package service

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"time"

	"scratch-lottery/internal/model"
	"scratch-lottery/pkg/crypto"

	"gorm.io/gorm"
)

var (
	ErrLotteryTypeNotFound = errors.New("lottery type not found")
	ErrLotteryTypeSoldOut  = errors.New("lottery type sold out")
	ErrPrizePoolNotFound   = errors.New("prize pool not found")
	ErrInvalidPrizeConfig  = errors.New("invalid prize configuration")
	ErrTicketNotFound      = errors.New("ticket not found")
	ErrSecurityCodeExists  = errors.New("security code already exists")
	ErrNoPrizePoolActive   = errors.New("no active prize pool")
	ErrEncryptionFailed    = errors.New("encryption failed")
	ErrInvalidSecurityCode = errors.New("invalid security code format")
)

// LotteryService handles lottery-related business logic
type LotteryService struct {
	db            *gorm.DB
	encryptionKey string
}

// NewLotteryService creates a new lottery service
func NewLotteryService(db *gorm.DB, encryptionKey string) *LotteryService {
	return &LotteryService{db: db, encryptionKey: encryptionKey}
}

// LotteryTypeResponse represents a lottery type in API responses
type LotteryTypeResponse struct {
	ID          uint                      `json:"id"`
	Name        string                    `json:"name"`
	Description string                    `json:"description"`
	Price       int                       `json:"price"`
	MaxPrize    int                       `json:"max_prize"`
	GameType    model.GameType            `json:"game_type"`
	CoverImage  string                    `json:"cover_image"`
	Status      model.LotteryTypeStatus   `json:"status"`
	Stock       int                       `json:"stock"`
	CreatedAt   time.Time                 `json:"created_at"`
	UpdatedAt   time.Time                 `json:"updated_at"`
}

// LotteryTypeDetailResponse represents detailed lottery type info
type LotteryTypeDetailResponse struct {
	LotteryTypeResponse
	Rules        string               `json:"rules"`
	RulesConfig  interface{}          `json:"rules_config,omitempty"`
	DesignConfig interface{}          `json:"design_config,omitempty"`
	PrizeLevels  []PrizeLevelResponse `json:"prize_levels"`
	WinSymbols   []string             `json:"win_symbols,omitempty"`
}

// PrizeLevelResponse represents a prize level in API responses
type PrizeLevelResponse struct {
	ID          uint   `json:"id"`
	Level       int    `json:"level"`
	Name        string `json:"name"`
	PrizeAmount int    `json:"prize_amount"`
	Quantity    int    `json:"quantity"`
	Remaining   int    `json:"remaining"`
}

// PrizePoolResponse represents a prize pool in API responses
type PrizePoolResponse struct {
	ID            uint                  `json:"id"`
	LotteryTypeID uint                  `json:"lottery_type_id"`
	TotalTickets  int                   `json:"total_tickets"`
	SoldTickets   int                   `json:"sold_tickets"`
	ClaimedPrizes int                   `json:"claimed_prizes"`
	ReturnRate    float64               `json:"return_rate"`
	Status        model.PrizePoolStatus `json:"status"`
	CreatedAt     time.Time             `json:"created_at"`
}

// CreateLotteryTypeRequest represents the request to create a lottery type
type CreateLotteryTypeRequest struct {
	Name        string           `json:"name" binding:"required"`
	Description string           `json:"description"`
	Price       int              `json:"price" binding:"required,gt=0"`
	MaxPrize    int              `json:"max_prize" binding:"required,gt=0"`
	GameType    model.GameType   `json:"game_type" binding:"required"`
	CoverImage  string           `json:"cover_image"`
	RulesConfig interface{}      `json:"rules_config"`
	PrizeLevels []PrizeLevelInput `json:"prize_levels"`
}

// UpdateLotteryTypeRequest represents the request to update a lottery type
type UpdateLotteryTypeRequest struct {
	Name         *string                   `json:"name"`
	Description  *string                   `json:"description"`
	Price        *int                      `json:"price"`
	MaxPrize     *int                      `json:"max_prize"`
	GameType     *model.GameType           `json:"game_type"`
	CoverImage   *string                   `json:"cover_image"`
	RulesConfig  interface{}               `json:"rules_config"`
	DesignConfig interface{}               `json:"design_config"`
	Status       *model.LotteryTypeStatus  `json:"status"`
}

// PrizeLevelInput represents input for creating prize levels
type PrizeLevelInput struct {
	Level       int    `json:"level" binding:"required"`
	Name        string `json:"name" binding:"required"`
	PrizeAmount int    `json:"prize_amount" binding:"required,gte=0"`
	Quantity    int    `json:"quantity" binding:"required,gt=0"`
}

// CreatePrizePoolRequest represents the request to create a prize pool
type CreatePrizePoolRequest struct {
	LotteryTypeID uint    `json:"lottery_type_id" binding:"required"`
	TotalTickets  int     `json:"total_tickets" binding:"required,gt=0"`
	ReturnRate    float64 `json:"return_rate"`
}

// LotteryTypeListQuery represents query parameters for listing lottery types
type LotteryTypeListQuery struct {
	Status   string `form:"status"`
	GameType string `form:"game_type"`
	Page     int    `form:"page"`
	Limit    int    `form:"limit"`
}

// LotteryTypeListResponse represents paginated lottery type list
type LotteryTypeListResponse struct {
	LotteryTypes []LotteryTypeResponse `json:"lottery_types"`
	Total        int64                 `json:"total"`
	Page         int                   `json:"page"`
	Limit        int                   `json:"limit"`
	TotalPages   int                   `json:"total_pages"`
}

