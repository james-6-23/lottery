package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"scratch-lottery/internal/model"

	"gorm.io/gorm"
)

var (
	ErrAdminNotFound     = errors.New("admin not found")
	ErrConfigNotFound    = errors.New("config not found")
	ErrInvalidConfigKey  = errors.New("invalid config key")
)

// AdminService handles admin-related business logic
type AdminService struct {
	db            *gorm.DB
	walletService *WalletService
}

// NewAdminService creates a new admin service
func NewAdminService(db *gorm.DB, walletService *WalletService) *AdminService {
	return &AdminService{
		db:            db,
		walletService: walletService,
	}
}

// ==================== Dashboard Statistics ====================

// DashboardStats represents the dashboard statistics
type DashboardStats struct {
	TotalUsers       int64   `json:"total_users"`
	NewUsersToday    int64   `json:"new_users_today"`
	NewUsersWeek     int64   `json:"new_users_week"`
	NewUsersMonth    int64   `json:"new_users_month"`
	TotalTicketsSold int64   `json:"total_tickets_sold"`
	TotalRevenue     int64   `json:"total_revenue"`
	TotalPrizesPaid  int64   `json:"total_prizes_paid"`
	TotalExchanges   int64   `json:"total_exchanges"`
	ActivePrizePools int64   `json:"active_prize_pools"`
	AvailableStock   int64   `json:"available_stock"`
}

// GetDashboardStats returns dashboard statistics
func (s *AdminService) GetDashboardStats() (*DashboardStats, error) {
	stats := &DashboardStats{}
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -7)
	monthStart := todayStart.AddDate(0, -1, 0)

	// Total users
	if err := s.db.Model(&model.User{}).Count(&stats.TotalUsers).Error; err != nil {
		return nil, err
	}

	// New users today
	if err := s.db.Model(&model.User{}).Where("created_at >= ?", todayStart).Count(&stats.NewUsersToday).Error; err != nil {
		return nil, err
	}

	// New users this week
	if err := s.db.Model(&model.User{}).Where("created_at >= ?", weekStart).Count(&stats.NewUsersWeek).Error; err != nil {
		return nil, err
	}

	// New users this month
	if err := s.db.Model(&model.User{}).Where("created_at >= ?", monthStart).Count(&stats.NewUsersMonth).Error; err != nil {
		return nil, err
	}

	// Total tickets sold
	if err := s.db.Model(&model.Ticket{}).Count(&stats.TotalTicketsSold).Error; err != nil {
		return nil, err
	}

	// Total revenue (sum of ticket prices)
	var revenue struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type = ?", model.TransactionTypePurchase).
		Scan(&revenue).Error; err != nil {
		return nil, err
	}
	stats.TotalRevenue = revenue.Total

	// Total prizes paid
	var prizes struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type = ?", model.TransactionTypeWin).
		Scan(&prizes).Error; err != nil {
		return nil, err
	}
	stats.TotalPrizesPaid = prizes.Total

	// Total exchanges
	if err := s.db.Model(&model.ExchangeRecord{}).Count(&stats.TotalExchanges).Error; err != nil {
		return nil, err
	}

	// Active prize pools
	if err := s.db.Model(&model.PrizePool{}).
		Where("status = ?", model.PrizePoolStatusActive).
		Count(&stats.ActivePrizePools).Error; err != nil {
		return nil, err
	}

	// Available stock (sum of remaining tickets in active pools)
	var stock struct {
		Total int64
	}
	if err := s.db.Model(&model.PrizePool{}).
		Select("COALESCE(SUM(total_tickets - sold_tickets), 0) as total").
		Where("status = ?", model.PrizePoolStatusActive).
		Scan(&stock).Error; err != nil {
		return nil, err
	}
	stats.AvailableStock = stock.Total

	return stats, nil
}

// ==================== User Management ====================

// UserListQuery represents query parameters for user list
type UserListQuery struct {
	Search string `form:"search"`
	Role   string `form:"role"`
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
}

