package logger

import (
	"context"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type contextKey string

const (
	requestIDKey contextKey = "request_id"
	userIDKey    contextKey = "user_id"
)

var log *zap.Logger

func init() {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	if os.Getenv("APP_ENV") != "production" {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	var err error
	log, err = config.Build(zap.AddCallerSkip(1))
	if err != nil {
		panic(err)
	}
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func getContextFields(ctx context.Context) []zap.Field {
	var fields []zap.Field

	if requestID, ok := ctx.Value(requestIDKey).(string); ok {
		fields = append(fields, zap.String("request_id", requestID))
	}
	if userID, ok := ctx.Value(userIDKey).(string); ok {
		fields = append(fields, zap.String("user_id", userID))
	}

	return fields
}

func Info(ctx context.Context, msg string, fields ...zap.Field) {
	log.Info(msg, append(getContextFields(ctx), fields...)...)
}

func Error(ctx context.Context, msg string, err error, fields ...zap.Field) {
	allFields := append(getContextFields(ctx), zap.Error(err))
	allFields = append(allFields, fields...)
	log.Error(msg, allFields...)
}

func Debug(ctx context.Context, msg string, fields ...zap.Field) {
	log.Debug(msg, append(getContextFields(ctx), fields...)...)
}

func Warn(ctx context.Context, msg string, fields ...zap.Field) {
	log.Warn(msg, append(getContextFields(ctx), fields...)...)
}

func Fatal(ctx context.Context, msg string, fields ...zap.Field) {
	log.Fatal(msg, append(getContextFields(ctx), fields...)...)
} 