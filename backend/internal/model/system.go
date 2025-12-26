package model

import (
	"gorm.io/gorm"
)

// SystemConfig represents system configuration
type SystemConfig struct {
	gorm.Model
	Key   string `gorm:"uniqueIndex;size:64" json:"key"`
	Value string `gorm:"type:text" json:"value"`
}

// AdminLog represents an admin action log
type AdminLog struct {
	gorm.Model
	AdminID    uint   `gorm:"index" json:"admin_id"`
	Action     string `gorm:"size:64" json:"action"`
	TargetType string `gorm:"size:64" json:"target_type"`
	TargetID   uint   `json:"target_id"`
	Details    string `gorm:"type:text" json:"details"` // JSON
	Admin      User   `gorm:"foreignKey:AdminID" json:"admin,omitempty"`
}

// PaymentOrder represents a payment order
type PaymentOrder struct {
	gorm.Model
	UserID      uint   `gorm:"index" json:"user_id"`
	OrderNo     string `gorm:"uniqueIndex;size:64" json:"order_no"`
	Amount      int    `json:"amount"`      // Amount in cents
	Points      int    `json:"points"`      // Points to add
	Status      string `gorm:"size:32;default:pending" json:"status"` // pending, paid, failed
	PaymentType string `gorm:"size:32" json:"payment_type"`
	TradeNo     string `gorm:"size:128" json:"trade_no,omitempty"` // Third-party trade number
	User        User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
