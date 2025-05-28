package grpc

import (
	"context"
	"errors"
	"testing"
	"time"

	"connectrpc.com/connect"
	// "github.com/nicolas-martin/dankfolio/backend/internal/service/price" // Original import, aliased below
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	birdeye "github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"

	// actual_price_service "github.com/nicolas-martin/dankfolio/backend/internal/service/price" // This alias is no longer needed
	priceMocks "github.com/nicolas-martin/dankfolio/backend/internal/service/price/mocks" // Import for generated mocks
)

// Manual MockPriceService struct and its methods are removed as we are using mockery generated mocks.

func TestGetPriceHistoryHandler(t *testing.T) {
	mockService := priceMocks.NewMockPriceServiceAPI(t) // Use generated mock

	handler := &priceServiceHandler{
		priceService: mockService,
	}

	ctx := context.Background()
	// Use fixed timestamps instead of time.Now() to make tests deterministic
	now := time.Date(2025, 5, 28, 16, 7, 49, 0, time.UTC)
	oneHourAgo := now.Add(-1 * time.Hour)

	defaultTimeFromPb := timestamppb.New(oneHourAgo)
	defaultTimeToPb := timestamppb.New(now)

	// Expected string format for time arguments to the service
	expectedTimeFromStr := oneHourAgo.Format("2006-01-02T15:04:05Z")
	expectedTimeToStr := now.Format("2006-01-02T15:04:05Z")

	defaultAddress := "test_address"
	defaultAddressType := "token"

	sampleServiceResponse := &birdeye.PriceHistory{
		Data: birdeye.PriceHistoryData{
			Items: []birdeye.PriceHistoryItem{
				{UnixTime: oneHourAgo.Unix(), Value: 100.0},
				{UnixTime: now.Unix(), Value: 105.0},
			},
		},
		Success: true,
	}

	tests := []struct {
		name                   string
		req                    *pb.GetPriceHistoryRequest
		mockSetup              func()
		expectedResp           *pb.GetPriceHistoryResponse
		expectedErrCode        connect.Code
		expectedMockCall       bool
		expectedHistoryType    string
		expectedTimeFromArg    string // For mock expectation
		expectedTimeToArg      string // For mock expectation
		expectSpecificMockArgs bool
	}{
		{
			name: "Valid request with ONE_MINUTE granularity",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_ONE_MINUTE,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup: func() {
				mockService.On("GetPriceHistory", ctx, defaultAddress, "1m", expectedTimeFromStr, expectedTimeToStr, defaultAddressType).Return(sampleServiceResponse, nil).Once()
			},
			expectedResp: &pb.GetPriceHistoryResponse{
				Data: &pb.PriceHistoryData{
					Items: []*pb.PriceHistoryItem{
						{UnixTime: oneHourAgo.Unix(), Value: 100.0},
						{UnixTime: now.Unix(), Value: 105.0},
					},
				},
				Success: true,
			},
			expectedErrCode:        0,
			expectedMockCall:       true,
			expectedHistoryType:    "1m",
			expectedTimeFromArg:    expectedTimeFromStr,
			expectedTimeToArg:      expectedTimeToStr,
			expectSpecificMockArgs: true,
		},
		{
			name: "Valid request with FIVE_MINUTE granularity",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_FIVE_MINUTE,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup: func() {
				mockService.On("GetPriceHistory", ctx, defaultAddress, "5m", expectedTimeFromStr, expectedTimeToStr, defaultAddressType).Return(sampleServiceResponse, nil).Once()
			},
			expectedResp: &pb.GetPriceHistoryResponse{
				Data: &pb.PriceHistoryData{
					Items: []*pb.PriceHistoryItem{
						{UnixTime: oneHourAgo.Unix(), Value: 100.0},
						{UnixTime: now.Unix(), Value: 105.0},
					},
				},
				Success: true,
			},
			expectedErrCode:        0,
			expectedMockCall:       true,
			expectedHistoryType:    "5m",
			expectedTimeFromArg:    expectedTimeFromStr,
			expectedTimeToArg:      expectedTimeToStr,
			expectSpecificMockArgs: true,
		},
		{
			name: "Valid request with FOUR_HOUR granularity",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_FOUR_HOUR,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup: func() {
				mockService.On("GetPriceHistory", ctx, defaultAddress, "4H", expectedTimeFromStr, expectedTimeToStr, defaultAddressType).Return(sampleServiceResponse, nil).Once()
			},
			expectedResp: &pb.GetPriceHistoryResponse{
				Data: &pb.PriceHistoryData{
					Items: []*pb.PriceHistoryItem{
						{UnixTime: oneHourAgo.Unix(), Value: 100.0},
						{UnixTime: now.Unix(), Value: 105.0},
					},
				},
				Success: true,
			},
			expectedErrCode:        0,
			expectedMockCall:       true,
			expectedHistoryType:    "4H",
			expectedTimeFromArg:    expectedTimeFromStr,
			expectedTimeToArg:      expectedTimeToStr,
			expectSpecificMockArgs: true,
		},
		{
			name: "Request with PRICE_HISTORY_TYPE_UNSPECIFIED",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_PRICE_HISTORY_TYPE_UNSPECIFIED,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup: func() {
				mockService.On("GetPriceHistory", ctx, defaultAddress, "15m", expectedTimeFromStr, expectedTimeToStr, defaultAddressType).Return(sampleServiceResponse, nil).Once()
			},
			expectedResp: &pb.GetPriceHistoryResponse{
				Data: &pb.PriceHistoryData{
					Items: []*pb.PriceHistoryItem{
						{UnixTime: oneHourAgo.Unix(), Value: 100.0},
						{UnixTime: now.Unix(), Value: 105.0},
					},
				},
				Success: true,
			},
			expectedErrCode:        0,
			expectedMockCall:       true,
			expectedHistoryType:    "15m",
			expectedTimeFromArg:    expectedTimeFromStr,
			expectedTimeToArg:      expectedTimeToStr,
			expectSpecificMockArgs: true,
		},
		{
			name: "Missing address",
			req: &pb.GetPriceHistoryRequest{
				Address:     "", // Missing
				Type:        pb.GetPriceHistoryRequest_ONE_MINUTE,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup:        func() {},
			expectedResp:     nil,
			expectedErrCode:  connect.CodeInvalidArgument,
			expectedMockCall: false,
		},
		{
			name: "Missing timeFrom",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_ONE_MINUTE,
				TimeFrom:    nil, // Missing
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup:        func() {},
			expectedResp:     nil,
			expectedErrCode:  connect.CodeInvalidArgument,
			expectedMockCall: false,
		},
		{
			name: "Missing timeTo",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_ONE_MINUTE,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      nil, // Missing
				AddressType: defaultAddressType,
			},
			mockSetup:        func() {},
			expectedResp:     nil,
			expectedErrCode:  connect.CodeInvalidArgument,
			expectedMockCall: false,
		},
		{
			name: "Error from price.Service",
			req: &pb.GetPriceHistoryRequest{
				Address:     defaultAddress,
				Type:        pb.GetPriceHistoryRequest_ONE_MINUTE,
				TimeFrom:    defaultTimeFromPb,
				TimeTo:      defaultTimeToPb,
				AddressType: defaultAddressType,
			},
			mockSetup: func() {
				mockService.On("GetPriceHistory", ctx, defaultAddress, "1m", expectedTimeFromStr, expectedTimeToStr, defaultAddressType).Return(nil, errors.New("service error")).Once()
			},
			expectedResp:           nil,
			expectedErrCode:        connect.CodeInternal,
			expectedMockCall:       true,
			expectedHistoryType:    "1m",
			expectedTimeFromArg:    expectedTimeFromStr,
			expectedTimeToArg:      expectedTimeToStr,
			expectSpecificMockArgs: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mocks for each test

			// mockService.Mock = mock.Mock{} // Reset calls - This is handled by NewMockPriceServiceAPI(t)
			tt.mockSetup()

			resp, err := handler.GetPriceHistory(ctx, connect.NewRequest(tt.req))

			if tt.expectedErrCode != 0 {
				assert.Error(t, err)
				connectErr, ok := err.(*connect.Error)
				assert.True(t, ok, "error should be a connect.Error")
				assert.Equal(t, tt.expectedErrCode, connectErr.Code())
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, resp.Msg) // Ensure resp.Msg is not nil
				if resp.Msg != nil {
					assert.Equal(t, tt.expectedResp.Success, resp.Msg.Success)
					assert.NotNil(t, resp.Msg.Data) // Ensure resp.Msg.Data is not nil
					if resp.Msg.Data != nil && tt.expectedResp != nil && tt.expectedResp.Data != nil {
						assert.Equal(t, len(tt.expectedResp.Data.Items), len(resp.Msg.Data.Items))
						if len(tt.expectedResp.Data.Items) > 0 && len(resp.Msg.Data.Items) > 0 {
							assert.Equal(t, tt.expectedResp.Data.Items[0].UnixTime, resp.Msg.Data.Items[0].UnixTime)
							assert.Equal(t, tt.expectedResp.Data.Items[0].Value, resp.Msg.Data.Items[0].Value)
						}
					} else if !(tt.expectedResp == nil || tt.expectedResp.Data == nil) {
						// Fail if expected data but got nil
						assert.Fail(t, "Response data or expected data is nil when it shouldn't be")
					}
				}
			}

			// Assertions on mock calls are handled by t.Cleanup in NewMockPriceServiceAPI if using that pattern
			// or can be done explicitly if needed:
			// if tt.expectedMockCall { ... }
			// mockService.AssertExpectations(t) // This might be redundant if NewMockPriceServiceAPI(t) is used correctly

		})
	}
}

