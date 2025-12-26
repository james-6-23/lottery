package handler

import (
	"net/http"
	"strconv"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// ExchangeHandler handles exchange-related endpoints
type ExchangeHandler struct {
	exchangeService *service.ExchangeService
}

// NewExchangeHandler creates a new exchange handler
func NewExchangeHandler(exchangeService *service.ExchangeService) *ExchangeHandler {
	return &ExchangeHandler{exchangeService: exchangeService}
}

// GetProducts returns the list of available products
// GET /api/exchange/products
func (h *ExchangeHandler) GetProducts(c *gin.Context) {
	var query service.ProductQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.exchangeService.GetProducts(query)
	if err != nil {
		response.InternalError(c, "获取商品列表失败", err.Error())
		return
	}

	response.Success(c, result)
}

// GetProductByID returns a product by ID
// GET /api/exchange/products/:id
func (h *ExchangeHandler) GetProductByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的商品ID")
		return
	}

	product, err := h.exchangeService.GetProductByID(uint(id))
	if err != nil {
		switch err {
		case service.ErrProductNotFound:
			response.NotFound(c, "商品不存在")
		default:
			response.InternalError(c, "获取商品详情失败", err.Error())
		}
		return
	}

	response.Success(c, product)
}


// Redeem redeems a product for the current user
// POST /api/exchange/redeem
func (h *ExchangeHandler) Redeem(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var req service.RedeemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.exchangeService.Redeem(userID.(uint), req.ProductID)
	if err != nil {
		switch err {
		case service.ErrProductNotFound:
			response.NotFound(c, "商品不存在")
		case service.ErrProductSoldOut:
			response.Error(c, http.StatusOK, response.ErrProductSoldOut, "商品已兑完")
		case service.ErrProductOffline:
			response.Error(c, http.StatusOK, response.ErrProductNotFound, "商品已下架")
		case service.ErrInsufficientPoints:
			response.Error(c, http.StatusOK, response.ErrInsufficientPoints, "积分不足")
		case service.ErrNoAvailableCardKey:
			response.Error(c, http.StatusOK, response.ErrProductSoldOut, "商品已兑完")
		default:
			response.InternalError(c, "兑换失败", err.Error())
		}
		return
	}

	response.Success(c, result)
}

// GetExchangeRecords returns the exchange records for the current user
// GET /api/exchange/records
func (h *ExchangeHandler) GetExchangeRecords(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var query service.ExchangeRecordQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.exchangeService.GetExchangeRecords(userID.(uint), query)
	if err != nil {
		response.InternalError(c, "获取兑换记录失败", err.Error())
		return
	}

	response.Success(c, result)
}

// GetExchangeRecordByID returns an exchange record by ID
// GET /api/exchange/records/:id
func (h *ExchangeHandler) GetExchangeRecordByID(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的记录ID")
		return
	}

	record, err := h.exchangeService.GetExchangeRecordByID(userID.(uint), uint(id))
	if err != nil {
		response.NotFound(c, "兑换记录不存在")
		return
	}

	response.Success(c, record)
}

// ==================== Admin Endpoints ====================

// GetAllProducts returns all products (including offline) for admin
// GET /api/admin/exchange/products
func (h *ExchangeHandler) GetAllProducts(c *gin.Context) {
	var query service.ProductQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.exchangeService.GetAllProducts(query)
	if err != nil {
		response.InternalError(c, "获取商品列表失败", err.Error())
		return
	}

	response.Success(c, result)
}

// CreateProduct creates a new product
// POST /api/admin/exchange/products
func (h *ExchangeHandler) CreateProduct(c *gin.Context) {
	var req service.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	product, err := h.exchangeService.CreateProduct(req)
	if err != nil {
		response.InternalError(c, "创建商品失败", err.Error())
		return
	}

	response.Created(c, product)
}

// UpdateProduct updates a product
// PUT /api/admin/exchange/products/:id
func (h *ExchangeHandler) UpdateProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的商品ID")
		return
	}

	var req service.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	product, err := h.exchangeService.UpdateProduct(uint(id), req)
	if err != nil {
		switch err {
		case service.ErrProductNotFound:
			response.NotFound(c, "商品不存在")
		default:
			response.InternalError(c, "更新商品失败", err.Error())
		}
		return
	}

	response.Success(c, product)
}

// DeleteProduct deletes a product
// DELETE /api/admin/exchange/products/:id
func (h *ExchangeHandler) DeleteProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的商品ID")
		return
	}

	if err := h.exchangeService.DeleteProduct(uint(id)); err != nil {
		switch err {
		case service.ErrProductNotFound:
			response.NotFound(c, "商品不存在")
		default:
			response.InternalError(c, "删除商品失败", err.Error())
		}
		return
	}

	response.Success(c, gin.H{"message": "商品已删除"})
}

// ImportCardKeys imports card keys for a product
// POST /api/admin/exchange/products/:id/import-keys
func (h *ExchangeHandler) ImportCardKeys(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的商品ID")
		return
	}

	var req service.ImportCardKeysRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	imported, err := h.exchangeService.ImportCardKeys(uint(id), req.CardKeys)
	if err != nil {
		switch err {
		case service.ErrProductNotFound:
			response.NotFound(c, "商品不存在")
		default:
			response.InternalError(c, "导入卡密失败", err.Error())
		}
		return
	}

	response.Success(c, gin.H{
		"imported": imported,
		"message":  "卡密导入成功",
	})
}

// GetCardKeys returns card keys for a product (admin only)
// GET /api/admin/exchange/products/:id/card-keys
func (h *ExchangeHandler) GetCardKeys(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的商品ID")
		return
	}

	status := c.Query("status")

	cardKeys, err := h.exchangeService.GetCardKeysByProductID(uint(id), status)
	if err != nil {
		switch err {
		case service.ErrProductNotFound:
			response.NotFound(c, "商品不存在")
		default:
			response.InternalError(c, "获取卡密列表失败", err.Error())
		}
		return
	}

	response.Success(c, gin.H{
		"card_keys": cardKeys,
		"total":     len(cardKeys),
	})
}
