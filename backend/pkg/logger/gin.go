package logger

import (
	"fmt"
	"net/http"
	"runtime/debug"
	"time"

	"scratch-lottery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	RequestIDHeader = "X-Request-Id"
	requestIDKey    = "requestID"
)

// GinRequestID ensures each request has a request id, and mirrors it back via `X-Request-Id`.
func GinRequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		_ = ensureRequestID(c)
		c.Next()
	}
}

func ensureRequestID(c *gin.Context) string {
	if v, ok := c.Get(requestIDKey); ok {
		if s, ok := v.(string); ok && s != "" {
			c.Header(RequestIDHeader, s)
			return s
		}
	}

	rid := c.GetHeader(RequestIDHeader)
	if rid == "" {
		rid = uuid.NewString()
	}
	c.Set(requestIDKey, rid)
	c.Header(RequestIDHeader, rid)
	return rid
}

// GinLogger returns a gin middleware for logging requests.
func GinLogger() gin.HandlerFunc {
	log := Default().WithPrefix("HTTP")
	format, colored := log.Snapshot()

	return func(c *gin.Context) {
		start := time.Now()
		rid := ensureRequestID(c)

		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		if raw != "" {
			path = path + "?" + raw
		}

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		method := c.Request.Method
		ip := c.ClientIP()
		route := c.FullPath()

		fields := []Field{
			F("request_id", rid),
			F("status", status),
			F("latency_ms", latency.Milliseconds()),
			F("ip", ip),
			F("method", method),
			F("path", path),
		}
		if route != "" {
			fields = append(fields, F("route", route))
		}
		if userID, ok := c.Get("userID"); ok {
			fields = append(fields, F("user_id", userID))
		}
		if username, ok := c.Get("username"); ok {
			fields = append(fields, F("username", username))
		}

		var apiErr *response.APIError
		if len(c.Errors) > 0 {
			last := c.Errors.Last()
			if last != nil {
				if e, ok := last.Err.(*response.APIError); ok {
					apiErr = e
				} else {
					fields = append(fields, F("error", last.Err.Error()))
				}
			}
		}
		if apiErr != nil {
			fields = append(fields,
				F("error_code", apiErr.Code),
				F("error_message", apiErr.Message),
			)
			if apiErr.Details != "" && status >= 500 {
				fields = append(fields, F("error_details", apiErr.Details))
			}
		}

		// Build a readable text msg, but keep JSON fully structured.
		msg := "request"
		if format == TextFormat {
			if colored {
				statusColor := getStatusColor(status)
				methodColor := getMethodColor(method)
				msg = fmt.Sprintf("%s%3d%s | %13v | %15s | %s%-7s%s %s",
					statusColor, status, resetColor,
					latency,
					ip,
					methodColor, method, resetColor,
					path,
				)
			} else {
				msg = fmt.Sprintf("%3d | %13v | %15s | %-7s %s",
					status,
					latency,
					ip,
					method,
					path,
				)
			}
		}

		switch {
		case status >= 500:
			log.Errorw(msg, fields...)
		case status >= 400:
			log.Warnw(msg, fields...)
		default:
			log.Infow(msg, fields...)
		}
	}
}

// GinRecovery returns a gin recovery middleware with logger.
func GinRecovery() gin.HandlerFunc {
	log := Default().WithPrefix("PANIC")

	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				rid := ensureRequestID(c)

				log.Errorw("panic recovered",
					F("request_id", rid),
					F("ip", c.ClientIP()),
					F("method", c.Request.Method),
					F("path", c.Request.URL.Path),
					F("route", c.FullPath()),
					F("panic", err),
					F("stack", string(debug.Stack())),
				)

				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"code":       response.ErrInternalServer,
					"message":    "服务器内部错误",
					"request_id": rid,
				})
			}
		}()
		c.Next()
	}
}

func getStatusColor(status int) string {
	switch {
	case status >= 500:
		return "\033[31m" // Red
	case status >= 400:
		return "\033[33m" // Yellow
	case status >= 300:
		return "\033[36m" // Cyan
	default:
		return "\033[32m" // Green
	}
}

func getMethodColor(method string) string {
	switch method {
	case "GET":
		return "\033[32m" // Green
	case "POST":
		return "\033[34m" // Blue
	case "PUT":
		return "\033[33m" // Yellow
	case "DELETE":
		return "\033[31m" // Red
	case "PATCH":
		return "\033[36m" // Cyan
	default:
		return "\033[0m"
	}
}

// SetGinMode sets Gin mode based on environment.
func SetGinMode(mode string) {
	if mode == "prod" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
}
