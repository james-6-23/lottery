package service

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"

	"scratch-lottery/internal/model"
	"scratch-lottery/pkg/crypto"

	"gorm.io/gorm"
)

var (
	ErrInvalidPatternConfig = errors.New("invalid pattern lottery configuration")
	ErrInvalidImageFormat   = errors.New("invalid image format, only JPG, PNG, GIF allowed")
	ErrImageTooLarge        = errors.New("image size exceeds limit")
)

// PatternLotteryService handles pattern-type lottery operations
type PatternLotteryService struct {
	db            *gorm.DB
	encryptionKey string
}

// NewPatternLotteryService creates a new pattern lottery service
func NewPatternLotteryService(db *gorm.DB, encryptionKey string) *PatternLotteryService {
	return &PatternLotteryService{db: db, encryptionKey: encryptionKey}
}

// PatternScratchResult represents the result of scratching a pattern area
type PatternScratchResult struct {
	AreaIndex       int    `json:"area_index"`
	PatternID       string `json:"pattern_id"`
	PatternName     string `json:"pattern_name"`
	PatternImageURL string `json:"pattern_image_url"`
	Points          int    `json:"points"`
	IsWin           bool   `json:"is_win"`
	IsSpecial       bool   `json:"is_special"`
	PrizeAwarded    int    `json:"prize_awarded"` // Prize awarded for this scratch (if any)
}

// ValidatePatternConfig validates a pattern lottery configuration
// Requirements: 5.1.1, 5.1.2, 5.1.3
func (s *PatternLotteryService) ValidatePatternConfig(config *PatternConfig) error {
	if config.AreaCount < 1 || config.AreaCount > 100 {
		return fmt.Errorf("%w: area_count must be between 1 and 100", ErrInvalidPatternConfig)
	}

	if len(config.Patterns) == 0 {
		return fmt.Errorf("%w: at least one pattern is required", ErrInvalidPatternConfig)
	}

	// Validate patterns
	patternIDs := make(map[string]bool)
	for _, p := range config.Patterns {
		if p.ID == "" {
			return fmt.Errorf("%w: pattern ID cannot be empty", ErrInvalidPatternConfig)
		}
		if patternIDs[p.ID] {
			return fmt.Errorf("%w: duplicate pattern ID: %s", ErrInvalidPatternConfig, p.ID)
		}
		patternIDs[p.ID] = true
	}

	// Validate special patterns
	for _, p := range config.SpecialPatterns {
		if p.ID == "" {
			return fmt.Errorf("%w: special pattern ID cannot be empty", ErrInvalidPatternConfig)
		}
		if patternIDs[p.ID] {
			return fmt.Errorf("%w: special pattern ID conflicts with regular pattern: %s", ErrInvalidPatternConfig, p.ID)
		}
	}

	return nil
}

// ValidateImageFormat validates image format (JPG, PNG, GIF)
// Requirements: 5.1.2
func (s *PatternLotteryService) ValidateImageFormat(contentType string) error {
	validFormats := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
	}

	if !validFormats[contentType] {
		return ErrInvalidImageFormat
	}
	return nil
}


// GeneratePatternTicketContent generates content for a pattern-type lottery ticket
// Requirements: 5.1.4, 5.1.5, 5.1.6
func (s *PatternLotteryService) GeneratePatternTicketContent(config *PatternConfig, prizeLevel int, prizeAmount int) (*PatternTicketContent, error) {
	if err := s.ValidatePatternConfig(config); err != nil {
		return nil, err
	}

	content := &PatternTicketContent{
		Areas:       make([]PatternAreaData, config.AreaCount),
		TotalPoints: 0,
		PrizeAmount: prizeAmount,
	}

	// Generate random points for each area
	defaultPoints := config.DefaultPoints
	if len(defaultPoints) == 0 {
		// Default point values if not specified
		defaultPoints = []int{1, 2, 3, 5, 10, 20, 50, 100}
	}

	// Calculate total points for all areas
	for i := 0; i < config.AreaCount; i++ {
		// Random point value from default points
		pointIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(defaultPoints))))
		if err != nil {
			return nil, err
		}
		points := defaultPoints[pointIdx.Int64()]
		content.TotalPoints += points

		// Random pattern from available patterns
		patternIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(config.Patterns))))
		if err != nil {
			return nil, err
		}
		pattern := config.Patterns[patternIdx.Int64()]

		content.Areas[i] = PatternAreaData{
			Index:     i,
			PatternID: pattern.ID,
			Points:    points,
			IsWin:     false,
			IsSpecial: false,
		}
	}

	// Determine winning based on prize level
	if prizeLevel > 0 && prizeAmount > 0 {
		// Decide whether to use special pattern or regular winning pattern
		useSpecial := false
		if len(config.SpecialPatterns) > 0 {
			// 20% chance of special pattern win
			specialChance, err := rand.Int(rand.Reader, big.NewInt(100))
			if err != nil {
				return nil, err
			}
			useSpecial = specialChance.Int64() < 20
		}

		if useSpecial {
			// Place special pattern in a random area
			// Requirements: 5.1.5 - Special pattern gives total sum of all areas
			specialIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(config.SpecialPatterns))))
			if err != nil {
				return nil, err
			}
			specialPattern := config.SpecialPatterns[specialIdx.Int64()]

			areaIdx, err := rand.Int(rand.Reader, big.NewInt(int64(config.AreaCount)))
			if err != nil {
				return nil, err
			}
			content.Areas[areaIdx.Int64()].PatternID = specialPattern.ID
			content.Areas[areaIdx.Int64()].IsSpecial = true
			content.SpecialPatternID = specialPattern.ID
			content.PrizeAmount = content.TotalPoints // Special pattern gives total sum
		} else if len(config.Patterns) > 0 {
			// Place winning pattern in a random area
			// Requirements: 5.1.4 - Regular winning pattern gives pattern's prize points
			winPatternIdx, err := rand.Int(rand.Reader, big.NewInt(int64(len(config.Patterns))))
			if err != nil {
				return nil, err
			}
			winPattern := config.Patterns[winPatternIdx.Int64()]

			areaIdx, err := rand.Int(rand.Reader, big.NewInt(int64(config.AreaCount)))
			if err != nil {
				return nil, err
			}
			content.Areas[areaIdx.Int64()].PatternID = winPattern.ID
			content.Areas[areaIdx.Int64()].IsWin = true
			content.WinPatternID = winPattern.ID
			content.PrizeAmount = winPattern.PrizePoints
		}
	}

	return content, nil
}

