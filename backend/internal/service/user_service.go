package service

import (
	"time"

	"scratch-lottery/internal/model"

	"gorm.io/gorm"
)

// UserService handles user-related business logic
type UserService struct {
	db            *gorm.DB
	walletService *WalletService
}

// NewUserService creates a new user service
func NewUserService(db *gorm.DB, walletService *WalletService) *UserService {
	return &UserService{
		db:            db,
		walletService: walletService,
	}
}

// UserProfileResponse represents user profile information
type UserProfileResponse struct {
	ID        uint      `json:"id"`
	LinuxdoID string    `json:"linuxdo_id"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	Balance   int       `json:"balance"`
	CreatedAt time.Time `json:"created_at"`
}

// UserStatisticsResponse represents user game statistics
type UserStatisticsResponse struct {
	TotalPurchases     int     `json:"total_purchases"`      // 累计购彩次数
	TotalSpent         int     `json:"total_spent"`          // 累计花费积分
	TotalWins          int     `json:"total_wins"`           // 累计中奖次数
	TotalWinAmount     int     `json:"total_win_amount"`     // 累计中奖积分
	MaxSingleWin       int     `json:"max_single_win"`       // 最高单次中奖
	TotalExchanges     int     `json:"total_exchanges"`      // 累计兑换次数
	TotalExchangeSpent int     `json:"total_exchange_spent"` // 累计兑换消耗积分
	WinRate            float64 `json:"win_rate"`             // 中奖率
}

// TicketRecordResponse represents a ticket record for user history
type TicketRecordResponse struct {
	ID            uint                 `json:"id"`
	LotteryTypeID uint                 `json:"lottery_type_id"`
	LotteryName   string               `json:"lottery_name"`
	SecurityCode  string               `json:"security_code"`
	Price         int                  `json:"price"`
	PrizeAmount   int                  `json:"prize_amount,omitempty"`
	Status        model.TicketStatus   `json:"status"`
	PurchasedAt   time.Time            `json:"purchased_at"`
	ScratchedAt   *time.Time           `json:"scratched_at,omitempty"`
}

// TicketRecordListResponse represents paginated ticket records
type TicketRecordListResponse struct {
	Tickets    []TicketRecordResponse `json:"tickets"`
	Total      int64                  `json:"total"`
	Page       int                    `json:"page"`
	Limit      int                    `json:"limit"`
	TotalPages int                    `json:"total_pages"`
}

// TicketRecordQuery represents query parameters for ticket records
type TicketRecordQuery struct {
	LotteryTypeID uint   `form:"lottery_type_id"`
	Status        string `form:"status"`
	StartDate     string `form:"start_date"`
	EndDate       string `form:"end_date"`
	Page          int    `form:"page"`
	Limit         int    `form:"limit"`
}

// WinRecordResponse represents a win record
type WinRecordResponse struct {
	ID            uint      `json:"id"`
	LotteryTypeID uint      `json:"lottery_type_id"`
	LotteryName   string    `json:"lottery_name"`
	SecurityCode  string    `json:"security_code"`
	PrizeAmount   int       `json:"prize_amount"`
	ScratchedAt   time.Time `json:"scratched_at"`
}

// WinRecordListResponse represents paginated win records
type WinRecordListResponse struct {
	Wins       []WinRecordResponse `json:"wins"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	Limit      int                 `json:"limit"`
	TotalPages int                 `json:"total_pages"`
}


// GetUserProfile retrieves user profile information
func (s *UserService) GetUserProfile(userID uint) (*UserProfileResponse, error) {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	// Get wallet balance
	balance, err := s.walletService.GetBalance(userID)
	if err != nil {
		balance = 0
	}

	return &UserProfileResponse{
		ID:        user.ID,
		LinuxdoID: user.LinuxdoID,
		Username:  user.Username,
		Avatar:    user.Avatar,
		Role:      user.Role,
		Balance:   balance,
		CreatedAt: user.CreatedAt,
	}, nil
}

// GetUserStatistics retrieves user game statistics
func (s *UserService) GetUserStatistics(userID uint) (*UserStatisticsResponse, error) {
	stats := &UserStatisticsResponse{}

	// Get total purchases count
	var purchaseCount int64
	s.db.Model(&model.Ticket{}).Where("user_id = ?", userID).Count(&purchaseCount)
	stats.TotalPurchases = int(purchaseCount)

	// Get total spent on purchases
	var totalSpent struct {
		Total int
	}
	s.db.Model(&model.Ticket{}).
		Select("COALESCE(SUM(lottery_types.price), 0) as total").
		Joins("LEFT JOIN lottery_types ON tickets.lottery_type_id = lottery_types.id").
		Where("tickets.user_id = ?", userID).
		Scan(&totalSpent)
	stats.TotalSpent = totalSpent.Total

	// Get win statistics
	var winStats struct {
		Count     int64
		Total     int
		MaxSingle int
	}
	s.db.Model(&model.Ticket{}).
		Select("COUNT(*) as count, COALESCE(SUM(prize_amount), 0) as total, COALESCE(MAX(prize_amount), 0) as max_single").
		Where("user_id = ? AND status IN ? AND prize_amount > 0", userID, []model.TicketStatus{model.TicketStatusScratched, model.TicketStatusClaimed}).
		Scan(&winStats)
	stats.TotalWins = int(winStats.Count)
	stats.TotalWinAmount = winStats.Total
	stats.MaxSingleWin = winStats.MaxSingle

	// Calculate win rate
	var scratchedCount int64
	s.db.Model(&model.Ticket{}).
		Where("user_id = ? AND status IN ?", userID, []model.TicketStatus{model.TicketStatusScratched, model.TicketStatusClaimed}).
		Count(&scratchedCount)
	if scratchedCount > 0 {
		stats.WinRate = float64(stats.TotalWins) / float64(scratchedCount) * 100
	}

	// Get exchange statistics
	var exchangeStats struct {
		Count int64
		Total int
	}
	s.db.Model(&model.ExchangeRecord{}).
		Select("COUNT(*) as count, COALESCE(SUM(cost), 0) as total").
		Where("user_id = ?", userID).
		Scan(&exchangeStats)
	stats.TotalExchanges = int(exchangeStats.Count)
	stats.TotalExchangeSpent = exchangeStats.Total

	return stats, nil
}

