package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
)

// Content filtering functionality using naughty words

// GetStore returns the database store (used by banned words manager)
func (s *Service) GetStore() db.Store {
	return s.store
}

// LoadNaughtyWords is a public method to reload naughty words (called from main.go after population)
func (s *Service) LoadNaughtyWords(ctx context.Context) error {
	return s.loadNaughtyWords(ctx)
}

// loadNaughtyWords fetches all words from the naughty_words table and populates the in-memory set.
func (s *Service) loadNaughtyWords(ctx context.Context) error {
	slog.InfoContext(ctx, "Loading naughty words into memory...")
	limit := 10000
	offset := 0
	// Prepare ListOptions. Ensure all fields are pointers as per db.ListOptions definition.
	opts := db.ListOptions{Limit: &limit, Offset: &offset}

	naughtyWordModels, totalCount, err := s.store.NaughtyWords().List(ctx, opts)
	if err != nil {
		return fmt.Errorf("failed to list naughty words from store: %w", err)
	}
	slog.DebugContext(ctx, "Fetched naughty words from DB", slog.Int("count", len(naughtyWordModels)), slog.Int("total_db_count", int(totalCount)))

	newSet := make(map[string]struct{}, len(naughtyWordModels))
	for _, nwModel := range naughtyWordModels {
		newSet[strings.ToLower(nwModel.Word)] = struct{}{}
	}

	s.naughtyWordSet = newSet
	slog.InfoContext(ctx, "Naughty words loaded into memory.", slog.Int("count", len(s.naughtyWordSet)))
	return nil
}

// isWordNaughty checks if a single word is in the loaded naughty word set.
// Assumes word is already normalized (e.g., lowercase).
func (s *Service) isWordNaughty(word string) bool {
	_, found := s.naughtyWordSet[strings.ToLower(word)] // Ensure word is lowercased before check
	return found
}

func (s *Service) coinContainsNaughtyWord(name, description string) bool {
	found := s.containsNaughtyWord(name)
	if found {
		return found
	}
	return s.containsNaughtyWord(description)
}

// containsNaughtyWord checks if any word in the input text is a naughty word.
func (s *Service) containsNaughtyWord(text string) bool {
	if text == "" {
		return false
	}
	normalizedText := strings.ToLower(text)
	words := strings.FieldsFunc(normalizedText, func(r rune) bool {
		// Consider more comprehensive punctuation/splitters if needed
		return r == ' ' || r == ',' || r == '.' || r == ';' || r == ':' || r == '-' || r == '_' || r == '\n' || r == '/' || r == '(' || r == ')' || r == '[' || r == ']' || r == '{' || r == '}' || r == '"' || r == '\''
	})

	for _, word := range words {
		// Trim additional common punctuation that might remain after FieldsFunc
		cleanedWord := strings.Trim(word, ".,;:!?'\"()[]{}<>")
		if cleanedWord != "" && s.isWordNaughty(cleanedWord) {
			slog.Warn("Naughty word found in text", slog.String("word", cleanedWord), slog.String("text_preview", text[:min(len(text), 100)]))
			return true
		}
	}
	return false
}

// min is a helper function to find the minimum of two integers.
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}