// EncryptPatternContent encrypts pattern ticket content
func (s *PatternLotteryService) EncryptPatternContent(content *PatternTicketContent) (string, error) {
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

// DecryptPatternContent decrypts pattern ticket content
func (s *PatternLotteryService) DecryptPatternContent(encrypted string) (*PatternTicketContent, error) {
	aesCrypto, err := crypto.NewAESCrypto(s.encryptionKey)
	if err != nil {
		return nil, err
	}

	decrypted, err := aesCrypto.Decrypt(encrypted)
	if err != nil {
		return nil, err
	}

	var content PatternTicketContent
	if err := json.Unmarshal([]byte(decrypted), &content); err != nil {
		return nil, err
	}

	return &content, nil
}

// JudgePatternWin determines the prize for scratching a pattern area
// Requirements: 5.1.4, 5.1.5
func (s *PatternLotteryService) JudgePatternWin(content *PatternTicketContent, areaIndex int, config *PatternConfig) (*PatternScratchResult, error) {
	if areaIndex < 0 || areaIndex >= len(content.Areas) {
		return nil, fmt.Errorf("invalid area index: %d", areaIndex)
	}

	area := content.Areas[areaIndex]
	result := &PatternScratchResult{
		AreaIndex:    areaIndex,
		PatternID:    area.PatternID,
		Points:       area.Points,
		IsWin:        area.IsWin,
		IsSpecial:    area.IsSpecial,
		PrizeAwarded: 0,
	}

	// Find pattern info
	for _, p := range config.Patterns {
		if p.ID == area.PatternID {
			result.PatternName = p.Name
			result.PatternImageURL = p.ImageURL
			break
		}
	}

	// Check special patterns
	for _, p := range config.SpecialPatterns {
		if p.ID == area.PatternID {
			result.PatternName = p.Name
			result.PatternImageURL = p.ImageURL
			result.IsSpecial = true
			break
		}
	}

	// Calculate prize
	if area.IsSpecial {
		// Requirements: 5.1.5 - Special pattern gives total sum of all areas
		result.PrizeAwarded = content.TotalPoints
	} else if area.IsWin {
		// Requirements: 5.1.4 - Regular winning pattern gives pattern's prize points
		for _, p := range config.Patterns {
			if p.ID == area.PatternID {
				result.PrizeAwarded = p.PrizePoints
				break
			}
		}
	}

	return result, nil
}

// GetPatternConfigFromLotteryType extracts pattern config from lottery type
func (s *PatternLotteryService) GetPatternConfigFromLotteryType(lotteryType *model.LotteryType) (*PatternConfig, error) {
	if lotteryType.GameType != model.GameTypePattern {
		return nil, fmt.Errorf("lottery type is not pattern type")
	}

	if lotteryType.RulesConfig == "" {
		return nil, ErrInvalidPatternConfig
	}

	var config PatternConfig
	if err := json.Unmarshal([]byte(lotteryType.RulesConfig), &config); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidPatternConfig, err)
	}

	return &config, nil
}

