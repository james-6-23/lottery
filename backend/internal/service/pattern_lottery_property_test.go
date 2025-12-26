package service

import (
	"testing"

	"scratch-lottery/internal/model"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupPatternLotteryTestDB creates a test database for pattern lottery tests
func setupPatternLotteryTestDB(t *testing.T) *gorm.DB {
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

// createTestPatternConfig creates a test pattern configuration
func createTestPatternConfig(areaCount int, patternCount int, specialPatternCount int) *PatternConfig {
	patterns := make([]PatternInfo, patternCount)
	for i := 0; i < patternCount; i++ {
		patterns[i] = PatternInfo{
			ID:          string(rune('A' + i)),
			Name:        "Pattern " + string(rune('A'+i)),
			ImageURL:    "https://example.com/pattern_" + string(rune('a'+i)) + ".png",
			PrizePoints: (i + 1) * 10,
			IsSpecial:   false,
		}
	}

	specialPatterns := make([]PatternInfo, specialPatternCount)
	for i := 0; i < specialPatternCount; i++ {
		specialPatterns[i] = PatternInfo{
			ID:          "SPECIAL_" + string(rune('A'+i)),
			Name:        "Special Pattern " + string(rune('A'+i)),
			ImageURL:    "https://example.com/special_" + string(rune('a'+i)) + ".png",
			PrizePoints: 0, // Special patterns give total sum, not fixed points
			IsSpecial:   true,
		}
	}

	return &PatternConfig{
		AreaCount:       areaCount,
		Patterns:        patterns,
		SpecialPatterns: specialPatterns,
		DefaultPoints:   []int{1, 2, 3, 5, 10, 20, 50, 100},
	}
}

// Property 13: 图案型彩票中奖判定
// For any pattern-type lottery ticket:
// - Scratching a regular winning pattern should award the pattern's prize points
// - Scratching a special pattern should award the total sum of all areas' points
// **Validates: Requirements 5.1.4, 5.1.5**

func TestProperty13_PatternLotteryWinJudgment(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Property: Regular winning pattern awards pattern's prize points
	// Requirements: 5.1.4
	properties.Property("regular winning pattern awards pattern prize points", prop.ForAll(
		func(areaCount, patternCount int) bool {
			if areaCount < 1 {
				areaCount = 10
			}
			if patternCount < 1 {
				patternCount = 3
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, patternCount, 1)

			// Generate winning ticket content (prizeLevel > 0)
			content, err := patternService.GeneratePatternTicketContent(config, 1, 100)
			if err != nil {
				t.Logf("Failed to generate pattern content: %v", err)
				return false
			}

			// Find the winning area (if any)
			var winningAreaIndex int = -1
			for i, area := range content.Areas {
				if area.IsWin {
					winningAreaIndex = i
					break
				}
			}

			// If there's a winning area, verify the prize
			if winningAreaIndex >= 0 {
				result, err := patternService.JudgePatternWin(content, winningAreaIndex, config)
				if err != nil {
					t.Logf("Failed to judge pattern win: %v", err)
					return false
				}

				// Find the expected prize for this pattern
				expectedPrize := 0
				for _, p := range config.Patterns {
					if p.ID == content.Areas[winningAreaIndex].PatternID {
						expectedPrize = p.PrizePoints
						break
					}
				}

				if result.PrizeAwarded != expectedPrize {
					t.Logf("Prize mismatch for regular win: got %d, want %d", result.PrizeAwarded, expectedPrize)
					return false
				}

				if !result.IsWin {
					t.Log("Winning area should have IsWin=true")
					return false
				}
			}

			return true
		},
		gen.IntRange(5, 20),  // areaCount
		gen.IntRange(2, 5),   // patternCount
	))

	// Property: Special pattern awards total sum of all areas
	// Requirements: 5.1.5
	properties.Property("special pattern awards total sum of all areas", prop.ForAll(
		func(areaCount int) bool {
			if areaCount < 5 {
				areaCount = 10
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, 3, 2)

			// Create content with a special pattern manually
			content := &PatternTicketContent{
				Areas:       make([]PatternAreaData, areaCount),
				TotalPoints: 0,
				PrizeAmount: 0,
			}

			// Fill areas with random points
			for i := 0; i < areaCount; i++ {
				points := (i + 1) * 5 // Deterministic points for testing
				content.TotalPoints += points
				content.Areas[i] = PatternAreaData{
					Index:     i,
					PatternID: config.Patterns[i%len(config.Patterns)].ID,
					Points:    points,
					IsWin:     false,
					IsSpecial: false,
				}
			}

			// Place special pattern in first area
			specialPatternID := config.SpecialPatterns[0].ID
			content.Areas[0].PatternID = specialPatternID
			content.Areas[0].IsSpecial = true
			content.SpecialPatternID = specialPatternID
			content.PrizeAmount = content.TotalPoints

			// Judge the special area
			result, err := patternService.JudgePatternWin(content, 0, config)
			if err != nil {
				t.Logf("Failed to judge pattern win: %v", err)
				return false
			}

			// Special pattern should award total sum
			if result.PrizeAwarded != content.TotalPoints {
				t.Logf("Special pattern prize mismatch: got %d, want %d (total sum)", result.PrizeAwarded, content.TotalPoints)
				return false
			}

			if !result.IsSpecial {
				t.Log("Special area should have IsSpecial=true")
				return false
			}

			return true
		},
		gen.IntRange(5, 20), // areaCount
	))

	// Property: Non-winning areas award zero points
	properties.Property("non-winning areas award zero points", prop.ForAll(
		func(areaCount, patternCount int) bool {
			if areaCount < 5 {
				areaCount = 10
			}
			if patternCount < 2 {
				patternCount = 3
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, patternCount, 1)

			// Generate non-winning ticket content (prizeLevel = 0)
			content, err := patternService.GeneratePatternTicketContent(config, 0, 0)
			if err != nil {
				t.Logf("Failed to generate pattern content: %v", err)
				return false
			}

			// Check all areas - none should be winning
			for i := range content.Areas {
				result, err := patternService.JudgePatternWin(content, i, config)
				if err != nil {
					t.Logf("Failed to judge pattern win for area %d: %v", i, err)
					return false
				}

				if result.PrizeAwarded != 0 {
					t.Logf("Non-winning area %d should award 0 points, got %d", i, result.PrizeAwarded)
					return false
				}

				if result.IsWin || result.IsSpecial {
					t.Logf("Non-winning area %d should not be marked as win or special", i)
					return false
				}
			}

			return true
		},
		gen.IntRange(5, 20), // areaCount
		gen.IntRange(2, 5),  // patternCount
	))

	// Property: Total points calculation is correct
	properties.Property("total points equals sum of all area points", prop.ForAll(
		func(areaCount int) bool {
			if areaCount < 5 {
				areaCount = 10
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, 3, 1)

			content, err := patternService.GeneratePatternTicketContent(config, 0, 0)
			if err != nil {
				t.Logf("Failed to generate pattern content: %v", err)
				return false
			}

			// Calculate sum manually
			calculatedSum := 0
			for _, area := range content.Areas {
				calculatedSum += area.Points
			}

			if content.TotalPoints != calculatedSum {
				t.Logf("Total points mismatch: stored=%d, calculated=%d", content.TotalPoints, calculatedSum)
				return false
			}

			return true
		},
		gen.IntRange(5, 30), // areaCount
	))

	// Property: Encryption round-trip preserves pattern content
	properties.Property("encryption round-trip preserves pattern content", prop.ForAll(
		func(areaCount int) bool {
			if areaCount < 5 {
				areaCount = 10
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, 3, 1)

			original, err := patternService.GeneratePatternTicketContent(config, 1, 100)
			if err != nil {
				t.Logf("Failed to generate pattern content: %v", err)
				return false
			}

			// Encrypt
			encrypted, err := patternService.EncryptPatternContent(original)
			if err != nil {
				t.Logf("Failed to encrypt pattern content: %v", err)
				return false
			}

			// Decrypt
			decrypted, err := patternService.DecryptPatternContent(encrypted)
			if err != nil {
				t.Logf("Failed to decrypt pattern content: %v", err)
				return false
			}

			// Verify all fields match
			if len(decrypted.Areas) != len(original.Areas) {
				t.Logf("Areas count mismatch: got %d, want %d", len(decrypted.Areas), len(original.Areas))
				return false
			}

			for i, area := range original.Areas {
				if decrypted.Areas[i].Index != area.Index {
					t.Logf("Area %d index mismatch", i)
					return false
				}
				if decrypted.Areas[i].PatternID != area.PatternID {
					t.Logf("Area %d pattern ID mismatch", i)
					return false
				}
				if decrypted.Areas[i].Points != area.Points {
					t.Logf("Area %d points mismatch", i)
					return false
				}
				if decrypted.Areas[i].IsWin != area.IsWin {
					t.Logf("Area %d IsWin mismatch", i)
					return false
				}
				if decrypted.Areas[i].IsSpecial != area.IsSpecial {
					t.Logf("Area %d IsSpecial mismatch", i)
					return false
				}
			}

			if decrypted.TotalPoints != original.TotalPoints {
				t.Logf("TotalPoints mismatch: got %d, want %d", decrypted.TotalPoints, original.TotalPoints)
				return false
			}

			if decrypted.WinPatternID != original.WinPatternID {
				t.Logf("WinPatternID mismatch: got %s, want %s", decrypted.WinPatternID, original.WinPatternID)
				return false
			}

			if decrypted.SpecialPatternID != original.SpecialPatternID {
				t.Logf("SpecialPatternID mismatch: got %s, want %s", decrypted.SpecialPatternID, original.SpecialPatternID)
				return false
			}

			return true
		},
		gen.IntRange(5, 20), // areaCount
	))

	// Property: Area count matches configuration
	properties.Property("generated content has correct area count", prop.ForAll(
		func(areaCount int) bool {
			if areaCount < 1 {
				areaCount = 10
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, 3, 1)

			content, err := patternService.GeneratePatternTicketContent(config, 0, 0)
			if err != nil {
				t.Logf("Failed to generate pattern content: %v", err)
				return false
			}

			if len(content.Areas) != areaCount {
				t.Logf("Area count mismatch: got %d, want %d", len(content.Areas), areaCount)
				return false
			}

			return true
		},
		gen.IntRange(1, 50), // areaCount
	))

	// Property: All areas have valid pattern IDs from config
	properties.Property("all areas have valid pattern IDs", prop.ForAll(
		func(areaCount, patternCount int) bool {
			if areaCount < 5 {
				areaCount = 10
			}
			if patternCount < 2 {
				patternCount = 3
			}

			db := setupPatternLotteryTestDB(t)
			patternService := NewPatternLotteryService(db, testEncryptionKey)

			config := createTestPatternConfig(areaCount, patternCount, 2)

			content, err := patternService.GeneratePatternTicketContent(config, 1, 100)
			if err != nil {
				t.Logf("Failed to generate pattern content: %v", err)
				return false
			}

			// Build set of valid pattern IDs
			validIDs := make(map[string]bool)
			for _, p := range config.Patterns {
				validIDs[p.ID] = true
			}
			for _, p := range config.SpecialPatterns {
				validIDs[p.ID] = true
			}

			// Check all areas
			for i, area := range content.Areas {
				if !validIDs[area.PatternID] {
					t.Logf("Area %d has invalid pattern ID: %s", i, area.PatternID)
					return false
				}
			}

			return true
		},
		gen.IntRange(5, 20), // areaCount
		gen.IntRange(2, 5),  // patternCount
	))

	properties.TestingRun(t)
}
