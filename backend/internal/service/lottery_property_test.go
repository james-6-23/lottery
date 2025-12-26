package service

import (
	"testing"
	"time"

	"scratch-lottery/internal/model"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Test encryption key (32 bytes)
const testEncryptionKey = "32-byte-key-for-aes-encryption!!"

func setupLotteryTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	err = db.AutoMigrate(
		&model.User{},
		&model.Wallet{},
		&model.Transaction{},
		&model.LotteryType{},
		&model.PrizeLevel{},
		&model.PrizePool{},
		&model.Ticket{},
	)
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

// Property 2: 保安码全局唯一性
// For any generated security code, the code must be globally unique in the system
// and must be a 16-character alphanumeric combination.
// **Validates: Requirements 3.4, 3.5**

func TestProperty2_SecurityCodeGlobalUniqueness(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Property: Generated security codes are exactly 16 characters
	properties.Property("security codes are exactly 16 characters", prop.ForAll(
		func(_ int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			code, err := lotteryService.GenerateSecurityCode()
			if err != nil {
				t.Logf("Failed to generate security code: %v", err)
				return false
			}

			if len(code) != SecurityCodeLength {
				t.Logf("Security code length mismatch: got %d, want %d", len(code), SecurityCodeLength)
				return false
			}

			return true
		},
		gen.IntRange(1, 1000),
	))

	// Property: Security codes only contain valid characters (alphanumeric, excluding confusing chars)
	properties.Property("security codes contain only valid characters", prop.ForAll(
		func(_ int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			code, err := lotteryService.GenerateSecurityCode()
			if err != nil {
				t.Logf("Failed to generate security code: %v", err)
				return false
			}

			for _, c := range code {
				found := false
				for _, valid := range SecurityCodeCharset {
					if c == valid {
						found = true
						break
					}
				}
				if !found {
					t.Logf("Invalid character in security code: %c", c)
					return false
				}
			}

			return true
		},
		gen.IntRange(1, 1000),
	))

	// Property: Multiple generated codes are unique
	properties.Property("multiple generated codes are unique", prop.ForAll(
		func(count int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			codes := make(map[string]bool)
			for i := 0; i < count; i++ {
				code, err := lotteryService.GenerateSecurityCode()
				if err != nil {
					t.Logf("Failed to generate security code: %v", err)
					return false
				}

				if codes[code] {
					t.Logf("Duplicate security code generated: %s", code)
					return false
				}
				codes[code] = true
			}

			return true
		},
		gen.IntRange(10, 50), // Generate 10-50 codes per test
	))

	// Property: GenerateUniqueSecurityCode returns codes not in database
	properties.Property("unique security codes are not in database", prop.ForAll(
		func(existingCount int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			// Create a user and lottery type for tickets
			user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			lotteryType := model.LotteryType{
				Name:     "Test Lottery",
				Price:    10,
				MaxPrize: 100,
				GameType: model.GameTypeNumberMatch,
				Status:   model.LotteryTypeStatusAvailable,
			}
			if err := db.Create(&lotteryType).Error; err != nil {
				t.Logf("Failed to create lottery type: %v", err)
				return false
			}

			// Create some existing tickets with security codes
			for i := 0; i < existingCount; i++ {
				code, _ := lotteryService.GenerateSecurityCode()
				ticket := model.Ticket{
					UserID:        user.ID,
					LotteryTypeID: lotteryType.ID,
					SecurityCode:  code,
					Status:        model.TicketStatusUnscratched,
				}
				if err := db.Create(&ticket).Error; err != nil {
					t.Logf("Failed to create ticket: %v", err)
					return false
				}
			}

			// Generate a unique code
			newCode, err := lotteryService.GenerateUniqueSecurityCode()
			if err != nil {
				t.Logf("Failed to generate unique security code: %v", err)
				return false
			}

			// Verify it's unique
			isUnique, err := lotteryService.IsSecurityCodeUnique(newCode)
			if err != nil {
				t.Logf("Failed to check uniqueness: %v", err)
				return false
			}

			if !isUnique {
				t.Logf("Generated code is not unique: %s", newCode)
				return false
			}

			return true
		},
		gen.IntRange(0, 20), // 0-20 existing codes
	))

	// Property: IsSecurityCodeUnique correctly identifies existing codes
	properties.Property("IsSecurityCodeUnique correctly identifies existing codes", prop.ForAll(
		func(_ int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			// Create a user and lottery type
			user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			lotteryType := model.LotteryType{
				Name:     "Test Lottery",
				Price:    10,
				MaxPrize: 100,
				GameType: model.GameTypeNumberMatch,
				Status:   model.LotteryTypeStatusAvailable,
			}
			if err := db.Create(&lotteryType).Error; err != nil {
				t.Logf("Failed to create lottery type: %v", err)
				return false
			}

			// Generate and store a code
			existingCode, _ := lotteryService.GenerateSecurityCode()
			ticket := model.Ticket{
				UserID:        user.ID,
				LotteryTypeID: lotteryType.ID,
				SecurityCode:  existingCode,
				Status:        model.TicketStatusUnscratched,
			}
			if err := db.Create(&ticket).Error; err != nil {
				t.Logf("Failed to create ticket: %v", err)
				return false
			}

			// Check existing code - should NOT be unique
			isUnique, err := lotteryService.IsSecurityCodeUnique(existingCode)
			if err != nil {
				t.Logf("Failed to check uniqueness: %v", err)
				return false
			}
			if isUnique {
				t.Logf("Existing code incorrectly marked as unique: %s", existingCode)
				return false
			}

			// Generate new code - should be unique
			newCode, _ := lotteryService.GenerateSecurityCode()
			isUnique, err = lotteryService.IsSecurityCodeUnique(newCode)
			if err != nil {
				t.Logf("Failed to check uniqueness: %v", err)
				return false
			}
			if !isUnique {
				t.Logf("New code incorrectly marked as not unique: %s", newCode)
				return false
			}

			return true
		},
		gen.IntRange(1, 100),
	))

	properties.TestingRun(t)
}


// Property 6: 彩票内容加密存储
// For any stored ticket data, the winning result must be stored in encrypted form,
// and the original content cannot be directly read from the database.
// **Validates: Requirements 8.4**

func TestProperty6_TicketContentEncryptedStorage(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Property: Encrypted content is different from original JSON
	properties.Property("encrypted content differs from original JSON", prop.ForAll(
		func(prizeLevel, prizeAmount int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			content := &TicketContent{
				PrizeLevel:  prizeLevel,
				PrizeAmount: prizeAmount,
				WinSymbols:  []string{"A", "B", "C"},
			}

			encrypted, err := lotteryService.EncryptTicketContent(content)
			if err != nil {
				t.Logf("Failed to encrypt content: %v", err)
				return false
			}

			// Encrypted content should not contain plain text prize info
			if encrypted == "" {
				t.Log("Encrypted content is empty")
				return false
			}

			// Check that encrypted content doesn't contain obvious plain text
			originalJSON := `"prize_level":`
			if len(encrypted) > 0 && encrypted[0] == '{' {
				t.Log("Encrypted content appears to be plain JSON")
				return false
			}

			// Encrypted content should be base64 encoded
			if len(encrypted) < 20 {
				t.Log("Encrypted content is too short")
				return false
			}

			// Should not contain the original JSON structure
			if contains(encrypted, originalJSON) {
				t.Log("Encrypted content contains plain text JSON")
				return false
			}

			return true
		},
		gen.IntRange(0, 10),   // prizeLevel
		gen.IntRange(0, 1000), // prizeAmount
	))

	// Property: Encryption is reversible (round-trip)
	properties.Property("encryption round-trip preserves content", prop.ForAll(
		func(prizeLevel, prizeAmount int, symbols []string) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			original := &TicketContent{
				PrizeLevel:  prizeLevel,
				PrizeAmount: prizeAmount,
				WinSymbols:  symbols,
			}

			encrypted, err := lotteryService.EncryptTicketContent(original)
			if err != nil {
				t.Logf("Failed to encrypt content: %v", err)
				return false
			}

			decrypted, err := lotteryService.DecryptTicketContent(encrypted)
			if err != nil {
				t.Logf("Failed to decrypt content: %v", err)
				return false
			}

			if decrypted.PrizeLevel != original.PrizeLevel {
				t.Logf("PrizeLevel mismatch: got %d, want %d", decrypted.PrizeLevel, original.PrizeLevel)
				return false
			}

			if decrypted.PrizeAmount != original.PrizeAmount {
				t.Logf("PrizeAmount mismatch: got %d, want %d", decrypted.PrizeAmount, original.PrizeAmount)
				return false
			}

			if len(decrypted.WinSymbols) != len(original.WinSymbols) {
				t.Logf("WinSymbols length mismatch: got %d, want %d", len(decrypted.WinSymbols), len(original.WinSymbols))
				return false
			}

			for i, s := range original.WinSymbols {
				if i < len(decrypted.WinSymbols) && decrypted.WinSymbols[i] != s {
					t.Logf("WinSymbol mismatch at %d: got %s, want %s", i, decrypted.WinSymbols[i], s)
					return false
				}
			}

			return true
		},
		gen.IntRange(0, 10),
		gen.IntRange(0, 1000),
		gen.SliceOf(gen.AlphaString().Map(func(s string) string {
			if len(s) > 5 {
				return s[:5]
			}
			if s == "" {
				return "X"
			}
			return s
		})),
	))

	// Property: Same content encrypted twice produces different ciphertext (due to random IV)
	properties.Property("same content produces different ciphertext each time", prop.ForAll(
		func(prizeLevel, prizeAmount int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			content := &TicketContent{
				PrizeLevel:  prizeLevel,
				PrizeAmount: prizeAmount,
			}

			encrypted1, err := lotteryService.EncryptTicketContent(content)
			if err != nil {
				t.Logf("Failed to encrypt content first time: %v", err)
				return false
			}

			encrypted2, err := lotteryService.EncryptTicketContent(content)
			if err != nil {
				t.Logf("Failed to encrypt content second time: %v", err)
				return false
			}

			// Due to random IV, same content should produce different ciphertext
			if encrypted1 == encrypted2 {
				t.Log("Same content produced identical ciphertext")
				return false
			}

			return true
		},
		gen.IntRange(0, 10),
		gen.IntRange(0, 1000),
	))

	// Property: Decryption with wrong key fails
	properties.Property("decryption with wrong key fails", prop.ForAll(
		func(prizeLevel, prizeAmount int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)
			wrongKeyService := NewLotteryService(db, "wrong-key-32-bytes-for-testing!!")

			content := &TicketContent{
				PrizeLevel:  prizeLevel,
				PrizeAmount: prizeAmount,
			}

			encrypted, err := lotteryService.EncryptTicketContent(content)
			if err != nil {
				t.Logf("Failed to encrypt content: %v", err)
				return false
			}

			// Try to decrypt with wrong key - should fail
			_, err = wrongKeyService.DecryptTicketContent(encrypted)
			if err == nil {
				t.Log("Decryption with wrong key should have failed")
				return false
			}

			return true
		},
		gen.IntRange(0, 10),
		gen.IntRange(0, 1000),
	))

	// Property: Ticket stored in database has encrypted content
	properties.Property("ticket in database has encrypted content", prop.ForAll(
		func(_ int) bool {
			db := setupLotteryTestDB(t)
			lotteryService := NewLotteryService(db, testEncryptionKey)

			// Create user, lottery type, and prize pool
			user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			lotteryType := model.LotteryType{
				Name:     "Test Lottery",
				Price:    10,
				MaxPrize: 100,
				GameType: model.GameTypeNumberMatch,
				Status:   model.LotteryTypeStatusAvailable,
			}
			if err := db.Create(&lotteryType).Error; err != nil {
				t.Logf("Failed to create lottery type: %v", err)
				return false
			}

			prizePool := model.PrizePool{
				LotteryTypeID: lotteryType.ID,
				TotalTickets:  100,
				SoldTickets:   0,
				Status:        model.PrizePoolStatusActive,
			}
			if err := db.Create(&prizePool).Error; err != nil {
				t.Logf("Failed to create prize pool: %v", err)
				return false
			}

			// Generate a ticket
			ticket, err := lotteryService.GenerateTicket(user.ID, lotteryType.ID)
			if err != nil {
				t.Logf("Failed to generate ticket: %v", err)
				return false
			}

			// Retrieve ticket from database
			var dbTicket model.Ticket
			if err := db.First(&dbTicket, ticket.ID).Error; err != nil {
				t.Logf("Failed to retrieve ticket: %v", err)
				return false
			}

			// Verify content is encrypted (not plain JSON)
			if dbTicket.ContentEncrypted == "" {
				t.Log("Ticket content is empty")
				return false
			}

			// Should not start with '{' (plain JSON)
			if len(dbTicket.ContentEncrypted) > 0 && dbTicket.ContentEncrypted[0] == '{' {
				t.Log("Ticket content appears to be plain JSON")
				return false
			}

			// Should be able to decrypt it
			content, err := lotteryService.DecryptTicketContent(dbTicket.ContentEncrypted)
			if err != nil {
				t.Logf("Failed to decrypt ticket content: %v", err)
				return false
			}

			// Decrypted content should have valid structure
			if content.PrizeAmount < 0 {
				t.Log("Decrypted content has invalid prize amount")
				return false
			}

			return true
		},
		gen.IntRange(1, 100),
	))

	properties.TestingRun(t)
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}


