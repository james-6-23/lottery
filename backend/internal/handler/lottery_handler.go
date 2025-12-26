package handler

import (
	"strconv"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// LotteryHandler handles lottery-related endpoints
type LotteryHandler struct {
	lotteryService  *service.LotteryService
	purchaseService *service.PurchaseService
	scratchService  *service.ScratchService
}

// NewLotteryHandler creates a new lottery handler
func NewLotteryHandler(lotteryService *service.LotteryService, purchaseService *service.PurchaseService, scratchService *service.ScratchService) *LotteryHandler {
	return &LotteryHandler{
		lotteryService:  lotteryService,
		purchaseService: purchaseService,
		scratchService:  scratchService,
	}
}

// GetLotteryTypes returns all available lottery types
// GET /api/lottery/types
func (h *LotteryHandler) GetLotteryTypes(c *gin.Context) {
	var query service.LotteryTypeListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.lotteryService.GetAllLotteryTypes(query)
	if err != nil {
		response.InternalError(c, "获取彩票类型列表失败", err.Error())
		return
	}

	response.Success(c, result)
}

// GetLotteryTypeByID returns a lottery type by ID with details
// GET /api/lottery/types/:id
func (h *LotteryHandler) GetLotteryTypeByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	lotteryType, err := h.lotteryService.GetLotteryTypeByID(uint(id))
	if err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		default:
			response.InternalError(c, "获取彩票类型详情失败", err.Error())
		}
		return
	}

	response.Success(c, lotteryType)
}

// CreateLotteryType creates a new lottery type (admin only)
// POST /api/admin/lottery/types
func (h *LotteryHandler) CreateLotteryType(c *gin.Context) {
	var req service.CreateLotteryTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	lotteryType, err := h.lotteryService.CreateLotteryType(req)
	if err != nil {
		switch err {
		case service.ErrInvalidPrizeConfig:
			response.BadRequest(c, "无效的奖级配置")
		default:
			response.InternalError(c, "创建彩票类型失败", err.Error())
		}
		return
	}

	response.Created(c, lotteryType)
}

// UpdateLotteryType updates an existing lottery type (admin only)
// PUT /api/admin/lottery/types/:id
func (h *LotteryHandler) UpdateLotteryType(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	var req service.UpdateLotteryTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	lotteryType, err := h.lotteryService.UpdateLotteryType(uint(id), req)
	if err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		case service.ErrInvalidPrizeConfig:
			response.BadRequest(c, "无效的奖级配置")
		default:
			response.InternalError(c, "更新彩票类型失败", err.Error())
		}
		return
	}

	response.Success(c, lotteryType)
}

// DeleteLotteryType deletes a lottery type (admin only)
// DELETE /api/admin/lottery/types/:id
func (h *LotteryHandler) DeleteLotteryType(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	if err := h.lotteryService.DeleteLotteryType(uint(id)); err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		default:
			response.InternalError(c, "删除彩票类型失败", err.Error())
		}
		return
	}

	response.Success(c, gin.H{"message": "彩票类型已删除"})
}

// GetPrizeLevels returns prize levels for a lottery type
// GET /api/lottery/types/:id/prize-levels
func (h *LotteryHandler) GetPrizeLevels(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	prizeLevels, err := h.lotteryService.GetPrizeLevels(uint(id))
	if err != nil {
		response.InternalError(c, "获取奖级配置失败", err.Error())
		return
	}

	response.Success(c, prizeLevels)
}

