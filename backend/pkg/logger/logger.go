package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// Level represents log level
type Level int

const (
	DebugLevel Level = iota
	InfoLevel
	WarnLevel
	ErrorLevel
	FatalLevel
	SilentLevel
)

type Format int

const (
	TextFormat Format = iota
	JSONFormat
)

var levelNames = map[Level]string{
	DebugLevel: "DEBUG",
	InfoLevel:  "INFO",
	WarnLevel:  "WARN",
	ErrorLevel: "ERROR",
	FatalLevel: "FATAL",
}

var levelColors = map[Level]string{
	DebugLevel: "\033[36m", // Cyan
	InfoLevel:  "\033[32m", // Green
	WarnLevel:  "\033[33m", // Yellow
	ErrorLevel: "\033[31m", // Red
	FatalLevel: "\033[35m", // Magenta
}

const resetColor = "\033[0m"

type core struct {
	mu            sync.Mutex
	level         Level
	output        io.Writer
	colored       bool
	format        Format
	timeFormat    string
	includeCaller bool
}

// Logger is the main logger struct.
// Derived loggers (WithPrefix) share the same core to stay concurrency-safe.
type Logger struct {
	core   *core
	prefix string
}

type Field struct {
	Key   string
	Value any
}

func F(key string, value any) Field {
	return Field{Key: key, Value: value}
}

type Option func(*core)

var (
	defaultLogger *Logger
	once          sync.Once
)

// Default returns the default logger.
func Default() *Logger {
	once.Do(func() {
		defaultLogger = New()
	})
	return defaultLogger
}

// ConfigureFromEnv reloads the default logger configuration from environment variables.
// Useful when `.env` is loaded after the logger is first initialized.
func ConfigureFromEnv() {
	Default().Configure(optionsFromEnv()...)
}

// New creates a new logger initialized from environment variables.
func New() *Logger {
	c := &core{
		level:         InfoLevel,
		output:        os.Stdout,
		colored:       true,
		format:        TextFormat,
		timeFormat:    "2006-01-02 15:04:05.000",
		includeCaller: false,
	}
	for _, opt := range optionsFromEnv() {
		opt(c)
	}
	return &Logger{core: c}
}

func (l *Logger) Configure(opts ...Option) {
	l.core.mu.Lock()
	defer l.core.mu.Unlock()
	for _, opt := range opts {
		opt(l.core)
	}
}

func (l *Logger) Snapshot() (format Format, colored bool) {
	l.core.mu.Lock()
	defer l.core.mu.Unlock()
	return l.core.format, l.core.colored
}

// ParseLevel parses a level string.
func ParseLevel(s string) Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return DebugLevel
	case "info":
		return InfoLevel
	case "warn", "warning":
		return WarnLevel
	case "error":
		return ErrorLevel
	case "fatal":
		return FatalLevel
	case "silent":
		return SilentLevel
	default:
		return InfoLevel
	}
}

func ParseFormat(s string) Format {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "json":
		return JSONFormat
	case "text", "":
		return TextFormat
	default:
		return TextFormat
	}
}

func parseBoolEnv(v string) (bool, bool) {
	if v == "" {
		return false, false
	}
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "y", "on":
		return true, true
	case "0", "false", "no", "n", "off":
		return false, true
	default:
		return false, false
	}
}

func openLogFile(filePath string) (io.Writer, func() error, error) {
	if filePath == "" {
		return nil, nil, fmt.Errorf("LOG_FILE is empty")
	}
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, nil, err
	}
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, nil, err
	}
	return f, f.Close, nil
}

