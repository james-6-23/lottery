package logger

import (
	"context"
	"time"

	"gorm.io/gorm/logger"
)

// GormLogger is a GORM logger adapter
type GormLogger struct {
	log                   *Logger
	SlowThreshold         time.Duration
	IgnoreRecordNotFound  bool
	ParameterizedQueries  bool
}

// NewGormLogger creates a new GORM logger
func NewGormLogger(log *Logger) *GormLogger {
	return &GormLogger{
		log:                  log.WithPrefix("GORM"),
		SlowThreshold:        200 * time.Millisecond,
		IgnoreRecordNotFound: true,
		ParameterizedQueries: true,
	}
}

// LogMode implements logger.Interface
func (l *GormLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	return &newLogger
}

// Info implements logger.Interface
func (l *GormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.log.Info(msg, data...)
}

// Warn implements logger.Interface
func (l *GormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.log.Warn(msg, data...)
}

// Error implements logger.Interface
func (l *GormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.log.Error(msg, data...)
}

// Trace implements logger.Interface
func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()

	// Only log slow queries or errors
	switch {
	case err != nil && (!l.IgnoreRecordNotFound || err != logger.ErrRecordNotFound):
		l.log.Error("Query error: %v | %s | rows=%d | time=%v", err, truncateSQL(sql), rows, elapsed)
	case elapsed > l.SlowThreshold && l.SlowThreshold != 0:
		l.log.Warn("Slow query: %s | rows=%d | time=%v", truncateSQL(sql), rows, elapsed)
	// Skip debug logs in production for cleaner output
	}
}

func truncateSQL(sql string) string {
	if len(sql) > 200 {
		return sql[:200] + "..."
	}
	return sql
}

// GormLoggerSilent returns a silent GORM logger
func GormLoggerSilent() logger.Interface {
	return logger.Default.LogMode(logger.Silent)
}

// GormLoggerForMode returns appropriate GORM logger based on mode
func GormLoggerForMode(mode string) logger.Interface {
	if mode == "dev" {
		return NewGormLogger(Default())
	}
	// In production, only log errors
	return &GormLogger{
		log:                  Default().WithPrefix("GORM"),
		SlowThreshold:        time.Second,
		IgnoreRecordNotFound: true,
	}
}

// Simple SQL logger for debug mode
type SimpleSQLLogger struct {
	log *Logger
}

func NewSimpleSQLLogger() *SimpleSQLLogger {
	return &SimpleSQLLogger{log: Default().WithPrefix("SQL")}
}

func (l *SimpleSQLLogger) LogMode(level logger.LogLevel) logger.Interface {
	return l
}

func (l *SimpleSQLLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.log.Debug(msg, data...)
}

func (l *SimpleSQLLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.log.Warn(msg, data...)
}

func (l *SimpleSQLLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.log.Error(msg, data...)
}

func (l *SimpleSQLLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()

	if err != nil {
		l.log.Error("%v | %s | rows=%d", err, truncateSQL(sql), rows)
	} else if elapsed > 100*time.Millisecond {
		l.log.Warn("[SLOW] %s | rows=%d | %v", truncateSQL(sql), rows, elapsed)
	} else {
		l.log.Debug("%s | rows=%d | %v", truncateSQL(sql), rows, elapsed)
	}
}
