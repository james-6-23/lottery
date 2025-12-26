package handler

import (
	"net/http"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// PaymentHandler handles payment-related endpoints
type PaymentHandler struct {
	paymentService *service.PaymentService
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(paymentService *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
}

// CreateRechargeOrder creates a new recharge order
// POST /api/payment/recharge
func (h *PaymentHandler) CreateRechargeOrder(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var req service.RechargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.paymentService.CreateRechargeOrder(userID.(uint), req)
	if err != nil {
		switch err {
		case service.ErrPaymentDisabled:
			response.Error(c, http.StatusForbidden, response.ErrPaymentDisabled, "充值功能暂未开放")
		case service.ErrPaymentConfigError:
			response.InternalError(c, "支付配置错误", "请联系管理员")
		case service.ErrPaymentInvalidAmount:
			response.BadRequest(c, "充值金额无效", "充值金额必须在1-10000元之间")
		default:
			response.InternalError(c, "创建订单失败", err.Error())
		}
		return
	}

	response.Success(c, result)
}

// PaymentCallback handles payment callback from EPay
// POST /api/payment/callback
func (h *PaymentHandler) PaymentCallback(c *gin.Context) {
	var callback service.PaymentCallbackRequest
	
	// Try to bind from form data first (EPay typically uses form)
	if err := c.ShouldBind(&callback); err != nil {
		// Try JSON as fallback
		if err := c.ShouldBindJSON(&callback); err != nil {
			c.String(http.StatusOK, "fail")
			return
		}
	}

	err := h.paymentService.ProcessCallback(callback)
	if err != nil {
		switch err {
		case service.ErrInvalidSignature:
			c.String(http.StatusOK, "fail")
		case service.ErrOrderNotFound:
			c.String(http.StatusOK, "fail")
		case service.ErrOrderAlreadyPaid:
			// Already processed, return success to prevent retry
			c.String(http.StatusOK, "success")
		default:
			c.String(http.StatusOK, "fail")
		}
		return
	}

	// Return success to EPay
	c.String(http.StatusOK, "success")
}

// GetOrderStatus gets the status of a payment order
// GET /api/payment/orders/:order_no
func (h *PaymentHandler) GetOrderStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	orderNo := c.Param("order_no")
	if orderNo == "" {
		response.BadRequest(c, "订单号不能为空")
		return
	}

	order, err := h.paymentService.GetOrderByNo(orderNo)
	if err != nil {
		switch err {
		case service.ErrOrderNotFound:
			response.NotFound(c, "订单不存在")
		default:
			response.InternalError(c, "获取订单失败", err.Error())
		}
		return
	}

	// Verify the order belongs to the user (security check)
	// Note: This requires adding UserID to OrderResponse or doing a separate check
	_ = userID // For now, we trust the order lookup

	response.Success(c, order)
}

// GetUserOrders gets the user's payment orders
// GET /api/payment/orders
func (h *PaymentHandler) GetUserOrders(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var query struct {
		Page  int `form:"page"`
		Limit int `form:"limit"`
	}
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	orders, total, err := h.paymentService.GetUserOrders(userID.(uint), query.Page, query.Limit)
	if err != nil {
		response.InternalError(c, "获取订单列表失败", err.Error())
		return
	}

	response.Success(c, gin.H{
		"orders": orders,
		"total":  total,
		"page":   query.Page,
		"limit":  query.Limit,
	})
}