func optionsFromEnv() []Option {
	var opts []Option

	mode := strings.ToLower(strings.TrimSpace(os.Getenv("OAUTH_MODE")))

	if lvl := os.Getenv("LOG_LEVEL"); lvl != "" {
		parsed := ParseLevel(lvl)
		opts = append(opts, func(c *core) { c.level = parsed })
	} else if mode == "dev" {
		opts = append(opts, func(c *core) { c.level = DebugLevel })
	} else if mode == "prod" {
		opts = append(opts, func(c *core) { c.level = InfoLevel })
	}

	if tf := os.Getenv("LOG_TIME_FORMAT"); tf != "" {
		opts = append(opts, func(c *core) { c.timeFormat = tf })
	} else if mode == "prod" {
		opts = append(opts, func(c *core) { c.timeFormat = time.RFC3339Nano })
	}

	if v := os.Getenv("LOG_FORMAT"); v != "" {
		format := ParseFormat(v)
		opts = append(opts, func(c *core) { c.format = format })
	} else if mode == "prod" {
		opts = append(opts, func(c *core) { c.format = JSONFormat })
	}

	if v, ok := parseBoolEnv(os.Getenv("LOG_CALLER")); ok {
		opts = append(opts, func(c *core) { c.includeCaller = v })
	} else if mode == "dev" {
		opts = append(opts, func(c *core) { c.includeCaller = true })
	}

	if _, ok := parseBoolEnv(os.Getenv("NO_COLOR")); ok {
		opts = append(opts, func(c *core) { c.colored = false })
	} else if v, ok := parseBoolEnv(os.Getenv("LOG_COLOR")); ok {
		opts = append(opts, func(c *core) { c.colored = v })
	} else if mode == "prod" {
		opts = append(opts, func(c *core) { c.colored = false })
	}

	// Outputs
	output := strings.ToLower(strings.TrimSpace(os.Getenv("LOG_OUTPUT")))
	logFile := strings.TrimSpace(os.Getenv("LOG_FILE"))
	if output == "" {
		output = "stdout"
	}
	switch output {
	case "stderr":
		opts = append(opts, func(c *core) { c.output = os.Stderr })
	case "file":
		if logFile != "" {
			if w, _, err := openLogFile(logFile); err == nil {
				opts = append(opts, func(c *core) { c.output = w })
			}
		}
	case "both":
		if logFile != "" {
			if w, _, err := openLogFile(logFile); err == nil {
				opts = append(opts, func(c *core) { c.output = io.MultiWriter(os.Stdout, w) })
			}
		}
	default:
		opts = append(opts, func(c *core) { c.output = os.Stdout })
	}

	// JSON logs should never include ANSI colors
	opts = append(opts, func(c *core) {
		if c.format == JSONFormat {
			c.colored = false
		}
	})

	return opts
}

// SetLevel sets the log level.
func (l *Logger) SetLevel(level Level) {
	l.core.mu.Lock()
	defer l.core.mu.Unlock()
	l.core.level = level
}

// SetOutput sets the output writer.
func (l *Logger) SetOutput(w io.Writer) {
	l.core.mu.Lock()
	defer l.core.mu.Unlock()
	l.core.output = w
}

// SetColored enables/disables colored output.
func (l *Logger) SetColored(colored bool) {
	l.core.mu.Lock()
	defer l.core.mu.Unlock()
	l.core.colored = colored
}

// SetPrefix sets a prefix for log messages.
func (l *Logger) SetPrefix(prefix string) {
	l.prefix = prefix
}

// WithPrefix returns a new logger with the given prefix.
func (l *Logger) WithPrefix(prefix string) *Logger {
	return &Logger{
		core:   l.core,
		prefix: prefix,
	}
}

func (l *Logger) log(level Level, format string, args ...interface{}) {
	var msg string
	if len(args) > 0 {
		msg = fmt.Sprintf(format, args...)
	} else {
		msg = format
	}
	l.logw(level, msg, nil)
}

func (l *Logger) logw(level Level, msg string, fields []Field) {
	l.core.mu.Lock()
	defer l.core.mu.Unlock()

	if level < l.core.level {
		return
	}

	ts := time.Now().Format(l.core.timeFormat)
	levelStr := levelNames[level]

	if l.core.format == JSONFormat {
		payload := map[string]any{
			"ts":    ts,
			"level": levelStr,
			"msg":   msg,
		}
		if l.prefix != "" {
			payload["prefix"] = l.prefix
		}
		if l.core.includeCaller {
			payload["caller"] = callerOutsideLogger()
		}
		for _, f := range fields {
			if f.Key == "" {
				continue
			}
			payload[f.Key] = f.Value
		}
		b, err := json.Marshal(payload)
		if err == nil {
			_, _ = l.core.output.Write(append(b, '\n'))
		} else {
			_, _ = l.core.output.Write([]byte(fmt.Sprintf("%s | %-5s | %s\n", ts, levelStr, msg)))
		}
		if level == FatalLevel {
			os.Exit(1)
		}
		return
	}

	caller := ""
	if l.core.includeCaller {
		caller = callerOutsideLogger()
	}
	line := formatTextLine(ts, level, levelStr, l.prefix, msg, caller, l.core.colored, fields)
	_, _ = l.core.output.Write([]byte(line))

	if level == FatalLevel {
		os.Exit(1)
	}
}

func formatTextLine(ts string, level Level, levelStr string, prefix string, msg string, caller string, colored bool, fields []Field) string {
	var b strings.Builder

	if colored {
		color := levelColors[level]
		b.WriteString(ts)
		b.WriteString(" | ")
		b.WriteString(color)
		b.WriteString(fmt.Sprintf("%-5s", levelStr))
		b.WriteString(resetColor)
		b.WriteString(" | ")
		if prefix != "" {
			b.WriteString("\033[34m")
			b.WriteString("[")
			b.WriteString(prefix)
			b.WriteString("]")
			b.WriteString(resetColor)
			b.WriteString(" ")
		}
		if caller != "" {
			b.WriteString("\033[90m")
			b.WriteString(caller)
			b.WriteString(resetColor)
			b.WriteString(" ")
		}
		b.WriteString(msg)
	} else {
		b.WriteString(ts)
		b.WriteString(" | ")
		b.WriteString(fmt.Sprintf("%-5s", levelStr))
		b.WriteString(" | ")
		if prefix != "" {
			b.WriteString("[")
			b.WriteString(prefix)
			b.WriteString("] ")
		}
		if caller != "" {
			b.WriteString(caller)
			b.WriteString(" ")
		}
		b.WriteString(msg)
	}

	for _, f := range fields {
		if f.Key == "" {
			continue
		}
		b.WriteString(" ")
		b.WriteString(f.Key)
		b.WriteString("=")
		b.WriteString(formatFieldValueText(f.Value))
	}

	b.WriteString("\n")
	return b.String()
}