// UserListResponse represents paginated user list
type UserListResponse struct {
	Users      []UserResponse `json:"users"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

// UserResponse represents a user in admin responses
type UserResponse struct {
	ID        uint      `json:"id"`
	LinuxdoID string    `json:"linuxdo_id"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	Balance   int       `json:"balance"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GetUsers returns paginated user list
func (s *AdminService) GetUsers(query UserListQuery) (*UserListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.User{})

	// Search by username or linuxdo_id
	if query.Search != "" {
		searchPattern := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("username LIKE ? OR linuxdo_id LIKE ?", searchPattern, searchPattern)
	}

	// Filter by role
	if query.Role != "" {
		dbQuery = dbQuery.Where("role = ?", query.Role)
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results with wallet
	var users []model.User
	offset := (query.Page - 1) * query.Limit
	if err := dbQuery.Preload("Wallet").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&users).Error; err != nil {
		return nil, err
	}

	// Convert to response
	responses := make([]UserResponse, len(users))
	for i, u := range users {
		responses[i] = UserResponse{
			ID:        u.ID,
			LinuxdoID: u.LinuxdoID,
			Username:  u.Username,
			Avatar:    u.Avatar,
			Role:      u.Role,
			Balance:   u.Wallet.Balance,
			CreatedAt: u.CreatedAt,
			UpdatedAt: u.UpdatedAt,
		}
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &UserListResponse{
		Users:      responses,
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetUserByID returns a user by ID
func (s *AdminService) GetUserByID(userID uint) (*UserResponse, error) {
	var user model.User
	if err := s.db.Preload("Wallet").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &UserResponse{
		ID:        user.ID,
		LinuxdoID: user.LinuxdoID,
		Username:  user.Username,
		Avatar:    user.Avatar,
		Role:      user.Role,
		Balance:   user.Wallet.Balance,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}, nil
}

// AdjustUserPointsRequest represents a request to adjust user points
type AdjustUserPointsRequest struct {
	Amount      int    `json:"amount" binding:"required"`
	Description string `json:"description"`
}

// AdjustUserPoints adjusts a user's points balance
func (s *AdminService) AdjustUserPoints(adminID, userID uint, req AdjustUserPointsRequest) (*UserResponse, error) {
	var user model.User
	if err := s.db.Preload("Wallet").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Check if adjustment would result in negative balance
	newBalance := user.Wallet.Balance + req.Amount
	if newBalance < 0 {
		return nil, ErrInsufficientBalance
	}

	description := req.Description
	if description == "" {
		if req.Amount > 0 {
			description = "管理员调整积分（增加）"
		} else {
			description = "管理员调整积分（扣除）"
		}
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Update wallet balance
		if err := tx.Model(&user.Wallet).Update("balance", newBalance).Error; err != nil {
			return err
		}

		// Create transaction record
		transaction := model.Transaction{
			WalletID:    user.Wallet.ID,
			Type:        model.TransactionTypeInitial, // Using initial type for admin adjustments
			Amount:      req.Amount,
			Description: description,
			ReferenceID: adminID, // Store admin ID as reference
		}
		if err := tx.Create(&transaction).Error; err != nil {
			return err
		}

		// Log admin action
		details, _ := json.Marshal(map[string]interface{}{
			"amount":      req.Amount,
			"description": description,
			"old_balance": user.Wallet.Balance,
			"new_balance": newBalance,
		})
		adminLog := model.AdminLog{
			AdminID:    adminID,
			Action:     "adjust_points",
			TargetType: "user",
			TargetID:   userID,
			Details:    string(details),
		}
		return tx.Create(&adminLog).Error
	})

	if err != nil {
		return nil, err
	}

	// Return updated user
	return s.GetUserByID(userID)
}

// UpdateUserRole updates a user's role
func (s *AdminService) UpdateUserRole(adminID, userID uint, role string) (*UserResponse, error) {
	if role != "user" && role != "admin" {
		return nil, errors.New("invalid role")
	}

	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	oldRole := user.Role
	user.Role = role

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		// Log admin action
		details, _ := json.Marshal(map[string]interface{}{
			"old_role": oldRole,
			"new_role": role,
		})
		adminLog := model.AdminLog{
			AdminID:    adminID,
			Action:     "update_role",
			TargetType: "user",
			TargetID:   userID,
			Details:    string(details),
		}
		return tx.Create(&adminLog).Error
	})

	if err != nil {
		return nil, err
	}

	return s.GetUserByID(userID)
}

// ==================== System Settings ====================

// SystemSettings represents system settings
type SystemSettings struct {
	PaymentEnabled   bool   `json:"payment_enabled"`
	EPayMerchantID   string `json:"epay_merchant_id"`
	EPaySecret       string `json:"epay_secret"`
	EPayCallbackURL  string `json:"epay_callback_url"`
}

// GetSystemSettings returns system settings
func (s *AdminService) GetSystemSettings() (*SystemSettings, error) {
	settings := &SystemSettings{}

	// Get payment enabled setting
	var paymentConfig model.SystemConfig
	if err := s.db.Where("key = ?", "payment_enabled").First(&paymentConfig).Error; err == nil {
		settings.PaymentEnabled = paymentConfig.Value == "true"
	}

	// Get epay settings
	var epayMerchant model.SystemConfig
	if err := s.db.Where("key = ?", "epay_merchant_id").First(&epayMerchant).Error; err == nil {
		settings.EPayMerchantID = epayMerchant.Value
	}

	var epaySecret model.SystemConfig
	if err := s.db.Where("key = ?", "epay_secret").First(&epaySecret).Error; err == nil {
		// Mask the secret for security
		if len(epaySecret.Value) > 4 {
			settings.EPaySecret = epaySecret.Value[:4] + "****"
		} else if epaySecret.Value != "" {
			settings.EPaySecret = "****"
		}
	}

	var epayCallback model.SystemConfig
	if err := s.db.Where("key = ?", "epay_callback_url").First(&epayCallback).Error; err == nil {
		settings.EPayCallbackURL = epayCallback.Value
	}

	return settings, nil
}

// UpdateSystemSettingsRequest represents a request to update system settings
type UpdateSystemSettingsRequest struct {
	PaymentEnabled  *bool   `json:"payment_enabled"`
	EPayMerchantID  *string `json:"epay_merchant_id"`
	EPaySecret      *string `json:"epay_secret"`
	EPayCallbackURL *string `json:"epay_callback_url"`
}

// UpdateSystemSettings updates system settings
func (s *AdminService) UpdateSystemSettings(adminID uint, req UpdateSystemSettingsRequest) (*SystemSettings, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if req.PaymentEnabled != nil {
			if err := s.upsertConfig(tx, "payment_enabled", boolToString(*req.PaymentEnabled)); err != nil {
				return err
			}
		}

		if req.EPayMerchantID != nil {
			if err := s.upsertConfig(tx, "epay_merchant_id", *req.EPayMerchantID); err != nil {
				return err
			}
		}

		if req.EPaySecret != nil && *req.EPaySecret != "" && !containsMask(*req.EPaySecret) {
			if err := s.upsertConfig(tx, "epay_secret", *req.EPaySecret); err != nil {
				return err
			}
		}

		if req.EPayCallbackURL != nil {
			if err := s.upsertConfig(tx, "epay_callback_url", *req.EPayCallbackURL); err != nil {
				return err
			}
		}

		// Log admin action
		details, _ := json.Marshal(req)
		adminLog := model.AdminLog{
			AdminID:    adminID,
			Action:     "update_settings",
			TargetType: "system",
			TargetID:   0,
			Details:    string(details),
		}
		return tx.Create(&adminLog).Error
	})

	if err != nil {
		return nil, err
	}

	return s.GetSystemSettings()
}

// upsertConfig inserts or updates a system config
func (s *AdminService) upsertConfig(tx *gorm.DB, key, value string) error {
	var config model.SystemConfig
	err := tx.Where("key = ?", key).First(&config).Error
	
	if errors.Is(err, gorm.ErrRecordNotFound) {
		config = model.SystemConfig{Key: key, Value: value}
		return tx.Create(&config).Error
	} else if err != nil {
		return err
	}

	config.Value = value
	return tx.Save(&config).Error
}

// IsPaymentEnabled checks if payment is enabled
func (s *AdminService) IsPaymentEnabled() bool {
	var config model.SystemConfig
	if err := s.db.Where("key = ?", "payment_enabled").First(&config).Error; err != nil {
		return false
	}
	return config.Value == "true"
}

// EPayConfig represents EPay configuration for payment processing
type EPayConfig struct {
	MerchantID  string `json:"merchant_id"`
	Secret      string `json:"secret"`
	CallbackURL string `json:"callback_url"`
}

// GetEPayConfig returns the EPay configuration (unmasked) for payment processing
// This should only be used internally by the payment system
func (s *AdminService) GetEPayConfig() (*EPayConfig, error) {
	config := &EPayConfig{}

	var merchantConfig model.SystemConfig
	if err := s.db.Where("key = ?", "epay_merchant_id").First(&merchantConfig).Error; err == nil {
		config.MerchantID = merchantConfig.Value
	}

	var secretConfig model.SystemConfig
	if err := s.db.Where("key = ?", "epay_secret").First(&secretConfig).Error; err == nil {
		config.Secret = secretConfig.Value
	}

	var callbackConfig model.SystemConfig
	if err := s.db.Where("key = ?", "epay_callback_url").First(&callbackConfig).Error; err == nil {
		config.CallbackURL = callbackConfig.Value
	}

	return config, nil
}

// GetConfigValue retrieves a single system config value by key
func (s *AdminService) GetConfigValue(key string) (string, error) {
	var config model.SystemConfig
	if err := s.db.Where("key = ?", key).First(&config).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrConfigNotFound
		}
		return "", err
	}
	return config.Value, nil
}

// SetConfigValue sets a single system config value
func (s *AdminService) SetConfigValue(key, value string) error {
	return s.upsertConfig(s.db, key, value)
}

// ==================== Admin Logs ====================

// AdminLogQuery represents query parameters for admin logs
type AdminLogQuery struct {
	AdminID    uint   `form:"admin_id"`
	Action     string `form:"action"`
	TargetType string `form:"target_type"`
	Page       int    `form:"page"`
	Limit      int    `form:"limit"`
}

// AdminLogResponse represents an admin log in responses
type AdminLogResponse struct {
	ID         uint        `json:"id"`
	AdminID    uint        `json:"admin_id"`
	AdminName  string      `json:"admin_name"`
	Action     string      `json:"action"`
	TargetType string      `json:"target_type"`
	TargetID   uint        `json:"target_id"`
	Details    interface{} `json:"details"`
	CreatedAt  time.Time   `json:"created_at"`
}

// AdminLogListResponse represents paginated admin log list
type AdminLogListResponse struct {
	Logs       []AdminLogResponse `json:"logs"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	Limit      int                `json:"limit"`
	TotalPages int                `json:"total_pages"`
}

