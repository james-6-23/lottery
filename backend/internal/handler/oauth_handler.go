package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// OAuthHandler handles OAuth2 endpoints
type OAuthHandler struct {
	oauthService *service.OAuthService
}

// NewOAuthHandler creates a new OAuth handler
func NewOAuthHandler(oauthService *service.OAuthService) *OAuthHandler {
	return &OAuthHandler{oauthService: oauthService}
}

// generateState generates a random state string for OAuth
func generateState() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// LinuxdoLogin initiates the Linux.do OAuth2 flow
// GET /api/auth/oauth/linuxdo
func (h *OAuthHandler) LinuxdoLogin(c *gin.Context) {
	if !h.oauthService.IsEnabled() {
		response.Error(c, http.StatusForbidden, response.ErrForbidden, "OAuth登录未启用")
		return
	}

	state := generateState()
	authURL, err := h.oauthService.GetAuthorizationURL(state)
	if err != nil {
		switch err {
		case service.ErrOAuthDisabled:
			response.Error(c, http.StatusForbidden, response.ErrForbidden, "OAuth登录在开发模式下不可用")
		default:
			response.InternalError(c, "获取授权URL失败", err.Error())
		}
		return
	}

	// Redirect to Linux.do authorization page
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// LinuxdoCallback handles the OAuth2 callback from Linux.do
// GET /api/auth/oauth/callback
func (h *OAuthHandler) LinuxdoCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	// Check for OAuth error
	if errorParam != "" {
		errorDesc := c.Query("error_description")
		response.Error(c, http.StatusBadRequest, response.ErrOAuthFailed, "OAuth授权失败: "+errorDesc)
		return
	}

	// Validate required parameters
	if code == "" || state == "" {
		response.BadRequest(c, "缺少必要的OAuth参数")
		return
	}

	authResp, err := h.oauthService.HandleCallback(code, state)
	if err != nil {
		switch err {
		case service.ErrOAuthDisabled:
			response.Error(c, http.StatusForbidden, response.ErrForbidden, "OAuth登录在开发模式下不可用")
		case service.ErrOAuthStateMismatch:
			response.Error(c, http.StatusBadRequest, response.ErrOAuthFailed, "OAuth状态验证失败")
		case service.ErrOAuthTokenExchange:
			response.Error(c, http.StatusBadRequest, response.ErrOAuthFailed, "OAuth令牌交换失败")
		case service.ErrOAuthUserInfo:
			response.Error(c, http.StatusBadRequest, response.ErrOAuthFailed, "获取用户信息失败")
		default:
			response.InternalError(c, "OAuth登录失败", err.Error())
		}
		return
	}

	// In production, you might want to redirect to frontend with tokens
	// For now, return JSON response
	response.Success(c, authResp)
}

// OAuthCallbackRedirect handles the OAuth2 callback and redirects to frontend
// GET /api/auth/oauth/callback/redirect
func (h *OAuthHandler) OAuthCallbackRedirect(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")
	frontendURL := c.Query("redirect") // Frontend URL to redirect to

	if frontendURL == "" {
		frontendURL = "/"
	}

	// Check for OAuth error
	if errorParam != "" {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"?error=oauth_failed")
		return
	}

	// Validate required parameters
	if code == "" || state == "" {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"?error=missing_params")
		return
	}

	authResp, err := h.oauthService.HandleCallback(code, state)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"?error=auth_failed")
		return
	}

	// Redirect to frontend with tokens in URL fragment (more secure than query params)
	redirectURL := frontendURL + "#access_token=" + authResp.AccessToken + "&refresh_token=" + authResp.RefreshToken
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
