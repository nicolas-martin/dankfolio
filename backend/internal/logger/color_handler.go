package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"slices"
	"strings"

	"github.com/fatih/color"
)

// ensure colorHandler implements slog.Handler
var _ slog.Handler = (*ColorHandler)(nil)

// ColorHandler implements slog.Handler interface with colored output
type ColorHandler struct {
	level     slog.Level
	outStream io.Writer
	errStream io.Writer
	attrs     []slog.Attr
	groups    []string
}

// NewColorHandler creates a new ColorHandler with specified log level and output streams
func NewColorHandler(level slog.Level, out, err io.Writer) *ColorHandler {
	return &ColorHandler{
		level:     level,
		outStream: out,
		errStream: err,
		attrs:     []slog.Attr{},
		groups:    []string{},
	}
}

func (h *ColorHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level
}

func (h *ColorHandler) Handle(_ context.Context, r slog.Record) error {
	timestamp := r.Time.Format("15:04:05")

	// Get colored level text
	var levelText string
	switch r.Level {
	case slog.LevelDebug:
		levelText = color.New(color.FgCyan).Sprint("DEBUG")
	case slog.LevelInfo:
		levelText = color.New(color.FgGreen).Sprint("INFO")
	case slog.LevelWarn:
		levelText = color.New(color.FgYellow).Sprint("WARN")
	case slog.LevelError:
		levelText = color.New(color.FgRed).Sprint("ERROR")
	default:
		levelText = r.Level.String()
	}

	// Build log message with prefix, timestamp, level and message
	msg := fmt.Sprintf("[%s] %-5s %s", timestamp, levelText, r.Message)

	// Collect attributes
	var attrs []slog.Attr
	attrs = append(attrs, h.attrs...)

	// Add record attributes
	r.Attrs(func(attr slog.Attr) bool {
		attrs = append(attrs, attr)
		return true
	})

	// Add attributes to message if any exist
	if len(attrs) > 0 {
		// Separate trace attributes from regular attributes
		var traceAttrs []slog.Attr
		var regularAttrs []slog.Attr
		
		for _, attr := range attrs {
			if attr.Key == "trace_id" || attr.Key == "span_id" || attr.Key == "trace_sampled" {
				traceAttrs = append(traceAttrs, attr)
			} else {
				regularAttrs = append(regularAttrs, attr)
			}
		}
		
		// Add trace attributes first with special formatting
		if len(traceAttrs) > 0 {
			msg += " " + color.New(color.FgMagenta).Sprint("[")
			for i, attr := range traceAttrs {
				if i > 0 {
					msg += " "
				}
				if attr.Key == "trace_id" {
					msg += color.New(color.FgMagenta).Sprintf("trace:%s", attr.Value.String())
				} else if attr.Key == "span_id" {
					msg += color.New(color.FgMagenta).Sprintf("span:%s", attr.Value.String())
				} else if attr.Key == "trace_sampled" {
					msg += color.New(color.FgMagenta).Sprint("sampled")
				}
			}
			msg += color.New(color.FgMagenta).Sprint("]")
		}
		
		// Add regular attributes
		if len(regularAttrs) > 0 {
			msg += " "
			for i, attr := range regularAttrs {
				if i > 0 {
					msg += " "
				}

				// Handle groups
				var attrKey string
				if len(h.groups) > 0 {
					attrKey = fmt.Sprintf("%s.%s", h.groups[len(h.groups)-1], attr.Key)
				} else {
					attrKey = attr.Key
				}

				// Format the value
				val := attr.Value.String()
				var valStr string
				if attr.Value.Kind() == slog.KindString && strings.Contains(val, "\x1b[") {
					// Has ANSI color codes, don't escape
					valStr = val
				} else if attr.Value.Kind() == slog.KindString {
					valStr = fmt.Sprintf("%q", val)
				} else {
					valStr = val
				}

				msg += fmt.Sprintf("%s=%s", attrKey, valStr)
			}
		}
	}

	// Decide output stream based on severity
	var out io.Writer
	if r.Level >= slog.LevelError {
		out = h.errStream
	} else {
		out = h.outStream
	}

	// Write log message
	_, err := fmt.Fprintln(out, msg)
	return err
}

func (h *ColorHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	// Create a new handler with the combined attributes
	newHandler := &ColorHandler{
		level:     h.level,
		outStream: h.outStream,
		errStream: h.errStream,
		groups:    slices.Clone(h.groups),        // Copy groups
		attrs:     slices.Concat(h.attrs, attrs), // Combine attrs
	}
	return newHandler
}

func (h *ColorHandler) WithGroup(name string) slog.Handler {
	// Create a new handler with the added group
	newHandler := &ColorHandler{
		level:     h.level,
		outStream: h.outStream,
		errStream: h.errStream,
		groups:    append(slices.Clone(h.groups), name), // Add new group
		attrs:     slices.Clone(h.attrs),                // Copy attrs
	}
	return newHandler
}
