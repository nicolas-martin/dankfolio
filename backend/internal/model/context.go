package model

// ContextKey is a custom type for context keys to avoid collisions
type ContextKey string

const (
	// DebugModeKey is the context key for debug mode
	DebugModeKey ContextKey = "debug_mode"
)
