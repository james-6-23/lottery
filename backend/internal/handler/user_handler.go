package handler

import (
	"strconv"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// UserHandler handles user-related endpoints
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// GetProfile returns the current user's profile
// GET /api/user/profile
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	profile, err := h.userService.GetUserProfile(userID.(uint))
	if err != nil {
		switch err {
		case service.ErrUserNotFound:
			response.NotFound(c, "用户不存在")
		default:
			response.InternalError(c, "获取用户信息失败", err.Error())
		}
		return
	}

	response.Success(c, profile)
}

// GetStatistics returns the current user's game statistics
// GET /api/user/statistics
func (h *UserHandler) GetStatistics(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	stats, err := h.userService.GetUserStatistics(userID.(uint))
	if err != nil {
		response.InternalError(c, "获取统计数据失败", err.Error())
		return
	}

	response.Success(c, stats)
}

// GetTickets returns the current user's ticket purchase history
// GET /api/user/tickets
func (h *UserHandler) GetTickets(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var query service.TicketRecordQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.userService.GetUserTickets(userID.(uint), query)
	if err != nil {
		response.InternalError(c, "获取购彩记录失败", err.Error())
		return
	}

	response.Success(c, result)
}

// GetWins returns the current user's winning records
// GET /api/user/wins
func (h *UserHandler) GetWins(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.userService.GetUserWins(userID.(uint), page, limit)
	if err != nil {
		response.InternalError(c, "获取中奖记录失败", err.Error())
		return
	}

	response.Success(c, result)
}
