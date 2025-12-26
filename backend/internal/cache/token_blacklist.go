package cache

import (
	"fmt"
	"time"
)

const tokenBlacklistPrefix = "token_blacklist:"

// TokenBlacklist manages revoked tokens
type TokenBlacklist struct {
	cache Cache
}

// NewTokenBlacklist creates a new token blacklist
func NewTokenBlacklist(cache Cache) *TokenBlacklist {
	return &TokenBlacklist{cache: cache}
}

// Add adds a token to the blacklist
func (b *TokenBlacklist) Add(token string, expiration time.Duration) error {
	key := fmt.Sprintf("%s%s", tokenBlacklistPrefix, token)
	return b.cache.Set(key, true, expiration)
}

// IsBlacklisted checks if a token is blacklisted
func (b *TokenBlacklist) IsBlacklisted(token string) bool {
	key := fmt.Sprintf("%s%s", tokenBlacklistPrefix, token)
	return b.cache.Exists(key)
}

// Remove removes a token from the blacklist
func (b *TokenBlacklist) Remove(token string) error {
	key := fmt.Sprintf("%s%s", tokenBlacklistPrefix, token)
	return b.cache.Delete(key)
}
