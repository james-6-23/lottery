package service

import (
	"errors"
	"time"

	"scratch-lottery/internal/cache"
	"scratch-lottery/internal/model"
	"scratch-lottery/pkg/auth"

	"gorm.io/gorm"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidDevUser    = errors.New("invalid dev user")
	ErrDevModeDisabled   = errors.New("dev mode is disabled")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
)

// DevUser represents a mock user for development mode
type DevUser struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	Avatar    string `json:"avatar"`
}

// Predefined dev users
var DevUsers = []DevUser{
	{ID: "dev_admin", Username: "管理员", Role: "admin", Avatar: ""},
	{ID: "dev_user", Username: "测试用户", Role: "user", Avatar: ""},
	{ID: "dev_user2", Username: "测试用户2", Role: "user", Avatar: ""},
	{ID: "dev_vip", Username: "VIP用户", Role: "user", Avatar: ""},
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresIn    int64       `json:"expires_in"`
	User         *model.User `json:"user"`
}

// AuthService handles authentication logic
type AuthService struct {
	db            *gorm.DB
	jwtManager    *auth.JWTManager
	blacklist     *cache.TokenBlacklist
	isDevMode     bool
}

// NewAuthService creates a new auth service
func NewAuthService(db *gorm.DB, jwtManager *auth.JWTManager, blacklist *cache.TokenBlacklist, isDevMode bool) *AuthService {
	return &AuthService{
		db:         db,
		jwtManager: jwtManager,
		blacklist:  blacklist,
		isDevMode:  isDevMode,
	}
}

// GetDevUsers returns the list of available dev users
func (s *AuthService) GetDevUsers() []DevUser {
	if !s.isDevMode {
		return nil
	}
	return DevUsers
}

// DevLogin handles development mode login
func (s *AuthService) DevLogin(devUserID string) (*AuthResponse, error) {
	if !s.isDevMode {
		return nil, ErrDevModeDisabled
	}

	// Find the dev user
	var devUser *DevUser
	for _, u := range DevUsers {
		if u.ID == devUserID {
			devUser = &u
			break
		}
	}
	if devUser == nil {
		return nil, ErrInvalidDevUser
	}

	// Find or create the user in database
	user, err := s.findOrCreateUser(devUser.ID, devUser.Username, devUser.Avatar, devUser.Role)
	if err != nil {
		return nil, err
	}

	// Generate tokens
	accessToken, refreshToken, err := s.jwtManager.GenerateTokenPair(
		user.ID,
		user.LinuxdoID,
		user.Username,
		user.Role,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.jwtManager.GetAccessExpiry(),
		User:         user,
	}, nil
}

// RefreshToken refreshes the access token using a refresh token
func (s *AuthService) RefreshToken(refreshTokenStr string) (*AuthResponse, error) {
	// Check if token is blacklisted
	if s.blacklist.IsBlacklisted(refreshTokenStr) {
		return nil, auth.ErrTokenBlacklisted
	}

	// Validate the refresh token
	claims, err := s.jwtManager.ValidateToken(refreshTokenStr)
	if err != nil {
		return nil, err
	}

	// Ensure it's a refresh token
	if claims.TokenType != auth.RefreshToken {
		return nil, ErrInvalidRefreshToken
	}

	// Get user from database
	var user model.User
	if err := s.db.Preload("Wallet").First(&user, claims.UserID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	// Blacklist the old refresh token
	remainingTime := time.Until(claims.ExpiresAt.Time)
	if remainingTime > 0 {
		_ = s.blacklist.Add(refreshTokenStr, remainingTime)
	}

	// Generate new tokens
	accessToken, newRefreshToken, err := s.jwtManager.GenerateTokenPair(
		user.ID,
		user.LinuxdoID,
		user.Username,
		user.Role,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    s.jwtManager.GetAccessExpiry(),
		User:         &user,
	}, nil
}

// Logout invalidates the tokens
func (s *AuthService) Logout(accessToken, refreshToken string) error {
	// Blacklist access token
	if accessToken != "" {
		claims, err := s.jwtManager.ValidateToken(accessToken)
		if err == nil {
			remainingTime := time.Until(claims.ExpiresAt.Time)
			if remainingTime > 0 {
				_ = s.blacklist.Add(accessToken, remainingTime)
			}
		}
	}

	// Blacklist refresh token
	if refreshToken != "" {
		claims, err := s.jwtManager.ValidateToken(refreshToken)
		if err == nil {
			remainingTime := time.Until(claims.ExpiresAt.Time)
			if remainingTime > 0 {
				_ = s.blacklist.Add(refreshToken, remainingTime)
			}
		}
	}

	return nil
}

// ValidateAccessToken validates an access token
func (s *AuthService) ValidateAccessToken(tokenStr string) (*auth.Claims, error) {
	// Check if token is blacklisted
	if s.blacklist.IsBlacklisted(tokenStr) {
		return nil, auth.ErrTokenBlacklisted
	}

	// Validate the token
	claims, err := s.jwtManager.ValidateToken(tokenStr)
	if err != nil {
		return nil, err
	}

	// Ensure it's an access token
	if claims.TokenType != auth.AccessToken {
		return nil, auth.ErrInvalidToken
	}

	return claims, nil
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(userID uint) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Wallet").First(&user, userID).Error; err != nil {
		return nil, ErrUserNotFound
	}
	return &user, nil
}

// findOrCreateUser finds or creates a user
func (s *AuthService) findOrCreateUser(linuxdoID, username, avatar, role string) (*model.User, error) {
	var user model.User
	err := s.db.Where("linuxdo_id = ?", linuxdoID).First(&user).Error
	
	if err == gorm.ErrRecordNotFound {
		// Create new user
		user = model.User{
			LinuxdoID: linuxdoID,
			Username:  username,
			Avatar:    avatar,
			Role:      role,
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
		// Load wallet for existing user
		if err := s.db.Preload("Wallet").First(&user, user.ID).Error; err != nil {
			return nil, err
		}
	}

	return &user, nil
}

// IsDevMode returns whether dev mode is enabled
func (s *AuthService) IsDevMode() bool {
	return s.isDevMode
}
