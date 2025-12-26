package auth

import (
	"os"
	"strconv"
	"testing"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
)

// getMinSuccessfulTests returns the minimum number of successful tests for property testing.
// Uses GOPTER_MIN_SUCCESSFUL_TESTS env var if set, otherwise defaults to 100.
func getMinSuccessfulTests() int {
	if val := os.Getenv("GOPTER_MIN_SUCCESSFUL_TESTS"); val != "" {
		if n, err := strconv.Atoi(val); err == nil && n > 0 {
			return n
		}
	}
	return 100
}

// Property 11: JWT 令牌有效性
// For any successful login (including OAuth2 and dev mode), the system must return
// valid JWT access tokens and refresh tokens.
// **Validates: Requirements 1.4, 1.1.5**

func TestProperty11_JWTTokenValidity(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = getMinSuccessfulTests()
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Property: For any valid user data, generated tokens should be valid and parseable
	properties.Property("generated tokens are valid and contain correct claims", prop.ForAll(
		func(userID uint, linuxdoID, username, role string) bool {
			// Skip empty strings
			if linuxdoID == "" || username == "" || role == "" {
				return true
			}

			jwtManager := NewJWTManager("test-secret-key-32-bytes-long!!", 15, 7)

			// Generate token pair
			accessToken, refreshToken, err := jwtManager.GenerateTokenPair(userID, linuxdoID, username, role)
			if err != nil {
				t.Logf("Failed to generate tokens: %v", err)
				return false
			}

			// Validate access token
			accessClaims, err := jwtManager.ValidateToken(accessToken)
			if err != nil {
				t.Logf("Failed to validate access token: %v", err)
				return false
			}

			// Validate refresh token
			refreshClaims, err := jwtManager.ValidateToken(refreshToken)
			if err != nil {
				t.Logf("Failed to validate refresh token: %v", err)
				return false
			}

			// Verify access token claims
			if accessClaims.UserID != userID {
				t.Logf("Access token UserID mismatch: got %d, want %d", accessClaims.UserID, userID)
				return false
			}
			if accessClaims.LinuxdoID != linuxdoID {
				t.Logf("Access token LinuxdoID mismatch: got %s, want %s", accessClaims.LinuxdoID, linuxdoID)
				return false
			}
			if accessClaims.Username != username {
				t.Logf("Access token Username mismatch: got %s, want %s", accessClaims.Username, username)
				return false
			}
			if accessClaims.Role != role {
				t.Logf("Access token Role mismatch: got %s, want %s", accessClaims.Role, role)
				return false
			}
			if accessClaims.TokenType != AccessToken {
				t.Logf("Access token type mismatch: got %s, want %s", accessClaims.TokenType, AccessToken)
				return false
			}

			// Verify refresh token claims
			if refreshClaims.UserID != userID {
				t.Logf("Refresh token UserID mismatch: got %d, want %d", refreshClaims.UserID, userID)
				return false
			}
			if refreshClaims.LinuxdoID != linuxdoID {
				t.Logf("Refresh token LinuxdoID mismatch: got %s, want %s", refreshClaims.LinuxdoID, linuxdoID)
				return false
			}
			if refreshClaims.TokenType != RefreshToken {
				t.Logf("Refresh token type mismatch: got %s, want %s", refreshClaims.TokenType, RefreshToken)
				return false
			}

			return true
		},
		gen.UInt().Map(func(n uint) uint { return n%1000000 + 1 }), // userID: 1 to 1000000
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "default_id"
			}
			return s
		}), // linuxdoID
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 128 {
				return s[:128]
			}
			if s == "" {
				return "default_user"
			}
			return s
		}), // username
		gen.OneConstOf("user", "admin"), // role
	))

	// Property: Access token and refresh token should be different
	properties.Property("access and refresh tokens are different", prop.ForAll(
		func(userID uint) bool {
			jwtManager := NewJWTManager("test-secret-key-32-bytes-long!!", 15, 7)

			accessToken, refreshToken, err := jwtManager.GenerateTokenPair(userID, "test_id", "test_user", "user")
			if err != nil {
				return false
			}

			return accessToken != refreshToken
		},
		gen.UInt().Map(func(n uint) uint { return n%1000000 + 1 }),
	))

	// Property: Invalid tokens should fail validation
	properties.Property("invalid tokens fail validation", prop.ForAll(
		func(invalidToken string) bool {
			jwtManager := NewJWTManager("test-secret-key-32-bytes-long!!", 15, 7)

			_, err := jwtManager.ValidateToken(invalidToken)
			// Invalid tokens should return an error
			return err != nil
		},
		gen.AlphaString().Map(func(s string) string {
			// Generate random strings that are not valid JWTs
			if len(s) < 10 {
				return "invalid.token.string"
			}
			return s
		}),
	))

	// Property: Tokens signed with different secrets should fail validation
	properties.Property("tokens with wrong secret fail validation", prop.ForAll(
		func(userID uint) bool {
			jwtManager1 := NewJWTManager("secret-key-one-32-bytes-long!!!", 15, 7)
			jwtManager2 := NewJWTManager("secret-key-two-32-bytes-long!!!", 15, 7)

			accessToken, _, err := jwtManager1.GenerateTokenPair(userID, "test_id", "test_user", "user")
			if err != nil {
				return false
			}

			// Try to validate with different secret
			_, err = jwtManager2.ValidateToken(accessToken)
			return err != nil
		},
		gen.UInt().Map(func(n uint) uint { return n%1000000 + 1 }),
	))

	properties.TestingRun(t)
}

// Additional unit test for token expiry
func TestJWTTokenExpiry(t *testing.T) {
	jwtManager := NewJWTManager("test-secret-key-32-bytes-long!!", 15, 7)

	// Test access expiry
	accessExpiry := jwtManager.GetAccessExpiry()
	expectedAccessExpiry := int64(15 * 60) // 15 minutes in seconds
	if accessExpiry != expectedAccessExpiry {
		t.Errorf("Access expiry mismatch: got %d, want %d", accessExpiry, expectedAccessExpiry)
	}

	// Test refresh expiry
	refreshExpiry := jwtManager.GetRefreshExpiry()
	expectedRefreshExpiry := int64(7 * 24 * 60 * 60) // 7 days in seconds
	if refreshExpiry != expectedRefreshExpiry {
		t.Errorf("Refresh expiry mismatch: got %d, want %d", refreshExpiry, expectedRefreshExpiry)
	}
}
