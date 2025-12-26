package repository

import (
	"scratch-lottery/internal/model"

	"gorm.io/gorm"
)

// AutoMigrate runs database migrations for all models
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		// User related
		&model.User{},
		&model.Wallet{},
		&model.Transaction{},

		// Lottery related
		&model.LotteryType{},
		&model.PrizeLevel{},
		&model.PrizePool{},
		&model.Ticket{},

		// Exchange related
		&model.Product{},
		&model.CardKey{},
		&model.ExchangeRecord{},

		// System related
		&model.SystemConfig{},
		&model.AdminLog{},
		&model.PaymentOrder{},
	)
}

// SeedDevData seeds development data for testing
func SeedDevData(db *gorm.DB) error {
	// Create default admin user for dev mode
	var adminCount int64
	db.Model(&model.User{}).Where("role = ?", "admin").Count(&adminCount)
	if adminCount == 0 {
		admin := &model.User{
			LinuxdoID: "dev_admin",
			Username:  "管理员",
			Avatar:    "",
			Role:      "admin",
		}
		if err := db.Create(admin).Error; err != nil {
			return err
		}
		// Create wallet for admin
		wallet := &model.Wallet{
			UserID:  admin.ID,
			Balance: 10000,
		}
		if err := db.Create(wallet).Error; err != nil {
			return err
		}
		// Create initial transaction
		tx := &model.Transaction{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeInitial,
			Amount:      10000,
			Description: "管理员初始积分",
		}
		if err := db.Create(tx).Error; err != nil {
			return err
		}
	}

	// Create test user for dev mode
	var userCount int64
	db.Model(&model.User{}).Where("linuxdo_id = ?", "dev_user").Count(&userCount)
	if userCount == 0 {
		user := &model.User{
			LinuxdoID: "dev_user",
			Username:  "测试用户",
			Avatar:    "",
			Role:      "user",
		}
		if err := db.Create(user).Error; err != nil {
			return err
		}
		// Create wallet for user
		wallet := &model.Wallet{
			UserID:  user.ID,
			Balance: 50,
		}
		if err := db.Create(wallet).Error; err != nil {
			return err
		}
		// Create initial transaction
		tx := &model.Transaction{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeInitial,
			Amount:      50,
			Description: "新用户注册赠送",
		}
		if err := db.Create(tx).Error; err != nil {
			return err
		}
	}

	// Create sample lottery types with prize levels and pools
	var lotteryCount int64
	db.Model(&model.LotteryType{}).Count(&lotteryCount)
	if lotteryCount == 0 {
		// Lottery type 1: 好运十倍
		lt1 := model.LotteryType{
			Name:        "好运十倍",
			Description: "刮开覆盖膜，如果出现的数字与中奖号码相同，即中得该数字下方所示的金额；如果出现10X标志，即中得该标志下方所示金额的10倍。",
			Price:       10,
			MaxPrize:    250000,
			GameType:    model.GameTypeMultiplier,
			CoverImage:  "/images/lottery/haoyun10x.png",
			RulesConfig: `{"multiplier": 10, "win_symbols": ["10X"]}`,
			Status:      model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lt1).Error; err != nil {
			return err
		}
		// Prize levels for 好运十倍
		prizeLevels1 := []model.PrizeLevel{
			{LotteryTypeID: lt1.ID, Level: 1, Name: "特等奖", PrizeAmount: 250000, Quantity: 1, Remaining: 1},
			{LotteryTypeID: lt1.ID, Level: 2, Name: "一等奖", PrizeAmount: 10000, Quantity: 5, Remaining: 5},
			{LotteryTypeID: lt1.ID, Level: 3, Name: "二等奖", PrizeAmount: 1000, Quantity: 50, Remaining: 50},
			{LotteryTypeID: lt1.ID, Level: 4, Name: "三等奖", PrizeAmount: 100, Quantity: 500, Remaining: 500},
			{LotteryTypeID: lt1.ID, Level: 5, Name: "四等奖", PrizeAmount: 20, Quantity: 5000, Remaining: 5000},
			{LotteryTypeID: lt1.ID, Level: 6, Name: "五等奖", PrizeAmount: 10, Quantity: 20000, Remaining: 20000},
		}
		for _, pl := range prizeLevels1 {
			if err := db.Create(&pl).Error; err != nil {
				return err
			}
		}
		// Prize pool for 好运十倍
		pool1 := model.PrizePool{
			LotteryTypeID: lt1.ID,
			TotalTickets:  100000,
			SoldTickets:   0,
			ClaimedPrizes: 0,
			ReturnRate:    0.65,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&pool1).Error; err != nil {
			return err
		}

		// Lottery type 2: 百发百中
		lt2 := model.LotteryType{
			Name:        "百发百中",
			Description: "刮开覆盖膜，如果在同一局游戏中刮出3个相同的图符，即中得该图符所对应的奖金。",
			Price:       5,
			MaxPrize:    100000,
			GameType:    model.GameTypeSymbolMatch,
			CoverImage:  "/images/lottery/baifabaizhong.png",
			RulesConfig: `{"match_count": 3, "win_symbols": ["金元宝", "红包", "福字", "鞭炮"]}`,
			Status:      model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lt2).Error; err != nil {
			return err
		}
		// Prize levels for 百发百中
		prizeLevels2 := []model.PrizeLevel{
			{LotteryTypeID: lt2.ID, Level: 1, Name: "特等奖", PrizeAmount: 100000, Quantity: 1, Remaining: 1},
			{LotteryTypeID: lt2.ID, Level: 2, Name: "一等奖", PrizeAmount: 5000, Quantity: 10, Remaining: 10},
			{LotteryTypeID: lt2.ID, Level: 3, Name: "二等奖", PrizeAmount: 500, Quantity: 100, Remaining: 100},
			{LotteryTypeID: lt2.ID, Level: 4, Name: "三等奖", PrizeAmount: 50, Quantity: 1000, Remaining: 1000},
			{LotteryTypeID: lt2.ID, Level: 5, Name: "四等奖", PrizeAmount: 5, Quantity: 30000, Remaining: 30000},
		}
		for _, pl := range prizeLevels2 {
			if err := db.Create(&pl).Error; err != nil {
				return err
			}
		}
		// Prize pool for 百发百中
		pool2 := model.PrizePool{
			LotteryTypeID: lt2.ID,
			TotalTickets:  100000,
			SoldTickets:   0,
			ClaimedPrizes: 0,
			ReturnRate:    0.60,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&pool2).Error; err != nil {
			return err
		}

		// Lottery type 3: 5倍惊喜
		lt3 := model.LotteryType{
			Name:        "5倍惊喜",
			Description: "刮开覆盖膜，如果出现5X标志，即中得该标志下方所示金额的5倍。",
			Price:       5,
			MaxPrize:    50000,
			GameType:    model.GameTypeMultiplier,
			CoverImage:  "/images/lottery/5beijingxi.png",
			RulesConfig: `{"multiplier": 5, "win_symbols": ["5X"]}`,
			Status:      model.LotteryTypeStatusAvailable,
		}
		if err := db.Create(&lt3).Error; err != nil {
			return err
		}
		// Prize levels for 5倍惊喜
		prizeLevels3 := []model.PrizeLevel{
			{LotteryTypeID: lt3.ID, Level: 1, Name: "特等奖", PrizeAmount: 50000, Quantity: 2, Remaining: 2},
			{LotteryTypeID: lt3.ID, Level: 2, Name: "一等奖", PrizeAmount: 2500, Quantity: 20, Remaining: 20},
			{LotteryTypeID: lt3.ID, Level: 3, Name: "二等奖", PrizeAmount: 250, Quantity: 200, Remaining: 200},
			{LotteryTypeID: lt3.ID, Level: 4, Name: "三等奖", PrizeAmount: 25, Quantity: 2000, Remaining: 2000},
			{LotteryTypeID: lt3.ID, Level: 5, Name: "四等奖", PrizeAmount: 5, Quantity: 40000, Remaining: 40000},
		}
		for _, pl := range prizeLevels3 {
			if err := db.Create(&pl).Error; err != nil {
				return err
			}
		}
		// Prize pool for 5倍惊喜
		pool3 := model.PrizePool{
			LotteryTypeID: lt3.ID,
			TotalTickets:  100000,
			SoldTickets:   0,
			ClaimedPrizes: 0,
			ReturnRate:    0.55,
			Status:        model.PrizePoolStatusActive,
		}
		if err := db.Create(&pool3).Error; err != nil {
			return err
		}
	}

	// Create default system config
	var configCount int64
	db.Model(&model.SystemConfig{}).Count(&configCount)
	if configCount == 0 {
		configs := []model.SystemConfig{
			{Key: "payment_enabled", Value: "false"},
			{Key: "site_name", Value: "刮刮乐彩票娱乐网站"},
		}
		for _, cfg := range configs {
			if err := db.Create(&cfg).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
