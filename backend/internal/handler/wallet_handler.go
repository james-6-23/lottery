package handler

import (
	"net/http"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// WalletHandler handles wallet-related endpoints
type WalletHandler struct {
	walletService *service.WalletService
}

// NewWalletHandler creates a new wallet handler
func NewWalletHandler(walletService *service.WalletService) *WalletHandler {
	return &WalletHandler{walletService: walletService}
}

// GetWallet returns the current user's wallet information
// GET /api/wallet
func (h *WalletHandler) GetWallet(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	wallet, err := h.walletService.GetWalletByUserID(userID.(uint))
	if err != nil {
		switch err {
		case service.ErrWalletNotFound:
			response.NotFound(c, "钱包不存在")
		default:
			response.InternalError(c, "获取钱包信息失败", err.Error())
		}
		return
	}

	response.Success(c, wallet)
}

// GetTransactions returns the current user's transaction history
// GET /api/wallet/transactions
func (h *WalletHandler) GetTransactions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var query service.TransactionQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.walletService.GetTransactions(userID.(uint), query)
	if err != nil {
		switch err {
		case service.ErrWalletNotFound:
			response.NotFound(c, "钱包不存在")
		default:
			response.InternalError(c, "获取交易记录失败", err.Error())
		}
		return
	}

	response.Success(c, result)
}

// GetBalance returns only the current balance
// GET /api/wallet/balance
func (h *WalletHandler) GetBalance(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	balance, err := h.walletService.GetBalance(userID.(uint))
	if err != nil {
		switch err {
		case service.ErrWalletNotFound:
			response.NotFound(c, "钱包不存在")
		default:
			response.InternalError(c, "获取余额失败", err.Error())
		}
		return
	}

	response.Success(c, gin.H{
		"balance": balance,
	})
}

// CheckBalance checks if user has sufficient balance for a given amount
// POST /api/wallet/check-balance
func (h *WalletHandler) CheckBalance(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var req struct {
		Amount int `json:"amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	sufficient, err := h.walletService.HasSufficientBalance(userID.(uint), req.Amount)
	if err != nil {
		switch err {
		case service.ErrWalletNotFound:
			response.NotFound(c, "钱包不存在")
		default:
			response.InternalError(c, "检查余额失败", err.Error())
		}
		return
	}

	if !sufficient {
		response.Error(c, http.StatusOK, response.ErrInsufficientBalance, "余额不足")
		return
	}

	response.Success(c, gin.H{
		"sufficient": true,
	})
}
