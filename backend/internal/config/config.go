package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	// Server settings
	ServerPort string
	ServerHost string

	// Database settings
	DBDriver   string // sqlite or postgres
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBPath     string // SQLite file path

	// JWT settings
	JWTSecret          string
	JWTAccessExpiry    int // in minutes
	JWTRefreshExpiry   int // in days

	// OAuth settings
	OAuthMode          string // dev or prod
	LinuxdoClientID    string
	LinuxdoSecret      string
	LinuxdoCallbackURL string

	// Cache settings
	CacheDriver  string // memory or redis
	RedisHost    string
	RedisPort    string
	RedisPassword string

	// Payment settings
	PaymentEnabled   bool
	EPayMerchantID   string
	EPaySecret       string
	EPayCallbackURL  string

	// Encryption
	EncryptionKey string
}

var cfg *Config

// Load loads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if exists (ignore error if not found)
	_ = godotenv.Load()

	cfg = &Config{
		// Server
		ServerPort: getEnv("SERVER_PORT", "8080"),
		ServerHost: getEnv("SERVER_HOST", "0.0.0.0"),

		// Database
		DBDriver:   getEnv("DB_DRIVER", "sqlite"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "scratch_lottery"),
		DBPath:     getEnv("DB_PATH", "./data/lottery.db"),

		// JWT
		JWTSecret:        getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTAccessExpiry:  getEnvInt("JWT_ACCESS_EXPIRY", 15),
		JWTRefreshExpiry: getEnvInt("JWT_REFRESH_EXPIRY", 7),

		// OAuth
		OAuthMode:          getEnv("OAUTH_MODE", "dev"),
		LinuxdoClientID:    getEnv("LINUXDO_CLIENT_ID", ""),
		LinuxdoSecret:      getEnv("LINUXDO_SECRET", ""),
		LinuxdoCallbackURL: getEnv("LINUXDO_CALLBACK_URL", "http://localhost:8080/api/auth/oauth/callback"),

		// Cache
		CacheDriver:   getEnv("CACHE_DRIVER", "memory"),
		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		// Payment
		PaymentEnabled:  getEnvBool("PAYMENT_ENABLED", false),
		EPayMerchantID:  getEnv("EPAY_MERCHANT_ID", ""),
		EPaySecret:      getEnv("EPAY_SECRET", ""),
		EPayCallbackURL: getEnv("EPAY_CALLBACK_URL", ""),

		// Encryption
		EncryptionKey: getEnv("ENCRYPTION_KEY", "32-byte-key-for-aes-encryption!"),
	}

	return cfg, nil
}

// Get returns the current configuration
func Get() *Config {
	if cfg == nil {
		cfg, _ = Load()
	}
	return cfg
}

// IsDevMode returns true if running in development mode
func (c *Config) IsDevMode() bool {
	return c.OAuthMode == "dev"
}

// IsProdMode returns true if running in production mode
func (c *Config) IsProdMode() bool {
	return c.OAuthMode == "prod"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