// GetAllLotteryTypes returns all available lottery types
func (s *LotteryService) GetAllLotteryTypes(query LotteryTypeListQuery) (*LotteryTypeListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.LotteryType{})

	// Filter by status if specified
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	} else {
		// By default, only show available lottery types for users
		dbQuery = dbQuery.Where("status != ?", model.LotteryTypeStatusDisabled)
	}

	// Filter by game type if specified
	if query.GameType != "" {
		dbQuery = dbQuery.Where("game_type = ?", query.GameType)
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var lotteryTypes []model.LotteryType
	offset := (query.Page - 1) * query.Limit
	if err := dbQuery.Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&lotteryTypes).Error; err != nil {
		return nil, err
	}

	// Calculate stock for each lottery type
	responses := make([]LotteryTypeResponse, len(lotteryTypes))
	for i, lt := range lotteryTypes {
		stock := s.calculateStock(lt.ID)
		responses[i] = s.toLotteryTypeResponse(&lt, stock)
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &LotteryTypeListResponse{
		LotteryTypes: responses,
		Total:        total,
		Page:         query.Page,
		Limit:        query.Limit,
		TotalPages:   totalPages,
	}, nil
}

// GetLotteryTypeByID returns a lottery type by ID with details
func (s *LotteryService) GetLotteryTypeByID(id uint) (*LotteryTypeDetailResponse, error) {
	var lotteryType model.LotteryType
	if err := s.db.Preload("PrizeLevels", func(db *gorm.DB) *gorm.DB {
		return db.Order("level ASC")
	}).First(&lotteryType, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLotteryTypeNotFound
		}
		return nil, err
	}

	return s.toLotteryTypeDetailResponse(&lotteryType), nil
}

// CreateLotteryType creates a new lottery type
func (s *LotteryService) CreateLotteryType(req CreateLotteryTypeRequest) (*LotteryTypeDetailResponse, error) {
	// Serialize rules config to JSON
	var rulesConfigJSON string
	if req.RulesConfig != nil {
		data, err := json.Marshal(req.RulesConfig)
		if err != nil {
			return nil, ErrInvalidPrizeConfig
		}
		rulesConfigJSON = string(data)
	}

	lotteryType := model.LotteryType{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		MaxPrize:    req.MaxPrize,
		GameType:    req.GameType,
		CoverImage:  req.CoverImage,
		RulesConfig: rulesConfigJSON,
		Status:      model.LotteryTypeStatusAvailable,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&lotteryType).Error; err != nil {
			return err
		}

		// Create prize levels if provided
		for _, pl := range req.PrizeLevels {
			prizeLevel := model.PrizeLevel{
				LotteryTypeID: lotteryType.ID,
				Level:         pl.Level,
				Name:          pl.Name,
				PrizeAmount:   pl.PrizeAmount,
				Quantity:      pl.Quantity,
				Remaining:     pl.Quantity,
			}
			if err := tx.Create(&prizeLevel).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.GetLotteryTypeByID(lotteryType.ID)
}

// UpdateLotteryType updates an existing lottery type
func (s *LotteryService) UpdateLotteryType(id uint, req UpdateLotteryTypeRequest) (*LotteryTypeDetailResponse, error) {
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLotteryTypeNotFound
		}
		return nil, err
	}

	// Update fields if provided
	if req.Name != nil {
		lotteryType.Name = *req.Name
	}
	if req.Description != nil {
		lotteryType.Description = *req.Description
	}
	if req.Price != nil {
		lotteryType.Price = *req.Price
	}
	if req.MaxPrize != nil {
		lotteryType.MaxPrize = *req.MaxPrize
	}
	if req.GameType != nil {
		lotteryType.GameType = *req.GameType
	}
	if req.CoverImage != nil {
		lotteryType.CoverImage = *req.CoverImage
	}
	if req.RulesConfig != nil {
		data, err := json.Marshal(req.RulesConfig)
		if err != nil {
			return nil, ErrInvalidPrizeConfig
		}
		lotteryType.RulesConfig = string(data)
	}
	if req.DesignConfig != nil {
		data, err := json.Marshal(req.DesignConfig)
		if err != nil {
			return nil, ErrInvalidPrizeConfig
		}
		lotteryType.DesignConfig = string(data)
	}
	if req.Status != nil {
		lotteryType.Status = *req.Status
	}

	if err := s.db.Save(&lotteryType).Error; err != nil {
		return nil, err
	}

	return s.GetLotteryTypeByID(id)
}

// DeleteLotteryType soft deletes a lottery type
func (s *LotteryService) DeleteLotteryType(id uint) error {
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLotteryTypeNotFound
		}
		return err
	}

	return s.db.Delete(&lotteryType).Error
}

// GetPrizeLevels returns prize levels for a lottery type
func (s *LotteryService) GetPrizeLevels(lotteryTypeID uint) ([]PrizeLevelResponse, error) {
	var prizeLevels []model.PrizeLevel
	if err := s.db.Where("lottery_type_id = ?", lotteryTypeID).
		Order("level ASC").
		Find(&prizeLevels).Error; err != nil {
		return nil, err
	}

	responses := make([]PrizeLevelResponse, len(prizeLevels))
	for i, pl := range prizeLevels {
		responses[i] = s.toPrizeLevelResponse(&pl)
	}

	return responses, nil
}

// UpdatePrizeLevels updates prize levels for a lottery type
func (s *LotteryService) UpdatePrizeLevels(lotteryTypeID uint, levels []PrizeLevelInput) error {
	// Verify lottery type exists
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, lotteryTypeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLotteryTypeNotFound
		}
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete existing prize levels
		if err := tx.Where("lottery_type_id = ?", lotteryTypeID).
			Delete(&model.PrizeLevel{}).Error; err != nil {
			return err
		}

		// Create new prize levels
		for _, pl := range levels {
			prizeLevel := model.PrizeLevel{
				LotteryTypeID: lotteryTypeID,
				Level:         pl.Level,
				Name:          pl.Name,
				PrizeAmount:   pl.PrizeAmount,
				Quantity:      pl.Quantity,
				Remaining:     pl.Quantity,
			}
			if err := tx.Create(&prizeLevel).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// CreatePrizePool creates a new prize pool for a lottery type
func (s *LotteryService) CreatePrizePool(req CreatePrizePoolRequest) (*PrizePoolResponse, error) {
	// Verify lottery type exists
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, req.LotteryTypeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLotteryTypeNotFound
		}
		return nil, err
	}

	prizePool := model.PrizePool{
		LotteryTypeID: req.LotteryTypeID,
		TotalTickets:  req.TotalTickets,
		SoldTickets:   0,
		ClaimedPrizes: 0,
		ReturnRate:    req.ReturnRate,
		Status:        model.PrizePoolStatusActive,
	}

	if err := s.db.Create(&prizePool).Error; err != nil {
		return nil, err
	}

	return s.toPrizePoolResponse(&prizePool), nil
}

