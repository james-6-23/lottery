package model

import (
	"time"

	"gorm.io/gorm"
)

// GameType defines the type of lottery game
type GameType string

const (
	GameTypeNumberMatch GameType = "number_match"  // 数字匹配型
	GameTypeSymbolMatch GameType = "symbol_match"  // 符号匹配型
	GameTypeAmountSum   GameType = "amount_sum"    // 金额累加型
	GameTypeMultiplier  GameType = "multiplier"    // 翻倍型
	GameTypePattern     GameType = "pattern"       // 图案型
)

// LotteryTypeStatus defines the status of a lottery type
type LotteryTypeStatus string

const (
	LotteryTypeStatusAvailable LotteryTypeStatus = "available"
	LotteryTypeStatusSoldOut   LotteryTypeStatus = "sold_out"
	LotteryTypeStatusDisabled  LotteryTypeStatus = "disabled"
)

// LotteryType represents a type of lottery game
type LotteryType struct {
	gorm.Model
	Name        string            `gorm:"size:128" json:"name"`
	Description string            `gorm:"type:text" json:"description"`
	Price       int               `json:"price"`
	MaxPrize    int               `json:"max_prize"`
	GameType    GameType          `gorm:"size:32" json:"game_type"`
	CoverImage  string            `gorm:"size:512" json:"cover_image"`
	RulesConfig string            `gorm:"type:text" json:"rules_config"` // JSON configuration
	Status      LotteryTypeStatus `gorm:"size:32;default:available" json:"status"`
	PrizeLevels []PrizeLevel      `gorm:"foreignKey:LotteryTypeID" json:"prize_levels,omitempty"`
	PrizePools  []PrizePool       `gorm:"foreignKey:LotteryTypeID" json:"prize_pools,omitempty"`
}

// PrizeLevel represents a prize level configuration
type PrizeLevel struct {
	gorm.Model
	LotteryTypeID uint   `gorm:"index" json:"lottery_type_id"`
	Level         int    `json:"level"`
	Name          string `gorm:"size:64" json:"name"`
	PrizeAmount   int    `json:"prize_amount"`
	Quantity      int    `json:"quantity"`  // Total quantity in prize pool
	Remaining     int    `json:"remaining"` // Remaining quantity
}

// PrizePoolStatus defines the status of a prize pool
type PrizePoolStatus string

const (
	PrizePoolStatusActive  PrizePoolStatus = "active"
	PrizePoolStatusSoldOut PrizePoolStatus = "sold_out"
	PrizePoolStatusClosed  PrizePoolStatus = "closed"
)

// PrizePool represents a batch of lottery tickets
type PrizePool struct {
	gorm.Model
	LotteryTypeID uint            `gorm:"index" json:"lottery_type_id"`
	TotalTickets  int             `json:"total_tickets"`
	SoldTickets   int             `json:"sold_tickets"`
	ClaimedPrizes int             `json:"claimed_prizes"`
	ReturnRate    float64         `json:"return_rate"`
	Status        PrizePoolStatus `gorm:"size:32;default:active" json:"status"`
}

// TicketStatus defines the status of a ticket
type TicketStatus string

const (
	TicketStatusUnscratched TicketStatus = "unscratched"
	TicketStatusScratched   TicketStatus = "scratched"
	TicketStatusClaimed     TicketStatus = "claimed"
)

// Ticket represents a lottery ticket
type Ticket struct {
	gorm.Model
	UserID           uint         `gorm:"index" json:"user_id"`
	LotteryTypeID    uint         `gorm:"index" json:"lottery_type_id"`
	PrizePoolID      uint         `gorm:"index" json:"prize_pool_id"`
	SecurityCode     string       `gorm:"uniqueIndex;size:16" json:"security_code"`
	ContentEncrypted string       `gorm:"type:text" json:"-"` // AES encrypted content
	PrizeAmount      int          `json:"prize_amount"`
	Status           TicketStatus `gorm:"size:32;default:unscratched" json:"status"`
	PurchasedAt      time.Time    `json:"purchased_at"`
	ScratchedAt      *time.Time   `json:"scratched_at,omitempty"`
	User             User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	LotteryType      LotteryType  `gorm:"foreignKey:LotteryTypeID" json:"lottery_type,omitempty"`
}
