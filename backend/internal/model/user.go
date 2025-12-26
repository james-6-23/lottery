package model

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	gorm.Model
	LinuxdoID string `gorm:"uniqueIndex;size:64" json:"linuxdo_id"`
	Username  string `gorm:"size:128" json:"username"`
	Avatar    string `gorm:"size:512" json:"avatar"`
	Role      string `gorm:"size:32;default:user" json:"role"` // user, admin
	Wallet    Wallet `gorm:"foreignKey:UserID" json:"wallet,omitempty"`
}

// Wallet represents a user's wallet
type Wallet struct {
	gorm.Model
	UserID       uint          `gorm:"uniqueIndex" json:"user_id"`
	Balance      int           `gorm:"default:50" json:"balance"` // Initial 50 points
	Transactions []Transaction `gorm:"foreignKey:WalletID" json:"transactions,omitempty"`
}

// TransactionType defines the type of transaction
type TransactionType string

const (
	TransactionTypeInitial  TransactionType = "initial"
	TransactionTypeRecharge TransactionType = "recharge"
	TransactionTypePurchase TransactionType = "purchase"
	TransactionTypeWin      TransactionType = "win"
	TransactionTypeExchange TransactionType = "exchange"
)

// Transaction represents a wallet transaction
type Transaction struct {
	gorm.Model
	WalletID    uint            `gorm:"index" json:"wallet_id"`
	Type        TransactionType `gorm:"size:32" json:"type"`
	Amount      int             `json:"amount"` // Positive for credit, negative for debit
	Description string          `gorm:"size:256" json:"description"`
	ReferenceID uint            `json:"reference_id,omitempty"` // Related ticket or product ID
	CreatedAt   time.Time       `json:"created_at"`
}
