package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Config represents the application configuration
type Config struct {
	DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
	Env         string `envconfig:"APP_ENV" default:"development"`
}

// Language represents a supported language in the banned words repository
type Language struct {
	Code string
	Name string
}

// All available languages from the LDNOOBW repository
var availableLanguages = []Language{
	{"ar", "Arabic"},
	{"cs", "Czech"},
	{"da", "Danish"},
	{"de", "German"},
	{"en", "English"},
	{"eo", "Esperanto"},
	{"es", "Spanish"},
	{"fa", "Persian"},
	{"fi", "Finnish"},
	{"fil", "Filipino"},
	{"fr", "French"},
	{"fr-CA-u-sd-caqc", "Canadian French"},
	{"hi", "Hindi"},
	{"hu", "Hungarian"},
	{"it", "Italian"},
	{"ja", "Japanese"},
	{"kab", "Kabyle"},
	{"ko", "Korean"},
	{"nl", "Dutch"},
	{"no", "Norwegian"},
	{"pl", "Polish"},
	{"pt", "Portuguese"},
	{"ru", "Russian"},
	{"sv", "Swedish"},
	{"th", "Thai"},
	{"tlh", "Klingon"},
	{"tr", "Turkish"},
	{"zh", "Chinese"},
}

var (
	download    = flag.Bool("download", false, "Download and populate banned words from all languages")
	clear       = flag.Bool("clear", false, "Clear all banned words from database")
	list        = flag.Bool("list", false, "List available languages")
	languages   = flag.String("languages", "", "Comma-separated list of language codes to download (default: all)")
	stats       = flag.Bool("stats", false, "Show statistics of banned words in database")
	dryRun      = flag.Bool("dry-run", false, "Show what would be downloaded without actually doing it")
)

func main() {
	flag.Parse()

	// Execute commands that don't need database first
	switch {
	case *list:
		listLanguages()
		return
	case *download && *dryRun:
		downloadBannedWords(context.Background(), nil)
		return
	case flag.NFlag() == 0:
		printUsage()
		return
	}

	// Load configuration for database operations
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		slog.Warn("Error loading .env file", slog.Any("error", err))
	}

	var config Config
	if err := envconfig.Process("", &config); err != nil {
		slog.Error("Failed to load configuration", slog.Any("error", err))
		os.Exit(1)
	}

	// Setup logging
	logLevel := slog.LevelDebug
	var handler slog.Handler
	if config.Env != "development" {
		handler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		handler = logger.NewColorHandler(logLevel, os.Stdout, os.Stderr)
	}
	slog.SetDefault(slog.New(handler))

	ctx := context.Background()

	// Initialize database
	store, err := postgres.NewStore(config.DatabaseURL, true, logLevel, config.Env)
	if err != nil {
		slog.Error("Failed to initialize database", slog.Any("error", err))
		os.Exit(1)
	}
	defer store.Close()

	// Execute database commands
	switch {
	case *stats:
		showStats(ctx, store)
	case *clear:
		clearBannedWords(ctx, store)
	case *download:
		downloadBannedWords(ctx, store)
	default:
		printUsage()
	}
}

func listLanguages() {
	fmt.Println("Available languages:")
	fmt.Println("Code\t\tName")
	fmt.Println("----\t\t----")
	for _, lang := range availableLanguages {
		fmt.Printf("%s\t\t%s\n", lang.Code, lang.Name)
	}
	fmt.Printf("\nTotal: %d languages available\n", len(availableLanguages))
}

func showStats(ctx context.Context, store db.Store) {
	// Get total count
	_, total, err := store.NaughtyWords().List(ctx, db.ListOptions{Limit: pint(1)})
	if err != nil {
		slog.Error("Failed to get banned words statistics", slog.Any("error", err))
		return
	}

	fmt.Printf("Total banned words in database: %d\n", total)

	if total > 0 {
		// Get sample of words to show languages represented
		words, _, err := store.NaughtyWords().List(ctx, db.ListOptions{Limit: pint(10)})
		if err != nil {
			slog.Error("Failed to fetch sample words", slog.Any("error", err))
			return
		}

		fmt.Println("\nSample words:")
		for i, word := range words {
			if i >= 5 { // Limit sample to 5 words for display
				break
			}
			fmt.Printf("- %s\n", word.Word)
		}
	}
}

func clearBannedWords(ctx context.Context, store db.Store) {
	fmt.Print("Are you sure you want to clear ALL banned words? (yes/no): ")
	var confirmation string
	fmt.Scanln(&confirmation)

	if strings.ToLower(confirmation) != "yes" {
		fmt.Println("Operation cancelled.")
		return
	}

	// Get all words first to count them
	_, total, err := store.NaughtyWords().List(ctx, db.ListOptions{Limit: pint(1)})
	if err != nil {
		slog.Error("Failed to get word count", slog.Any("error", err))
		return
	}

	if total == 0 {
		fmt.Println("No banned words found in database.")
		return
	}

	// Note: This assumes we have a method to clear all. 
	// If not available, we'd need to implement batch deletion
	fmt.Printf("Clearing %d banned words...\n", total)
	
	// For now, we'll need to implement this via listing and deleting
	// This is a placeholder - would need actual implementation
	slog.Warn("Clear operation not yet fully implemented - requires batch delete functionality")
}