// GetAdminLogs returns paginated admin logs
func (s *AdminService) GetAdminLogs(query AdminLogQuery) (*AdminLogListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.AdminLog{})

	if query.AdminID > 0 {
		dbQuery = dbQuery.Where("admin_id = ?", query.AdminID)
	}
	if query.Action != "" {
		dbQuery = dbQuery.Where("action = ?", query.Action)
	}
	if query.TargetType != "" {
		dbQuery = dbQuery.Where("target_type = ?", query.TargetType)
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var logs []model.AdminLog
	offset := (query.Page - 1) * query.Limit
	if err := dbQuery.Preload("Admin").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&logs).Error; err != nil {
		return nil, err
	}

	// Convert to response
	responses := make([]AdminLogResponse, len(logs))
	for i, log := range logs {
		var details interface{}
		if log.Details != "" {
			_ = json.Unmarshal([]byte(log.Details), &details)
		}
		responses[i] = AdminLogResponse{
			ID:         log.ID,
			AdminID:    log.AdminID,
			AdminName:  log.Admin.Username,
			Action:     log.Action,
			TargetType: log.TargetType,
			TargetID:   log.TargetID,
			Details:    details,
			CreatedAt:  log.CreatedAt,
		}
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &AdminLogListResponse{
		Logs:       responses,
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		TotalPages: totalPages,
	}, nil
}