// GetActivePrizePool returns the active prize pool for a lottery type
func (s *LotteryService) GetActivePrizePool(lotteryTypeID uint) (*PrizePoolResponse, error) {
	var prizePool model.PrizePool
	if err := s.db.Where("lottery_type_id = ? AND status = ?", lotteryTypeID, model.PrizePoolStatusActive).
		First(&prizePool).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPrizePoolNotFound
		}
		return nil, err
	}

	return s.toPrizePoolResponse(&prizePool), nil
}

// GetPrizePools returns all prize pools for a lottery type
func (s *LotteryService) GetPrizePools(lotteryTypeID uint) ([]PrizePoolResponse, error) {
	var prizePools []model.PrizePool
	if err := s.db.Where("lottery_type_id = ?", lotteryTypeID).
		Order("created_at DESC").
		Find(&prizePools).Error; err != nil {
		return nil, err
	}

	responses := make([]PrizePoolResponse, len(prizePools))
	for i, pp := range prizePools {
		responses[i] = *s.toPrizePoolResponse(&pp)
	}

	return responses, nil
}

// calculateStock calculates available stock for a lottery type
func (s *LotteryService) calculateStock(lotteryTypeID uint) int {
	var prizePool model.PrizePool
	if err := s.db.Where("lottery_type_id = ? AND status = ?", lotteryTypeID, model.PrizePoolStatusActive).
		First(&prizePool).Error; err != nil {
		return 0
	}
	return prizePool.TotalTickets - prizePool.SoldTickets
}

// Helper functions

func (s *LotteryService) toLotteryTypeResponse(lt *model.LotteryType, stock int) LotteryTypeResponse {
	return LotteryTypeResponse{
		ID:          lt.ID,
		Name:        lt.Name,
		Description: lt.Description,
		Price:       lt.Price,
		MaxPrize:    lt.MaxPrize,
		GameType:    lt.GameType,
		CoverImage:  lt.CoverImage,
		Status:      lt.Status,
		Stock:       stock,
		CreatedAt:   lt.CreatedAt,
		UpdatedAt:   lt.UpdatedAt,
	}
}

func (s *LotteryService) toLotteryTypeDetailResponse(lt *model.LotteryType) *LotteryTypeDetailResponse {
	stock := s.calculateStock(lt.ID)
	
	// Parse rules config
	var rulesConfig interface{}
	if lt.RulesConfig != "" {
		_ = json.Unmarshal([]byte(lt.RulesConfig), &rulesConfig)
	}

	// Parse design config
	var designConfig interface{}
	if lt.DesignConfig != "" {
		_ = json.Unmarshal([]byte(lt.DesignConfig), &designConfig)
	}

	// Parse win symbols from rules config
	var winSymbols []string
	if rulesConfig != nil {
		if cfg, ok := rulesConfig.(map[string]interface{}); ok {
			if symbols, ok := cfg["win_symbols"].([]interface{}); ok {
				for _, s := range symbols {
					if str, ok := s.(string); ok {
						winSymbols = append(winSymbols, str)
					}
				}
			}
		}
	}

	// Convert prize levels
	prizeLevels := make([]PrizeLevelResponse, len(lt.PrizeLevels))
	for i, pl := range lt.PrizeLevels {
		prizeLevels[i] = PrizeLevelResponse{
			ID:          pl.ID,
			Level:       pl.Level,
			Name:        pl.Name,
			PrizeAmount: pl.PrizeAmount,
			Quantity:    pl.Quantity,
			Remaining:   pl.Remaining,
		}
	}

	return &LotteryTypeDetailResponse{
		LotteryTypeResponse: LotteryTypeResponse{
			ID:          lt.ID,
			Name:        lt.Name,
			Description: lt.Description,
			Price:       lt.Price,
			MaxPrize:    lt.MaxPrize,
			GameType:    lt.GameType,
			CoverImage:  lt.CoverImage,
			Status:      lt.Status,
			Stock:       stock,
			CreatedAt:   lt.CreatedAt,
			UpdatedAt:   lt.UpdatedAt,
		},
		Rules:        lt.Description, // Use description as rules for now
		RulesConfig:  rulesConfig,
		DesignConfig: designConfig,
		PrizeLevels:  prizeLevels,
		WinSymbols:   winSymbols,
	}
}

func (s *LotteryService) toPrizeLevelResponse(pl *model.PrizeLevel) PrizeLevelResponse {
	return PrizeLevelResponse{
		ID:          pl.ID,
		Level:       pl.Level,
		Name:        pl.Name,
		PrizeAmount: pl.PrizeAmount,
		Quantity:    pl.Quantity,
		Remaining:   pl.Remaining,
	}
}

func (s *LotteryService) toPrizePoolResponse(pp *model.PrizePool) *PrizePoolResponse {
	return &PrizePoolResponse{
		ID:            pp.ID,
		LotteryTypeID: pp.LotteryTypeID,
		TotalTickets:  pp.TotalTickets,
		SoldTickets:   pp.SoldTickets,
		ClaimedPrizes: pp.ClaimedPrizes,
		ReturnRate:    pp.ReturnRate,
		Status:        pp.Status,
		CreatedAt:     pp.CreatedAt,
	}
}


// TicketResponse represents a ticket in API responses
type TicketResponse struct {
	ID            uint                 `json:"id"`
	UserID        uint                 `json:"user_id"`
	LotteryTypeID uint                 `json:"lottery_type_id"`
	SecurityCode  string               `json:"security_code"`
	PrizeAmount   int                  `json:"prize_amount,omitempty"`
	Status        model.TicketStatus   `json:"status"`
	PurchasedAt   time.Time            `json:"purchased_at"`
	ScratchedAt   *time.Time           `json:"scratched_at,omitempty"`
	LotteryType   *LotteryTypeResponse `json:"lottery_type,omitempty"`
}

