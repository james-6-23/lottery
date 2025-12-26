package service

import (
	"testing"

	"scratch-lottery/internal/model"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupExchangeTestDB creates an in-memory SQLite database for testing
func setupExchangeTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate models
	err = db.AutoMigrate(
		&model.User{},
		&model.Wallet{},
		&model.Transaction{},
		&model.Product{},
		&model.CardKey{},
		&model.ExchangeRecord{},
	)
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

// createTestUserWithBalance creates a test user with a specific balance
func createTestUserWithBalance(db *gorm.DB, userID uint, balance int) error {
	user := model.User{
		LinuxdoID: "test_user_" + string(rune(userID%26+'a')),
		Username:  "TestUser",
		Role:      "user",
	}
	user.ID = userID
	if err := db.Create(&user).Error; err != nil {
		return err
	}

	wallet := model.Wallet{
		UserID:  userID,
		Balance: balance,
	}
	return db.Create(&wallet).Error
}

// createTestProductWithCardKeys creates a test product with card keys
func createTestProductWithCardKeys(db *gorm.DB, productID uint, price int, numKeys int) error {
	product := model.Product{
		Name:   "Test Product",
		Price:  price,
		Stock:  numKeys,
		Status: model.ProductStatusAvailable,
	}
	product.ID = productID
	if err := db.Create(&product).Error; err != nil {
		return err
	}

	for i := 0; i < numKeys; i++ {
		cardKey := model.CardKey{
			ProductID:  productID,
			KeyContent: "TEST-KEY-" + string(rune(i%26+'A')),
			Status:     model.CardKeyStatusAvailable,
		}
		if err := db.Create(&cardKey).Error; err != nil {
			return err
		}
	}

	return nil
}


// Property 8: 兑换余额验证
// For any product redemption request, if the user's points are less than the product price,
// the redemption must be rejected and the points must remain unchanged.
// **Validates: Requirements 11.3, 11.4**

func TestProperty8_ExchangeBalanceVerification(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = getMinSuccessfulTests()
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Property: Redemption should fail when balance is less than product price
	properties.Property("redemption fails when balance < price and balance unchanged", prop.ForAll(
		func(balance int, price int) bool {
			// Ensure balance < price for this test
			if balance >= price {
				balance = price - 1
			}
			if balance < 0 {
				balance = 0
			}
			if price <= 0 {
				price = 1
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			userID := uint(1)
			productID := uint(1)

			// Create user with insufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with card keys
			if err := createTestProductWithCardKeys(db, productID, price, 5); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Attempt redemption
			_, err := exchangeService.Redeem(userID, productID)

			// Should fail with insufficient points error
			if err != ErrInsufficientPoints {
				t.Logf("Expected ErrInsufficientPoints, got: %v", err)
				return false
			}

			// Verify balance unchanged
			newBalance, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance: %v", err)
				return false
			}

			if newBalance != balance {
				t.Logf("Balance changed: was %d, now %d", balance, newBalance)
				return false
			}

			return true
		},
		gen.IntRange(0, 100),   // balance: 0 to 100
		gen.IntRange(1, 1000),  // price: 1 to 1000
	))

	// Property: Redemption should succeed when balance >= price
	properties.Property("redemption succeeds when balance >= price", prop.ForAll(
		func(extraBalance int, price int) bool {
			if price <= 0 {
				price = 1
			}
			if extraBalance < 0 {
				extraBalance = 0
			}
			balance := price + extraBalance // Ensure balance >= price

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with card keys
			if err := createTestProductWithCardKeys(db, productID, price, 5); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Attempt redemption
			result, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("Redemption failed unexpectedly: %v", err)
				return false
			}

			// Verify result
			if result.Cost != price {
				t.Logf("Cost mismatch: got %d, want %d", result.Cost, price)
				return false
			}

			if result.Balance != balance-price {
				t.Logf("Balance mismatch: got %d, want %d", result.Balance, balance-price)
				return false
			}

			return true
		},
		gen.IntRange(0, 500),   // extraBalance: 0 to 500
		gen.IntRange(1, 500),   // price: 1 to 500
	))

	// Property: Balance should be exactly reduced by product price after successful redemption
	properties.Property("balance reduced by exactly product price after redemption", prop.ForAll(
		func(balance int, price int) bool {
			if price <= 0 {
				price = 1
			}
			if balance < price {
				balance = price + 10 // Ensure sufficient balance
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with card keys
			if err := createTestProductWithCardKeys(db, productID, price, 5); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Perform redemption
			_, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("Redemption failed: %v", err)
				return false
			}

			// Verify balance reduced by exactly price
			newBalance, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance: %v", err)
				return false
			}

			expectedBalance := balance - price
			if newBalance != expectedBalance {
				t.Logf("Balance mismatch: got %d, want %d (original: %d, price: %d)", 
					newBalance, expectedBalance, balance, price)
				return false
			}

			return true
		},
		gen.IntRange(100, 1000), // balance: 100 to 1000
		gen.IntRange(1, 100),    // price: 1 to 100
	))

	properties.TestingRun(t)
}


