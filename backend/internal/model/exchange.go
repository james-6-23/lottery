package model

import (
	"time"

	"gorm.io/gorm"
)

// ProductStatus defines the status of a product
type ProductStatus string

const (
	ProductStatusAvailable ProductStatus = "available"
	ProductStatusSoldOut   ProductStatus = "sold_out"
	ProductStatusOffline   ProductStatus = "offline"
)

// Product represents an exchangeable product
type Product struct {
	gorm.Model
	Name        string        `gorm:"size:128" json:"name"`
	Description string        `gorm:"type:text" json:"description"`
	Image       string        `gorm:"size:512" json:"image"`
	Price       int           `json:"price"` // Points required
	Stock       int           `json:"stock"` // Available stock
	Status      ProductStatus `gorm:"size:32;default:available" json:"status"`
	CardKeys    []CardKey     `gorm:"foreignKey:ProductID" json:"card_keys,omitempty"`
}

// CardKeyStatus defines the status of a card key
type CardKeyStatus string

const (
	CardKeyStatusAvailable CardKeyStatus = "available"
	CardKeyStatusRedeemed  CardKeyStatus = "redeemed"
)

// CardKey represents a redeemable card key
type CardKey struct {
	gorm.Model
	ProductID  uint          `gorm:"index" json:"product_id"`
	KeyContent string        `gorm:"size:512" json:"key_content"`
	Status     CardKeyStatus `gorm:"size:32;default:available" json:"status"`
	RedeemedBy uint          `json:"redeemed_by,omitempty"`
	RedeemedAt *time.Time    `json:"redeemed_at,omitempty"`
}

// ExchangeRecord represents an exchange transaction
type ExchangeRecord struct {
	gorm.Model
	UserID    uint    `gorm:"index" json:"user_id"`
	ProductID uint    `gorm:"index" json:"product_id"`
	CardKeyID uint    `gorm:"index" json:"card_key_id"`
	Cost      int     `json:"cost"`
	User      User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Product   Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	CardKey   CardKey `gorm:"foreignKey:CardKeyID" json:"card_key,omitempty"`
}
