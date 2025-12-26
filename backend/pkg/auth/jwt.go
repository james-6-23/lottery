package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidClaims    = errors.New("invalid token claims")
	ErrTokenBlacklisted = errors.New("token has been revoked")
)

// TokenType represents the type of JWT token
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims represents the JWT claims
type Claims struct {
	UserID    uint      `json:"user_id"`
	LinuxdoID string    `json:"linuxdo_id"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	TokenType TokenType `json:"token_type"`
	jwt.RegisteredClaims
}

// JWTManager handles JWT token operations
type JWTManager struct {
	secretKey     []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secret string, accessExpiryMinutes, refreshExpiryDays int) *JWTManager {
	return &JWTManager{
		secretKey:     []byte(secret),
		accessExpiry:  time.Duration(accessExpiryMinutes) * time.Minute,
		refreshExpiry: time.Duration(refreshExpiryDays) * 24 * time.Hour,
	}
}

// GenerateTokenPair generates both access and refresh tokens
func (m *JWTManager) GenerateTokenPair(userID uint, linuxdoID, username, role string) (accessToken, refreshToken string, err error) {
	accessToken, err = m.generateToken(userID, linuxdoID, username, role, AccessToken, m.accessExpiry)
	if err != nil {
		return "", "", err
	}

	refreshToken, err = m.generateToken(userID, linuxdoID, username, role, RefreshToken, m.refreshExpiry)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// generateToken creates a JWT token
func (m *JWTManager) generateToken(userID uint, linuxdoID, username, role string, tokenType TokenType, expiry time.Duration) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID:    userID,
		LinuxdoID: linuxdoID,
		Username:  username,
		Role:      role,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secretKey)
}

// ValidateToken validates a JWT token and returns the claims
func (m *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	return claims, nil
}

// GetAccessExpiry returns the access token expiry duration in seconds
func (m *JWTManager) GetAccessExpiry() int64 {
	return int64(m.accessExpiry.Seconds())
}

// GetRefreshExpiry returns the refresh token expiry duration in seconds
func (m *JWTManager) GetRefreshExpiry() int64 {
	return int64(m.refreshExpiry.Seconds())
}