// CreatePatternLotteryType creates a new pattern-type lottery
func (s *PatternLotteryService) CreatePatternLotteryType(req CreatePatternLotteryTypeRequest) (*model.LotteryType, error) {
	// Validate pattern config
	if err := s.ValidatePatternConfig(&req.PatternConfig); err != nil {
		return nil, err
	}

	// Serialize pattern config to JSON
	configJSON, err := json.Marshal(req.PatternConfig)
	if err != nil {
		return nil, ErrInvalidPatternConfig
	}

	lotteryType := model.LotteryType{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		MaxPrize:    req.MaxPrize,
		GameType:    model.GameTypePattern,
		CoverImage:  req.CoverImage,
		RulesConfig: string(configJSON),
		Status:      model.LotteryTypeStatusAvailable,
	}

	if err := s.db.Create(&lotteryType).Error; err != nil {
		return nil, err
	}

	return &lotteryType, nil
}

// CreatePatternLotteryTypeRequest represents the request to create a pattern lottery type
type CreatePatternLotteryTypeRequest struct {
	Name          string        `json:"name" binding:"required"`
	Description   string        `json:"description"`
	Price         int           `json:"price" binding:"required,gt=0"`
	MaxPrize      int           `json:"max_prize" binding:"required,gt=0"`
	CoverImage    string        `json:"cover_image"`
	PatternConfig PatternConfig `json:"pattern_config" binding:"required"`
}

// UpdatePatternConfig updates the pattern configuration for a lottery type
func (s *PatternLotteryService) UpdatePatternConfig(lotteryTypeID uint, config *PatternConfig) error {
	// Validate config
	if err := s.ValidatePatternConfig(config); err != nil {
		return err
	}

	// Serialize config
	configJSON, err := json.Marshal(config)
	if err != nil {
		return ErrInvalidPatternConfig
	}

	// Update lottery type
	return s.db.Model(&model.LotteryType{}).
		Where("id = ? AND game_type = ?", lotteryTypeID, model.GameTypePattern).
		Update("rules_config", string(configJSON)).Error
}

// GeneratePatternTicket generates a pattern-type lottery ticket
// Requirements: 5.1.6
func (s *PatternLotteryService) GeneratePatternTicket(userID, lotteryTypeID uint, prizePoolID uint, prizeLevel int, prizeAmount int) (*PatternTicketContent, string, error) {
	// Get lottery type
	var lotteryType model.LotteryType
	if err := s.db.First(&lotteryType, lotteryTypeID).Error; err != nil {
		return nil, "", err
	}

	// Get pattern config
	config, err := s.GetPatternConfigFromLotteryType(&lotteryType)
	if err != nil {
		return nil, "", err
	}

	// Generate pattern ticket content
	content, err := s.GeneratePatternTicketContent(config, prizeLevel, prizeAmount)
	if err != nil {
		return nil, "", err
	}

	// Encrypt content
	encrypted, err := s.EncryptPatternContent(content)
	if err != nil {
		return nil, "", err
	}

	return content, encrypted, nil
}

// ScratchPatternArea handles scratching a specific area of a pattern lottery ticket
// Requirements: 5.1.7, 5.1.8
func (s *PatternLotteryService) ScratchPatternArea(ticketID uint, areaIndex int) (*PatternScratchResult, error) {
	// Get ticket
	var ticket model.Ticket
	if err := s.db.Preload("LotteryType").First(&ticket, ticketID).Error; err != nil {
		return nil, err
	}

	// Verify it's a pattern type
	if ticket.LotteryType.GameType != model.GameTypePattern {
		return nil, fmt.Errorf("ticket is not a pattern type lottery")
	}

	// Get pattern config
	config, err := s.GetPatternConfigFromLotteryType(&ticket.LotteryType)
	if err != nil {
		return nil, err
	}

	// Decrypt content
	content, err := s.DecryptPatternContent(ticket.ContentEncrypted)
	if err != nil {
		return nil, err
	}

	// Judge win for this area
	result, err := s.JudgePatternWin(content, areaIndex, config)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// GetPatternTicketAreas returns all areas for a pattern ticket (for display after scratching)
func (s *PatternLotteryService) GetPatternTicketAreas(ticketID uint) ([]PatternAreaData, *PatternConfig, error) {
	// Get ticket
	var ticket model.Ticket
	if err := s.db.Preload("LotteryType").First(&ticket, ticketID).Error; err != nil {
		return nil, nil, err
	}

	// Verify it's a pattern type
	if ticket.LotteryType.GameType != model.GameTypePattern {
		return nil, nil, fmt.Errorf("ticket is not a pattern type lottery")
	}

	// Get pattern config
	config, err := s.GetPatternConfigFromLotteryType(&ticket.LotteryType)
	if err != nil {
		return nil, nil, err
	}

	// Decrypt content
	content, err := s.DecryptPatternContent(ticket.ContentEncrypted)
	if err != nil {
		return nil, nil, err
	}

	return content.Areas, config, nil
}