// Property 3: 购买余额验证
// For any ticket purchase request, if the user's balance is less than the ticket price,
// the purchase must be rejected and the balance must remain unchanged.
// **Validates: Requirements 3.1, 3.2**

func TestProperty3_PurchaseBalanceVerification(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Helper to setup test environment with user, wallet, lottery type, and prize pool
	setupPurchaseTest := func(initialBalance, ticketPrice int) (*gorm.DB, *PurchaseService, uint, uint, error) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if err != nil {
			return nil, nil, 0, 0, err
		}

		err = db.AutoMigrate(
			&model.User{},
			&model.Wallet{},
			&model.Transaction{},
			&model.LotteryType{},
			&model.PrizeLevel{},
			&model.PrizePool{},
			&model.Ticket{},
		)
		if err != nil {
			return nil, nil, 0, 0, err
		}

		walletService := NewWalletService(db)
		lotteryService := NewLotteryService(db, testEncryptionKey)
		purchaseService := NewPurchaseService(db, lotteryService, walletService)

		// Create user
		user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
		if err := db.Create(&user).Error; err != nil {
			return nil, nil, 0, 0, err
		}

		// Create wallet with specific balance
		wallet := model.Wallet{UserID: user.ID, Balance: initialBalance}
		if err := db.Create(&wallet).Error; err != nil {
			return nil, nil, 0, 0, err
		}

		// Create lottery type
		lotteryType := model.LotteryType{
			Name:     "Test Lottery",
			Price:    ticketPrice,
			MaxPrize: 100,
			GameType: model.GameTypeNumberMatch,
			Status:   model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lotteryType).Error; err != nil {
			return nil, nil, 0, 0, err
		}

		// Create prize pool
		prizePool := model.PrizePool{
			LotteryTypeID: lotteryType.ID,
			TotalTickets:  100,
			SoldTickets:   0,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&prizePool).Error; err != nil {
			return nil, nil, 0, 0, err
		}

		return db, purchaseService, user.ID, lotteryType.ID, nil
	}

	// Property: Purchase with insufficient balance is rejected
	properties.Property("purchase with insufficient balance is rejected", prop.ForAll(
		func(balance, price int) bool {
			// Ensure balance < price
			if balance >= price {
				balance = price - 1
			}
			if balance < 0 {
				balance = 0
			}
			if price <= 0 {
				price = 10
			}

			db, purchaseService, userID, lotteryTypeID, err := setupPurchaseTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Attempt purchase
			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			_, err = purchaseService.PurchaseTickets(userID, req)
			if err == nil {
				t.Log("Purchase should have been rejected due to insufficient balance")
				return false
			}

			if err != ErrInsufficientBalance {
				t.Logf("Expected ErrInsufficientBalance, got: %v", err)
				return false
			}

			// Verify balance unchanged
			walletService := NewWalletService(db)
			currentBalance, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance: %v", err)
				return false
			}

			if currentBalance != balance {
				t.Logf("Balance changed after rejected purchase: got %d, want %d", currentBalance, balance)
				return false
			}

			return true
		},
		gen.IntRange(0, 100),  // balance
		gen.IntRange(10, 200), // price
	))

	// Property: Purchase with exact balance succeeds
	properties.Property("purchase with exact balance succeeds", prop.ForAll(
		func(price int) bool {
			if price <= 0 {
				price = 10
			}

			db, purchaseService, userID, lotteryTypeID, err := setupPurchaseTest(price, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			resp, err := purchaseService.PurchaseTickets(userID, req)
			if err != nil {
				t.Logf("Purchase with exact balance should succeed: %v", err)
				return false
			}

			// Verify balance is now 0
			if resp.Balance != 0 {
				t.Logf("Balance after exact purchase should be 0, got %d", resp.Balance)
				return false
			}

			// Verify ticket was created
			if len(resp.Tickets) != 1 {
				t.Logf("Expected 1 ticket, got %d", len(resp.Tickets))
				return false
			}

			// Verify in database
			walletService := NewWalletService(db)
			currentBalance, _ := walletService.GetBalance(userID)
			if currentBalance != 0 {
				t.Logf("Database balance should be 0, got %d", currentBalance)
				return false
			}

			return true
		},
		gen.IntRange(10, 100),
	))

	// Property: Purchase with sufficient balance succeeds
	properties.Property("purchase with sufficient balance succeeds", prop.ForAll(
		func(balance, price int) bool {
			// Ensure balance > price
			if balance <= price {
				balance = price + 50
			}
			if price <= 0 {
				price = 10
			}

			db, purchaseService, userID, lotteryTypeID, err := setupPurchaseTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			resp, err := purchaseService.PurchaseTickets(userID, req)
			if err != nil {
				t.Logf("Purchase with sufficient balance should succeed: %v", err)
				return false
			}

			expectedBalance := balance - price
			if resp.Balance != expectedBalance {
				t.Logf("Balance mismatch: got %d, want %d", resp.Balance, expectedBalance)
				return false
			}

			// Verify in database
			walletService := NewWalletService(db)
			currentBalance, _ := walletService.GetBalance(userID)
			if currentBalance != expectedBalance {
				t.Logf("Database balance mismatch: got %d, want %d", currentBalance, expectedBalance)
				return false
			}

			return true
		},
		gen.IntRange(50, 200), // balance
		gen.IntRange(10, 50),  // price
	))

	// Property: Multiple ticket purchase requires sufficient balance for all
	properties.Property("multiple ticket purchase requires balance for all tickets", prop.ForAll(
		func(balance, price, quantity int) bool {
			if price <= 0 {
				price = 10
			}
			if quantity <= 0 || quantity > 10 {
				quantity = 2
			}

			totalCost := price * quantity

			// Test case: balance < total cost
			if balance >= totalCost {
				balance = totalCost - 1
			}
			if balance < 0 {
				balance = 0
			}

			db, purchaseService, userID, lotteryTypeID, err := setupPurchaseTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      quantity,
			}

			_, err = purchaseService.PurchaseTickets(userID, req)
			if err == nil {
				t.Log("Purchase should have been rejected")
				return false
			}

			// Verify balance unchanged
			walletService := NewWalletService(db)
			currentBalance, _ := walletService.GetBalance(userID)
			if currentBalance != balance {
				t.Logf("Balance changed after rejected purchase: got %d, want %d", currentBalance, balance)
				return false
			}

			return true
		},
		gen.IntRange(0, 100),
		gen.IntRange(10, 50),
		gen.IntRange(2, 5),
	))

	// Property: ValidatePurchase correctly predicts purchase outcome for insufficient balance
	properties.Property("ValidatePurchase correctly rejects insufficient balance", prop.ForAll(
		func(balance, price int) bool {
			if price <= 0 {
				price = 10
			}
			// Ensure insufficient balance
			if balance >= price {
				balance = price - 1
			}
			if balance < 0 {
				balance = 0
			}

			_, purchaseService, userID, lotteryTypeID, err := setupPurchaseTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			validateErr := purchaseService.ValidatePurchase(userID, req)

			// Validation should fail for insufficient balance
			if validateErr == nil {
				t.Log("Validation should have failed for insufficient balance")
				return false
			}

			if validateErr != ErrInsufficientBalance {
				t.Logf("Expected ErrInsufficientBalance, got: %v", validateErr)
				return false
			}

			return true
		},
		gen.IntRange(0, 100),
		gen.IntRange(10, 200),
	))

	properties.TestingRun(t)
}


