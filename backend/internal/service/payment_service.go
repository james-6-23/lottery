package service

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"scratch-lottery/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrPaymentDisabled    = errors.New("payment is disabled")
	ErrPaymentConfigError = errors.New("payment configuration error")
	ErrInvalidSignature   = errors.New("invalid signature")
	ErrOrderNotFound      = errors.New("order not found")
	ErrOrderAlreadyPaid   = errors.New("order already paid")
	ErrPaymentInvalidAmount = errors.New("invalid payment amount")
)

// PaymentService handles payment-related business logic
type PaymentService struct {
	db            *gorm.DB
	adminService  *AdminService
	walletService *WalletService
}

// NewPaymentService creates a new payment service
func NewPaymentService(db *gorm.DB, adminService *AdminService, walletService *WalletService) *PaymentService {
	return &PaymentService{
		db:            db,
		adminService:  adminService,
		walletService: walletService,
	}
}

// RechargeRequest represents a recharge request
type RechargeRequest struct {
	Amount int `json:"amount" binding:"required,gt=0"` // Amount in yuan
}

// RechargeResponse represents a recharge response
type RechargeResponse struct {
	OrderNo    string `json:"order_no"`
	PaymentURL string `json:"payment_url"`
	Amount     int    `json:"amount"`
	Points     int    `json:"points"`
}

// PaymentCallbackRequest represents a payment callback from EPay
type PaymentCallbackRequest struct {
	PID         string `form:"pid" json:"pid"`                   // Merchant ID
	TradeNo     string `form:"trade_no" json:"trade_no"`         // EPay trade number
	OutTradeNo  string `form:"out_trade_no" json:"out_trade_no"` // Our order number
	Type        string `form:"type" json:"type"`                 // Payment type (alipay, wxpay, etc.)
	Name        string `form:"name" json:"name"`                 // Product name
	Money       string `form:"money" json:"money"`               // Amount
	TradeStatus string `form:"trade_status" json:"trade_status"` // Trade status
	Sign        string `form:"sign" json:"sign"`                 // Signature
	SignType    string `form:"sign_type" json:"sign_type"`       // Signature type (MD5)
}