func TestGetCoinPricesHandler(t *testing.T) {

	mockService := priceMocks.NewMockPriceServiceAPI(t) // Use generated mock
	handler := &priceServiceHandler{
		priceService: mockService,
	}
	ctx := context.Background()

	tests := []struct {
		name            string
		req             *pb.GetCoinPricesRequest
		mockSetup       func()
		expectedResp    *pb.GetCoinPricesResponse
		expectedErrCode connect.Code
	}{
		{
			name: "Valid request with coin IDs",
			req: &pb.GetCoinPricesRequest{
				CoinIds: []string{"solana", "bitcoin"},
			},
			mockSetup: func() {
				expectedPrices := map[string]float64{"solana": 150.0, "bitcoin": 40000.0}
				mockService.On("GetCoinPrices", ctx, []string{"solana", "bitcoin"}).Return(expectedPrices, nil).Once()
			},
			expectedResp: &pb.GetCoinPricesResponse{
				Prices: map[string]float64{"solana": 150.0, "bitcoin": 40000.0},
			},
			expectedErrCode: 0,
		},
		{
			name: "Request with no coin IDs",
			req: &pb.GetCoinPricesRequest{
				CoinIds: []string{},
			},
			mockSetup:       func() {},
			expectedResp:    nil,
			expectedErrCode: connect.CodeInvalidArgument,
		},
		{
			name: "Request with nil coin IDs",
			req: &pb.GetCoinPricesRequest{
				CoinIds: nil,
			},
			mockSetup:       func() {},
			expectedResp:    nil,
			expectedErrCode: connect.CodeInvalidArgument,
		},
		{
			name: "Error from price.Service",
			req: &pb.GetCoinPricesRequest{
				CoinIds: []string{"solana"},
			},
			mockSetup: func() {
				mockService.On("GetCoinPrices", ctx, []string{"solana"}).Return(nil, errors.New("service error")).Once()
			},
			expectedResp:    nil,
			expectedErrCode: connect.CodeInternal,
		},
		{
			name: "Partial error from price.Service (e.g. some prices found, some not)",
			req: &pb.GetCoinPricesRequest{
				CoinIds: []string{"solana", "unknown_coin"},
			},
			mockSetup: func() {
				// This scenario might be better handled by the service returning a partial map and no error,
				// or a specific error type. For this test, assume the service returns what it found.
				expectedPrices := map[string]float64{"solana": 150.0}
				mockService.On("GetCoinPrices", ctx, []string{"solana", "unknown_coin"}).Return(expectedPrices, nil).Once()
			},
			expectedResp: &pb.GetCoinPricesResponse{
				Prices: map[string]float64{"solana": 150.0},
			},
			expectedErrCode: 0, // Assuming service returns what it can find without an error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService.Mock = mock.Mock{} // Reset mocks
			tt.mockSetup()

			resp, err := handler.GetCoinPrices(ctx, connect.NewRequest(tt.req))

			if tt.expectedErrCode != 0 {
				assert.Error(t, err)
				connectErr, ok := err.(*connect.Error)
				assert.True(t, ok, "error should be a connect.Error")
				assert.Equal(t, tt.expectedErrCode, connectErr.Code())
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedResp.Prices, resp.Msg.Prices)
			}

			if tt.expectedErrCode == 0 || tt.expectedErrCode == connect.CodeInternal {
				mockService.AssertCalled(t, "GetCoinPrices", ctx, tt.req.CoinIds)
			} else {
				mockService.AssertNotCalled(t, "GetCoinPrices", mock.Anything, mock.Anything)
			}
			mockService.AssertExpectations(t)
		})
	}
}
