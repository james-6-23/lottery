package service

import (
	"errors"
	"time"

	"scratch-lottery/internal/model"

	"gorm.io/gorm"
)

var (
	ErrWalletNotFound       = errors.New("wallet not found")
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrInvalidAmount        = errors.New("invalid amount")
)

// WalletService handles wallet-related business logic
type WalletService struct {
	db *gorm.DB
}

// NewWalletService creates a new wallet service
func NewWalletService(db *gorm.DB) *WalletService {
	return &WalletService{db: db}
}

// WalletResponse represents the wallet information response
type WalletResponse struct {
	ID           uint                 `json:"id"`
	UserID       uint                 `json:"user_id"`
	Balance      int                  `json:"balance"`
	Transactions []TransactionResponse `json:"transactions,omitempty"`
	CreatedAt    time.Time            `json:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at"`
}

// TransactionResponse represents a transaction in the response
type TransactionResponse struct {
	ID          uint                   `json:"id"`
	Type        model.TransactionType  `json:"type"`
	Amount      int                    `json:"amount"`
	Description string                 `json:"description"`
	ReferenceID uint                   `json:"reference_id,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

// TransactionQuery represents query parameters for transactions
type TransactionQuery struct {
	Type   string `form:"type"`
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
}

// TransactionListResponse represents paginated transaction list
type TransactionListResponse struct {
	Transactions []TransactionResponse `json:"transactions"`
	Total        int64                 `json:"total"`
	Page         int                   `json:"page"`
	Limit        int                   `json:"limit"`
	TotalPages   int                   `json:"total_pages"`
}

// CreateWalletForUser creates a wallet for a new user with initial balance
func (s *WalletService) CreateWalletForUser(userID uint) (*model.Wallet, error) {
	// Check if wallet already exists
	var existingWallet model.Wallet
	if err := s.db.Where("user_id = ?", userID).First(&existingWallet).Error; err == nil {
		return &existingWallet, nil
	}

	// Create wallet with initial balance
	wallet := model.Wallet{
		UserID:  userID,
		Balance: 50, // Initial 50 points as per requirements
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&wallet).Error; err != nil {
			return err
		}

		// Create initial transaction record
		transaction := model.Transaction{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeInitial,
			Amount:      50,
			Description: "新用户注册赠送",
		}
		return tx.Create(&transaction).Error
	})

	if err != nil {
		return nil, err
	}

	return &wallet, nil
}

// GetWalletByUserID retrieves wallet information for a user
func (s *WalletService) GetWalletByUserID(userID uint) (*WalletResponse, error) {
	var wallet model.Wallet
	if err := s.db.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWalletNotFound
		}
		return nil, err
	}

	// Get recent transactions (last 10)
	var transactions []model.Transaction
	s.db.Where("wallet_id = ?", wallet.ID).
		Order("created_at DESC").
		Limit(10).
		Find(&transactions)

	return s.toWalletResponse(&wallet, transactions), nil
}

// GetBalance retrieves the current balance for a user
func (s *WalletService) GetBalance(userID uint) (int, error) {
	var wallet model.Wallet
	if err := s.db.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrWalletNotFound
		}
		return 0, err
	}
	return wallet.Balance, nil
}

// GetTransactions retrieves paginated transactions for a user
func (s *WalletService) GetTransactions(userID uint, query TransactionQuery) (*TransactionListResponse, error) {
	var wallet model.Wallet
	if err := s.db.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWalletNotFound
		}
		return nil, err
	}

	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.Transaction{}).Where("wallet_id = ?", wallet.ID)
	
	// Filter by type if specified
	if query.Type != "" {
		dbQuery = dbQuery.Where("type = ?", query.Type)
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var transactions []model.Transaction
	offset := (query.Page - 1) * query.Limit
	if err := dbQuery.Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&transactions).Error; err != nil {
		return nil, err
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &TransactionListResponse{
		Transactions: s.toTransactionResponses(transactions),
		Total:        total,
		Page:         query.Page,
		Limit:        query.Limit,
		TotalPages:   totalPages,
	}, nil
}

// AddTransaction adds a transaction and updates the wallet balance
func (s *WalletService) AddTransaction(userID uint, txType model.TransactionType, amount int, description string, referenceID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var wallet model.Wallet
		if err := tx.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrWalletNotFound
			}
			return err
		}

		// Check balance for debit transactions
		if amount < 0 && wallet.Balance+amount < 0 {
			return ErrInsufficientBalance
		}

		// Update balance
		wallet.Balance += amount
		if err := tx.Save(&wallet).Error; err != nil {
			return err
		}

		// Create transaction record
		transaction := model.Transaction{
			WalletID:    wallet.ID,
			Type:        txType,
			Amount:      amount,
			Description: description,
			ReferenceID: referenceID,
		}
		return tx.Create(&transaction).Error
	})
}

// Deduct deducts points from user's wallet (for purchases)
func (s *WalletService) Deduct(userID uint, amount int, txType model.TransactionType, description string, referenceID uint) error {
	if amount <= 0 {
		return ErrInvalidAmount
	}
	return s.AddTransaction(userID, txType, -amount, description, referenceID)
}

// Credit adds points to user's wallet (for wins, recharges)
func (s *WalletService) Credit(userID uint, amount int, txType model.TransactionType, description string, referenceID uint) error {
	if amount <= 0 {
		return ErrInvalidAmount
	}
	return s.AddTransaction(userID, txType, amount, description, referenceID)
}

// HasSufficientBalance checks if user has enough balance
func (s *WalletService) HasSufficientBalance(userID uint, amount int) (bool, error) {
	balance, err := s.GetBalance(userID)
	if err != nil {
		return false, err
	}
	return balance >= amount, nil
}

// Helper functions

func (s *WalletService) toWalletResponse(wallet *model.Wallet, transactions []model.Transaction) *WalletResponse {
	return &WalletResponse{
		ID:           wallet.ID,
		UserID:       wallet.UserID,
		Balance:      wallet.Balance,
		Transactions: s.toTransactionResponses(transactions),
		CreatedAt:    wallet.CreatedAt,
		UpdatedAt:    wallet.UpdatedAt,
	}
}

func (s *WalletService) toTransactionResponses(transactions []model.Transaction) []TransactionResponse {
	responses := make([]TransactionResponse, len(transactions))
	for i, tx := range transactions {
		responses[i] = TransactionResponse{
			ID:          tx.ID,
			Type:        tx.Type,
			Amount:      tx.Amount,
			Description: tx.Description,
			ReferenceID: tx.ReferenceID,
			CreatedAt:   tx.CreatedAt,
		}
	}
	return responses
}