// OrderResponse represents an order in responses
type OrderResponse struct {
	ID          uint      `json:"id"`
	OrderNo     string    `json:"order_no"`
	Amount      int       `json:"amount"`
	Points      int       `json:"points"`
	Status      string    `json:"status"`
	PaymentType string    `json:"payment_type,omitempty"`
	TradeNo     string    `json:"trade_no,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateRechargeOrder creates a new recharge order and returns payment URL
func (s *PaymentService) CreateRechargeOrder(userID uint, req RechargeRequest) (*RechargeResponse, error) {
	// Check if payment is enabled
	if !s.adminService.IsPaymentEnabled() {
		return nil, ErrPaymentDisabled
	}

	// Validate amount (minimum 1 yuan, maximum 10000 yuan)
	if req.Amount < 1 || req.Amount > 10000 {
		return nil, ErrPaymentInvalidAmount
	}

	// Get EPay configuration
	epayConfig, err := s.adminService.GetEPayConfig()
	if err != nil {
		return nil, err
	}

	if epayConfig.MerchantID == "" || epayConfig.Secret == "" {
		return nil, ErrPaymentConfigError
	}

	// Calculate points (1 yuan = 10 points)
	points := req.Amount * 10

	// Generate unique order number
	orderNo := s.generateOrderNo()

	// Create order in database
	order := model.PaymentOrder{
		UserID:  userID,
		OrderNo: orderNo,
		Amount:  req.Amount * 100, // Store in cents
		Points:  points,
		Status:  "pending",
	}

	if err := s.db.Create(&order).Error; err != nil {
		return nil, err
	}

	// Build payment URL
	paymentURL, err := s.buildPaymentURL(epayConfig, orderNo, req.Amount)
	if err != nil {
		return nil, err
	}

	return &RechargeResponse{
		OrderNo:    orderNo,
		PaymentURL: paymentURL,
		Amount:     req.Amount,
		Points:     points,
	}, nil
}

// ProcessCallback processes payment callback from EPay
func (s *PaymentService) ProcessCallback(callback PaymentCallbackRequest) error {
	// Get EPay configuration
	epayConfig, err := s.adminService.GetEPayConfig()
	if err != nil {
		return err
	}

	// Verify signature
	if !s.VerifySignature(callback, epayConfig.Secret) {
		return ErrInvalidSignature
	}

	// Check trade status
	if callback.TradeStatus != "TRADE_SUCCESS" {
		return nil // Not a successful payment, ignore
	}

	// Find order
	var order model.PaymentOrder
	if err := s.db.Where("order_no = ?", callback.OutTradeNo).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return err
	}

	// Check if already processed
	if order.Status == "paid" {
		return ErrOrderAlreadyPaid
	}

	// Update order and add points in transaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Update order status
		order.Status = "paid"
		order.PaymentType = callback.Type
		order.TradeNo = callback.TradeNo
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Add points to user wallet
		description := fmt.Sprintf("充值 %d 元，获得 %d 积分", order.Amount/100, order.Points)
		
		// Get wallet
		var wallet model.Wallet
		if err := tx.Where("user_id = ?", order.UserID).First(&wallet).Error; err != nil {
			return err
		}

		// Update balance
		wallet.Balance += order.Points
		if err := tx.Save(&wallet).Error; err != nil {
			return err
		}

		// Create transaction record
		transaction := model.Transaction{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeRecharge,
			Amount:      order.Points,
			Description: description,
			ReferenceID: order.ID,
		}
		return tx.Create(&transaction).Error
	})

	return err
}

// GetOrderByNo retrieves an order by order number
func (s *PaymentService) GetOrderByNo(orderNo string) (*OrderResponse, error) {
	var order model.PaymentOrder
	if err := s.db.Where("order_no = ?", orderNo).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}

	return s.toOrderResponse(&order), nil
}

// GetUserOrders retrieves orders for a user
func (s *PaymentService) GetUserOrders(userID uint, page, limit int) ([]OrderResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var total int64
	if err := s.db.Model(&model.PaymentOrder{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var orders []model.PaymentOrder
	offset := (page - 1) * limit
	if err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	responses := make([]OrderResponse, len(orders))
	for i, order := range orders {
		responses[i] = *s.toOrderResponse(&order)
	}

	return responses, total, nil
}

// VerifySignature verifies the EPay callback signature
func (s *PaymentService) VerifySignature(callback PaymentCallbackRequest, secret string) bool {
	// Build params map (exclude sign and sign_type)
	params := map[string]string{
		"pid":          callback.PID,
		"trade_no":     callback.TradeNo,
		"out_trade_no": callback.OutTradeNo,
		"type":         callback.Type,
		"name":         callback.Name,
		"money":        callback.Money,
		"trade_status": callback.TradeStatus,
	}

	// Calculate expected signature
	expectedSign := s.CalculateSign(params, secret)

	return expectedSign == callback.Sign
}

// CalculateSign calculates MD5 signature for EPay
func (s *PaymentService) CalculateSign(params map[string]string, secret string) string {
	// Sort keys
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build query string
	var parts []string
	for _, k := range keys {
		v := params[k]
		if v != "" {
			parts = append(parts, fmt.Sprintf("%s=%s", k, v))
		}
	}
	queryString := strings.Join(parts, "&")

	// Append secret
	signStr := queryString + secret

	// Calculate MD5
	hash := md5.Sum([]byte(signStr))
	return hex.EncodeToString(hash[:])
}

// buildPaymentURL builds the EPay payment URL
func (s *PaymentService) buildPaymentURL(config *EPayConfig, orderNo string, amount int) (string, error) {
	// EPay API endpoint (this is a common EPay API format)
	baseURL := "https://pay.example.com/submit.php" // This should be configurable

	// Get callback URL from config or use default
	notifyURL := config.CallbackURL
	if notifyURL == "" {
		notifyURL = "http://localhost:8080/api/payment/callback"
	}

	// Build params
	params := map[string]string{
		"pid":          config.MerchantID,
		"type":         "alipay", // Default to alipay, can be made configurable
		"out_trade_no": orderNo,
		"notify_url":   notifyURL,
		"return_url":   notifyURL, // Can be different for user redirect
		"name":         "积分充值",
		"money":        fmt.Sprintf("%.2f", float64(amount)),
	}

	// Calculate signature
	sign := s.CalculateSign(params, config.Secret)
	params["sign"] = sign
	params["sign_type"] = "MD5"

	// Build URL
	u, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	return u.String(), nil
}

// generateOrderNo generates a unique order number
func (s *PaymentService) generateOrderNo() string {
	// Format: timestamp + random UUID suffix
	timestamp := time.Now().Format("20060102150405")
	uuidStr := uuid.New().String()
	// Take first 8 chars of UUID
	suffix := strings.ReplaceAll(uuidStr, "-", "")[:8]
	return fmt.Sprintf("%s%s", timestamp, suffix)
}

// toOrderResponse converts a PaymentOrder to OrderResponse
func (s *PaymentService) toOrderResponse(order *model.PaymentOrder) *OrderResponse {
	return &OrderResponse{
		ID:          order.ID,
		OrderNo:     order.OrderNo,
		Amount:      order.Amount / 100, // Convert from cents to yuan
		Points:      order.Points,
		Status:      order.Status,
		PaymentType: order.PaymentType,
		TradeNo:     order.TradeNo,
		CreatedAt:   order.CreatedAt,
		UpdatedAt:   order.UpdatedAt,
	}
}