// ==================== Statistics ====================

// StatisticsQuery represents query parameters for statistics
type StatisticsQuery struct {
	StartDate string `form:"start_date"` // Format: 2006-01-02
	EndDate   string `form:"end_date"`   // Format: 2006-01-02
	Period    string `form:"period"`     // day, week, month
}

// CoreMetrics represents core platform metrics
type CoreMetrics struct {
	TotalUsers         int64   `json:"total_users"`
	NewUsersToday      int64   `json:"new_users_today"`
	NewUsersWeek       int64   `json:"new_users_week"`
	NewUsersMonth      int64   `json:"new_users_month"`
	TotalPointsInflow  int64   `json:"total_points_inflow"`  // Total recharge + initial
	TotalPointsOutflow int64   `json:"total_points_outflow"` // Total purchase + exchange
	TotalTicketsSold   int64   `json:"total_tickets_sold"`
	TotalSalesAmount   int64   `json:"total_sales_amount"`
	TotalPrizesPaid    int64   `json:"total_prizes_paid"`
	ReturnRate         float64 `json:"return_rate"` // prizes / sales
	TotalExchangeCost  int64   `json:"total_exchange_cost"`
}

// TrendDataPoint represents a single data point in trend data
type TrendDataPoint struct {
	Date   string `json:"date"`
	Value  int64  `json:"value"`
	Value2 int64  `json:"value2,omitempty"` // For dual-axis charts
}

// TrendData represents trend data for charts
type TrendData struct {
	Labels []string `json:"labels"`
	Data   []int64  `json:"data"`
	Data2  []int64  `json:"data2,omitempty"` // For dual-axis charts
}

// LotteryTypeStats represents statistics for a lottery type
type LotteryTypeStats struct {
	ID          uint    `json:"id"`
	Name        string  `json:"name"`
	TotalSold   int64   `json:"total_sold"`
	TotalAmount int64   `json:"total_amount"`
	TotalPrizes int64   `json:"total_prizes"`
	ReturnRate  float64 `json:"return_rate"`
}

// PrizeDistribution represents prize distribution by level
type PrizeDistribution struct {
	Level  string `json:"level"`
	Count  int64  `json:"count"`
	Amount int64  `json:"amount"`
}

// UserBehaviorStats represents user behavior statistics
type UserBehaviorStats struct {
	ActiveUsersToday  int64   `json:"active_users_today"`
	ActiveUsersWeek   int64   `json:"active_users_week"`
	ActiveUsersMonth  int64   `json:"active_users_month"`
	AvgPurchaseCount  float64 `json:"avg_purchase_count"`
	AvgPurchaseAmount float64 `json:"avg_purchase_amount"`
	RetentionRate7d   float64 `json:"retention_rate_7d"`
	RetentionRate30d  float64 `json:"retention_rate_30d"`
}

// StatisticsResponse represents the full statistics response
type StatisticsResponse struct {
	CoreMetrics       CoreMetrics         `json:"core_metrics"`
	UserTrend         TrendData           `json:"user_trend"`
	SalesTrend        TrendData           `json:"sales_trend"`
	PrizesTrend       TrendData           `json:"prizes_trend"`
	LotteryTypeStats  []LotteryTypeStats  `json:"lottery_type_stats"`
	PrizeDistribution []PrizeDistribution `json:"prize_distribution"`
	UserBehavior      UserBehaviorStats   `json:"user_behavior"`
}

