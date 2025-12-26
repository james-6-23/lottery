package handler

import (
	"strconv"

	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
)

// AdminHandler handles admin-related endpoints
type AdminHandler struct {
	adminService *service.AdminService
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(adminService *service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

// GetPaymentStatus returns whether payment is enabled (public endpoint)
// GET /api/system/payment-status
func (h *AdminHandler) GetPaymentStatus(c *gin.Context) {
	enabled := h.adminService.IsPaymentEnabled()
	response.Success(c, gin.H{
		"payment_enabled": enabled,
	})
}

// GetDashboard returns dashboard statistics
// GET /api/admin/dashboard
func (h *AdminHandler) GetDashboard(c *gin.Context) {
	stats, err := h.adminService.GetDashboardStats()
	if err != nil {
		response.InternalError(c, "获取统计数据失败", err.Error())
		return
	}

	response.Success(c, stats)
}

// ==================== User Management ====================

// GetUsers returns paginated user list
// GET /api/admin/users
func (h *AdminHandler) GetUsers(c *gin.Context) {
	var query service.UserListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.adminService.GetUsers(query)
	if err != nil {
		response.InternalError(c, "获取用户列表失败", err.Error())
		return
	}

	response.Success(c, result)
}

// GetUserByID returns a user by ID
// GET /api/admin/users/:id
func (h *AdminHandler) GetUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的用户ID")
		return
	}

	user, err := h.adminService.GetUserByID(uint(id))
	if err != nil {
		switch err {
		case service.ErrUserNotFound:
			response.NotFound(c, "用户不存在")
		default:
			response.InternalError(c, "获取用户信息失败", err.Error())
		}
		return
	}

	response.Success(c, user)
}

// AdjustUserPoints adjusts a user's points balance
// PUT /api/admin/users/:id/points
func (h *AdminHandler) AdjustUserPoints(c *gin.Context) {
	adminID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的用户ID")
		return
	}

	var req service.AdjustUserPointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	user, err := h.adminService.AdjustUserPoints(adminID.(uint), uint(id), req)
	if err != nil {
		switch err {
		case service.ErrUserNotFound:
			response.NotFound(c, "用户不存在")
		case service.ErrInsufficientBalance:
			response.BadRequest(c, "调整后余额不能为负数")
		default:
			response.InternalError(c, "调整积分失败", err.Error())
		}
		return
	}

	response.Success(c, user)
}

// UpdateUserRole updates a user's role
// PUT /api/admin/users/:id/role
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	adminID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "无效的用户ID")
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	user, err := h.adminService.UpdateUserRole(adminID.(uint), uint(id), req.Role)
	if err != nil {
		switch err {
		case service.ErrUserNotFound:
			response.NotFound(c, "用户不存在")
		default:
			response.InternalError(c, "更新角色失败", err.Error())
		}
		return
	}

	response.Success(c, user)
}

// ==================== System Settings ====================

// GetSystemSettings returns system settings
// GET /api/admin/settings
func (h *AdminHandler) GetSystemSettings(c *gin.Context) {
	settings, err := h.adminService.GetSystemSettings()
	if err != nil {
		response.InternalError(c, "获取系统设置失败", err.Error())
		return
	}

	response.Success(c, settings)
}

// UpdateSystemSettings updates system settings
// PUT /api/admin/settings
func (h *AdminHandler) UpdateSystemSettings(c *gin.Context) {
	adminID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	var req service.UpdateSystemSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	settings, err := h.adminService.UpdateSystemSettings(adminID.(uint), req)
	if err != nil {
		response.InternalError(c, "更新系统设置失败", err.Error())
		return
	}

	response.Success(c, settings)
}

// ==================== Admin Logs ====================

// GetAdminLogs returns paginated admin logs
// GET /api/admin/logs
func (h *AdminHandler) GetAdminLogs(c *gin.Context) {
	var query service.AdminLogQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	result, err := h.adminService.GetAdminLogs(query)
	if err != nil {
		response.InternalError(c, "获取操作日志失败", err.Error())
		return
	}

	response.Success(c, result)
}

// ==================== Statistics ====================

// GetStatistics returns comprehensive statistics
// GET /api/admin/statistics
func (h *AdminHandler) GetStatistics(c *gin.Context) {
	var query service.StatisticsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	stats, err := h.adminService.GetStatistics(query)
	if err != nil {
		response.InternalError(c, "获取统计数据失败", err.Error())
		return
	}

	response.Success(c, stats)
}

// ExportStatistics exports statistics as CSV
// GET /api/admin/statistics/export
func (h *AdminHandler) ExportStatistics(c *gin.Context) {
	var query service.StatisticsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "请求参数无效", err.Error())
		return
	}

	csvData, err := h.adminService.ExportStatisticsCSV(query)
	if err != nil {
		response.InternalError(c, "导出统计数据失败", err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=statistics.csv")
	c.Data(200, "text/csv; charset=utf-8", csvData)
}