// Property 9: 兑换交易一致性
// For any successful product redemption, the user's points deducted must equal the product price,
// and the card key status must be updated to redeemed.
// **Validates: Requirements 11.5, 11.1.4**

func TestProperty9_ExchangeTransactionConsistency(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = getMinSuccessfulTests()
	parameters.Rng.Seed(5678)

	properties := gopter.NewProperties(parameters)

	// Property: Points deducted equals product price
	properties.Property("points deducted equals product price", prop.ForAll(
		func(balance int, price int) bool {
			if price <= 0 {
				price = 1
			}
			if balance < price {
				balance = price + 100
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with card keys
			if err := createTestProductWithCardKeys(db, productID, price, 5); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Perform redemption
			result, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("Redemption failed: %v", err)
				return false
			}

			// Verify cost equals price
			if result.Cost != price {
				t.Logf("Cost mismatch: got %d, want %d", result.Cost, price)
				return false
			}

			// Verify transaction record exists with correct amount
			var transaction model.Transaction
			if err := db.Where("type = ? AND reference_id = ?", model.TransactionTypeExchange, productID).
				First(&transaction).Error; err != nil {
				t.Logf("Failed to find transaction: %v", err)
				return false
			}

			// Transaction amount should be negative (deduction)
			if transaction.Amount != -price {
				t.Logf("Transaction amount mismatch: got %d, want %d", transaction.Amount, -price)
				return false
			}

			return true
		},
		gen.IntRange(100, 1000), // balance
		gen.IntRange(1, 100),    // price
	))

	// Property: Card key status updated to redeemed after successful redemption
	properties.Property("card key status updated to redeemed", prop.ForAll(
		func(balance int, price int) bool {
			if price <= 0 {
				price = 1
			}
			if balance < price {
				balance = price + 100
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with card keys
			if err := createTestProductWithCardKeys(db, productID, price, 5); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Perform redemption
			result, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("Redemption failed: %v", err)
				return false
			}

			// Find the exchange record to get the card key ID
			var record model.ExchangeRecord
			if err := db.Where("id = ?", result.RecordID).First(&record).Error; err != nil {
				t.Logf("Failed to find exchange record: %v", err)
				return false
			}

			// Verify card key status is redeemed
			var cardKey model.CardKey
			if err := db.First(&cardKey, record.CardKeyID).Error; err != nil {
				t.Logf("Failed to find card key: %v", err)
				return false
			}

			if cardKey.Status != model.CardKeyStatusRedeemed {
				t.Logf("Card key status mismatch: got %s, want %s", cardKey.Status, model.CardKeyStatusRedeemed)
				return false
			}

			// Verify card key is marked with correct user
			if cardKey.RedeemedBy != userID {
				t.Logf("Card key redeemed_by mismatch: got %d, want %d", cardKey.RedeemedBy, userID)
				return false
			}

			// Verify redeemed_at is set
			if cardKey.RedeemedAt == nil {
				t.Logf("Card key redeemed_at is nil")
				return false
			}

			return true
		},
		gen.IntRange(100, 1000), // balance
		gen.IntRange(1, 100),    // price
	))

	// Property: Exchange record is created with correct data
	properties.Property("exchange record created with correct data", prop.ForAll(
		func(balance int, price int) bool {
			if price <= 0 {
				price = 1
			}
			if balance < price {
				balance = price + 100
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with card keys
			if err := createTestProductWithCardKeys(db, productID, price, 5); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Perform redemption
			result, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("Redemption failed: %v", err)
				return false
			}

			// Verify exchange record exists
			var record model.ExchangeRecord
			if err := db.Where("id = ?", result.RecordID).First(&record).Error; err != nil {
				t.Logf("Failed to find exchange record: %v", err)
				return false
			}

			// Verify record data
			if record.UserID != userID {
				t.Logf("Record user_id mismatch: got %d, want %d", record.UserID, userID)
				return false
			}

			if record.ProductID != productID {
				t.Logf("Record product_id mismatch: got %d, want %d", record.ProductID, productID)
				return false
			}

			if record.Cost != price {
				t.Logf("Record cost mismatch: got %d, want %d", record.Cost, price)
				return false
			}

			return true
		},
		gen.IntRange(100, 1000), // balance
		gen.IntRange(1, 100),    // price
	))

	properties.TestingRun(t)
}