// Property 4: 购买交易一致性
// For any successful ticket purchase, the user's wallet balance decrease must equal
// the ticket price, and a corresponding transaction record must be generated.
// **Validates: Requirements 3.3**

func TestProperty4_PurchaseTransactionConsistency(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Helper to setup test environment
	setupTransactionTest := func(initialBalance, ticketPrice int) (*gorm.DB, *PurchaseService, *WalletService, uint, uint, error) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if err != nil {
			return nil, nil, nil, 0, 0, err
		}

		err = db.AutoMigrate(
			&model.User{},
			&model.Wallet{},
			&model.Transaction{},
			&model.LotteryType{},
			&model.PrizeLevel{},
			&model.PrizePool{},
			&model.Ticket{},
		)
		if err != nil {
			return nil, nil, nil, 0, 0, err
		}

		walletService := NewWalletService(db)
		lotteryService := NewLotteryService(db, testEncryptionKey)
		purchaseService := NewPurchaseService(db, lotteryService, walletService)

		// Create user
		user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
		if err := db.Create(&user).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create wallet with specific balance
		wallet := model.Wallet{UserID: user.ID, Balance: initialBalance}
		if err := db.Create(&wallet).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create lottery type
		lotteryType := model.LotteryType{
			Name:     "Test Lottery",
			Price:    ticketPrice,
			MaxPrize: 100,
			GameType: model.GameTypeNumberMatch,
			Status:   model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lotteryType).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create prize pool
		prizePool := model.PrizePool{
			LotteryTypeID: lotteryType.ID,
			TotalTickets:  100,
			SoldTickets:   0,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&prizePool).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		return db, purchaseService, walletService, user.ID, lotteryType.ID, nil
	}

	// Property: Balance decrease equals ticket price
	properties.Property("balance decrease equals ticket price", prop.ForAll(
		func(balance, price int) bool {
			// Ensure sufficient balance
			if balance < price {
				balance = price + 50
			}
			if price <= 0 {
				price = 10
			}

			db, purchaseService, walletService, userID, lotteryTypeID, err := setupTransactionTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Get initial balance
			initialBalance, _ := walletService.GetBalance(userID)

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			resp, err := purchaseService.PurchaseTickets(userID, req)
			if err != nil {
				t.Logf("Purchase failed: %v", err)
				return false
			}

			// Verify balance decrease equals price
			balanceDecrease := initialBalance - resp.Balance
			if balanceDecrease != price {
				t.Logf("Balance decrease mismatch: got %d, want %d", balanceDecrease, price)
				return false
			}

			// Verify in database
			dbBalance, _ := walletService.GetBalance(userID)
			if dbBalance != resp.Balance {
				t.Logf("Database balance mismatch: got %d, want %d", dbBalance, resp.Balance)
				return false
			}

			// Verify cost in response
			if resp.Cost != price {
				t.Logf("Response cost mismatch: got %d, want %d", resp.Cost, price)
				return false
			}

			_ = db // suppress unused warning
			return true
		},
		gen.IntRange(50, 200),
		gen.IntRange(10, 50),
	))

	// Property: Transaction record is created for purchase
	properties.Property("transaction record is created for purchase", prop.ForAll(
		func(balance, price int) bool {
			if balance < price {
				balance = price + 50
			}
			if price <= 0 {
				price = 10
			}

			db, purchaseService, _, userID, lotteryTypeID, err := setupTransactionTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Count transactions before purchase
			var countBefore int64
			db.Model(&model.Transaction{}).Count(&countBefore)

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			_, err = purchaseService.PurchaseTickets(userID, req)
			if err != nil {
				t.Logf("Purchase failed: %v", err)
				return false
			}

			// Count transactions after purchase
			var countAfter int64
			db.Model(&model.Transaction{}).Count(&countAfter)

			// Should have one new transaction
			if countAfter != countBefore+1 {
				t.Logf("Transaction count mismatch: before=%d, after=%d", countBefore, countAfter)
				return false
			}

			// Verify transaction details
			var transaction model.Transaction
			if err := db.Where("type = ?", model.TransactionTypePurchase).Order("created_at DESC").First(&transaction).Error; err != nil {
				t.Logf("Failed to find purchase transaction: %v", err)
				return false
			}

			// Transaction amount should be negative (debit)
			expectedAmount := -price
			if transaction.Amount != expectedAmount {
				t.Logf("Transaction amount mismatch: got %d, want %d", transaction.Amount, expectedAmount)
				return false
			}

			// Transaction type should be purchase
			if transaction.Type != model.TransactionTypePurchase {
				t.Logf("Transaction type mismatch: got %s, want %s", transaction.Type, model.TransactionTypePurchase)
				return false
			}

			return true
		},
		gen.IntRange(50, 200),
		gen.IntRange(10, 50),
	))

	// Property: Multiple ticket purchase creates correct transaction
	properties.Property("multiple ticket purchase creates correct transaction", prop.ForAll(
		func(balance, price, quantity int) bool {
			if price <= 0 {
				price = 10
			}
			if quantity <= 0 || quantity > 5 {
				quantity = 2
			}

			totalCost := price * quantity
			if balance < totalCost {
				balance = totalCost + 50
			}

			db, purchaseService, walletService, userID, lotteryTypeID, err := setupTransactionTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			initialBalance, _ := walletService.GetBalance(userID)

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      quantity,
			}

			resp, err := purchaseService.PurchaseTickets(userID, req)
			if err != nil {
				t.Logf("Purchase failed: %v", err)
				return false
			}

			// Verify total cost
			if resp.Cost != totalCost {
				t.Logf("Total cost mismatch: got %d, want %d", resp.Cost, totalCost)
				return false
			}

			// Verify balance decrease
			balanceDecrease := initialBalance - resp.Balance
			if balanceDecrease != totalCost {
				t.Logf("Balance decrease mismatch: got %d, want %d", balanceDecrease, totalCost)
				return false
			}

			// Verify correct number of tickets
			if len(resp.Tickets) != quantity {
				t.Logf("Ticket count mismatch: got %d, want %d", len(resp.Tickets), quantity)
				return false
			}

			// Verify transaction amount
			var transaction model.Transaction
			if err := db.Where("type = ?", model.TransactionTypePurchase).Order("created_at DESC").First(&transaction).Error; err != nil {
				t.Logf("Failed to find purchase transaction: %v", err)
				return false
			}

			expectedAmount := -totalCost
			if transaction.Amount != expectedAmount {
				t.Logf("Transaction amount mismatch: got %d, want %d", transaction.Amount, expectedAmount)
				return false
			}

			return true
		},
		gen.IntRange(100, 500),
		gen.IntRange(10, 50),
		gen.IntRange(1, 5),
	))

	// Property: Ticket is created and associated with user
	properties.Property("ticket is created and associated with user", prop.ForAll(
		func(balance, price int) bool {
			if balance < price {
				balance = price + 50
			}
			if price <= 0 {
				price = 10
			}

			db, purchaseService, _, userID, lotteryTypeID, err := setupTransactionTest(balance, price)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			req := PurchaseRequest{
				LotteryTypeID: lotteryTypeID,
				Quantity:      1,
			}

			resp, err := purchaseService.PurchaseTickets(userID, req)
			if err != nil {
				t.Logf("Purchase failed: %v", err)
				return false
			}

			// Verify ticket in response
			if len(resp.Tickets) != 1 {
				t.Logf("Expected 1 ticket, got %d", len(resp.Tickets))
				return false
			}

			ticket := resp.Tickets[0]

			// Verify ticket is associated with user
			if ticket.UserID != userID {
				t.Logf("Ticket user ID mismatch: got %d, want %d", ticket.UserID, userID)
				return false
			}

			// Verify ticket is associated with lottery type
			if ticket.LotteryTypeID != lotteryTypeID {
				t.Logf("Ticket lottery type ID mismatch: got %d, want %d", ticket.LotteryTypeID, lotteryTypeID)
				return false
			}

			// Verify ticket exists in database
			var dbTicket model.Ticket
			if err := db.First(&dbTicket, ticket.ID).Error; err != nil {
				t.Logf("Ticket not found in database: %v", err)
				return false
			}

			// Verify ticket status is unscratched
			if dbTicket.Status != model.TicketStatusUnscratched {
				t.Logf("Ticket status mismatch: got %s, want %s", dbTicket.Status, model.TicketStatusUnscratched)
				return false
			}

			return true
		},
		gen.IntRange(50, 200),
		gen.IntRange(10, 50),
	))

	properties.TestingRun(t)
}


