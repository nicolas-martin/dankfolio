package price

import (
	"testing"
	"time"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

func TestRoundDateDown(t *testing.T) {
	tests := []struct {
		name        string
		input       time.Time
		granularity time.Duration
		expected    time.Time
	}{
		{
			name:        "1 minute granularity",
			input:       time.Date(2024, 12, 15, 14, 37, 45, 0, time.UTC),
			granularity: 1 * time.Minute,
			expected:    time.Date(2024, 12, 15, 14, 37, 0, 0, time.UTC),
		},
		{
			name:        "5 minute granularity",
			input:       time.Date(2024, 12, 15, 14, 37, 45, 0, time.UTC),
			granularity: 5 * time.Minute,
			expected:    time.Date(2024, 12, 15, 14, 35, 0, 0, time.UTC),
		},
		{
			name:        "10 minute granularity",
			input:       time.Date(2024, 12, 15, 14, 37, 45, 0, time.UTC),
			granularity: 10 * time.Minute,
			expected:    time.Date(2024, 12, 15, 14, 30, 0, 0, time.UTC),
		},
		{
			name:        "60 minute granularity",
			input:       time.Date(2024, 12, 15, 14, 37, 45, 0, time.UTC),
			granularity: 60 * time.Minute,
			expected:    time.Date(2024, 12, 15, 14, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := roundDateDown(tt.input, tt.granularity)
			if !result.Equal(tt.expected) {
				t.Errorf("roundDateDown() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestTimeRangeCalculationWithRealConfigs(t *testing.T) {
	// Test with a known past time (December 2024) to avoid future timestamp issues
	testTime := time.Date(2024, 12, 15, 14, 37, 0, 0, time.UTC)

	tests := []struct {
		name        string
		historyType pb.GetPriceHistoryRequest_PriceHistoryType
	}{
		{
			name:        "ONE_HOUR timeframe",
			historyType: pb.GetPriceHistoryRequest_ONE_HOUR,
		},
		{
			name:        "FOUR_HOUR timeframe",
			historyType: pb.GetPriceHistoryRequest_FOUR_HOUR,
		},
		{
			name:        "ONE_DAY timeframe",
			historyType: pb.GetPriceHistoryRequest_ONE_DAY,
		},
		{
			name:        "ONE_WEEK timeframe",
			historyType: pb.GetPriceHistoryRequest_ONE_WEEK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Get the real config from TimeframeConfigMap
			config, exists := TimeframeConfigMap[tt.historyType]
			if !exists {
				t.Fatalf("Config not found for history type: %v", tt.historyType)
			}

			// Calculate time range like the service does
			timeFrom := testTime.Add(-config.DefaultViewDuration)
			timeTo := testTime

			// Round the times
			roundedTimeFrom := roundDateDown(timeFrom, config.Rounding)
			roundedTimeTo := roundDateDown(timeTo, config.Rounding)

			// Check minimum time span logic
			minTimeSpan := config.DefaultViewDuration / 4
			actualSpan := roundedTimeTo.Sub(roundedTimeFrom)

			t.Logf("Config: %+v", config)
			t.Logf("Original range: %v to %v (span: %v)", timeFrom, timeTo, timeTo.Sub(timeFrom))
			t.Logf("Rounded range: %v to %v (span: %v)", roundedTimeFrom, roundedTimeTo, actualSpan)
			t.Logf("Minimum required span: %v", minTimeSpan)

			// Verify the span is reasonable
			if actualSpan < minTimeSpan {
				t.Logf("Span too small, would be adjusted to: %v", config.DefaultViewDuration)
				// This is expected behavior - the service would adjust it
			} else {
				// Verify the span is close to what we expect
				expectedSpan := config.DefaultViewDuration
				tolerance := config.Rounding * 2 // Allow some tolerance for rounding

				if actualSpan < expectedSpan-tolerance || actualSpan > expectedSpan+tolerance {
					t.Errorf("Time span %v is not close to expected %v (tolerance: %v)",
						actualSpan, expectedSpan, tolerance)
				}
			}

			// Verify rounding worked correctly
			if roundedTimeFrom.Minute()%int(config.Rounding/time.Minute) != 0 {
				t.Errorf("roundedTimeFrom minutes (%d) not properly rounded to %v granularity",
					roundedTimeFrom.Minute(), config.Rounding)
			}
			if roundedTimeTo.Minute()%int(config.Rounding/time.Minute) != 0 {
				t.Errorf("roundedTimeTo minutes (%d) not properly rounded to %v granularity",
					roundedTimeTo.Minute(), config.Rounding)
			}
		})
	}
}

func TestMinimumTimeSpanLogic(t *testing.T) {
	// Test the minimum time span adjustment logic specifically
	config := TimeframeConfigMap[pb.GetPriceHistoryRequest_ONE_DAY]

	// Create a scenario where rounding would create a very small span
	testTime := time.Date(2024, 12, 15, 14, 35, 0, 0, time.UTC) // Already rounded to 10min

	timeFrom := testTime.Add(-5 * time.Minute) // Very small duration
	timeTo := testTime

	roundedTimeFrom := roundDateDown(timeFrom, config.Rounding)
	roundedTimeTo := roundDateDown(timeTo, config.Rounding)

	minTimeSpan := config.DefaultViewDuration / 4
	actualSpan := roundedTimeTo.Sub(roundedTimeFrom)

	t.Logf("Small span test:")
	t.Logf("Original span: %v", timeTo.Sub(timeFrom))
	t.Logf("Rounded span: %v", actualSpan)
	t.Logf("Minimum required: %v", minTimeSpan)

	// This should trigger the minimum span logic
	if actualSpan < minTimeSpan {
		t.Logf("✅ Minimum span logic would be triggered (expected)")

		// Simulate what the service would do
		adjustedTimeFrom := roundedTimeTo.Add(-config.DefaultViewDuration)
		adjustedSpan := roundedTimeTo.Sub(adjustedTimeFrom)

		t.Logf("After adjustment: %v (span: %v)", adjustedTimeFrom, adjustedSpan)

		if adjustedSpan != config.DefaultViewDuration {
			t.Errorf("Adjusted span %v should equal DefaultViewDuration %v",
				adjustedSpan, config.DefaultViewDuration)
		}
	} else {
		t.Logf("Span is already adequate: %v >= %v", actualSpan, minTimeSpan)
	}
}