// GetStatistics returns comprehensive statistics
func (s *AdminService) GetStatistics(query StatisticsQuery) (*StatisticsResponse, error) {
	// Parse dates
	var startDate, endDate time.Time
	var err error
	
	if query.StartDate != "" {
		startDate, err = time.Parse("2006-01-02", query.StartDate)
		if err != nil {
			startDate = time.Now().AddDate(0, -1, 0) // Default to 1 month ago
		}
	} else {
		startDate = time.Now().AddDate(0, -1, 0)
	}
	
	if query.EndDate != "" {
		endDate, err = time.Parse("2006-01-02", query.EndDate)
		if err != nil {
			endDate = time.Now()
		}
	} else {
		endDate = time.Now()
	}
	
	// Set default period
	if query.Period == "" {
		query.Period = "day"
	}

	response := &StatisticsResponse{}

	// Get core metrics
	coreMetrics, err := s.getCoreMetrics()
	if err != nil {
		return nil, err
	}
	response.CoreMetrics = *coreMetrics

	// Get user trend
	userTrend, err := s.getUserTrend(startDate, endDate, query.Period)
	if err != nil {
		return nil, err
	}
	response.UserTrend = *userTrend

	// Get sales trend
	salesTrend, err := s.getSalesTrend(startDate, endDate, query.Period)
	if err != nil {
		return nil, err
	}
	response.SalesTrend = *salesTrend

	// Get prizes trend
	prizesTrend, err := s.getPrizesTrend(startDate, endDate, query.Period)
	if err != nil {
		return nil, err
	}
	response.PrizesTrend = *prizesTrend

	// Get lottery type stats
	lotteryStats, err := s.getLotteryTypeStats()
	if err != nil {
		return nil, err
	}
	response.LotteryTypeStats = lotteryStats

	// Get prize distribution
	prizeDistribution, err := s.getPrizeDistribution()
	if err != nil {
		return nil, err
	}
	response.PrizeDistribution = prizeDistribution

	// Get user behavior stats
	userBehavior, err := s.getUserBehaviorStats()
	if err != nil {
		return nil, err
	}
	response.UserBehavior = *userBehavior

	return response, nil
}

// getCoreMetrics returns core platform metrics
func (s *AdminService) getCoreMetrics() (*CoreMetrics, error) {
	metrics := &CoreMetrics{}
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -7)
	monthStart := todayStart.AddDate(0, -1, 0)

	// Total users
	if err := s.db.Model(&model.User{}).Count(&metrics.TotalUsers).Error; err != nil {
		return nil, err
	}

	// New users today
	if err := s.db.Model(&model.User{}).Where("created_at >= ?", todayStart).Count(&metrics.NewUsersToday).Error; err != nil {
		return nil, err
	}

	// New users this week
	if err := s.db.Model(&model.User{}).Where("created_at >= ?", weekStart).Count(&metrics.NewUsersWeek).Error; err != nil {
		return nil, err
	}

	// New users this month
	if err := s.db.Model(&model.User{}).Where("created_at >= ?", monthStart).Count(&metrics.NewUsersMonth).Error; err != nil {
		return nil, err
	}

	// Total points inflow (recharge + initial)
	var inflow struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type IN (?, ?) AND amount > 0", model.TransactionTypeRecharge, model.TransactionTypeInitial).
		Scan(&inflow).Error; err != nil {
		return nil, err
	}
	metrics.TotalPointsInflow = inflow.Total

	// Total points outflow (purchase + exchange)
	var outflow struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type IN (?, ?) AND amount < 0", model.TransactionTypePurchase, model.TransactionTypeExchange).
		Scan(&outflow).Error; err != nil {
		return nil, err
	}
	metrics.TotalPointsOutflow = outflow.Total

	// Total tickets sold
	if err := s.db.Model(&model.Ticket{}).Count(&metrics.TotalTicketsSold).Error; err != nil {
		return nil, err
	}

	// Total sales amount
	var sales struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type = ?", model.TransactionTypePurchase).
		Scan(&sales).Error; err != nil {
		return nil, err
	}
	metrics.TotalSalesAmount = sales.Total

	// Total prizes paid
	var prizes struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type = ?", model.TransactionTypeWin).
		Scan(&prizes).Error; err != nil {
		return nil, err
	}
	metrics.TotalPrizesPaid = prizes.Total

	// Calculate return rate
	if metrics.TotalSalesAmount > 0 {
		metrics.ReturnRate = float64(metrics.TotalPrizesPaid) / float64(metrics.TotalSalesAmount) * 100
	}

	// Total exchange cost
	var exchangeCost struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type = ?", model.TransactionTypeExchange).
		Scan(&exchangeCost).Error; err != nil {
		return nil, err
	}
	metrics.TotalExchangeCost = exchangeCost.Total

	return metrics, nil
}

