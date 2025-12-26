package service

import (
	"errors"
	"fmt"
	"time"

	"scratch-lottery/internal/model"

	"gorm.io/gorm"
)

var (
	ErrProductNotFound     = errors.New("product not found")
	ErrProductSoldOut      = errors.New("product sold out")
	ErrProductOffline      = errors.New("product offline")
	ErrInsufficientPoints  = errors.New("insufficient points")
	ErrNoAvailableCardKey  = errors.New("no available card key")
	ErrCardKeyNotFound     = errors.New("card key not found")
)

// ExchangeService handles exchange-related business logic
type ExchangeService struct {
	db            *gorm.DB
	walletService *WalletService
}

// NewExchangeService creates a new exchange service
func NewExchangeService(db *gorm.DB, walletService *WalletService) *ExchangeService {
	return &ExchangeService{
		db:            db,
		walletService: walletService,
	}
}

// ProductResponse represents a product in the response
type ProductResponse struct {
	ID          uint                 `json:"id"`
	Name        string               `json:"name"`
	Description string               `json:"description"`
	Image       string               `json:"image"`
	Price       int                  `json:"price"`
	Stock       int                  `json:"stock"`
	Status      model.ProductStatus  `json:"status"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

// ProductListResponse represents paginated product list
type ProductListResponse struct {
	Products   []ProductResponse `json:"products"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

// ProductQuery represents query parameters for products
type ProductQuery struct {
	Status string `form:"status"`
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
}


// RedeemRequest represents a redeem request
type RedeemRequest struct {
	ProductID uint `json:"product_id" binding:"required"`
}

// RedeemResponse represents a redeem response
type RedeemResponse struct {
	CardKey     string `json:"card_key"`
	ProductName string `json:"product_name"`
	Cost        int    `json:"cost"`
	Balance     int    `json:"balance"`
	RecordID    uint   `json:"record_id"`
}

// ExchangeRecordResponse represents an exchange record in the response
type ExchangeRecordResponse struct {
	ID          uint      `json:"id"`
	ProductID   uint      `json:"product_id"`
	ProductName string    `json:"product_name"`
	CardKey     string    `json:"card_key"`
	Cost        int       `json:"cost"`
	CreatedAt   time.Time `json:"created_at"`
}

// ExchangeRecordListResponse represents paginated exchange record list
type ExchangeRecordListResponse struct {
	Records    []ExchangeRecordResponse `json:"records"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	Limit      int                      `json:"limit"`
	TotalPages int                      `json:"total_pages"`
}

// ExchangeRecordQuery represents query parameters for exchange records
type ExchangeRecordQuery struct {
	Page  int `form:"page"`
	Limit int `form:"limit"`
}

// CreateProductRequest represents a request to create a product
type CreateProductRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Price       int    `json:"price" binding:"required,gt=0"`
}

// UpdateProductRequest represents a request to update a product
type UpdateProductRequest struct {
	Name        *string              `json:"name"`
	Description *string              `json:"description"`
	Image       *string              `json:"image"`
	Price       *int                 `json:"price"`
	Status      *model.ProductStatus `json:"status"`
}

// ImportCardKeysRequest represents a request to import card keys
type ImportCardKeysRequest struct {
	CardKeys []string `json:"card_keys" binding:"required,min=1"`
}


// ==================== Product CRUD Operations ====================

// CreateProduct creates a new product
func (s *ExchangeService) CreateProduct(req CreateProductRequest) (*ProductResponse, error) {
	product := model.Product{
		Name:        req.Name,
		Description: req.Description,
		Image:       req.Image,
		Price:       req.Price,
		Stock:       0,
		Status:      model.ProductStatusAvailable,
	}

	if err := s.db.Create(&product).Error; err != nil {
		return nil, err
	}

	return s.toProductResponse(&product), nil
}

// GetProducts retrieves paginated products
func (s *ExchangeService) GetProducts(query ProductQuery) (*ProductListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query - only show available products for users
	dbQuery := s.db.Model(&model.Product{})
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	} else {
		// Default: show only available and sold_out products (not offline)
		dbQuery = dbQuery.Where("status IN ?", []model.ProductStatus{
			model.ProductStatusAvailable,
			model.ProductStatusSoldOut,
		})
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var products []model.Product
	offset := (query.Page - 1) * query.Limit
	if err := dbQuery.Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&products).Error; err != nil {
		return nil, err
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &ProductListResponse{
		Products:   s.toProductResponses(products),
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetAllProducts retrieves all products (for admin)
func (s *ExchangeService) GetAllProducts(query ProductQuery) (*ProductListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.Product{})
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var products []model.Product
	offset := (query.Page - 1) * query.Limit
	if err := dbQuery.Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&products).Error; err != nil {
		return nil, err
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &ProductListResponse{
		Products:   s.toProductResponses(products),
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		TotalPages: totalPages,
	}, nil
}


// GetProductByID retrieves a product by ID
func (s *ExchangeService) GetProductByID(id uint) (*ProductResponse, error) {
	var product model.Product
	if err := s.db.First(&product, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	return s.toProductResponse(&product), nil
}

// UpdateProduct updates a product
func (s *ExchangeService) UpdateProduct(id uint, req UpdateProductRequest) (*ProductResponse, error) {
	var product model.Product
	if err := s.db.First(&product, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}

	// Update fields if provided
	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Image != nil {
		product.Image = *req.Image
	}
	if req.Price != nil {
		product.Price = *req.Price
	}
	if req.Status != nil {
		product.Status = *req.Status
	}

	if err := s.db.Save(&product).Error; err != nil {
		return nil, err
	}

	return s.toProductResponse(&product), nil
}

// DeleteProduct deletes a product (soft delete)
func (s *ExchangeService) DeleteProduct(id uint) error {
	result := s.db.Delete(&model.Product{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrProductNotFound
	}
	return nil
}

// ==================== Card Key Management ====================

// ImportCardKeys imports card keys for a product
func (s *ExchangeService) ImportCardKeys(productID uint, cardKeys []string) (int, error) {
	var product model.Product
	if err := s.db.First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrProductNotFound
		}
		return 0, err
	}

	imported := 0
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, key := range cardKeys {
			if key == "" {
				continue
			}
			cardKey := model.CardKey{
				ProductID:  productID,
				KeyContent: key,
				Status:     model.CardKeyStatusAvailable,
			}
			if err := tx.Create(&cardKey).Error; err != nil {
				return err
			}
			imported++
		}

		// Update product stock
		if err := tx.Model(&product).Update("stock", gorm.Expr("stock + ?", imported)).Error; err != nil {
			return err
		}

		// Update product status if it was sold out
		if product.Status == model.ProductStatusSoldOut && imported > 0 {
			if err := tx.Model(&product).Update("status", model.ProductStatusAvailable).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	return imported, nil
}


// GetCardKeysByProductID retrieves card keys for a product (admin only)
func (s *ExchangeService) GetCardKeysByProductID(productID uint, status string) ([]model.CardKey, error) {
	var product model.Product
	if err := s.db.First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}

	dbQuery := s.db.Where("product_id = ?", productID)
	if status != "" {
		dbQuery = dbQuery.Where("status = ?", status)
	}

	var cardKeys []model.CardKey
	if err := dbQuery.Order("created_at DESC").Find(&cardKeys).Error; err != nil {
		return nil, err
	}

	return cardKeys, nil
}

// UpdateProductStock updates the stock count based on available card keys
func (s *ExchangeService) UpdateProductStock(productID uint) error {
	var count int64
	if err := s.db.Model(&model.CardKey{}).
		Where("product_id = ? AND status = ?", productID, model.CardKeyStatusAvailable).
		Count(&count).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"stock": count,
	}

	// Update status based on stock
	if count == 0 {
		updates["status"] = model.ProductStatusSoldOut
	}

	return s.db.Model(&model.Product{}).Where("id = ?", productID).Updates(updates).Error
}

// ==================== Exchange Operations ====================

// Redeem redeems a product for a user
func (s *ExchangeService) Redeem(userID uint, productID uint) (*RedeemResponse, error) {
	var product model.Product
	if err := s.db.First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}

	// Check product status
	if product.Status == model.ProductStatusOffline {
		return nil, ErrProductOffline
	}
	if product.Status == model.ProductStatusSoldOut || product.Stock <= 0 {
		return nil, ErrProductSoldOut
	}

	// Check user balance
	balance, err := s.walletService.GetBalance(userID)
	if err != nil {
		return nil, err
	}
	if balance < product.Price {
		return nil, ErrInsufficientPoints
	}

	var record model.ExchangeRecord
	var cardKey model.CardKey
	var newBalance int

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Find and lock an available card key
		if err := tx.Where("product_id = ? AND status = ?", productID, model.CardKeyStatusAvailable).
			Order("created_at ASC").
			First(&cardKey).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNoAvailableCardKey
			}
			return err
		}

		// Mark card key as redeemed
		now := time.Now()
		cardKey.Status = model.CardKeyStatusRedeemed
		cardKey.RedeemedBy = userID
		cardKey.RedeemedAt = &now
		if err := tx.Save(&cardKey).Error; err != nil {
			return err
		}

		// Deduct points from wallet
		var wallet model.Wallet
		if err := tx.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return err
		}
		wallet.Balance -= product.Price
		newBalance = wallet.Balance
		if err := tx.Save(&wallet).Error; err != nil {
			return err
		}

		// Create transaction record
		transaction := model.Transaction{
			WalletID:    wallet.ID,
			Type:        model.TransactionTypeExchange,
			Amount:      -product.Price,
			Description: fmt.Sprintf("兑换商品: %s", product.Name),
			ReferenceID: productID,
		}
		if err := tx.Create(&transaction).Error; err != nil {
			return err
		}

		// Create exchange record
		record = model.ExchangeRecord{
			UserID:    userID,
			ProductID: productID,
			CardKeyID: cardKey.ID,
			Cost:      product.Price,
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		// Update product stock
		product.Stock--
		if product.Stock <= 0 {
			product.Status = model.ProductStatusSoldOut
		}
		if err := tx.Save(&product).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &RedeemResponse{
		CardKey:     cardKey.KeyContent,
		ProductName: product.Name,
		Cost:        product.Price,
		Balance:     newBalance,
		RecordID:    record.ID,
	}, nil
}


// GetExchangeRecords retrieves paginated exchange records for a user
func (s *ExchangeService) GetExchangeRecords(userID uint, query ExchangeRecordQuery) (*ExchangeRecordListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Build query
	dbQuery := s.db.Model(&model.ExchangeRecord{}).Where("user_id = ?", userID)

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results with preloaded relations
	var records []model.ExchangeRecord
	offset := (query.Page - 1) * query.Limit
	if err := s.db.Where("user_id = ?", userID).
		Preload("Product").
		Preload("CardKey").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&records).Error; err != nil {
		return nil, err
	}

	// Calculate total pages
	totalPages := int(total) / query.Limit
	if int(total)%query.Limit > 0 {
		totalPages++
	}

	return &ExchangeRecordListResponse{
		Records:    s.toExchangeRecordResponses(records),
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetExchangeRecordByID retrieves an exchange record by ID
func (s *ExchangeService) GetExchangeRecordByID(userID uint, recordID uint) (*ExchangeRecordResponse, error) {
	var record model.ExchangeRecord
	if err := s.db.Where("id = ? AND user_id = ?", recordID, userID).
		Preload("Product").
		Preload("CardKey").
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("exchange record not found")
		}
		return nil, err
	}

	return s.toExchangeRecordResponse(&record), nil
}

// ==================== Helper Functions ====================

func (s *ExchangeService) toProductResponse(product *model.Product) *ProductResponse {
	return &ProductResponse{
		ID:          product.ID,
		Name:        product.Name,
		Description: product.Description,
		Image:       product.Image,
		Price:       product.Price,
		Stock:       product.Stock,
		Status:      product.Status,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	}
}

func (s *ExchangeService) toProductResponses(products []model.Product) []ProductResponse {
	responses := make([]ProductResponse, len(products))
	for i, p := range products {
		responses[i] = *s.toProductResponse(&p)
	}
	return responses
}

func (s *ExchangeService) toExchangeRecordResponse(record *model.ExchangeRecord) *ExchangeRecordResponse {
	return &ExchangeRecordResponse{
		ID:          record.ID,
		ProductID:   record.ProductID,
		ProductName: record.Product.Name,
		CardKey:     record.CardKey.KeyContent,
		Cost:        record.Cost,
		CreatedAt:   record.CreatedAt,
	}
}

func (s *ExchangeService) toExchangeRecordResponses(records []model.ExchangeRecord) []ExchangeRecordResponse {
	responses := make([]ExchangeRecordResponse, len(records))
	for i, r := range records {
		responses[i] = *s.toExchangeRecordResponse(&r)
	}
	return responses
}
