package handler

import (
	"net/http"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/auth"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// DevLoginRequest represents the dev login request
type DevLoginRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

// RefreshRequest represents the token refresh request
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// LogoutRequest represents the logout request
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// GetDevUsers returns the list of available dev users
// GET /api/auth/dev/users
func (h *AuthHandler) GetDevUsers(c *gin.Context) {
	if !h.authService.IsDevMode() {
		response.Error(c, http.StatusForbidden, response.ErrForbidden, "开发模式未启用")
		return
	}

	users := h.authService.GetDevUsers()
	response.Success(c, gin.H{
		"users": users,
	})
}

// DevLogin handles development mode login
// POST /api/auth/login/dev
func (h *AuthHandler) DevLogin(c *gin.Context) {
	var req DevLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	authResp, err := h.authService.DevLogin(req.UserID)
	if err != nil {
		switch err {
		case service.ErrDevModeDisabled:
			response.Error(c, http.StatusForbidden, response.ErrForbidden, "开发模式未启用")
		case service.ErrInvalidDevUser:
			response.BadRequest(c, "无效的开发用户ID")
		default:
			response.InternalError(c, "登录失败", err.Error())
		}
		return
	}

	response.Success(c, authResp)
}

// RefreshToken refreshes the access token
// POST /api/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	authResp, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		switch err {
		case auth.ErrExpiredToken:
			response.Error(c, http.StatusUnauthorized, response.ErrTokenExpired, "刷新令牌已过期")
		case auth.ErrInvalidToken, auth.ErrInvalidClaims, service.ErrInvalidRefreshToken:
			response.Error(c, http.StatusUnauthorized, response.ErrTokenInvalid, "无效的刷新令牌")
		case auth.ErrTokenBlacklisted:
			response.Error(c, http.StatusUnauthorized, response.ErrTokenInvalid, "令牌已被撤销")
		case service.ErrUserNotFound:
			response.Error(c, http.StatusUnauthorized, response.ErrUnauthorized, "用户不存在")
		default:
			response.Error(c, http.StatusUnauthorized, response.ErrRefreshFailed, "刷新令牌失败")
		}
		return
	}

	response.Success(c, authResp)
}

// Logout handles user logout
// POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	_ = c.ShouldBindJSON(&req)

	// Get access token from header
	accessToken := ""
	authHeader := c.GetHeader("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		accessToken = authHeader[7:]
	}

	if err := h.authService.Logout(accessToken, req.RefreshToken); err != nil {
		response.InternalError(c, "登出失败", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "登出成功"})
}

// GetCurrentUser returns the current authenticated user
// GET /api/auth/me
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	response.Success(c, user)
}

// GetAuthMode returns the current authentication mode
// GET /api/auth/mode
func (h *AuthHandler) GetAuthMode(c *gin.Context) {
	mode := "prod"
	if h.authService.IsDevMode() {
		mode = "dev"
	}
	response.Success(c, gin.H{
		"mode": mode,
	})
}