// Property 5: 中奖奖金发放
// For any scratched winning ticket, the user's wallet balance increase must equal
// the ticket's prize amount.
// **Validates: Requirements 4.5**

func TestProperty5_WinningPrizePayout(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Helper to setup test environment with a ticket that has a specific prize
	setupScratchTest := func(initialBalance, prizeAmount int) (*gorm.DB, *ScratchService, *WalletService, uint, uint, error) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if err != nil {
			return nil, nil, nil, 0, 0, err
		}

		err = db.AutoMigrate(
			&model.User{},
			&model.Wallet{},
			&model.Transaction{},
			&model.LotteryType{},
			&model.PrizeLevel{},
			&model.PrizePool{},
			&model.Ticket{},
		)
		if err != nil {
			return nil, nil, nil, 0, 0, err
		}

		walletService := NewWalletService(db)
		lotteryService := NewLotteryService(db, testEncryptionKey)
		scratchService := NewScratchService(db, lotteryService, walletService)

		// Create user
		user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
		if err := db.Create(&user).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create wallet with specific balance
		wallet := model.Wallet{UserID: user.ID, Balance: initialBalance}
		if err := db.Create(&wallet).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create lottery type
		lotteryType := model.LotteryType{
			Name:     "Test Lottery",
			Price:    10,
			MaxPrize: 1000,
			GameType: model.GameTypeNumberMatch,
			Status:   model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lotteryType).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create prize pool
		prizePool := model.PrizePool{
			LotteryTypeID: lotteryType.ID,
			TotalTickets:  100,
			SoldTickets:   1,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&prizePool).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create ticket content and encrypt it
		content := &TicketContent{
			PrizeLevel:  1,
			PrizeAmount: prizeAmount,
		}
		encryptedContent, err := lotteryService.EncryptTicketContent(content)
		if err != nil {
			return nil, nil, nil, 0, 0, err
		}

		// Create ticket with specific prize
		securityCode, _ := lotteryService.GenerateSecurityCode()
		ticket := model.Ticket{
			UserID:           user.ID,
			LotteryTypeID:    lotteryType.ID,
			PrizePoolID:      prizePool.ID,
			SecurityCode:     securityCode,
			ContentEncrypted: encryptedContent,
			PrizeAmount:      prizeAmount,
			Status:           model.TicketStatusUnscratched,
		}
		if err := db.Create(&ticket).Error; err != nil {
			return nil, nil, nil, 0, 0, err
		}

		return db, scratchService, walletService, user.ID, ticket.ID, nil
	}

	// Property: Winning ticket scratch increases balance by prize amount
	properties.Property("winning ticket scratch increases balance by prize amount", prop.ForAll(
		func(initialBalance, prizeAmount int) bool {
			if initialBalance < 0 {
				initialBalance = 0
			}
			if prizeAmount <= 0 {
				prizeAmount = 100
			}

			db, scratchService, walletService, userID, ticketID, err := setupScratchTest(initialBalance, prizeAmount)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Get balance before scratch
			balanceBefore, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance before: %v", err)
				return false
			}

			// Scratch the ticket
			resp, err := scratchService.ScratchTicket(userID, ticketID)
			if err != nil {
				t.Logf("Scratch failed: %v", err)
				return false
			}

			// Verify response indicates win
			if !resp.IsWin {
				t.Log("Response should indicate win")
				return false
			}

			// Verify prize amount in response
			if resp.PrizeAmount != prizeAmount {
				t.Logf("Prize amount mismatch: got %d, want %d", resp.PrizeAmount, prizeAmount)
				return false
			}

			// Verify balance increase equals prize amount
			balanceIncrease := resp.NewBalance - balanceBefore
			if balanceIncrease != prizeAmount {
				t.Logf("Balance increase mismatch: got %d, want %d", balanceIncrease, prizeAmount)
				return false
			}

			// Verify in database
			dbBalance, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get database balance: %v", err)
				return false
			}

			expectedBalance := initialBalance + prizeAmount
			if dbBalance != expectedBalance {
				t.Logf("Database balance mismatch: got %d, want %d", dbBalance, expectedBalance)
				return false
			}

			_ = db // suppress unused warning
			return true
		},
		gen.IntRange(0, 500),   // initialBalance
		gen.IntRange(10, 1000), // prizeAmount
	))

	// Property: Non-winning ticket scratch does not change balance
	properties.Property("non-winning ticket scratch does not change balance", prop.ForAll(
		func(initialBalance int) bool {
			if initialBalance < 0 {
				initialBalance = 50
			}

			// Setup with prize amount = 0 (non-winning)
			db, scratchService, walletService, userID, ticketID, err := setupScratchTest(initialBalance, 0)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Get balance before scratch
			balanceBefore, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance before: %v", err)
				return false
			}

			// Scratch the ticket
			resp, err := scratchService.ScratchTicket(userID, ticketID)
			if err != nil {
				t.Logf("Scratch failed: %v", err)
				return false
			}

			// Verify response indicates no win
			if resp.IsWin {
				t.Log("Response should indicate no win")
				return false
			}

			// Verify prize amount is 0
			if resp.PrizeAmount != 0 {
				t.Logf("Prize amount should be 0, got %d", resp.PrizeAmount)
				return false
			}

			// Verify balance unchanged
			if resp.NewBalance != balanceBefore {
				t.Logf("Balance should be unchanged: got %d, want %d", resp.NewBalance, balanceBefore)
				return false
			}

			// Verify in database
			dbBalance, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get database balance: %v", err)
				return false
			}

			if dbBalance != initialBalance {
				t.Logf("Database balance should be unchanged: got %d, want %d", dbBalance, initialBalance)
				return false
			}

			_ = db // suppress unused warning
			return true
		},
		gen.IntRange(0, 500),
	))

	// Property: Win transaction record is created for winning ticket
	properties.Property("win transaction record is created for winning ticket", prop.ForAll(
		func(initialBalance, prizeAmount int) bool {
			if initialBalance < 0 {
				initialBalance = 50
			}
			if prizeAmount <= 0 {
				prizeAmount = 100
			}

			db, scratchService, _, userID, ticketID, err := setupScratchTest(initialBalance, prizeAmount)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Count win transactions before scratch
			var countBefore int64
			db.Model(&model.Transaction{}).Where("type = ?", model.TransactionTypeWin).Count(&countBefore)

			// Scratch the ticket
			_, err = scratchService.ScratchTicket(userID, ticketID)
			if err != nil {
				t.Logf("Scratch failed: %v", err)
				return false
			}

			// Count win transactions after scratch
			var countAfter int64
			db.Model(&model.Transaction{}).Where("type = ?", model.TransactionTypeWin).Count(&countAfter)

			// Should have one new win transaction
			if countAfter != countBefore+1 {
				t.Logf("Win transaction count mismatch: before=%d, after=%d", countBefore, countAfter)
				return false
			}

			// Verify transaction details
			var transaction model.Transaction
			if err := db.Where("type = ?", model.TransactionTypeWin).Order("created_at DESC").First(&transaction).Error; err != nil {
				t.Logf("Failed to find win transaction: %v", err)
				return false
			}

			// Transaction amount should be positive (credit)
			if transaction.Amount != prizeAmount {
				t.Logf("Transaction amount mismatch: got %d, want %d", transaction.Amount, prizeAmount)
				return false
			}

			// Transaction reference should be ticket ID
			if transaction.ReferenceID != ticketID {
				t.Logf("Transaction reference mismatch: got %d, want %d", transaction.ReferenceID, ticketID)
				return false
			}

			return true
		},
		gen.IntRange(0, 500),
		gen.IntRange(10, 1000),
	))

	// Property: Ticket status changes to scratched after scratch
	properties.Property("ticket status changes to scratched after scratch", prop.ForAll(
		func(initialBalance, prizeAmount int) bool {
			if initialBalance < 0 {
				initialBalance = 50
			}
			if prizeAmount < 0 {
				prizeAmount = 0
			}

			db, scratchService, _, userID, ticketID, err := setupScratchTest(initialBalance, prizeAmount)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Verify ticket is unscratched before
			var ticketBefore model.Ticket
			if err := db.First(&ticketBefore, ticketID).Error; err != nil {
				t.Logf("Failed to get ticket before: %v", err)
				return false
			}
			if ticketBefore.Status != model.TicketStatusUnscratched {
				t.Logf("Ticket should be unscratched before: got %s", ticketBefore.Status)
				return false
			}

			// Scratch the ticket
			resp, err := scratchService.ScratchTicket(userID, ticketID)
			if err != nil {
				t.Logf("Scratch failed: %v", err)
				return false
			}

			// Verify response status
			if resp.Status != model.TicketStatusScratched {
				t.Logf("Response status mismatch: got %s, want %s", resp.Status, model.TicketStatusScratched)
				return false
			}

			// Verify in database
			var ticketAfter model.Ticket
			if err := db.First(&ticketAfter, ticketID).Error; err != nil {
				t.Logf("Failed to get ticket after: %v", err)
				return false
			}
			if ticketAfter.Status != model.TicketStatusScratched {
				t.Logf("Database ticket status mismatch: got %s, want %s", ticketAfter.Status, model.TicketStatusScratched)
				return false
			}

			// Verify scratched_at is set
			if ticketAfter.ScratchedAt == nil {
				t.Log("ScratchedAt should be set")
				return false
			}

			return true
		},
		gen.IntRange(0, 500),
		gen.IntRange(0, 1000),
	))

	// Property: Already scratched ticket cannot be scratched again
	properties.Property("already scratched ticket cannot be scratched again", prop.ForAll(
		func(initialBalance, prizeAmount int) bool {
			if initialBalance < 0 {
				initialBalance = 50
			}
			if prizeAmount < 0 {
				prizeAmount = 100
			}

			_, scratchService, walletService, userID, ticketID, err := setupScratchTest(initialBalance, prizeAmount)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// First scratch
			_, err = scratchService.ScratchTicket(userID, ticketID)
			if err != nil {
				t.Logf("First scratch failed: %v", err)
				return false
			}

			// Get balance after first scratch
			balanceAfterFirst, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance after first scratch: %v", err)
				return false
			}

			// Try to scratch again
			_, err = scratchService.ScratchTicket(userID, ticketID)
			if err == nil {
				t.Log("Second scratch should have failed")
				return false
			}

			if err != ErrTicketAlreadyScratched {
				t.Logf("Expected ErrTicketAlreadyScratched, got: %v", err)
				return false
			}

			// Verify balance unchanged after failed second scratch
			balanceAfterSecond, err := walletService.GetBalance(userID)
			if err != nil {
				t.Logf("Failed to get balance after second scratch: %v", err)
				return false
			}

			if balanceAfterSecond != balanceAfterFirst {
				t.Logf("Balance should be unchanged after failed scratch: got %d, want %d", balanceAfterSecond, balanceAfterFirst)
				return false
			}

			return true
		},
		gen.IntRange(0, 500),
		gen.IntRange(0, 1000),
	))

	// Property: User cannot scratch another user's ticket
	properties.Property("user cannot scratch another user's ticket", prop.ForAll(
		func(initialBalance, prizeAmount int) bool {
			if initialBalance < 0 {
				initialBalance = 50
			}
			if prizeAmount < 0 {
				prizeAmount = 100
			}

			db, scratchService, _, _, ticketID, err := setupScratchTest(initialBalance, prizeAmount)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Create another user
			otherUser := model.User{LinuxdoID: "other_user", Username: "Other", Role: "user"}
			if err := db.Create(&otherUser).Error; err != nil {
				t.Logf("Failed to create other user: %v", err)
				return false
			}

			// Try to scratch with other user
			_, err = scratchService.ScratchTicket(otherUser.ID, ticketID)
			if err == nil {
				t.Log("Scratch by other user should have failed")
				return false
			}

			if err != ErrTicketNotOwned {
				t.Logf("Expected ErrTicketNotOwned, got: %v", err)
				return false
			}

			// Verify ticket is still unscratched
			var ticket model.Ticket
			if err := db.First(&ticket, ticketID).Error; err != nil {
				t.Logf("Failed to get ticket: %v", err)
				return false
			}

			if ticket.Status != model.TicketStatusUnscratched {
				t.Logf("Ticket should still be unscratched: got %s", ticket.Status)
				return false
			}

			return true
		},
		gen.IntRange(0, 500),
		gen.IntRange(0, 1000),
	))

	properties.TestingRun(t)
}