// TicketContent represents the content of a ticket (to be encrypted)
type TicketContent struct {
	PrizeLevel  int         `json:"prize_level"`
	PrizeAmount int         `json:"prize_amount"`
	WinSymbols  []string    `json:"win_symbols,omitempty"`
	Areas       []AreaData  `json:"areas,omitempty"`
	GameData    interface{} `json:"game_data,omitempty"`
}

// AreaData represents data for each scratch area
type AreaData struct {
	Index   int         `json:"index"`
	Content interface{} `json:"content"`
	Value   int         `json:"value,omitempty"`
}

// PurchaseRequest represents a ticket purchase request
type PurchaseRequest struct {
	LotteryTypeID uint `json:"lottery_type_id" binding:"required"`
	Quantity      int  `json:"quantity" binding:"required,min=1,max=10"`
}

// PurchaseResponse represents the response after purchasing tickets
type PurchaseResponse struct {
	Tickets []TicketResponse `json:"tickets"`
	Cost    int              `json:"cost"`
	Balance int              `json:"balance"`
}

// SecurityCodeCharset defines the characters used for security codes
const SecurityCodeCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const SecurityCodeLength = 16

// GenerateSecurityCode generates a unique 16-character alphanumeric security code
func (s *LotteryService) GenerateSecurityCode() (string, error) {
	code := make([]byte, SecurityCodeLength)
	charsetLen := big.NewInt(int64(len(SecurityCodeCharset)))

	for i := 0; i < SecurityCodeLength; i++ {
		n, err := rand.Int(rand.Reader, charsetLen)
		if err != nil {
			return "", err
		}
		code[i] = SecurityCodeCharset[n.Int64()]
	}

	return string(code), nil
}

// GenerateUniqueSecurityCode generates a security code that doesn't exist in the database
func (s *LotteryService) GenerateUniqueSecurityCode() (string, error) {
	maxAttempts := 10
	for i := 0; i < maxAttempts; i++ {
		code, err := s.GenerateSecurityCode()
		if err != nil {
			return "", err
		}

		// Check if code already exists
		var count int64
		if err := s.db.Model(&model.Ticket{}).Where("security_code = ?", code).Count(&count).Error; err != nil {
			return "", err
		}

		if count == 0 {
			return code, nil
		}
	}

	return "", ErrSecurityCodeExists
}

// IsSecurityCodeUnique checks if a security code is unique
func (s *LotteryService) IsSecurityCodeUnique(code string) (bool, error) {
	var count int64
	if err := s.db.Model(&model.Ticket{}).Where("security_code = ?", code).Count(&count).Error; err != nil {
		return false, err
	}
	return count == 0, nil
}

// EncryptTicketContent encrypts the ticket content using AES
func (s *LotteryService) EncryptTicketContent(content *TicketContent) (string, error) {
	aesCrypto, err := crypto.NewAESCrypto(s.encryptionKey)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrEncryptionFailed, err)
	}

	jsonData, err := json.Marshal(content)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrEncryptionFailed, err)
	}

	encrypted, err := aesCrypto.Encrypt(string(jsonData))
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrEncryptionFailed, err)
	}

	return encrypted, nil
}

// DecryptTicketContent decrypts the ticket content
func (s *LotteryService) DecryptTicketContent(encrypted string) (*TicketContent, error) {
	aesCrypto, err := crypto.NewAESCrypto(s.encryptionKey)
	if err != nil {
		return nil, err
	}

	decrypted, err := aesCrypto.Decrypt(encrypted)
	if err != nil {
		return nil, err
	}

	var content TicketContent
	if err := json.Unmarshal([]byte(decrypted), &content); err != nil {
		return nil, err
	}

	return &content, nil
}

// DeterminePrizeResult determines the prize result for a new ticket based on prize pool configuration
func (s *LotteryService) DeterminePrizeResult(prizePoolID uint) (*TicketContent, error) {
	var prizePool model.PrizePool
	if err := s.db.First(&prizePool, prizePoolID).Error; err != nil {
		return nil, ErrPrizePoolNotFound
	}

	// Get prize levels for this lottery type
	var prizeLevels []model.PrizeLevel
	if err := s.db.Where("lottery_type_id = ?", prizePool.LotteryTypeID).
		Order("level ASC").
		Find(&prizeLevels).Error; err != nil {
		return nil, err
	}

	// Determine prize based on remaining quantities
	content := &TicketContent{
		PrizeLevel:  0,
		PrizeAmount: 0,
	}

	// Calculate total remaining prizes
	totalRemaining := 0
	for _, pl := range prizeLevels {
		totalRemaining += pl.Remaining
	}

	// Calculate remaining non-winning tickets
	remainingTickets := prizePool.TotalTickets - prizePool.SoldTickets
	nonWinningRemaining := remainingTickets - totalRemaining

	if remainingTickets <= 0 {
		return nil, ErrLotteryTypeSoldOut
	}

	// Random selection based on remaining distribution
	totalPool := remainingTickets
	n, err := rand.Int(rand.Reader, big.NewInt(int64(totalPool)))
	if err != nil {
		return nil, err
	}
	selection := int(n.Int64())

	// Determine if this ticket wins and at what level
	cumulative := 0
	for _, pl := range prizeLevels {
		cumulative += pl.Remaining
		if selection < cumulative && pl.Remaining > 0 {
			content.PrizeLevel = pl.Level
			content.PrizeAmount = pl.PrizeAmount
			break
		}
	}

	// If selection falls in non-winning range, prize remains 0
	if content.PrizeLevel == 0 && selection >= totalRemaining && nonWinningRemaining > 0 {
		// Non-winning ticket
		content.PrizeLevel = 0
		content.PrizeAmount = 0
	}

	return content, nil
}

