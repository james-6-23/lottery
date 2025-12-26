package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIError is attached to gin.Context errors for request logging.
// It does not change the response body format by itself.
type APIError struct {
	HTTPStatus int
	Code       int
	Message    string
	Details    string
}

func (e *APIError) Error() string {
	if e == nil {
		return ""
	}
	if e.Details != "" {
		return e.Details
	}
	return e.Message
}

// Error codes
const (
	// General errors 1xxx
	ErrInvalidRequest  = 1001
	ErrUnauthorized    = 1002
	ErrForbidden       = 1003
	ErrNotFound        = 1004
	ErrInternalServer  = 1005

	// Auth errors 2xxx
	ErrOAuthFailed    = 2001
	ErrTokenExpired   = 2002
	ErrTokenInvalid   = 2003
	ErrRefreshFailed  = 2004

	// Lottery errors 3xxx
	ErrInsufficientBalance = 3001
	ErrLotteryNotFound     = 3002
	ErrLotterySoldOut      = 3003
	ErrAlreadyScratched    = 3004
	ErrInvalidSecurityCode = 3005

	// Exchange errors 4xxx
	ErrProductNotFound    = 4001
	ErrProductSoldOut     = 4002
	ErrInsufficientPoints = 4003

	// Payment errors 5xxx
	ErrPaymentDisabled  = 5001
	ErrPaymentFailed    = 5002
	ErrInvalidSignature = 5003
)

// Response represents a standard API response
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Success sends a successful response
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

// Created sends a 201 created response
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Code:    0,
		Message: "created",
		Data:    data,
	})
}

// Error sends an error response
func Error(c *gin.Context, httpStatus int, code int, message string, details ...string) {
	resp := ErrorResponse{
		Code:    code,
		Message: message,
	}
	if len(details) > 0 {
		resp.Details = details[0]
	}

	_ = c.Error(&APIError{
		HTTPStatus: httpStatus,
		Code:       code,
		Message:    message,
		Details:    resp.Details,
	})
	c.JSON(httpStatus, resp)
}

// BadRequest sends a 400 bad request response
func BadRequest(c *gin.Context, message string, details ...string) {
	Error(c, http.StatusBadRequest, ErrInvalidRequest, message, details...)
}

// Unauthorized sends a 401 unauthorized response
func Unauthorized(c *gin.Context, message string, details ...string) {
	Error(c, http.StatusUnauthorized, ErrUnauthorized, message, details...)
}

// Forbidden sends a 403 forbidden response
func Forbidden(c *gin.Context, message string, details ...string) {
	Error(c, http.StatusForbidden, ErrForbidden, message, details...)
}

// NotFound sends a 404 not found response
func NotFound(c *gin.Context, message string, details ...string) {
	Error(c, http.StatusNotFound, ErrNotFound, message, details...)
}

// InternalError sends a 500 internal server error response
func InternalError(c *gin.Context, message string, details ...string) {
	Error(c, http.StatusInternalServerError, ErrInternalServer, message, details...)
}