// getUserTrend returns user registration trend
func (s *AdminService) getUserTrend(startDate, endDate time.Time, period string) (*TrendData, error) {
	trend := &TrendData{
		Labels: []string{},
		Data:   []int64{},
	}

	// Generate date labels
	current := startDate
	for !current.After(endDate) {
		var label string
		switch period {
		case "week":
			label = current.Format("2006-W02")
			current = current.AddDate(0, 0, 7)
		case "month":
			label = current.Format("2006-01")
			current = current.AddDate(0, 1, 0)
		default: // day
			label = current.Format("01-02")
			current = current.AddDate(0, 0, 1)
		}
		trend.Labels = append(trend.Labels, label)
	}

	// Query user counts by date
	type DateCount struct {
		Date  string
		Count int64
	}
	var results []DateCount

	dateFormat := s.getDateFormat(period)
	if err := s.db.Model(&model.User{}).
		Select(dateFormat + " as date, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Group("date").
		Order("date").
		Scan(&results).Error; err != nil {
		return nil, err
	}

	// Map results to trend data
	resultMap := make(map[string]int64)
	for _, r := range results {
		resultMap[r.Date] = r.Count
	}

	// Fill in data for each label
	current = startDate
	for range trend.Labels {
		var key string
		switch period {
		case "week":
			key = current.Format("2006-W02")
			current = current.AddDate(0, 0, 7)
		case "month":
			key = current.Format("2006-01")
			current = current.AddDate(0, 1, 0)
		default:
			key = current.Format("01-02")
			current = current.AddDate(0, 0, 1)
		}
		trend.Data = append(trend.Data, resultMap[key])
	}

	return trend, nil
}

// getSalesTrend returns sales trend
func (s *AdminService) getSalesTrend(startDate, endDate time.Time, period string) (*TrendData, error) {
	trend := &TrendData{
		Labels: []string{},
		Data:   []int64{},
		Data2:  []int64{}, // For ticket count
	}

	// Generate date labels
	current := startDate
	for !current.After(endDate) {
		var label string
		switch period {
		case "week":
			label = current.Format("2006-W02")
			current = current.AddDate(0, 0, 7)
		case "month":
			label = current.Format("2006-01")
			current = current.AddDate(0, 1, 0)
		default:
			label = current.Format("01-02")
			current = current.AddDate(0, 0, 1)
		}
		trend.Labels = append(trend.Labels, label)
	}

	// Query sales by date
	type DateSales struct {
		Date   string
		Amount int64
		Count  int64
	}
	var results []DateSales

	dateFormat := s.getDateFormat(period)
	if err := s.db.Model(&model.Transaction{}).
		Select(dateFormat + " as date, COALESCE(SUM(ABS(amount)), 0) as amount, COUNT(*) as count").
		Where("type = ? AND created_at >= ? AND created_at <= ?", model.TransactionTypePurchase, startDate, endDate).
		Group("date").
		Order("date").
		Scan(&results).Error; err != nil {
		return nil, err
	}

	// Map results
	amountMap := make(map[string]int64)
	countMap := make(map[string]int64)
	for _, r := range results {
		amountMap[r.Date] = r.Amount
		countMap[r.Date] = r.Count
	}

	// Fill in data
	current = startDate
	for range trend.Labels {
		var key string
		switch period {
		case "week":
			key = current.Format("2006-W02")
			current = current.AddDate(0, 0, 7)
		case "month":
			key = current.Format("2006-01")
			current = current.AddDate(0, 1, 0)
		default:
			key = current.Format("01-02")
			current = current.AddDate(0, 0, 1)
		}
		trend.Data = append(trend.Data, amountMap[key])
		trend.Data2 = append(trend.Data2, countMap[key])
	}

	return trend, nil
}

// getPrizesTrend returns prizes trend
func (s *AdminService) getPrizesTrend(startDate, endDate time.Time, period string) (*TrendData, error) {
	trend := &TrendData{
		Labels: []string{},
		Data:   []int64{},
	}

	// Generate date labels
	current := startDate
	for !current.After(endDate) {
		var label string
		switch period {
		case "week":
			label = current.Format("2006-W02")
			current = current.AddDate(0, 0, 7)
		case "month":
			label = current.Format("2006-01")
			current = current.AddDate(0, 1, 0)
		default:
			label = current.Format("01-02")
			current = current.AddDate(0, 0, 1)
		}
		trend.Labels = append(trend.Labels, label)
	}

	// Query prizes by date
	type DatePrize struct {
		Date   string
		Amount int64
	}
	var results []DatePrize

	dateFormat := s.getDateFormat(period)
	if err := s.db.Model(&model.Transaction{}).
		Select(dateFormat + " as date, COALESCE(SUM(amount), 0) as amount").
		Where("type = ? AND created_at >= ? AND created_at <= ?", model.TransactionTypeWin, startDate, endDate).
		Group("date").
		Order("date").
		Scan(&results).Error; err != nil {
		return nil, err
	}

	// Map results
	resultMap := make(map[string]int64)
	for _, r := range results {
		resultMap[r.Date] = r.Amount
	}

	// Fill in data
	current = startDate
	for range trend.Labels {
		var key string
		switch period {
		case "week":
			key = current.Format("2006-W02")
			current = current.AddDate(0, 0, 7)
		case "month":
			key = current.Format("2006-01")
			current = current.AddDate(0, 1, 0)
		default:
			key = current.Format("01-02")
			current = current.AddDate(0, 0, 1)
		}
		trend.Data = append(trend.Data, resultMap[key])
	}

	return trend, nil
}

// getLotteryTypeStats returns statistics by lottery type
func (s *AdminService) getLotteryTypeStats() ([]LotteryTypeStats, error) {
	var lotteryTypes []model.LotteryType
	if err := s.db.Find(&lotteryTypes).Error; err != nil {
		return nil, err
	}

	stats := make([]LotteryTypeStats, 0, len(lotteryTypes))
	for _, lt := range lotteryTypes {
		stat := LotteryTypeStats{
			ID:   lt.ID,
			Name: lt.Name,
		}

		// Count tickets sold
		if err := s.db.Model(&model.Ticket{}).
			Where("lottery_type_id = ?", lt.ID).
			Count(&stat.TotalSold).Error; err != nil {
			return nil, err
		}

		// Calculate total amount (tickets * price)
		stat.TotalAmount = stat.TotalSold * int64(lt.Price)

		// Sum prizes paid
		var prizes struct {
			Total int64
		}
		if err := s.db.Model(&model.Ticket{}).
			Select("COALESCE(SUM(prize_amount), 0) as total").
			Where("lottery_type_id = ? AND status IN (?, ?)", lt.ID, model.TicketStatusScratched, model.TicketStatusClaimed).
			Scan(&prizes).Error; err != nil {
			return nil, err
		}
		stat.TotalPrizes = prizes.Total

		// Calculate return rate
		if stat.TotalAmount > 0 {
			stat.ReturnRate = float64(stat.TotalPrizes) / float64(stat.TotalAmount) * 100
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// getPrizeDistribution returns prize distribution by level
func (s *AdminService) getPrizeDistribution() ([]PrizeDistribution, error) {
	type Result struct {
		PrizeAmount int64
		Count       int64
		Total       int64
	}
	var results []Result

	if err := s.db.Model(&model.Ticket{}).
		Select("prize_amount, COUNT(*) as count, SUM(prize_amount) as total").
		Where("status IN (?, ?) AND prize_amount > 0", model.TicketStatusScratched, model.TicketStatusClaimed).
		Group("prize_amount").
		Order("prize_amount DESC").
		Scan(&results).Error; err != nil {
		return nil, err
	}

	distribution := make([]PrizeDistribution, 0, len(results))
	for _, r := range results {
		var levelName string
		switch {
		case r.PrizeAmount >= 10000:
			levelName = "特等奖"
		case r.PrizeAmount >= 1000:
			levelName = "一等奖"
		case r.PrizeAmount >= 100:
			levelName = "二等奖"
		case r.PrizeAmount >= 10:
			levelName = "三等奖"
		default:
			levelName = "小奖"
		}

		distribution = append(distribution, PrizeDistribution{
			Level:  levelName,
			Count:  r.Count,
			Amount: r.Total,
		})
	}

	return distribution, nil
}

// getUserBehaviorStats returns user behavior statistics
func (s *AdminService) getUserBehaviorStats() (*UserBehaviorStats, error) {
	stats := &UserBehaviorStats{}
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -7)
	monthStart := todayStart.AddDate(0, -1, 0)

	// Active users today (users who purchased tickets today)
	if err := s.db.Model(&model.Ticket{}).
		Select("COUNT(DISTINCT user_id)").
		Where("purchased_at >= ?", todayStart).
		Scan(&stats.ActiveUsersToday).Error; err != nil {
		return nil, err
	}

	// Active users this week
	if err := s.db.Model(&model.Ticket{}).
		Select("COUNT(DISTINCT user_id)").
		Where("purchased_at >= ?", weekStart).
		Scan(&stats.ActiveUsersWeek).Error; err != nil {
		return nil, err
	}

	// Active users this month
	if err := s.db.Model(&model.Ticket{}).
		Select("COUNT(DISTINCT user_id)").
		Where("purchased_at >= ?", monthStart).
		Scan(&stats.ActiveUsersMonth).Error; err != nil {
		return nil, err
	}

	// Average purchase count per user
	var totalUsers int64
	if err := s.db.Model(&model.User{}).Count(&totalUsers).Error; err != nil {
		return nil, err
	}

	var totalTickets int64
	if err := s.db.Model(&model.Ticket{}).Count(&totalTickets).Error; err != nil {
		return nil, err
	}

	if totalUsers > 0 {
		stats.AvgPurchaseCount = float64(totalTickets) / float64(totalUsers)
	}

	// Average purchase amount per user
	var totalAmount struct {
		Total int64
	}
	if err := s.db.Model(&model.Transaction{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type = ?", model.TransactionTypePurchase).
		Scan(&totalAmount).Error; err != nil {
		return nil, err
	}

	if totalUsers > 0 {
		stats.AvgPurchaseAmount = float64(totalAmount.Total) / float64(totalUsers)
	}

	// 7-day retention rate (users who registered 7+ days ago and were active in last 7 days)
	var usersRegistered7DaysAgo int64
	if err := s.db.Model(&model.User{}).
		Where("created_at <= ?", weekStart).
		Count(&usersRegistered7DaysAgo).Error; err != nil {
		return nil, err
	}

	var retainedUsers7d int64
	if err := s.db.Model(&model.Ticket{}).
		Select("COUNT(DISTINCT user_id)").
		Joins("JOIN users ON tickets.user_id = users.id").
		Where("users.created_at <= ? AND tickets.purchased_at >= ?", weekStart, weekStart).
		Scan(&retainedUsers7d).Error; err != nil {
		return nil, err
	}

	if usersRegistered7DaysAgo > 0 {
		stats.RetentionRate7d = float64(retainedUsers7d) / float64(usersRegistered7DaysAgo) * 100
	}

	// 30-day retention rate
	var usersRegistered30DaysAgo int64
	if err := s.db.Model(&model.User{}).
		Where("created_at <= ?", monthStart).
		Count(&usersRegistered30DaysAgo).Error; err != nil {
		return nil, err
	}

	var retainedUsers30d int64
	if err := s.db.Model(&model.Ticket{}).
		Select("COUNT(DISTINCT user_id)").
		Joins("JOIN users ON tickets.user_id = users.id").
		Where("users.created_at <= ? AND tickets.purchased_at >= ?", monthStart, monthStart).
		Scan(&retainedUsers30d).Error; err != nil {
		return nil, err
	}

	if usersRegistered30DaysAgo > 0 {
		stats.RetentionRate30d = float64(retainedUsers30d) / float64(usersRegistered30DaysAgo) * 100
	}

	return stats, nil
}

// getDateFormat returns the SQL date format based on period
func (s *AdminService) getDateFormat(period string) string {
	// PostgreSQL uses to_char for date formatting
	switch period {
	case "week":
		return "to_char(created_at, 'IYYY-\"W\"IW')"
	case "month":
		return "to_char(created_at, 'YYYY-MM')"
	default:
		return "to_char(created_at, 'MM-DD')"
	}
}

// ExportStatisticsCSV exports statistics as CSV
func (s *AdminService) ExportStatisticsCSV(query StatisticsQuery) ([]byte, error) {
	stats, err := s.GetStatistics(query)
	if err != nil {
		return nil, err
	}

	// Build CSV content
	var csv string
	
	// Core metrics section
	csv += "核心指标\n"
	csv += "指标,数值\n"
	csv += "总用户数," + formatInt64(stats.CoreMetrics.TotalUsers) + "\n"
	csv += "今日新增用户," + formatInt64(stats.CoreMetrics.NewUsersToday) + "\n"
	csv += "本周新增用户," + formatInt64(stats.CoreMetrics.NewUsersWeek) + "\n"
	csv += "本月新增用户," + formatInt64(stats.CoreMetrics.NewUsersMonth) + "\n"
	csv += "总积分流入," + formatInt64(stats.CoreMetrics.TotalPointsInflow) + "\n"
	csv += "总积分流出," + formatInt64(stats.CoreMetrics.TotalPointsOutflow) + "\n"
	csv += "总彩票销量," + formatInt64(stats.CoreMetrics.TotalTicketsSold) + "\n"
	csv += "总销售额," + formatInt64(stats.CoreMetrics.TotalSalesAmount) + "\n"
	csv += "总奖金支出," + formatInt64(stats.CoreMetrics.TotalPrizesPaid) + "\n"
	csv += "返奖率," + formatFloat64(stats.CoreMetrics.ReturnRate) + "%\n"
	csv += "总兑换消耗," + formatInt64(stats.CoreMetrics.TotalExchangeCost) + "\n"
	csv += "\n"

	// Lottery type stats section
	csv += "彩票类型统计\n"
	csv += "ID,名称,销量,销售额,奖金支出,返奖率\n"
	for _, lt := range stats.LotteryTypeStats {
		csv += formatUint(lt.ID) + "," + lt.Name + "," + formatInt64(lt.TotalSold) + "," + formatInt64(lt.TotalAmount) + "," + formatInt64(lt.TotalPrizes) + "," + formatFloat64(lt.ReturnRate) + "%\n"
	}
	csv += "\n"

	// Prize distribution section
	csv += "奖金分布\n"
	csv += "奖级,中奖次数,奖金总额\n"
	for _, pd := range stats.PrizeDistribution {
		csv += pd.Level + "," + formatInt64(pd.Count) + "," + formatInt64(pd.Amount) + "\n"
	}

	return []byte(csv), nil
}

// Helper functions

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func containsMask(s string) bool {
	for _, c := range s {
		if c == '*' {
			return true
		}
	}
	return false
}

func formatInt64(n int64) string {
	return fmt.Sprintf("%d", n)
}

func formatUint(n uint) string {
	return fmt.Sprintf("%d", n)
}

func formatFloat64(f float64) string {
	return fmt.Sprintf("%.2f", f)
}