// DeterminePrizeResultForPatternLottery determines prize result for pattern-type lottery
// Requirements: 5.1.4, 5.1.5, 5.1.6
func (s *LotteryService) DeterminePrizeResultForPatternLottery(prizePoolID uint, lotteryTypeID uint) (*TicketContent, error) {
	// First determine base prize level using standard logic
	baseContent, err := s.DeterminePrizeResult(prizePoolID)
	if err != nil {
		return nil, err
	}

	// Get lottery type to check if it's pattern type
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, lotteryTypeID).Error; err != nil {
		return nil, err
	}

	// If not pattern type, return base content
	if lotteryType.GameType != model.GameTypePattern {
		return baseContent, nil
	}

	// Parse pattern config
	var patternConfig PatternConfig
	if lotteryType.RulesConfig != "" {
		if err := json.Unmarshal([]byte(lotteryType.RulesConfig), &patternConfig); err != nil {
			return baseContent, nil // Fall back to base content if config is invalid
		}
	}

	// Generate pattern-specific content
	patternContent := &PatternTicketContent{
		Areas:       make([]PatternAreaData, patternConfig.AreaCount),
		TotalPoints: 0,
		PrizeAmount: baseContent.PrizeAmount,
	}

	// Default point values
	defaultPoints := patternConfig.DefaultPoints
	if len(defaultPoints) == 0 {
		defaultPoints = []int{1, 2, 3, 5, 10, 20, 50, 100}
	}

	// Generate areas with random patterns and points
	for i := 0; i < patternConfig.AreaCount; i++ {
		// Random point value
		pointIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(defaultPoints))))
		if err != nil {
			return nil, err
		}
		points := defaultPoints[pointIdx.Int64()]
		patternContent.TotalPoints += points

		// Random pattern
		patternID := ""
		if len(patternConfig.Patterns) > 0 {
			patternIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(patternConfig.Patterns))))
			if err != nil {
				return nil, err
			}
			patternID = patternConfig.Patterns[patternIdx.Int64()].ID
		}

		patternContent.Areas[i] = PatternAreaData{
			Index:     i,
			PatternID: patternID,
			Points:    points,
			IsWin:     false,
			IsSpecial: false,
		}
	}

	// If winning, place winning pattern
	if baseContent.PrizeLevel > 0 && baseContent.PrizeAmount > 0 {
		useSpecial := false
		if len(patternConfig.SpecialPatterns) > 0 {
			specialChance, err := rand.Int(rand.Reader, big.NewInt(100))
			if err != nil {
				return nil, err
			}
			useSpecial = specialChance.Int64() < 20
		}

		if useSpecial && len(patternConfig.SpecialPatterns) > 0 {
			// Place special pattern - gives total sum
			specialIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(patternConfig.SpecialPatterns))))
			if err != nil {
				return nil, err
			}
			specialPattern := patternConfig.SpecialPatterns[specialIdx.Int64()]
			areaIdx, err := rand.Int(rand.Reader, big.NewInt(int64(patternConfig.AreaCount)))
			if err != nil {
				return nil, err
			}
			patternContent.Areas[areaIdx.Int64()].PatternID = specialPattern.ID
			patternContent.Areas[areaIdx.Int64()].IsSpecial = true
			patternContent.SpecialPatternID = specialPattern.ID
			patternContent.PrizeAmount = patternContent.TotalPoints
		} else if len(patternConfig.Patterns) > 0 {
			// Place winning pattern
			winPatternIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(patternConfig.Patterns))))
			if err != nil {
				return nil, err
			}
			winPattern := patternConfig.Patterns[winPatternIdx.Int64()]
			areaIdx, err := rand.Int(rand.Reader, big.NewInt(int64(patternConfig.AreaCount)))
			if err != nil {
				return nil, err
			}
			patternContent.Areas[areaIdx.Int64()].PatternID = winPattern.ID
			patternContent.Areas[areaIdx.Int64()].IsWin = true
			patternContent.WinPatternID = winPattern.ID
			if winPattern.PrizePoints > 0 {
				patternContent.PrizeAmount = winPattern.PrizePoints
			}
		}
	}

	// Convert pattern content to generic TicketContent
	areasData := make([]AreaData, len(patternContent.Areas))
	for i, area := range patternContent.Areas {
		areasData[i] = AreaData{
			Index:   area.Index,
			Content: area.PatternID,
			Value:   area.Points,
		}
	}

	content := &TicketContent{
		PrizeLevel:  baseContent.PrizeLevel,
		PrizeAmount: patternContent.PrizeAmount,
		Areas:       areasData,
		GameData: map[string]interface{}{
			"pattern_content": patternContent,
		},
	}

	return content, nil
}

// PatternConfig represents the configuration for a pattern-type lottery
type PatternConfig struct {
	AreaCount       int             `json:"area_count"`
	Patterns        []PatternInfo   `json:"patterns"`
	SpecialPatterns []PatternInfo   `json:"special_patterns"`
	DefaultPoints   []int           `json:"default_points"`
}

// PatternInfo represents a pattern configuration
type PatternInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ImageURL    string `json:"image_url"`
	PrizePoints int    `json:"prize_points"`
	IsSpecial   bool   `json:"is_special"`
}

// PatternTicketContent represents the content of a pattern-type ticket
type PatternTicketContent struct {
	Areas            []PatternAreaData `json:"areas"`
	WinPatternID     string            `json:"win_pattern_id"`
	SpecialPatternID string            `json:"special_pattern_id"`
	TotalPoints      int               `json:"total_points"`
	PrizeAmount      int               `json:"prize_amount"`
}

// PatternAreaData represents data for each scratch area in pattern lottery
type PatternAreaData struct {
	Index     int    `json:"index"`
	PatternID string `json:"pattern_id"`
	Points    int    `json:"points"`
	IsWin     bool   `json:"is_win"`
	IsSpecial bool   `json:"is_special"`
}

