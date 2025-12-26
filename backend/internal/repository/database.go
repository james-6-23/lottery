package repository

import (
	"fmt"
	"os"
	"path/filepath"

	"scratch-lottery/internal/config"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var db *gorm.DB

// InitDB initializes the database connection
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector
	var gormConfig *gorm.Config

	// Configure logger based on mode
	if cfg.IsDevMode() {
		gormConfig = &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		}
	} else {
		gormConfig = &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		}
	}

	switch cfg.DBDriver {
	case "sqlite":
		// Ensure data directory exists
		dir := filepath.Dir(cfg.DBPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create data directory: %w", err)
		}
		dialector = sqlite.Open(cfg.DBPath)
	case "postgres":
		dsn := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
		)
		dialector = postgres.Open(dsn)
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", cfg.DBDriver)
	}

	var err error
	db, err = gorm.Open(dialector, gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return db
}

// CloseDB closes the database connection
func CloseDB() error {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
