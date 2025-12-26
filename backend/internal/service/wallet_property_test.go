package service

import (
	"os"
	"strconv"
	"testing"

	"scratch-lottery/internal/model"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
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

// Property 1: 新用户钱包初始化
// For any newly registered user, the system should automatically create a wallet
// and initialize it with 50 points balance.
// **Validates: Requirements 1.7, 6.1**

func setupTestDB(t *testing.T) *gorm.DB {
	// Use in-memory SQLite for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate models
	err = db.AutoMigrate(&model.User{}, &model.Wallet{}, &model.Transaction{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func TestProperty1_NewUserWalletInitialization(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = getMinSuccessfulTests()
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Property: For any new user, wallet should be created with exactly 50 points
	properties.Property("new user wallet is created with 50 points initial balance", prop.ForAll(
		func(userID uint) bool {
			db := setupTestDB(t)
			walletService := NewWalletService(db)

			// Create a user first
			user := model.User{
				LinuxdoID: "test_" + string(rune(userID%26+'a')),
				Username:  "TestUser",
				Role:      "user",
			}
			user.ID = userID
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create wallet for user
			wallet, err := walletService.CreateWalletForUser(userID)
			if err != nil {
				t.Logf("Failed to create wallet: %v", err)
				return false
			}

			// Verify wallet balance is exactly 50
			if wallet.Balance != 50 {
				t.Logf("Wallet balance mismatch: got %d, want 50", wallet.Balance)
				return false
			}

			// Verify wallet is associated with correct user
			if wallet.UserID != userID {
				t.Logf("Wallet UserID mismatch: got %d, want %d", wallet.UserID, userID)
				return false
			}

			return true
		},
		gen.UInt().Map(func(n uint) uint { return n%10000 + 1 }), // userID: 1 to 10000
	))

	// Property: Initial transaction record should be created with correct amount
	properties.Property("initial transaction record is created with 50 points", prop.ForAll(
		func(userID uint) bool {
			db := setupTestDB(t)
			walletService := NewWalletService(db)

			// Create a user first
			user := model.User{
				LinuxdoID: "test_" + string(rune(userID%26+'a')),
				Username:  "TestUser",
				Role:      "user",
			}
			user.ID = userID
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create wallet for user
			wallet, err := walletService.CreateWalletForUser(userID)
			if err != nil {
				t.Logf("Failed to create wallet: %v", err)
				return false
			}

			// Verify initial transaction exists
			var transaction model.Transaction
			if err := db.Where("wallet_id = ? AND type = ?", wallet.ID, model.TransactionTypeInitial).First(&transaction).Error; err != nil {
				t.Logf("Failed to find initial transaction: %v", err)
				return false
			}

			// Verify transaction amount is 50
			if transaction.Amount != 50 {
				t.Logf("Transaction amount mismatch: got %d, want 50", transaction.Amount)
				return false
			}

			// Verify transaction type is initial
			if transaction.Type != model.TransactionTypeInitial {
				t.Logf("Transaction type mismatch: got %s, want %s", transaction.Type, model.TransactionTypeInitial)
				return false
			}

			return true
		},
		gen.UInt().Map(func(n uint) uint { return n%10000 + 1 }),
	))

	// Property: Creating wallet for same user twice should return existing wallet
	properties.Property("creating wallet twice returns existing wallet with same balance", prop.ForAll(
		func(userID uint) bool {
			db := setupTestDB(t)
			walletService := NewWalletService(db)

			// Create a user first
			user := model.User{
				LinuxdoID: "test_" + string(rune(userID%26+'a')),
				Username:  "TestUser",
				Role:      "user",
			}
			user.ID = userID
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create wallet first time
			wallet1, err := walletService.CreateWalletForUser(userID)
			if err != nil {
				t.Logf("Failed to create wallet first time: %v", err)
				return false
			}

			// Create wallet second time (should return existing)
			wallet2, err := walletService.CreateWalletForUser(userID)
			if err != nil {
				t.Logf("Failed to create wallet second time: %v", err)
				return false
			}

			// Verify same wallet is returned
			if wallet1.ID != wallet2.ID {
				t.Logf("Wallet ID mismatch: first %d, second %d", wallet1.ID, wallet2.ID)
				return false
			}

			// Verify balance is still 50 (not doubled)
			if wallet2.Balance != 50 {
				t.Logf("Wallet balance after second create: got %d, want 50", wallet2.Balance)
				return false
			}

			return true
		},
		gen.UInt().Map(func(n uint) uint { return n%10000 + 1 }),
	))

	// Property: GetBalance should return correct balance after wallet creation
	properties.Property("GetBalance returns 50 for newly created wallet", prop.ForAll(
		func(userID uint) bool {
			db := setupTestDB(t)
			walletService := NewWalletService(db)

			// Create a user first
			user := model.User{
				LinuxdoID: "test_" + string(rune(userID%26+'a')),
				Username:  "TestUser",
				Role:      "user",
			}
			user.ID = userID
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create wallet
			_, err := walletService.CreateWalletForUser(userID)
			if err != nil {
				t.Logf("Failed to create wallet: %v", err)
				return false
			}

			// Get balance
			balance, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance: %v", err)
				return false
			}

			// Verify balance is 50
			if balance != 50 {
				t.Logf("Balance mismatch: got %d, want 50", balance)
				return false
			}

			return true
		},
		gen.UInt().Map(func(n uint) uint { return n%10000 + 1 }),
	))

	properties.TestingRun(t)
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