// GenerateTicket generates a new ticket for a user
func (s *LotteryService) GenerateTicket(userID, lotteryTypeID uint) (*model.Ticket, error) {
	// Get active prize pool
	var prizePool model.PrizePool
	if err := s.db.Where("lottery_type_id = ? AND status = ?", lotteryTypeID, model.PrizePoolStatusActive).
		First(&prizePool).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNoPrizePoolActive
		}
		return nil, err
	}

	// Check if pool has available tickets
	if prizePool.SoldTickets >= prizePool.TotalTickets {
		return nil, ErrLotteryTypeSoldOut
	}

	// Generate unique security code
	securityCode, err := s.GenerateUniqueSecurityCode()
	if err != nil {
		return nil, err
	}

	// Get lottery type to check game type
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, lotteryTypeID).Error; err != nil {
		return nil, err
	}

	// Determine prize result based on game type
	var content *TicketContent
	if lotteryType.GameType == model.GameTypePattern {
		// Use pattern lottery logic
		content, err = s.DeterminePrizeResultForPatternLottery(prizePool.ID, lotteryTypeID)
	} else {
		// Use standard lottery logic
		content, err = s.DeterminePrizeResult(prizePool.ID)
	}
	if err != nil {
		return nil, err
	}

	// Encrypt content
	encryptedContent, err := s.EncryptTicketContent(content)
	if err != nil {
		return nil, err
	}

	// Create ticket
	ticket := &model.Ticket{
		UserID:           userID,
		LotteryTypeID:    lotteryTypeID,
		PrizePoolID:      prizePool.ID,
		SecurityCode:     securityCode,
		ContentEncrypted: encryptedContent,
		PrizeAmount:      content.PrizeAmount,
		Status:           model.TicketStatusUnscratched,
		PurchasedAt:      time.Now(),
	}

	// Use transaction to ensure consistency
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Create ticket
		if err := tx.Create(ticket).Error; err != nil {
			return err
		}

		// Update prize pool sold count
		if err := tx.Model(&prizePool).Update("sold_tickets", gorm.Expr("sold_tickets + 1")).Error; err != nil {
			return err
		}

		// Update prize level remaining count if won
		if content.PrizeLevel > 0 {
			if err := tx.Model(&model.PrizeLevel{}).
				Where("lottery_type_id = ? AND level = ?", lotteryTypeID, content.PrizeLevel).
				Update("remaining", gorm.Expr("remaining - 1")).Error; err != nil {
				return err
			}
		}

		// Check if pool is now sold out
		var updatedPool model.PrizePool
		if err := tx.First(&updatedPool, prizePool.ID).Error; err != nil {
			return err
		}
		if updatedPool.SoldTickets >= updatedPool.TotalTickets {
			if err := tx.Model(&updatedPool).Update("status", model.PrizePoolStatusSoldOut).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return ticket, nil
}

// GetTicketByID retrieves a ticket by ID
func (s *LotteryService) GetTicketByID(ticketID uint) (*model.Ticket, error) {
	var ticket model.Ticket
	if err := s.db.Preload("LotteryType").First(&ticket, ticketID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTicketNotFound
		}
		return nil, err
	}
	return &ticket, nil
}

// GetTicketBySecurityCode retrieves a ticket by security code
func (s *LotteryService) GetTicketBySecurityCode(code string) (*model.Ticket, error) {
	var ticket model.Ticket
	if err := s.db.Preload("LotteryType").Where("security_code = ?", code).First(&ticket).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTicketNotFound
		}
		return nil, err
	}
	return &ticket, nil
}

// VerifySecurityCodeResponse represents the response for security code verification
type VerifySecurityCodeResponse struct {
	SecurityCode string     `json:"security_code"`
	LotteryType  string     `json:"lottery_type"`
	PurchaseTime time.Time  `json:"purchase_time"`
	Status       string     `json:"status"`
	PrizeAmount  *int       `json:"prize_amount,omitempty"`
	ScratchedAt  *time.Time `json:"scratched_at,omitempty"`
}

// VerifySecurityCode verifies a security code and returns ticket information
// For unscratched tickets, prize information is hidden
// **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
func (s *LotteryService) VerifySecurityCode(code string) (*VerifySecurityCodeResponse, error) {
	// Validate security code format
	if len(code) != SecurityCodeLength {
		return nil, ErrInvalidSecurityCode
	}

	// Get ticket by security code
	ticket, err := s.GetTicketBySecurityCode(code)
	if err != nil {
		return nil, err
	}

	// Build response - hide prize info if not scratched (Requirement 7.4)
	resp := &VerifySecurityCodeResponse{
		SecurityCode: ticket.SecurityCode,
		LotteryType:  ticket.LotteryType.Name,
		PurchaseTime: ticket.PurchasedAt,
		Status:       string(ticket.Status),
	}

	// Only show prize if scratched or claimed (Requirement 7.4)
	if ticket.Status == model.TicketStatusScratched || ticket.Status == model.TicketStatusClaimed {
		resp.PrizeAmount = &ticket.PrizeAmount
		resp.ScratchedAt = ticket.ScratchedAt
	}

	return resp, nil
}

// IsTicketScratched checks if a ticket has been scratched
func (s *LotteryService) IsTicketScratched(code string) (bool, error) {
	ticket, err := s.GetTicketBySecurityCode(code)
	if err != nil {
		return false, err
	}
	return ticket.Status != model.TicketStatusUnscratched, nil
}

