package middleware

import (
	"strings"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/auth"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware creates a JWT authentication middleware
func AuthMiddleware(authService *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "缺少认证令牌")
			c.Abort()
			return
		}

		// Check Bearer prefix
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "认证令牌格式错误")
			c.Abort()
			return
		}

		tokenStr := parts[1]
		claims, err := authService.ValidateAccessToken(tokenStr)
		if err != nil {
			switch err {
			case auth.ErrExpiredToken:
				response.Error(c, 401, response.ErrTokenExpired, "令牌已过期")
			case auth.ErrTokenBlacklisted:
				response.Error(c, 401, response.ErrTokenInvalid, "令牌已被撤销")
			default:
				response.Error(c, 401, response.ErrTokenInvalid, "无效的令牌")
			}
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("userID", claims.UserID)
		c.Set("linuxdoID", claims.LinuxdoID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// AdminMiddleware ensures the user is an admin
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role.(string) != "admin" {
			response.Forbidden(c, "需要管理员权限")
			c.Abort()
			return
		}
		c.Next()
	}
}

// OptionalAuthMiddleware tries to authenticate but doesn't require it
func OptionalAuthMiddleware(authService *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenStr := parts[1]
		claims, err := authService.ValidateAccessToken(tokenStr)
		if err != nil {
			c.Next()
			return
		}

		// Set user info in context
		c.Set("userID", claims.UserID)
		c.Set("linuxdoID", claims.LinuxdoID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}
