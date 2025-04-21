package coin

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// loadEnrichedCoinsFromFile reads and parses the JSON file containing pre-enriched Coin data.
func loadEnrichedCoinsFromFile(filePath string) ([]model.Coin, time.Time, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, time.Time{}, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	var output EnrichedFileOutput
	if err := json.NewDecoder(file).Decode(&output); err != nil {
		return nil, time.Time{}, fmt.Errorf("failed to decode JSON: %w", err)
	}

	return output.Tokens, output.ScrapeTimestamp, nil
}