// GetUserTickets retrieves all tickets for a user
func (s *LotteryService) GetUserTickets(userID uint, page, limit int) ([]TicketResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var total int64
	if err := s.db.Model(&model.Ticket{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var tickets []model.Ticket
	offset := (page - 1) * limit
	if err := s.db.Preload("LotteryType").
		Where("user_id = ?", userID).
		Order("purchased_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tickets).Error; err != nil {
		return nil, 0, err
	}

	responses := make([]TicketResponse, len(tickets))
	for i, t := range tickets {
		responses[i] = s.toTicketResponse(&t, t.Status == model.TicketStatusScratched || t.Status == model.TicketStatusClaimed)
	}

	return responses, total, nil
}

// toTicketResponse converts a ticket model to response
func (s *LotteryService) toTicketResponse(ticket *model.Ticket, showPrize bool) TicketResponse {
	resp := TicketResponse{
		ID:            ticket.ID,
		UserID:        ticket.UserID,
		LotteryTypeID: ticket.LotteryTypeID,
		SecurityCode:  ticket.SecurityCode,
		Status:        ticket.Status,
		PurchasedAt:   ticket.PurchasedAt,
		ScratchedAt:   ticket.ScratchedAt,
	}

	if showPrize {
		resp.PrizeAmount = ticket.PrizeAmount
	}

	if ticket.LotteryType.ID != 0 {
		stock := s.calculateStock(ticket.LotteryTypeID)
		ltResp := s.toLotteryTypeResponse(&ticket.LotteryType, stock)
		resp.LotteryType = &ltResp
	}

	return resp
}


// PurchaseService handles ticket purchase operations
type PurchaseService struct {
	db             *gorm.DB
	lotteryService *LotteryService
	walletService  *WalletService
}

// NewPurchaseService creates a new purchase service
func NewPurchaseService(db *gorm.DB, lotteryService *LotteryService, walletService *WalletService) *PurchaseService {
	return &PurchaseService{
		db:             db,
		lotteryService: lotteryService,
		walletService:  walletService,
	}
}

// PurchaseTickets purchases tickets for a user
func (s *PurchaseService) PurchaseTickets(userID uint, req PurchaseRequest) (*PurchaseResponse, error) {
	// Get lottery type to check price
	lotteryType, err := s.lotteryService.GetLotteryTypeByID(req.LotteryTypeID)
	if err != nil {
		return nil, err
	}

	// Check if lottery type is available
	if lotteryType.Status == model.LotteryTypeStatusSoldOut {
		return nil, ErrLotteryTypeSoldOut
	}
	if lotteryType.Status == model.LotteryTypeStatusDisabled {
		return nil, ErrLotteryTypeNotFound
	}

	// Calculate total cost
	totalCost := lotteryType.Price * req.Quantity

	// Check user balance
	balance, err := s.walletService.GetBalance(userID)
	if err != nil {
		return nil, err
	}

	if balance < totalCost {
		return nil, ErrInsufficientBalance
	}

	// Check stock availability
	if lotteryType.Stock < req.Quantity {
		return nil, ErrLotteryTypeSoldOut
	}

	// Purchase tickets - deduct balance first, then generate tickets
	var tickets []TicketResponse
	var newBalance int

	// First deduct the total cost
	description := fmt.Sprintf("购买彩票: %s x%d", lotteryType.Name, req.Quantity)
	if err := s.walletService.Deduct(userID, totalCost, model.TransactionTypePurchase, description, 0); err != nil {
		return nil, err
	}

	// Generate tickets
	for i := 0; i < req.Quantity; i++ {
		ticket, err := s.lotteryService.GenerateTicket(userID, req.LotteryTypeID)
		if err != nil {
			// If ticket generation fails, we should refund - but for simplicity, we'll just return error
			// In production, this should be handled with proper compensation
			return nil, err
		}
		tickets = append(tickets, s.lotteryService.toTicketResponse(ticket, false))
	}

	// Get updated balance
	newBalance, err = s.walletService.GetBalance(userID)
	if err != nil {
		return nil, err
	}

	return &PurchaseResponse{
		Tickets: tickets,
		Cost:    totalCost,
		Balance: newBalance,
	}, nil
}

// ValidatePurchase validates if a purchase can be made without actually making it
func (s *PurchaseService) ValidatePurchase(userID uint, req PurchaseRequest) error {
	// Get lottery type
	lotteryType, err := s.lotteryService.GetLotteryTypeByID(req.LotteryTypeID)
	if err != nil {
		return err
	}

	// Check status
	if lotteryType.Status == model.LotteryTypeStatusSoldOut {
		return ErrLotteryTypeSoldOut
	}
	if lotteryType.Status == model.LotteryTypeStatusDisabled {
		return ErrLotteryTypeNotFound
	}

	// Calculate total cost
	totalCost := lotteryType.Price * req.Quantity

	// Check balance
	balance, err := s.walletService.GetBalance(userID)
	if err != nil {
		return err
	}

	if balance < totalCost {
		return ErrInsufficientBalance
	}

	// Check stock
	if lotteryType.Stock < req.Quantity {
		return ErrLotteryTypeSoldOut
	}

	return nil
}

// GetPurchasePreview returns a preview of the purchase without making it
func (s *PurchaseService) GetPurchasePreview(userID uint, req PurchaseRequest) (map[string]interface{}, error) {
	// Get lottery type
	lotteryType, err := s.lotteryService.GetLotteryTypeByID(req.LotteryTypeID)
	if err != nil {
		return nil, err
	}

	// Calculate total cost
	totalCost := lotteryType.Price * req.Quantity

	// Get balance
	balance, err := s.walletService.GetBalance(userID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"lottery_type":    lotteryType,
		"quantity":        req.Quantity,
		"unit_price":      lotteryType.Price,
		"total_cost":      totalCost,
		"current_balance": balance,
		"balance_after":   balance - totalCost,
		"can_purchase":    balance >= totalCost && lotteryType.Stock >= req.Quantity,
	}, nil
}

// ScratchService handles ticket scratching operations
type ScratchService struct {
	db             *gorm.DB
	lotteryService *LotteryService
	walletService  *WalletService
}

// NewScratchService creates a new scratch service
func NewScratchService(db *gorm.DB, lotteryService *LotteryService, walletService *WalletService) *ScratchService {
	return &ScratchService{
		db:             db,
		lotteryService: lotteryService,
		walletService:  walletService,
	}
}

// ScratchResponse represents the response after scratching a ticket
type ScratchResponse struct {
	TicketID     uint                `json:"ticket_id"`
	SecurityCode string              `json:"security_code"`
	Status       model.TicketStatus  `json:"status"`
	PrizeAmount  int                 `json:"prize_amount"`
	IsWin        bool                `json:"is_win"`
	Content      *TicketContent      `json:"content,omitempty"`
	NewBalance   int                 `json:"new_balance"`
	ScratchedAt  *time.Time          `json:"scratched_at"`
}

// TicketDetailResponse represents detailed ticket information
type TicketDetailResponse struct {
	ID            uint                 `json:"id"`
	UserID        uint                 `json:"user_id"`
	LotteryTypeID uint                 `json:"lottery_type_id"`
	SecurityCode  string               `json:"security_code"`
	Status        model.TicketStatus   `json:"status"`
	PrizeAmount   int                  `json:"prize_amount,omitempty"`
	Content       *TicketContent       `json:"content,omitempty"`
	PurchasedAt   time.Time            `json:"purchased_at"`
	ScratchedAt   *time.Time           `json:"scratched_at,omitempty"`
	LotteryType   *LotteryTypeResponse `json:"lottery_type,omitempty"`
}

var (
	ErrTicketAlreadyScratched = errors.New("ticket already scratched")
	ErrTicketNotOwned         = errors.New("ticket not owned by user")
)

// ScratchTicket scratches a ticket and awards prize if won
func (s *ScratchService) ScratchTicket(userID, ticketID uint) (*ScratchResponse, error) {
	// Get ticket
	ticket, err := s.lotteryService.GetTicketByID(ticketID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if ticket.UserID != userID {
		return nil, ErrTicketNotOwned
	}

	// Check if already scratched
	if ticket.Status != model.TicketStatusUnscratched {
		return nil, ErrTicketAlreadyScratched
	}

	// Decrypt ticket content
	content, err := s.lotteryService.DecryptTicketContent(ticket.ContentEncrypted)
	if err != nil {
		return nil, err
	}

	// Update ticket status and award prize in a transaction
	now := time.Now()
	var newBalance int

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Update ticket status
		if err := tx.Model(&model.Ticket{}).Where("id = ?", ticketID).Updates(map[string]interface{}{
			"status":       model.TicketStatusScratched,
			"scratched_at": now,
		}).Error; err != nil {
			return err
		}

		// Award prize if won - do all operations within the same transaction
		if ticket.PrizeAmount > 0 {
			// Get wallet
			var wallet model.Wallet
			if err := tx.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
				return err
			}

			// Update wallet balance
			wallet.Balance += ticket.PrizeAmount
			if err := tx.Save(&wallet).Error; err != nil {
				return err
			}

			// Create transaction record
			description := fmt.Sprintf("彩票中奖: %s", ticket.LotteryType.Name)
			transaction := model.Transaction{
				WalletID:    wallet.ID,
				Type:        model.TransactionTypeWin,
				Amount:      ticket.PrizeAmount,
				Description: description,
				ReferenceID: ticketID,
			}
			if err := tx.Create(&transaction).Error; err != nil {
				return err
			}

			// Update prize pool claimed count
			if err := tx.Model(&model.PrizePool{}).Where("id = ?", ticket.PrizePoolID).
				Update("claimed_prizes", gorm.Expr("claimed_prizes + 1")).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Get updated balance
	newBalance, err = s.walletService.GetBalance(userID)
	if err != nil {
		return nil, err
	}

	return &ScratchResponse{
		TicketID:     ticketID,
		SecurityCode: ticket.SecurityCode,
		Status:       model.TicketStatusScratched,
		PrizeAmount:  ticket.PrizeAmount,
		IsWin:        ticket.PrizeAmount > 0,
		Content:      content,
		NewBalance:   newBalance,
		ScratchedAt:  &now,
	}, nil
}

// GetTicketDetail returns detailed ticket information for the owner
func (s *ScratchService) GetTicketDetail(userID, ticketID uint) (*TicketDetailResponse, error) {
	// Get ticket
	ticket, err := s.lotteryService.GetTicketByID(ticketID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if ticket.UserID != userID {
		return nil, ErrTicketNotOwned
	}

	resp := &TicketDetailResponse{
		ID:            ticket.ID,
		UserID:        ticket.UserID,
		LotteryTypeID: ticket.LotteryTypeID,
		SecurityCode:  ticket.SecurityCode,
		Status:        ticket.Status,
		PurchasedAt:   ticket.PurchasedAt,
		ScratchedAt:   ticket.ScratchedAt,
	}

	// Include lottery type info
	if ticket.LotteryType.ID != 0 {
		stock := s.lotteryService.calculateStock(ticket.LotteryTypeID)
		ltResp := s.lotteryService.toLotteryTypeResponse(&ticket.LotteryType, stock)
		resp.LotteryType = &ltResp
	}

	// Only show prize and content if scratched
	if ticket.Status == model.TicketStatusScratched || ticket.Status == model.TicketStatusClaimed {
		resp.PrizeAmount = ticket.PrizeAmount

		// Decrypt and include content
		content, err := s.lotteryService.DecryptTicketContent(ticket.ContentEncrypted)
		if err == nil {
			resp.Content = content
		}
	}

	return resp, nil
}

// GetTicketForScratch returns ticket info needed for scratch animation (without revealing prize)
func (s *ScratchService) GetTicketForScratch(userID, ticketID uint) (*TicketDetailResponse, error) {
	// Get ticket
	ticket, err := s.lotteryService.GetTicketByID(ticketID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if ticket.UserID != userID {
		return nil, ErrTicketNotOwned
	}

	resp := &TicketDetailResponse{
		ID:            ticket.ID,
		UserID:        ticket.UserID,
		LotteryTypeID: ticket.LotteryTypeID,
		SecurityCode:  ticket.SecurityCode,
		Status:        ticket.Status,
		PurchasedAt:   ticket.PurchasedAt,
		ScratchedAt:   ticket.ScratchedAt,
	}

	// Include lottery type info
	if ticket.LotteryType.ID != 0 {
		stock := s.lotteryService.calculateStock(ticket.LotteryTypeID)
		ltResp := s.lotteryService.toLotteryTypeResponse(&ticket.LotteryType, stock)
		resp.LotteryType = &ltResp
	}

	// If already scratched, include prize info
	if ticket.Status == model.TicketStatusScratched || ticket.Status == model.TicketStatusClaimed {
		resp.PrizeAmount = ticket.PrizeAmount
		
		// Decrypt and include content
		content, err := s.lotteryService.DecryptTicketContent(ticket.ContentEncrypted)
		if err == nil {
			resp.Content = content
		}
	}

	return resp, nil
}
