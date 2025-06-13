# Backend Enhancements: Security and Performance (July 2024)

## Overview

This document outlines a series of enhancements applied to the backend services in July 2024, focusing on improving security, performance, and robustness. The primary areas of change include comprehensive input validation across critical service functions and the implementation of pagination for coin listing APIs. Additionally, reviews were conducted for API key handling, SQL injection vulnerabilities (specifically in sorting), and external API call timeouts, confirming adherence to best practices in most areas.

## 1. Enhanced Input Validation

### Reasoning

Proper input validation is crucial for maintaining a secure and reliable application. The key motivations for these enhancements were:

-   **Security:** To protect against common web vulnerabilities by ensuring that data passed to service layers is well-formed and sanitized. This helps prevent injection attacks (even if specific SQL injection vectors were already mitigated) and ensures data integrity.
-   **Robustness:** To prevent malformed or unexpected data from causing errors, panics, or crashes within the service logic, database interactions, or when making calls to external APIs. Early validation leads to more predictable behavior and clearer error reporting.

### Implementation Details

Comprehensive input validation checks were integrated into critical service layer functions, primarily within `trade.Service` and `coin.Service`.

-   **Key Validations Added:**
    -   **Solana Address Formats:** Mint addresses, user wallet addresses, and transaction hashes are now validated for correct Base58 encoding and typical length constraints (e.g., 32-44 characters for public keys, 64-88 for transaction signatures).
    -   **Numerical Inputs:** Amounts (e.g., trade amounts, volumes) are checked to ensure they are positive where applicable. Slippage percentages (BPS) are validated to be within a non-negative and practical upper bound (e.g., 0-50%).
    -   **String Lengths:** Limits were imposed on free-text fields like search queries (e.g., max 256 characters) and tags (e.g., max 64 characters) to prevent overly long inputs.
    -   **Non-Emptiness:** Essential string fields, such as those carrying transaction data, are checked to ensure they are not empty.

-   **Validation Utility:**
    -   A new utility package was created at `backend/internal/util/validation.go`.
    -   This package houses reusable validation helper functions, including `IsValidSolanaAddress(address string) bool` and `IsValidBase58(str string) bool`. This promotes consistency and simplifies the addition of new validations in the future.

-   **Error Handling:**
    -   If validation fails, functions now return errors promptly (typically `fmt.Errorf` or `connect.NewError` for gRPC handlers). This allows client applications to receive clear feedback on invalid inputs.

## 2. Implemented Pagination for Coin Listing (`GetAvailableCoins` API)

### Reasoning

Fetching and transmitting an entire list of entities, such as all available coins, can lead to significant performance bottlenecks and high memory consumption, especially as the dataset grows.

-   **Performance:** Reduces the amount of data fetched from the database and transmitted over the network for a single request, leading to faster API response times.
-   **Scalability:** Ensures that the coin listing API remains performant and usable even as the number of supported coins increases substantially.
-   **User Experience:** Allows client applications to implement more responsive UIs by loading data in manageable chunks.

### Implementation Details

Pagination and sorting capabilities were integrated into the `GetAvailableCoins` API endpoint and its underlying service and data layers.

-   **Database Layer (`db.Repository` and `postgres.Repository`):**
    -   The `List` method in the generic `db.Repository` interface (defined in `backend/internal/db/db.go`) was updated to accept `db.ListOptions` (which include `Limit`, `Offset`, `SortBy`, `SortDesc`, and `Filters`).
    -   The GORM implementation in `backend/internal/db/postgres/repository.go` was updated to apply these options, effectively making the generic `List` method now capable of paginated and sorted queries. It now returns both the list of items and a total count for the query.

-   **Service Layer (`coin.Service`):**
    -   The `GetCoins` method in `backend/internal/service/coin/service.go` was refactored to accept `db.ListOptions`.
    -   It now passes these options to the repository layer to fetch a paginated and sorted list of coins along with the total count.
    -   Previously existing in-memory sorting logic within `GetCoins` was removed, as sorting is now delegated to the database for greater efficiency.
    -   A default sort order (e.g., by "volume_24h" descending) is applied if no specific sorting options are provided by the caller.

-   **API Layer (`grpc/coin_service.go`):**
    -   The `GetAvailableCoinsRequest` protobuf message (definition assumed to be updated) now includes fields for `limit`, `offset`, `sort_by`, and `sort_desc`.
    -   The `GetAvailableCoinsResponse` protobuf message (definition assumed to be updated) now includes a `total_count` field.
    -   The gRPC handler `GetAvailableCoins` was updated to:
        -   Construct `db.ListOptions` from the incoming request parameters.
        -   Call the updated `coinService.GetCoins` method with these options.
        -   Populate the response with the fetched subset of coins and the `total_count`.
    -   The path for `TrendingOnly` requests in this handler currently does not use the new pagination features and will require a separate update if pagination is desired for trending coins.

## 3. Other Reviews & Confirmations

During this enhancement process, several other areas were reviewed:

-   **SQL Injection (Sorting in `SearchCoins`):**
    -   It was confirmed that the `SearchCoins` method in `backend/internal/db/postgres/store.go` already employs a whitelist mapping (`mapSortBy`) for the `SortBy` parameter. This ensures that only predefined, safe column names are used in `ORDER BY` clauses, effectively preventing SQL injection vulnerabilities through sort parameters.

-   **API Key Handling:**
    -   A review of `backend/cmd/api/main.go` confirmed that API keys for external services (like Birdeye and Jupiter) are loaded from environment variables using the `envconfig` library. This adheres to security best practices by avoiding hardcoded secrets in the codebase.

-   **External API Call Timeouts:**
    -   The HTTP client configuration was reviewed. A global default timeout of 10 seconds is applied to most external API calls.
    -   A specific, longer timeout (5 minutes) is correctly implemented for the Jupiter client's `GetAllCoins` method, which is known to be a potentially long-running operation.
    -   The use of `context.Context` throughout the client methods also allows for per-request deadline control by callers.

-   **Jupiter Client Prioritization Fees:**
    -   The parameters for `prioritizationFeeLamports` within the Jupiter client's `CreateSwapTransaction` method were found to be hardcoded. While this means they are not subject to input validation at that function's interface, it also means they cannot be directly manipulated by API callers. It was noted that making these values configurable (e.g., via environment variables) could offer greater operational flexibility and cost management in the future.

## Overall Benefit

These collective changes significantly bolster the backend system by:
-   Strengthening its security against invalid or malicious inputs.
-   Improving its performance and scalability, particularly for data-intensive operations like coin listing.
-   Increasing its overall robustness and reliability.
