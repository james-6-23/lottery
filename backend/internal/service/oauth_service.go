package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"scratch-lottery/internal/cache"
	"scratch-lottery/internal/config"
	"scratch-lottery/internal/model"
	"scratch-lottery/pkg/auth"

	"gorm.io/gorm"
)

var (
	ErrOAuthDisabled     = errors.New("OAuth is disabled in dev mode")
	ErrOAuthFailed       = errors.New("OAuth authentication failed")
	ErrOAuthStateMismatch = errors.New("OAuth state mismatch")
	ErrOAuthTokenExchange = errors.New("failed to exchange OAuth token")
	ErrOAuthUserInfo      = errors.New("failed to get user info from OAuth provider")
)

const (
	linuxdoAuthorizeURL = "https://connect.linux.do/oauth2/authorize"
	linuxdoTokenURL     = "https://connect.linuxdo.org/oauth2/token"
	linuxdoUserInfoURL  = "https://connect.linuxdo.org/api/user"
)

// LinuxdoUserInfo represents the user info from Linux.do
type LinuxdoUserInfo struct {
	ID             int    `json:"id"`
	Username       string `json:"username"`
	Name           string `json:"name"`
	AvatarURL      string `json:"avatar_url"`
	AvatarTemplate string `json:"avatar_template"` // Linux.do 返回的头像模板，需要替换 {size}
	Email          string `json:"email"`
}

// OAuthService handles OAuth2 authentication
type OAuthService struct {
	db          *gorm.DB
	cfg         *config.Config
	jwtManager  *auth.JWTManager
	blacklist   *cache.TokenBlacklist
	stateCache  cache.Cache
}

// NewOAuthService creates a new OAuth service
func NewOAuthService(db *gorm.DB, cfg *config.Config, jwtManager *auth.JWTManager, blacklist *cache.TokenBlacklist, stateCache cache.Cache) *OAuthService {
	return &OAuthService{
		db:         db,
		cfg:        cfg,
		jwtManager: jwtManager,
		blacklist:  blacklist,
		stateCache: stateCache,
	}
}

// GetAuthorizationURL returns the OAuth2 authorization URL
func (s *OAuthService) GetAuthorizationURL(state string) (string, error) {
	if s.cfg.IsDevMode() {
		return "", ErrOAuthDisabled
	}

	// Store state in cache for validation
	_ = s.stateCache.Set("oauth_state:"+state, true, 600) // 10 minutes

	params := url.Values{}
	params.Set("client_id", s.cfg.LinuxdoClientID)
	params.Set("redirect_uri", s.cfg.LinuxdoCallbackURL)
	params.Set("response_type", "code")
	params.Set("scope", "read")
	params.Set("state", state)

	return fmt.Sprintf("%s?%s", linuxdoAuthorizeURL, params.Encode()), nil
}

// HandleCallback handles the OAuth2 callback
func (s *OAuthService) HandleCallback(code, state string) (*AuthResponse, error) {
	if s.cfg.IsDevMode() {
		return nil, ErrOAuthDisabled
	}

	// Validate state
	if !s.stateCache.Exists("oauth_state:" + state) {
		return nil, ErrOAuthStateMismatch
	}
	_ = s.stateCache.Delete("oauth_state:" + state)

	// Exchange code for token
	accessToken, err := s.exchangeCodeForToken(code)
	if err != nil {
		return nil, err
	}

	// Get user info
	userInfo, err := s.getUserInfo(accessToken)
	if err != nil {
		return nil, err
	}

	// Find or create user
	user, err := s.findOrCreateUser(userInfo)
	if err != nil {
		return nil, err
	}

	// Generate JWT tokens
	jwtAccessToken, refreshToken, err := s.jwtManager.GenerateTokenPair(
		user.ID,
		user.LinuxdoID,
		user.Username,
		user.Role,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  jwtAccessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.jwtManager.GetAccessExpiry(),
		User:         user,
	}, nil
}