// Property 7: 保安码查询信息隐藏
// For any unscratched ticket, querying by security code should not return prize information.
// **Validates: Requirements 7.4**

func TestProperty7_SecurityCodeQueryInfoHiding(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Helper to setup test environment with a ticket
	setupVerifyTest := func(prizeAmount int, scratched bool) (*gorm.DB, *LotteryService, string, error) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if err != nil {
			return nil, nil, "", err
		}

		err = db.AutoMigrate(
			&model.User{},
			&model.Wallet{},
			&model.Transaction{},
			&model.LotteryType{},
			&model.PrizeLevel{},
			&model.PrizePool{},
			&model.Ticket{},
		)
		if err != nil {
			return nil, nil, "", err
		}

		lotteryService := NewLotteryService(db, testEncryptionKey)

		// Create user
		user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
		if err := db.Create(&user).Error; err != nil {
			return nil, nil, "", err
		}

		// Create lottery type
		lotteryType := model.LotteryType{
			Name:     "Test Lottery",
			Price:    10,
			MaxPrize: 1000,
			GameType: model.GameTypeNumberMatch,
			Status:   model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lotteryType).Error; err != nil {
			return nil, nil, "", err
		}

		// Create prize pool
		prizePool := model.PrizePool{
			LotteryTypeID: lotteryType.ID,
			TotalTickets:  100,
			SoldTickets:   0,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&prizePool).Error; err != nil {
			return nil, nil, "", err
		}

		// Generate security code
		securityCode, err := lotteryService.GenerateUniqueSecurityCode()
		if err != nil {
			return nil, nil, "", err
		}

		// Create ticket content
		content := &TicketContent{
			PrizeLevel:  1,
			PrizeAmount: prizeAmount,
		}
		encryptedContent, err := lotteryService.EncryptTicketContent(content)
		if err != nil {
			return nil, nil, "", err
		}

		// Determine ticket status
		status := model.TicketStatusUnscratched
		var scratchedAt *time.Time
		if scratched {
			status = model.TicketStatusScratched
			now := time.Now()
			scratchedAt = &now
		}

		// Create ticket
		ticket := model.Ticket{
			UserID:           user.ID,
			LotteryTypeID:    lotteryType.ID,
			PrizePoolID:      prizePool.ID,
			SecurityCode:     securityCode,
			ContentEncrypted: encryptedContent,
			PrizeAmount:      prizeAmount,
			Status:           status,
			PurchasedAt:      time.Now(),
			ScratchedAt:      scratchedAt,
		}
		if err := db.Create(&ticket).Error; err != nil {
			return nil, nil, "", err
		}

		return db, lotteryService, securityCode, nil
	}

	// Property: Unscratched ticket query does not return prize amount
	properties.Property("unscratched ticket query hides prize amount", prop.ForAll(
		func(prizeAmount int) bool {
			if prizeAmount < 0 {
				prizeAmount = 100
			}

			_, lotteryService, securityCode, err := setupVerifyTest(prizeAmount, false)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Query by security code
			result, err := lotteryService.VerifySecurityCode(securityCode)
			if err != nil {
				t.Logf("VerifySecurityCode failed: %v", err)
				return false
			}

			// Prize amount should be nil for unscratched ticket
			if result.PrizeAmount != nil {
				t.Logf("Prize amount should be hidden for unscratched ticket, got: %d", *result.PrizeAmount)
				return false
			}

			// ScratchedAt should be nil for unscratched ticket
			if result.ScratchedAt != nil {
				t.Log("ScratchedAt should be nil for unscratched ticket")
				return false
			}

			// Status should be unscratched
			if result.Status != string(model.TicketStatusUnscratched) {
				t.Logf("Status should be unscratched, got: %s", result.Status)
				return false
			}

			// Security code should be returned
			if result.SecurityCode != securityCode {
				t.Logf("Security code mismatch: got %s, want %s", result.SecurityCode, securityCode)
				return false
			}

			return true
		},
		gen.IntRange(0, 1000),
	))

	// Property: Scratched ticket query returns prize amount
	properties.Property("scratched ticket query shows prize amount", prop.ForAll(
		func(prizeAmount int) bool {
			if prizeAmount < 0 {
				prizeAmount = 100
			}

			_, lotteryService, securityCode, err := setupVerifyTest(prizeAmount, true)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Query by security code
			result, err := lotteryService.VerifySecurityCode(securityCode)
			if err != nil {
				t.Logf("VerifySecurityCode failed: %v", err)
				return false
			}

			// Prize amount should be visible for scratched ticket
			if result.PrizeAmount == nil {
				t.Log("Prize amount should be visible for scratched ticket")
				return false
			}

			if *result.PrizeAmount != prizeAmount {
				t.Logf("Prize amount mismatch: got %d, want %d", *result.PrizeAmount, prizeAmount)
				return false
			}

			// ScratchedAt should be set for scratched ticket
			if result.ScratchedAt == nil {
				t.Log("ScratchedAt should be set for scratched ticket")
				return false
			}

			// Status should be scratched
			if result.Status != string(model.TicketStatusScratched) {
				t.Logf("Status should be scratched, got: %s", result.Status)
				return false
			}

			return true
		},
		gen.IntRange(0, 1000),
	))

	// Property: Non-existent security code returns error
	properties.Property("non-existent security code returns error", prop.ForAll(
		func(_ int) bool {
			db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
				Logger: logger.Default.LogMode(logger.Silent),
			})
			if err != nil {
				t.Logf("Failed to open database: %v", err)
				return false
			}

			err = db.AutoMigrate(
				&model.User{},
				&model.Wallet{},
				&model.Transaction{},
				&model.LotteryType{},
				&model.PrizeLevel{},
				&model.PrizePool{},
				&model.Ticket{},
			)
			if err != nil {
				t.Logf("Failed to migrate: %v", err)
				return false
			}

			lotteryService := NewLotteryService(db, testEncryptionKey)

			// Generate a random security code that doesn't exist
			nonExistentCode, err := lotteryService.GenerateSecurityCode()
			if err != nil {
				t.Logf("Failed to generate code: %v", err)
				return false
			}

			// Query should return error
			_, err = lotteryService.VerifySecurityCode(nonExistentCode)
			if err == nil {
				t.Log("Query for non-existent code should return error")
				return false
			}

			if err != ErrTicketNotFound {
				t.Logf("Expected ErrTicketNotFound, got: %v", err)
				return false
			}

			return true
		},
		gen.IntRange(1, 100),
	))

	// Property: Invalid security code format returns error
	properties.Property("invalid security code format returns error", prop.ForAll(
		func(codeLen int) bool {
			// Generate code with invalid length (not 16)
			if codeLen == 16 {
				codeLen = 15 // Ensure it's not valid length
			}
			if codeLen < 1 {
				codeLen = 1
			}
			if codeLen > 32 {
				codeLen = 32
			}

			db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
				Logger: logger.Default.LogMode(logger.Silent),
			})
			if err != nil {
				t.Logf("Failed to open database: %v", err)
				return false
			}

			err = db.AutoMigrate(&model.Ticket{})
			if err != nil {
				t.Logf("Failed to migrate: %v", err)
				return false
			}

			lotteryService := NewLotteryService(db, testEncryptionKey)

			// Create invalid code
			invalidCode := ""
			for i := 0; i < codeLen; i++ {
				invalidCode += "A"
			}

			// Query should return error for invalid format
			_, err = lotteryService.VerifySecurityCode(invalidCode)
			if err == nil {
				t.Logf("Query for invalid code length %d should return error", codeLen)
				return false
			}

			if err != ErrInvalidSecurityCode {
				t.Logf("Expected ErrInvalidSecurityCode, got: %v", err)
				return false
			}

			return true
		},
		gen.IntRange(1, 32),
	))

	// Property: Query returns correct lottery type name
	properties.Property("query returns correct lottery type name", prop.ForAll(
		func(prizeAmount int) bool {
			if prizeAmount < 0 {
				prizeAmount = 100
			}

			_, lotteryService, securityCode, err := setupVerifyTest(prizeAmount, false)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			result, err := lotteryService.VerifySecurityCode(securityCode)
			if err != nil {
				t.Logf("VerifySecurityCode failed: %v", err)
				return false
			}

			// Lottery type name should be "Test Lottery" (from setup)
			if result.LotteryType != "Test Lottery" {
				t.Logf("Lottery type mismatch: got %s, want Test Lottery", result.LotteryType)
				return false
			}

			return true
		},
		gen.IntRange(0, 1000),
	))

	// Property: Query returns purchase time
	properties.Property("query returns purchase time", prop.ForAll(
		func(prizeAmount int) bool {
			if prizeAmount < 0 {
				prizeAmount = 100
			}

			_, lotteryService, securityCode, err := setupVerifyTest(prizeAmount, false)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			result, err := lotteryService.VerifySecurityCode(securityCode)
			if err != nil {
				t.Logf("VerifySecurityCode failed: %v", err)
				return false
			}

			// Purchase time should be set and recent
			if result.PurchaseTime.IsZero() {
				t.Log("Purchase time should be set")
				return false
			}

			// Purchase time should be within the last minute (test just created it)
			if time.Since(result.PurchaseTime) > time.Minute {
				t.Log("Purchase time should be recent")
				return false
			}

			return true
		},
		gen.IntRange(0, 1000),
	))

	properties.TestingRun(t)
}


