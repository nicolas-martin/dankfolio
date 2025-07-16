package postgres

import (
	"context"
	"runtime"
	"strings"

	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres/schema"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("dankfolio.repository")

// getTableName returns the table name for a given schema type
func getTableName[S any]() string {
	var s S
	switch any(s).(type) {
	case schema.Coin:
		return "coins"
	case schema.Trade:
		return "trades"
	case schema.Wallet:
		return "wallets"
	case schema.NaughtyWord:
		return "naughty_words"
	default:
		return "unknown"
	}
}

// withRepositorySpan creates a new span for repository operations
// IMPORTANT: After deploying, test the attributes are available in Tempo:
// ssh linode 'curl -s "http://localhost:3200/api/search?q=%7Bspan.db.repository.method!=%22%22%7D&limit=5&start=$(($(date +%s) - 3600))&end=$(date +%s)"'
func withRepositorySpan(ctx context.Context, operationType string, tableName string) (context.Context, trace.Span) {
	// Get the calling function name
	pc, _, _, _ := runtime.Caller(1)
	funcName := runtime.FuncForPC(pc).Name()
	// Extract just the method name
	parts := strings.Split(funcName, ".")
	methodName := parts[len(parts)-1]
	
	// Extract repository type from function name
	repoType := "unknown"
	if strings.Contains(funcName, "Repository[") {
		// Extract the type info between brackets
		start := strings.Index(funcName, "[")
		end := strings.Index(funcName, "]")
		if start != -1 && end != -1 {
			typeInfo := funcName[start+1 : end]
			// Get the schema type (first type in the bracket)
			typeParts := strings.Split(typeInfo, ",")
			if len(typeParts) > 0 {
				schemaType := strings.TrimSpace(typeParts[0])
				// Extract just the type name
				schemaParts := strings.Split(schemaType, ".")
				repoType = strings.ToLower(schemaParts[len(schemaParts)-1])
			}
		}
	}

	spanName := "repository." + methodName
	
	ctx, span := tracer.Start(ctx, spanName,
		trace.WithAttributes(
			attribute.String("db.repository.method", methodName),
			attribute.String("db.repository.type", repoType),
			attribute.String("db.operation.type", operationType),
			attribute.String("db.table", tableName),
		),
	)
	
	return ctx, span
}