// exchangeCodeForToken exchanges the authorization code for an access token
func (s *OAuthService) exchangeCodeForToken(code string) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", s.cfg.LinuxdoCallbackURL)
	data.Set("client_id", s.cfg.LinuxdoClientID)
	data.Set("client_secret", s.cfg.LinuxdoSecret)

	req, err := http.NewRequest("POST", linuxdoTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", ErrOAuthTokenExchange
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", ErrOAuthTokenExchange
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", ErrOAuthTokenExchange
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", ErrOAuthTokenExchange
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", ErrOAuthTokenExchange
	}

	return tokenResp.AccessToken, nil
}

// getUserInfo retrieves user info from Linux.do
func (s *OAuthService) getUserInfo(accessToken string) (*LinuxdoUserInfo, error) {
	req, err := http.NewRequest("GET", linuxdoUserInfoURL, nil)
	if err != nil {
		return nil, ErrOAuthUserInfo
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, ErrOAuthUserInfo
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrOAuthUserInfo
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrOAuthUserInfo
	}

	var userInfo LinuxdoUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, ErrOAuthUserInfo
	}

	return &userInfo, nil
}

// findOrCreateUser finds or creates a user from OAuth info
func (s *OAuthService) findOrCreateUser(userInfo *LinuxdoUserInfo) (*model.User, error) {
	linuxdoID := fmt.Sprintf("%d", userInfo.ID)
	
	// 处理头像 URL
	avatarURL := s.processAvatarURL(userInfo)
	
	var user model.User
	err := s.db.Where("linuxdo_id = ?", linuxdoID).First(&user).Error

	if err == gorm.ErrRecordNotFound {
		// Create new user
		displayName := userInfo.Name
		if displayName == "" {
			displayName = userInfo.Username
		}

		user = model.User{
			LinuxdoID: linuxdoID,
			Username:  displayName,
			Avatar:    avatarURL,
			Role:      "user",
		}
		if err := s.db.Create(&user).Error; err != nil {
			return nil, err
		}

		// Create wallet with initial balance
		wallet := model.Wallet{
			UserID:  user.ID,
			Balance: 50, // Initial 50 points
		}
		if err := s.db.Create(&wallet).Error; err != nil {
			return nil, err
		}

		// Create initial transaction
		tx := model.Transaction{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeInitial,
			Amount:      50,
			Description: "新用户注册赠送",
		}
		if err := s.db.Create(&tx).Error; err != nil {
			return nil, err
		}

		// Reload user with wallet
		if err := s.db.Preload("Wallet").First(&user, user.ID).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// Update user info if changed
		displayName := userInfo.Name
		if displayName == "" {
			displayName = userInfo.Username
		}

		if user.Username != displayName || user.Avatar != avatarURL {
			user.Username = displayName
			user.Avatar = avatarURL
			if err := s.db.Save(&user).Error; err != nil {
				return nil, err
			}
		}

		// Load wallet for existing user
		if err := s.db.Preload("Wallet").First(&user, user.ID).Error; err != nil {
			return nil, err
		}
	}

	return &user, nil
}

// processAvatarURL 处理头像 URL，优先使用 avatar_template
func (s *OAuthService) processAvatarURL(userInfo *LinuxdoUserInfo) string {
	// 优先使用 avatar_template（Linux.do 返回的标准格式）
	if userInfo.AvatarTemplate != "" {
		avatarURL := strings.Replace(userInfo.AvatarTemplate, "{size}", "120", 1)
		// 如果是相对路径，添加 linux.do 域名
		if strings.HasPrefix(avatarURL, "/") {
			avatarURL = "https://linux.do" + avatarURL
		}
		return avatarURL
	}
	// 回退到 avatar_url
	return userInfo.AvatarURL
}

// IsEnabled returns whether OAuth is enabled
func (s *OAuthService) IsEnabled() bool {
	return !s.cfg.IsDevMode() && s.cfg.LinuxdoClientID != "" && s.cfg.LinuxdoSecret != ""
}