// GetUserTickets retrieves user's ticket purchase history
func (s *UserService) GetUserTickets(userID uint, query TicketRecordQuery) (*TicketRecordListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.Ticket{}).Where("tickets.user_id = ?", userID)

	// Filter by lottery type
	if query.LotteryTypeID > 0 {
		dbQuery = dbQuery.Where("tickets.lottery_type_id = ?", query.LotteryTypeID)
	}

	// Filter by status
	if query.Status != "" {
		dbQuery = dbQuery.Where("tickets.status = ?", query.Status)
	}

	// Filter by date range
	if query.StartDate != "" {
		startTime, err := time.Parse("2006-01-02", query.StartDate)
		if err == nil {
			dbQuery = dbQuery.Where("tickets.purchased_at >= ?", startTime)
		}
	}
	if query.EndDate != "" {
		endTime, err := time.Parse("2006-01-02", query.EndDate)
		if err == nil {
			// Add one day to include the end date
			endTime = endTime.Add(24 * time.Hour)
			dbQuery = dbQuery.Where("tickets.purchased_at < ?", endTime)
		}
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results with lottery type info
	var tickets []model.Ticket
	offset := (query.Page - 1) * query.Limit
	if err := s.db.Preload("LotteryType").
		Where("user_id = ?", userID).
		Scopes(func(db *gorm.DB) *gorm.DB {
			if query.LotteryTypeID > 0 {
				db = db.Where("lottery_type_id = ?", query.LotteryTypeID)
			}
			if query.Status != "" {
				db = db.Where("status = ?", query.Status)
			}
			if query.StartDate != "" {
				if startTime, err := time.Parse("2006-01-02", query.StartDate); err == nil {
					db = db.Where("purchased_at >= ?", startTime)
				}
			}
			if query.EndDate != "" {
				if endTime, err := time.Parse("2006-01-02", query.EndDate); err == nil {
					db = db.Where("purchased_at < ?", endTime.Add(24*time.Hour))
				}
			}
			return db
		}).
		Order("purchased_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&tickets).Error; err != nil {
		return nil, err
	}

	// Convert to response
	responses := make([]TicketRecordResponse, len(tickets))
	for i, t := range tickets {
		responses[i] = TicketRecordResponse{
			ID:            t.ID,
			LotteryTypeID: t.LotteryTypeID,
			LotteryName:   t.LotteryType.Name,
			SecurityCode:  t.SecurityCode,
			Price:         t.LotteryType.Price,
			Status:        t.Status,
			PurchasedAt:   t.PurchasedAt,
			ScratchedAt:   t.ScratchedAt,
		}
		// Only show prize amount if scratched
		if t.Status == model.TicketStatusScratched || t.Status == model.TicketStatusClaimed {
			responses[i].PrizeAmount = t.PrizeAmount
		}
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &TicketRecordListResponse{
		Tickets:    responses,
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetUserWins retrieves user's winning records
func (s *UserService) GetUserWins(userID uint, page, limit int) (*WinRecordListResponse, error) {
	// Set defaults
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build query for winning tickets only
	dbQuery := s.db.Model(&model.Ticket{}).
		Where("user_id = ? AND status IN ? AND prize_amount > 0", userID, 
			[]model.TicketStatus{model.TicketStatusScratched, model.TicketStatusClaimed})

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var tickets []model.Ticket
	offset := (page - 1) * limit
	if err := s.db.Preload("LotteryType").
		Where("user_id = ? AND status IN ? AND prize_amount > 0", userID,
			[]model.TicketStatus{model.TicketStatusScratched, model.TicketStatusClaimed}).
		Order("scratched_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tickets).Error; err != nil {
		return nil, err
	}

	// Convert to response
	responses := make([]WinRecordResponse, len(tickets))
	for i, t := range tickets {
		var scratchedAt time.Time
		if t.ScratchedAt != nil {
			scratchedAt = *t.ScratchedAt
		}
		responses[i] = WinRecordResponse{
			ID:            t.ID,
			LotteryTypeID: t.LotteryTypeID,
			LotteryName:   t.LotteryType.Name,
			SecurityCode:  t.SecurityCode,
			PrizeAmount:   t.PrizeAmount,
			ScratchedAt:   scratchedAt,
		}
	}

	// Calculate total pages
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &WinRecordListResponse{
		Wins:       responses,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}