// Property 12: 奖组彩票数量一致性
// For any prize pool, the total number of generated tickets must equal the configured
// issue quantity, and the number of tickets at each prize level must match the configuration.
// **Validates: Requirements 5.3**

func TestProperty12_PrizePoolTicketQuantityConsistency(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Helper to setup test environment with lottery type and prize levels
	setupPrizePoolTest := func(prizeLevels []PrizeLevelInput, totalTickets int) (*gorm.DB, *LotteryService, uint, error) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if err != nil {
			return nil, nil, 0, err
		}

		err = db.AutoMigrate(
			&model.User{},
			&model.Wallet{},
			&model.Transaction{},
			&model.LotteryType{},
			&model.PrizeLevel{},
			&model.PrizePool{},
			&model.Ticket{},
		)
		if err != nil {
			return nil, nil, 0, err
		}

		lotteryService := NewLotteryService(db, testEncryptionKey)

		// Create lottery type with prize levels
		req := CreateLotteryTypeRequest{
			Name:        "Test Lottery",
			Description: "Test lottery for property testing",
			Price:       10,
			MaxPrize:    1000,
			GameType:    model.GameTypeNumberMatch,
			PrizeLevels: prizeLevels,
		}

		lotteryType, err := lotteryService.CreateLotteryType(req)
		if err != nil {
			return nil, nil, 0, err
		}

		return db, lotteryService, lotteryType.ID, nil
	}

	// Property: Prize pool total tickets equals configured amount
	properties.Property("prize pool total tickets equals configured amount", prop.ForAll(
		func(totalTickets int) bool {
			if totalTickets <= 0 {
				totalTickets = 100
			}
			if totalTickets > 1000 {
				totalTickets = 1000
			}

			prizeLevels := []PrizeLevelInput{
				{Level: 1, Name: "一等奖", PrizeAmount: 1000, Quantity: totalTickets / 100},
				{Level: 2, Name: "二等奖", PrizeAmount: 100, Quantity: totalTickets / 20},
				{Level: 3, Name: "三等奖", PrizeAmount: 10, Quantity: totalTickets / 5},
			}

			// Ensure at least 1 for each level
			for i := range prizeLevels {
				if prizeLevels[i].Quantity < 1 {
					prizeLevels[i].Quantity = 1
				}
			}

			db, lotteryService, lotteryTypeID, err := setupPrizePoolTest(prizeLevels, totalTickets)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Create prize pool
			prizePoolReq := CreatePrizePoolRequest{
				LotteryTypeID: lotteryTypeID,
				TotalTickets:  totalTickets,
				ReturnRate:    0.5,
			}

			prizePool, err := lotteryService.CreatePrizePool(prizePoolReq)
			if err != nil {
				t.Logf("Failed to create prize pool: %v", err)
				return false
			}

			// Verify total tickets
			if prizePool.TotalTickets != totalTickets {
				t.Logf("Total tickets mismatch: got %d, want %d", prizePool.TotalTickets, totalTickets)
				return false
			}

			// Verify sold tickets starts at 0
			if prizePool.SoldTickets != 0 {
				t.Logf("Sold tickets should be 0, got %d", prizePool.SoldTickets)
				return false
			}

			// Verify prize pool status is active
			if prizePool.Status != model.PrizePoolStatusActive {
				t.Logf("Prize pool status should be active, got %s", prizePool.Status)
				return false
			}

			_ = db // suppress unused warning
			return true
		},
		gen.IntRange(50, 500),
	))

	// Property: Prize level quantities are preserved after creation
	properties.Property("prize level quantities are preserved after creation", prop.ForAll(
		func(level1Qty, level2Qty, level3Qty int) bool {
			// Ensure valid quantities
			if level1Qty < 1 {
				level1Qty = 1
			}
			if level2Qty < 1 {
				level2Qty = 1
			}
			if level3Qty < 1 {
				level3Qty = 1
			}
			if level1Qty > 50 {
				level1Qty = 50
			}
			if level2Qty > 100 {
				level2Qty = 100
			}
			if level3Qty > 200 {
				level3Qty = 200
			}

			prizeLevels := []PrizeLevelInput{
				{Level: 1, Name: "一等奖", PrizeAmount: 1000, Quantity: level1Qty},
				{Level: 2, Name: "二等奖", PrizeAmount: 100, Quantity: level2Qty},
				{Level: 3, Name: "三等奖", PrizeAmount: 10, Quantity: level3Qty},
			}

			totalTickets := (level1Qty + level2Qty + level3Qty) * 2 // Ensure enough non-winning tickets

			_, lotteryService, lotteryTypeID, err := setupPrizePoolTest(prizeLevels, totalTickets)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Get prize levels from database
			dbPrizeLevels, err := lotteryService.GetPrizeLevels(lotteryTypeID)
			if err != nil {
				t.Logf("Failed to get prize levels: %v", err)
				return false
			}

			// Verify prize level count
			if len(dbPrizeLevels) != 3 {
				t.Logf("Prize level count mismatch: got %d, want 3", len(dbPrizeLevels))
				return false
			}

			// Verify each prize level quantity
			expectedQuantities := map[int]int{
				1: level1Qty,
				2: level2Qty,
				3: level3Qty,
			}

			for _, pl := range dbPrizeLevels {
				expected, ok := expectedQuantities[pl.Level]
				if !ok {
					t.Logf("Unexpected prize level: %d", pl.Level)
					return false
				}
				if pl.Quantity != expected {
					t.Logf("Prize level %d quantity mismatch: got %d, want %d", pl.Level, pl.Quantity, expected)
					return false
				}
				// Remaining should equal quantity initially
				if pl.Remaining != expected {
					t.Logf("Prize level %d remaining mismatch: got %d, want %d", pl.Level, pl.Remaining, expected)
					return false
				}
			}

			return true
		},
		gen.IntRange(1, 50),
		gen.IntRange(1, 100),
		gen.IntRange(1, 200),
	))

	// Property: Sold tickets count increases correctly when tickets are generated
	properties.Property("sold tickets count increases correctly", prop.ForAll(
		func(purchaseCount int) bool {
			if purchaseCount < 1 {
				purchaseCount = 1
			}
			if purchaseCount > 20 {
				purchaseCount = 20
			}

			totalTickets := 100
			prizeLevels := []PrizeLevelInput{
				{Level: 1, Name: "一等奖", PrizeAmount: 100, Quantity: 5},
				{Level: 2, Name: "二等奖", PrizeAmount: 50, Quantity: 10},
			}

			db, lotteryService, lotteryTypeID, err := setupPrizePoolTest(prizeLevels, totalTickets)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Create prize pool
			prizePoolReq := CreatePrizePoolRequest{
				LotteryTypeID: lotteryTypeID,
				TotalTickets:  totalTickets,
				ReturnRate:    0.5,
			}

			_, err = lotteryService.CreatePrizePool(prizePoolReq)
			if err != nil {
				t.Logf("Failed to create prize pool: %v", err)
				return false
			}

			// Create a user
			user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Generate tickets
			for i := 0; i < purchaseCount; i++ {
				_, err := lotteryService.GenerateTicket(user.ID, lotteryTypeID)
				if err != nil {
					t.Logf("Failed to generate ticket %d: %v", i+1, err)
					return false
				}
			}

			// Verify sold tickets count
			prizePool, err := lotteryService.GetActivePrizePool(lotteryTypeID)
			if err != nil {
				t.Logf("Failed to get prize pool: %v", err)
				return false
			}

			if prizePool.SoldTickets != purchaseCount {
				t.Logf("Sold tickets mismatch: got %d, want %d", prizePool.SoldTickets, purchaseCount)
				return false
			}

			// Verify ticket count in database
			var ticketCount int64
			if err := db.Model(&model.Ticket{}).Where("lottery_type_id = ?", lotteryTypeID).Count(&ticketCount).Error; err != nil {
				t.Logf("Failed to count tickets: %v", err)
				return false
			}

			if int(ticketCount) != purchaseCount {
				t.Logf("Ticket count in database mismatch: got %d, want %d", ticketCount, purchaseCount)
				return false
			}

			return true
		},
		gen.IntRange(1, 20),
	))

	// Property: Prize pool becomes sold out when all tickets are sold
	properties.Property("prize pool becomes sold out when all tickets sold", prop.ForAll(
		func(totalTickets int) bool {
			if totalTickets < 5 {
				totalTickets = 5
			}
			if totalTickets > 30 {
				totalTickets = 30
			}

			prizeLevels := []PrizeLevelInput{
				{Level: 1, Name: "一等奖", PrizeAmount: 100, Quantity: 1},
			}

			db, lotteryService, lotteryTypeID, err := setupPrizePoolTest(prizeLevels, totalTickets)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Create prize pool
			prizePoolReq := CreatePrizePoolRequest{
				LotteryTypeID: lotteryTypeID,
				TotalTickets:  totalTickets,
				ReturnRate:    0.5,
			}

			_, err = lotteryService.CreatePrizePool(prizePoolReq)
			if err != nil {
				t.Logf("Failed to create prize pool: %v", err)
				return false
			}

			// Create a user
			user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Generate all tickets
			for i := 0; i < totalTickets; i++ {
				_, err := lotteryService.GenerateTicket(user.ID, lotteryTypeID)
				if err != nil {
					t.Logf("Failed to generate ticket %d: %v", i+1, err)
					return false
				}
			}

			// Verify prize pool is sold out
			var prizePool model.PrizePool
			if err := db.Where("lottery_type_id = ?", lotteryTypeID).First(&prizePool).Error; err != nil {
				t.Logf("Failed to get prize pool: %v", err)
				return false
			}

			if prizePool.Status != model.PrizePoolStatusSoldOut {
				t.Logf("Prize pool should be sold out, got status: %s", prizePool.Status)
				return false
			}

			if prizePool.SoldTickets != totalTickets {
				t.Logf("Sold tickets should equal total: got %d, want %d", prizePool.SoldTickets, totalTickets)
				return false
			}

			// Verify no more tickets can be generated
			_, err = lotteryService.GenerateTicket(user.ID, lotteryTypeID)
			if err == nil {
				t.Log("Should not be able to generate ticket from sold out pool")
				return false
			}

			return true
		},
		gen.IntRange(5, 30),
	))

	// Property: Total winning tickets does not exceed prize level quantities
	properties.Property("winning tickets do not exceed prize level quantities", prop.ForAll(
		func(totalTickets int) bool {
			if totalTickets < 20 {
				totalTickets = 20
			}
			if totalTickets > 100 {
				totalTickets = 100
			}

			// Set up prize levels with known quantities
			level1Qty := 2
			level2Qty := 5
			prizeLevels := []PrizeLevelInput{
				{Level: 1, Name: "一等奖", PrizeAmount: 1000, Quantity: level1Qty},
				{Level: 2, Name: "二等奖", PrizeAmount: 100, Quantity: level2Qty},
			}

			db, lotteryService, lotteryTypeID, err := setupPrizePoolTest(prizeLevels, totalTickets)
			if err != nil {
				t.Logf("Setup failed: %v", err)
				return false
			}

			// Create prize pool
			prizePoolReq := CreatePrizePoolRequest{
				LotteryTypeID: lotteryTypeID,
				TotalTickets:  totalTickets,
				ReturnRate:    0.5,
			}

			_, err = lotteryService.CreatePrizePool(prizePoolReq)
			if err != nil {
				t.Logf("Failed to create prize pool: %v", err)
				return false
			}

			// Create a user
			user := model.User{LinuxdoID: "test_user", Username: "Test", Role: "user"}
			if err := db.Create(&user).Error; err != nil {
				t.Logf("Failed to create user: %v", err)
				return false
			}

			// Generate all tickets
			winningCounts := make(map[int]int) // prize amount -> count
			for i := 0; i < totalTickets; i++ {
				ticket, err := lotteryService.GenerateTicket(user.ID, lotteryTypeID)
				if err != nil {
					t.Logf("Failed to generate ticket %d: %v", i+1, err)
					return false
				}
				if ticket.PrizeAmount > 0 {
					winningCounts[ticket.PrizeAmount]++
				}
			}

			// Verify winning counts don't exceed prize level quantities
			if winningCounts[1000] > level1Qty {
				t.Logf("Level 1 winners exceed quantity: got %d, max %d", winningCounts[1000], level1Qty)
				return false
			}
			if winningCounts[100] > level2Qty {
				t.Logf("Level 2 winners exceed quantity: got %d, max %d", winningCounts[100], level2Qty)
				return false
			}

			// Verify prize level remaining counts
			dbPrizeLevels, err := lotteryService.GetPrizeLevels(lotteryTypeID)
			if err != nil {
				t.Logf("Failed to get prize levels: %v", err)
				return false
			}

			for _, pl := range dbPrizeLevels {
				if pl.Remaining < 0 {
					t.Logf("Prize level %d has negative remaining: %d", pl.Level, pl.Remaining)
					return false
				}
				expectedRemaining := pl.Quantity - winningCounts[pl.PrizeAmount]
				if pl.Remaining != expectedRemaining {
					t.Logf("Prize level %d remaining mismatch: got %d, want %d", pl.Level, pl.Remaining, expectedRemaining)
					return false
				}
			}

			_ = db // suppress unused warning
			return true
		},
		gen.IntRange(20, 100),
	))

	properties.TestingRun(t)
}
