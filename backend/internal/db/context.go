package db

import (
	"context"
	"database/sql"

	"github.com/nicolas-martin/dankfolio/internal/common"
)

// WithTx wraps database operations with transaction and request ID context
func WithTx(ctx context.Context, db *sql.DB, fn func(tx *sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	// Get request ID from context
	requestID := common.GetRequestID(ctx)
	if requestID != "" {
		// Set application_name with request ID for PostgreSQL transaction tracking
		_, err = tx.ExecContext(ctx, "SET application_name = $1", "dankfolio:"+requestID)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	err = fn(tx)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// GetRequestIDFromContext is a helper function to get request ID from context
func GetRequestIDFromContext(ctx context.Context) string {
	return common.GetRequestID(ctx)
}