// UpdatePrizeLevels updates prize levels for a lottery type (admin only)
// PUT /api/admin/lottery/types/:id/prize-levels
func (h *LotteryHandler) UpdatePrizeLevels(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	var req struct {
		PrizeLevels []service.PrizeLevelInput `json:"prize_levels" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	if err := h.lotteryService.UpdatePrizeLevels(uint(id), req.PrizeLevels); err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		default:
			response.InternalError(c, "更新奖级配置失败", err.Error())
		}
		return
	}

	response.Success(c, gin.H{"message": "奖级配置已更新"})
}

// CreatePrizePool creates a new prize pool for a lottery type (admin only)
// POST /api/admin/lottery/types/:id/prize-pools
func (h *LotteryHandler) CreatePrizePool(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	var req service.CreatePrizePoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}
	req.LotteryTypeID = uint(id)

	prizePool, err := h.lotteryService.CreatePrizePool(req)
	if err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		default:
			response.InternalError(c, "创建奖组失败", err.Error())
		}
		return
	}

	response.Created(c, prizePool)
}

// GetPrizePools returns all prize pools for a lottery type
// GET /api/lottery/types/:id/prize-pools
func (h *LotteryHandler) GetPrizePools(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	prizePools, err := h.lotteryService.GetPrizePools(uint(id))
	if err != nil {
		response.InternalError(c, "获取奖组列表失败", err.Error())
		return
	}

	response.Success(c, prizePools)
}

// GetActivePrizePool returns the active prize pool for a lottery type
// GET /api/lottery/types/:id/active-pool
func (h *LotteryHandler) GetActivePrizePool(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票类型ID")
		return
	}

	prizePool, err := h.lotteryService.GetActivePrizePool(uint(id))
	if err != nil {
		switch err {
		case service.ErrPrizePoolNotFound:
			response.NotFound(c, "没有可用的奖组")
		default:
			response.InternalError(c, "获取奖组失败", err.Error())
		}
		return
	}

	response.Success(c, prizePool)
}


// PurchaseTickets handles ticket purchase requests
// POST /api/lottery/purchase
func (h *LotteryHandler) PurchaseTickets(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "请先登录")
		return
	}

	var req service.PurchaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	// Validate quantity
	if req.Quantity < 1 || req.Quantity > 10 {
		response.BadRequest(c, "购买数量必须在1-10之间")
		return
	}

	result, err := h.purchaseService.PurchaseTickets(userID.(uint), req)
	if err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		case service.ErrLotteryTypeSoldOut:
			response.BadRequest(c, "彩票已售罄")
		case service.ErrInsufficientBalance:
			response.BadRequest(c, "余额不足")
		case service.ErrNoPrizePoolActive:
			response.BadRequest(c, "暂无可用奖组")
		default:
			response.InternalError(c, "购买失败", err.Error())
		}
		return
	}

	response.Success(c, result)
}

// GetPurchasePreview returns a preview of the purchase
// POST /api/lottery/purchase/preview
func (h *LotteryHandler) GetPurchasePreview(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "请先登录")
		return
	}

	var req service.PurchaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	preview, err := h.purchaseService.GetPurchasePreview(userID.(uint), req)
	if err != nil {
		switch err {
		case service.ErrLotteryTypeNotFound:
			response.NotFound(c, "彩票类型不存在")
		case service.ErrWalletNotFound:
			response.NotFound(c, "钱包不存在")
		default:
			response.InternalError(c, "获取预览失败", err.Error())
		}
		return
	}

	response.Success(c, preview)
}

// GetUserTickets returns the user's tickets
// GET /api/lottery/tickets
func (h *LotteryHandler) GetUserTickets(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "请先登录")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	tickets, total, err := h.lotteryService.GetUserTickets(userID.(uint), page, limit)
	if err != nil {
		response.InternalError(c, "获取彩票列表失败", err.Error())
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	response.Success(c, gin.H{
		"tickets":     tickets,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

// GetTicketByID returns a ticket by ID
// GET /api/lottery/tickets/:id
func (h *LotteryHandler) GetTicketByID(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "请先登录")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票ID")
		return
	}

	ticket, err := h.lotteryService.GetTicketByID(uint(id))
	if err != nil {
		switch err {
		case service.ErrTicketNotFound:
			response.NotFound(c, "彩票不存在")
		default:
			response.InternalError(c, "获取彩票详情失败", err.Error())
		}
		return
	}

	// Verify ticket belongs to user
	if ticket.UserID != userID.(uint) {
		response.Forbidden(c, "无权访问此彩票")
		return
	}

	// Only show prize amount if scratched
	showPrize := ticket.Status == "scratched" || ticket.Status == "claimed"
	
	resp := gin.H{
		"id":              ticket.ID,
		"user_id":         ticket.UserID,
		"lottery_type_id": ticket.LotteryTypeID,
		"security_code":   ticket.SecurityCode,
		"status":          ticket.Status,
		"purchased_at":    ticket.PurchasedAt,
		"scratched_at":    ticket.ScratchedAt,
	}

	if showPrize {
		resp["prize_amount"] = ticket.PrizeAmount
	}

	response.Success(c, resp)
}

// VerifySecurityCode verifies a security code
// GET /api/lottery/verify/:code
func (h *LotteryHandler) VerifySecurityCode(c *gin.Context) {
	code := c.Param("code")
	if len(code) != 16 {
		response.BadRequest(c, "无效的保安码格式")
		return
	}

	result, err := h.lotteryService.VerifySecurityCode(code)
	if err != nil {
		switch err {
		case service.ErrTicketNotFound:
			response.NotFound(c, "彩票不存在")
		case service.ErrInvalidSecurityCode:
			response.BadRequest(c, "无效的保安码格式")
		default:
			response.InternalError(c, "查询失败", err.Error())
		}
		return
	}

	response.Success(c, result)
}


// ScratchTicket scratches a ticket and reveals the result
// POST /api/lottery/scratch/:id
func (h *LotteryHandler) ScratchTicket(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "请先登录")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票ID")
		return
	}

	result, err := h.scratchService.ScratchTicket(userID.(uint), uint(id))
	if err != nil {
		switch err {
		case service.ErrTicketNotFound:
			response.NotFound(c, "彩票不存在")
		case service.ErrTicketNotOwned:
			response.Forbidden(c, "无权操作此彩票")
		case service.ErrTicketAlreadyScratched:
			response.BadRequest(c, "彩票已刮开")
		default:
			response.InternalError(c, "刮奖失败", err.Error())
		}
		return
	}

	response.Success(c, result)
}

// GetTicketDetail returns detailed ticket information for scratch page
// GET /api/lottery/tickets/:id/detail
func (h *LotteryHandler) GetTicketDetail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "请先登录")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的彩票ID")
		return
	}

	detail, err := h.scratchService.GetTicketDetail(userID.(uint), uint(id))
	if err != nil {
		switch err {
		case service.ErrTicketNotFound:
			response.NotFound(c, "彩票不存在")
		case service.ErrTicketNotOwned:
			response.Forbidden(c, "无权访问此彩票")
		default:
			response.InternalError(c, "获取彩票详情失败", err.Error())
		}
		return
	}

	response.Success(c, detail)
}