func formatFieldValueText(v any) string {
	switch t := v.(type) {
	case nil:
		return "null"
	case string:
		if strings.ContainsAny(t, " \t\r\n\"=") {
			return fmt.Sprintf("%q", t)
		}
		return t
	case fmt.Stringer:
		return formatFieldValueText(t.String())
	default:
		return fmt.Sprintf("%v", v)
	}
}

// Debug logs a debug message.
func (l *Logger) Debug(format string, args ...interface{}) { l.log(DebugLevel, format, args...) }
func (l *Logger) Debugw(msg string, fields ...Field)      { l.logw(DebugLevel, msg, fields) }

// Info logs an info message.
func (l *Logger) Info(format string, args ...interface{}) { l.log(InfoLevel, format, args...) }
func (l *Logger) Infow(msg string, fields ...Field)      { l.logw(InfoLevel, msg, fields) }

// Warn logs a warning message.
func (l *Logger) Warn(format string, args ...interface{}) { l.log(WarnLevel, format, args...) }
func (l *Logger) Warnw(msg string, fields ...Field)      { l.logw(WarnLevel, msg, fields) }

// Error logs an error message.
func (l *Logger) Error(format string, args ...interface{}) { l.log(ErrorLevel, format, args...) }
func (l *Logger) Errorw(msg string, fields ...Field)       { l.logw(ErrorLevel, msg, fields) }

// Fatal logs a fatal message and exits.
func (l *Logger) Fatal(format string, args ...interface{}) { l.log(FatalLevel, format, args...) }
func (l *Logger) Fatalw(msg string, fields ...Field)       { l.logw(FatalLevel, msg, fields) }

// Package-level functions using default logger.
func Debug(format string, args ...interface{}) { Default().Debug(format, args...) }
func Info(format string, args ...interface{})  { Default().Info(format, args...) }
func Warn(format string, args ...interface{})  { Default().Warn(format, args...) }
func Error(format string, args ...interface{}) { Default().Error(format, args...) }
func Fatal(format string, args ...interface{}) { Default().Fatal(format, args...) }

// PrintBanner prints a startup banner.
func PrintBanner(name, version, mode string) {
	if Default().core.format == JSONFormat {
		Default().Infow("service starting", F("name", name), F("version", version), F("mode", mode))
		return
	}

	banner := `
╔═══════════════════════════════════════════════════════════╗
║                    %s                     
║                    Version: %s                            
║                    Mode: %s                               
╚═══════════════════════════════════════════════════════════╝
`
	fmt.Printf(banner, name, version, mode)
}

// PrintRoutes prints registered routes in a clean format.
func PrintRoutes(routes []RouteInfo) {
	if Default().core.format == JSONFormat {
		Default().Infow("routes registered", F("count", len(routes)))
		return
	}

	Default().Info("Registered routes:")
	fmt.Println("┌─────────┬─────────────────────────────────────────────────────────┐")
	fmt.Printf("│ %-7s │ %-55s │\n", "METHOD", "PATH")
	fmt.Println("├─────────┼─────────────────────────────────────────────────────────┤")
	for _, r := range routes {
		fmt.Printf("│ %-7s │ %-55s │\n", r.Method, r.Path)
	}
	fmt.Println("└─────────┴─────────────────────────────────────────────────────────┘")
}

// RouteInfo represents a route.
type RouteInfo struct {
	Method string
	Path   string
}

// Caller returns the file and line number of the caller.
func Caller(skip int) string {
	_, file, line, ok := runtime.Caller(skip + 1)
	if !ok {
		return "unknown:0"
	}
	return fmt.Sprintf("%s:%d", filepath.Base(file), line)
}

func callerOutsideLogger() string {
	const maxDepth = 24
	pcs := make([]uintptr, maxDepth)
	n := runtime.Callers(3, pcs)
	frames := runtime.CallersFrames(pcs[:n])
	for {
		f, more := frames.Next()
		if !strings.Contains(f.Function, "scratch-lottery/pkg/logger") {
			return fmt.Sprintf("%s:%d", filepath.Base(f.File), f.Line)
		}
		if !more {
			break
		}
	}
	return "unknown:0"
}