// Property 10: 商品库存自动更新
// For any product, when all card keys are redeemed, the product status must be
// automatically updated to "sold_out".
// **Validates: Requirements 11.1.6**

func TestProperty10_ProductStockAutoUpdate(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = getMinSuccessfulTests()
	parameters.Rng.Seed(9012)

	properties := gopter.NewProperties(parameters)

	// Property: Product status becomes sold_out when all card keys are redeemed
	properties.Property("product status becomes sold_out when all keys redeemed", prop.ForAll(
		func(numKeys int) bool {
			if numKeys < 1 {
				numKeys = 1
			}
			if numKeys > 10 {
				numKeys = 10 // Limit for test performance
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			price := 10
			balance := price * (numKeys + 1) // Enough for all redemptions

			productID := uint(1)

			// Create product with specified number of card keys
			if err := createTestProductWithCardKeys(db, productID, price, numKeys); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Redeem all card keys with different users
			for i := 0; i < numKeys; i++ {
				userID := uint(i + 1)
				if err := createTestUserWithBalance(db, userID, balance); err != nil {
					t.Logf("Failed to create user %d: %v", userID, err)
					return false
				}

				_, err := exchangeService.Redeem(userID, productID)
				if err != nil {
					t.Logf("Redemption %d failed: %v", i+1, err)
					return false
				}
			}

			// Verify product status is sold_out
			var product model.Product
			if err := db.First(&product, productID).Error; err != nil {
				t.Logf("Failed to find product: %v", err)
				return false
			}

			if product.Status != model.ProductStatusSoldOut {
				t.Logf("Product status mismatch: got %s, want %s", product.Status, model.ProductStatusSoldOut)
				return false
			}

			// Verify stock is 0
			if product.Stock != 0 {
				t.Logf("Product stock mismatch: got %d, want 0", product.Stock)
				return false
			}

			return true
		},
		gen.IntRange(1, 10), // numKeys: 1 to 10
	))

	// Property: Product stock decreases by 1 after each redemption
	properties.Property("product stock decreases by 1 after each redemption", prop.ForAll(
		func(initialStock int) bool {
			if initialStock < 2 {
				initialStock = 2
			}
			if initialStock > 10 {
				initialStock = 10
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			price := 10
			balance := price * 2

			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with specified stock
			if err := createTestProductWithCardKeys(db, productID, price, initialStock); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// Perform one redemption
			_, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("Redemption failed: %v", err)
				return false
			}

			// Verify stock decreased by 1
			var product model.Product
			if err := db.First(&product, productID).Error; err != nil {
				t.Logf("Failed to find product: %v", err)
				return false
			}

			expectedStock := initialStock - 1
			if product.Stock != expectedStock {
				t.Logf("Stock mismatch: got %d, want %d", product.Stock, expectedStock)
				return false
			}

			// Product should still be available if stock > 0
			if expectedStock > 0 && product.Status != model.ProductStatusAvailable {
				t.Logf("Product status should be available when stock > 0, got %s", product.Status)
				return false
			}

			return true
		},
		gen.IntRange(2, 10), // initialStock: 2 to 10
	))

	// Property: Redemption fails when product is sold out
	properties.Property("redemption fails when product is sold out", prop.ForAll(
		func(balance int) bool {
			if balance < 100 {
				balance = 100
			}

			db := setupExchangeTestDB(t)
			walletService := NewWalletService(db)
			exchangeService := NewExchangeService(db, walletService)

			price := 10
			userID := uint(1)
			productID := uint(1)

			// Create user with sufficient balance
			if err := createTestUserWithBalance(db, userID, balance); err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Create product with 1 card key
			if err := createTestProductWithCardKeys(db, productID, price, 1); err != nil {
				t.Logf("Failed to create product: %v", err)
				return false
			}

			// First redemption should succeed
			_, err := exchangeService.Redeem(userID, productID)
			if err != nil {
				t.Logf("First redemption failed: %v", err)
				return false
			}

			// Create another user for second attempt
			userID2 := uint(2)
			if err := createTestUserWithBalance(db, userID2, balance); err != nil {
				t.Logf("Failed to create second user: %v", err)
				return false
			}

			// Second redemption should fail (sold out)
			_, err = exchangeService.Redeem(userID2, productID)
			if err != ErrProductSoldOut && err != ErrNoAvailableCardKey {
				t.Logf("Expected sold out error, got: %v", err)
				return false
			}

			return true
		},
		gen.IntRange(100, 1000), // balance
	))

	properties.TestingRun(t)
}