func downloadBannedWords(ctx context.Context, store db.Store) {
	languagesToDownload := getLanguagesToDownload()
	
	if *dryRun {
		fmt.Printf("DRY RUN: Would download banned words for %d languages:\n", len(languagesToDownload))
		for _, lang := range languagesToDownload {
			fmt.Printf("- %s (%s)\n", lang.Name, lang.Code)
		}
		return
	}

	// Check existing word count
	_, existingCount, err := store.NaughtyWords().List(ctx, db.ListOptions{Limit: pint(1)})
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		slog.Error("Failed to check existing banned words", slog.Any("error", err))
		return
	}

	if existingCount > 0 {
		fmt.Printf("Found %d existing banned words in database.\n", existingCount)
		fmt.Print("Continue and add new words? (yes/no): ")
		var confirmation string
		fmt.Scanln(&confirmation)
		
		if strings.ToLower(confirmation) != "yes" {
			fmt.Println("Operation cancelled.")
			return
		}
	}

	totalWordsAdded := 0
	totalWordsFetched := 0

	for _, lang := range languagesToDownload {
		fmt.Printf("Downloading %s (%s) banned words...\n", lang.Name, lang.Code)
		
		wordsAdded, wordsFetched, err := downloadLanguage(ctx, store, lang)
		if err != nil {
			slog.Error("Failed to download language", 
				slog.String("language", lang.Name), 
				slog.String("code", lang.Code), 
				slog.Any("error", err))
			continue
		}

		totalWordsAdded += wordsAdded
		totalWordsFetched += wordsFetched
		
		fmt.Printf("✓ %s: %d words fetched, %d words added\n", lang.Name, wordsFetched, wordsAdded)
		
		// Small delay between requests to be respectful
		time.Sleep(100 * time.Millisecond)
	}

	fmt.Printf("\nSummary:\n")
	fmt.Printf("Languages processed: %d\n", len(languagesToDownload))
	fmt.Printf("Total words fetched: %d\n", totalWordsFetched)
	fmt.Printf("Total words added: %d\n", totalWordsAdded)
	fmt.Printf("Duplicates skipped: %d\n", totalWordsFetched-totalWordsAdded)
}

func downloadLanguage(ctx context.Context, store db.Store, lang Language) (int, int, error) {
	url := fmt.Sprintf("https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/%s", lang.Code)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to fetch %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("failed to fetch %s: status %d", url, resp.StatusCode)
	}

	scanner := bufio.NewScanner(resp.Body)
	var wordsToCreate []model.NaughtyWord
	
	for scanner.Scan() {
		word := strings.TrimSpace(scanner.Text())
		if word != "" && !strings.HasPrefix(word, "#") { // Skip comments
			wordsToCreate = append(wordsToCreate, model.NaughtyWord{
				Word:     word,
				Language: lang.Code,
			})
		}
	}

	if err := scanner.Err(); err != nil {
		return 0, len(wordsToCreate), fmt.Errorf("error reading response: %w", err)
	}

	// Create words in database
	wordsAdded := 0
	for _, nw := range wordsToCreate {
		createCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		
		if err := store.NaughtyWords().Create(createCtx, &nw); err != nil {
			// Log but continue - word might already exist
			slog.Debug("Failed to create word entry", 
				slog.String("word", nw.Word), 
				slog.String("language", lang.Code),
				slog.Any("error", err))
		} else {
			wordsAdded++
		}
		cancel()
	}

	return wordsAdded, len(wordsToCreate), nil
}

func getLanguagesToDownload() []Language {
	if *languages == "" {
		return availableLanguages
	}

	requestedCodes := strings.Split(*languages, ",")
	var result []Language
	
	for _, code := range requestedCodes {
		code = strings.TrimSpace(code)
		found := false
		for _, lang := range availableLanguages {
			if lang.Code == code {
				result = append(result, lang)
				found = true
				break
			}
		}
		if !found {
			slog.Warn("Unknown language code", slog.String("code", code))
		}
	}
	
	return result
}

func printUsage() {
	fmt.Println("Banned Words Manager")
	fmt.Println("===================")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  go run cmd/banned-words-manager/main.go [options]")
	fmt.Println()
	fmt.Println("Options:")
	fmt.Println("  -download          Download and populate banned words from all languages")
	fmt.Println("  -clear             Clear all banned words from database")
	fmt.Println("  -list              List available languages")
	fmt.Println("  -languages=<codes> Comma-separated list of language codes (default: all)")
	fmt.Println("  -stats             Show statistics of banned words in database")
	fmt.Println("  -dry-run           Show what would be downloaded without doing it")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  go run cmd/banned-words-manager/main.go -list")
	fmt.Println("  go run cmd/banned-words-manager/main.go -download")
	fmt.Println("  go run cmd/banned-words-manager/main.go -download -languages=en,es,fr")
	fmt.Println("  go run cmd/banned-words-manager/main.go -download -dry-run")
	fmt.Println("  go run cmd/banned-words-manager/main.go -stats")
	fmt.Println("  go run cmd/banned-words-manager/main.go -clear")
	fmt.Println()
	fmt.Println("Environment variables:")
	fmt.Println("  DATABASE_URL       PostgreSQL connection string")
	fmt.Println("  APP_ENV           Application environment (development, production)")
}

// Helper function to get pointer to int
func pint(i int) *int {
	return &i
}