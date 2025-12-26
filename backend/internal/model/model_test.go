package model_test

import (
	"testing"
	"time"

	"scratch-lottery/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate all models
	err = db.AutoMigrate(
		&model.User{},
		&model.Wallet{},
		&model.Transaction{},
		&model.LotteryType{},
		&model.PrizeLevel{},
		&model.PrizePool{},
		&model.Ticket{},
		&model.Product{},
		&model.CardKey{},
		&model.ExchangeRecord{},
		&model.SystemConfig{},
		&model.AdminLog{},
		&model.PaymentOrder{},
	)
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func TestUserCreation(t *testing.T) {
	db := setupTestDB(t)

	user := &model.User{
		LinuxdoID: "test_user_123",
		Username:  "TestUser",
		Avatar:    "https://example.com/avatar.png",
		Role:      "user",
	}

	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user.ID == 0 {
		t.Error("User ID should not be 0 after creation")
	}

	// Verify user can be retrieved
	var retrieved model.User
	if err := db.First(&retrieved, user.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve user: %v", err)
	}

	if retrieved.LinuxdoID != user.LinuxdoID {
		t.Errorf("Expected LinuxdoID %s, got %s", user.LinuxdoID, retrieved.LinuxdoID)
	}
}

func TestUserWalletRelation(t *testing.T) {
	db := setupTestDB(t)

	// Create user
	user := &model.User{
		LinuxdoID: "wallet_test_user",
		Username:  "WalletTestUser",
		Role:      "user",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create wallet for user
	wallet := &model.Wallet{
		UserID:  user.ID,
		Balance: 50,
	}
	if err := db.Create(wallet).Error; err != nil {
		t.Fatalf("Failed to create wallet: %v", err)
	}

	// Verify wallet default balance
	if wallet.Balance != 50 {
		t.Errorf("Expected initial balance 50, got %d", wallet.Balance)
	}

	// Retrieve user with wallet
	var userWithWallet model.User
	if err := db.Preload("Wallet").First(&userWithWallet, user.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve user with wallet: %v", err)
	}

	if userWithWallet.Wallet.ID == 0 {
		t.Error("Wallet should be loaded with user")
	}

	if userWithWallet.Wallet.Balance != 50 {
		t.Errorf("Expected wallet balance 50, got %d", userWithWallet.Wallet.Balance)
	}
}

func TestWalletTransactionRelation(t *testing.T) {
	db := setupTestDB(t)

	// Create user and wallet
	user := &model.User{
		LinuxdoID: "tx_test_user",
		Username:  "TxTestUser",
		Role:      "user",
	}
	db.Create(user)

	wallet := &model.Wallet{
		UserID:  user.ID,
		Balance: 100,
	}
	db.Create(wallet)

	// Create transactions
	transactions := []model.Transaction{
		{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeInitial,
			Amount:      50,
			Description: "Initial bonus",
		},
		{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeRecharge,
			Amount:      50,
			Description: "Recharge",
		},
	}

	for _, tx := range transactions {
		if err := db.Create(&tx).Error; err != nil {
			t.Fatalf("Failed to create transaction: %v", err)
		}
	}

	// Retrieve wallet with transactions
	var walletWithTx model.Wallet
	if err := db.Preload("Transactions").First(&walletWithTx, wallet.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve wallet with transactions: %v", err)
	}

	if len(walletWithTx.Transactions) != 2 {
		t.Errorf("Expected 2 transactions, got %d", len(walletWithTx.Transactions))
	}
}

func TestLotteryTypeCreation(t *testing.T) {
	db := setupTestDB(t)

	lotteryType := &model.LotteryType{
		Name:        "Test Lottery",
		Description: "A test lottery type",
		Price:       10,
		MaxPrize:    10000,
		GameType:    model.GameTypeNumberMatch,
		Status:      model.LotteryTypeStatusAvailable,
	}

	if err := db.Create(lotteryType).Error; err != nil {
		t.Fatalf("Failed to create lottery type: %v", err)
	}

	if lotteryType.ID == 0 {
		t.Error("LotteryType ID should not be 0 after creation")
	}

	// Verify default status
	var retrieved model.LotteryType
	db.First(&retrieved, lotteryType.ID)
	if retrieved.Status != model.LotteryTypeStatusAvailable {
		t.Errorf("Expected status %s, got %s", model.LotteryTypeStatusAvailable, retrieved.Status)
	}
}

func TestLotteryTypePrizeLevelRelation(t *testing.T) {
	db := setupTestDB(t)

	// Create lottery type
	lotteryType := &model.LotteryType{
		Name:     "Prize Level Test",
		Price:    10,
		MaxPrize: 50000,
		GameType: model.GameTypeSymbolMatch,
		Status:   model.LotteryTypeStatusAvailable,
	}
	db.Create(lotteryType)

	// Create prize levels
	prizeLevels := []model.PrizeLevel{
		{LotteryTypeID: lotteryType.ID, Level: 1, Name: "一等奖", PrizeAmount: 50000, Quantity: 1, Remaining: 1},
		{LotteryTypeID: lotteryType.ID, Level: 2, Name: "二等奖", PrizeAmount: 10000, Quantity: 5, Remaining: 5},
		{LotteryTypeID: lotteryType.ID, Level: 3, Name: "三等奖", PrizeAmount: 1000, Quantity: 50, Remaining: 50},
	}

	for _, pl := range prizeLevels {
		if err := db.Create(&pl).Error; err != nil {
			t.Fatalf("Failed to create prize level: %v", err)
		}
	}

	// Retrieve lottery type with prize levels
	var ltWithPrizes model.LotteryType
	if err := db.Preload("PrizeLevels").First(&ltWithPrizes, lotteryType.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve lottery type with prize levels: %v", err)
	}

	if len(ltWithPrizes.PrizeLevels) != 3 {
		t.Errorf("Expected 3 prize levels, got %d", len(ltWithPrizes.PrizeLevels))
	}
}

func TestTicketCreation(t *testing.T) {
	db := setupTestDB(t)

	// Create user
	user := &model.User{LinuxdoID: "ticket_user", Username: "TicketUser", Role: "user"}
	db.Create(user)

	// Create lottery type
	lotteryType := &model.LotteryType{
		Name:     "Ticket Test",
		Price:    10,
		MaxPrize: 10000,
		GameType: model.GameTypeNumberMatch,
		Status:   model.LotteryTypeStatusAvailable,
	}
	db.Create(lotteryType)

	// Create prize pool
	prizePool := &model.PrizePool{
		LotteryTypeID: lotteryType.ID,
		TotalTickets:  1000,
		SoldTickets:   0,
		Status:        model.PrizePoolStatusActive,
	}
	db.Create(prizePool)

	// Create ticket
	ticket := &model.Ticket{
		UserID:           user.ID,
		LotteryTypeID:    lotteryType.ID,
		PrizePoolID:      prizePool.ID,
		SecurityCode:     "ABCD1234EFGH5678",
		ContentEncrypted: "encrypted_content_here",
		PrizeAmount:      100,
		Status:           model.TicketStatusUnscratched,
		PurchasedAt:      time.Now(),
	}

	if err := db.Create(ticket).Error; err != nil {
		t.Fatalf("Failed to create ticket: %v", err)
	}

	// Verify security code uniqueness
	duplicateTicket := &model.Ticket{
		UserID:           user.ID,
		LotteryTypeID:    lotteryType.ID,
		PrizePoolID:      prizePool.ID,
		SecurityCode:     "ABCD1234EFGH5678", // Same security code
		ContentEncrypted: "other_content",
		PrizeAmount:      0,
		Status:           model.TicketStatusUnscratched,
		PurchasedAt:      time.Now(),
	}

	err := db.Create(duplicateTicket).Error
	if err == nil {
		t.Error("Should not allow duplicate security codes")
	}
}

func TestProductCardKeyRelation(t *testing.T) {
	db := setupTestDB(t)

	// Create product
	product := &model.Product{
		Name:        "Test Product",
		Description: "A test product",
		Price:       100,
		Stock:       10,
		Status:      model.ProductStatusAvailable,
	}
	db.Create(product)

	// Create card keys
	cardKeys := []model.CardKey{
		{ProductID: product.ID, KeyContent: "KEY-001-ABC", Status: model.CardKeyStatusAvailable},
		{ProductID: product.ID, KeyContent: "KEY-002-DEF", Status: model.CardKeyStatusAvailable},
		{ProductID: product.ID, KeyContent: "KEY-003-GHI", Status: model.CardKeyStatusAvailable},
	}

	for _, ck := range cardKeys {
		if err := db.Create(&ck).Error; err != nil {
			t.Fatalf("Failed to create card key: %v", err)
		}
	}

	// Retrieve product with card keys
	var productWithKeys model.Product
	if err := db.Preload("CardKeys").First(&productWithKeys, product.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve product with card keys: %v", err)
	}

	if len(productWithKeys.CardKeys) != 3 {
		t.Errorf("Expected 3 card keys, got %d", len(productWithKeys.CardKeys))
	}
}

func TestExchangeRecordRelations(t *testing.T) {
	db := setupTestDB(t)

	// Create user
	user := &model.User{LinuxdoID: "exchange_user", Username: "ExchangeUser", Role: "user"}
	db.Create(user)

	// Create product
	product := &model.Product{
		Name:   "Exchange Product",
		Price:  50,
		Stock:  5,
		Status: model.ProductStatusAvailable,
	}
	db.Create(product)

	// Create card key
	cardKey := &model.CardKey{
		ProductID:  product.ID,
		KeyContent: "EXCHANGE-KEY-001",
		Status:     model.CardKeyStatusAvailable,
	}
	db.Create(cardKey)

	// Create exchange record
	now := time.Now()
	cardKey.Status = model.CardKeyStatusRedeemed
	cardKey.RedeemedBy = user.ID
	cardKey.RedeemedAt = &now
	db.Save(cardKey)

	exchangeRecord := &model.ExchangeRecord{
		UserID:    user.ID,
		ProductID: product.ID,
		CardKeyID: cardKey.ID,
		Cost:      product.Price,
	}

	if err := db.Create(exchangeRecord).Error; err != nil {
		t.Fatalf("Failed to create exchange record: %v", err)
	}

	// Retrieve exchange record with relations
	var record model.ExchangeRecord
	if err := db.Preload("User").Preload("Product").Preload("CardKey").First(&record, exchangeRecord.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve exchange record: %v", err)
	}

	if record.User.ID != user.ID {
		t.Error("Exchange record should have correct user relation")
	}

	if record.Product.ID != product.ID {
		t.Error("Exchange record should have correct product relation")
	}

	if record.CardKey.ID != cardKey.ID {
		t.Error("Exchange record should have correct card key relation")
	}
}

func TestSystemConfig(t *testing.T) {
	db := setupTestDB(t)

	config := &model.SystemConfig{
		Key:   "test_setting",
		Value: "test_value",
	}

	if err := db.Create(config).Error; err != nil {
		t.Fatalf("Failed to create system config: %v", err)
	}

	// Verify unique key constraint
	duplicateConfig := &model.SystemConfig{
		Key:   "test_setting",
		Value: "another_value",
	}

	err := db.Create(duplicateConfig).Error
	if err == nil {
		t.Error("Should not allow duplicate config keys")
	}
}
