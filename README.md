# 🎮 Dankfolio

## TODO:
- [ ] Make wallet creation fully frontend and only send public key to the backend
- [ ] There's a bug where in the profile when we have 0 coin we still see SOL
- [ ] Optimize the graph fetching by fetching ALL points at once and then filter/aggregate by time.

- Problem:
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Step 1: Navigating to https://www.birdeye.so/?chain=solana
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Warning: Initial data load/refresh failed: failed to scrape and enrich coins: failed during basic token scraping: initial navigation failed: exec: "google-chrome": executable file not found in $PATH
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Starting gRPC server on port 9000
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Starting Connect RPC server on :9000

- Solution:
Use a direct page instead 🤦‍♂️

### NOTE
In order for the raw_coins to be populated which is required for the search functionality. We currently have to trigger the jupiter call to /tokens/v1/all which is currently done manually by triggering. We should also think about using the `new` endpoint periodically which is not implemented currently.

```bash
→ grpcurl -plaintext \
  -import-path proto/dankfolio/v1 \
  -proto coin.proto \
  -d '{}' \
  localhost:9000 \
  dankfolio.v1.CoinService/GetAllCoins
```

### Improvements
- [x] Add contract display in coin details
- [x] Add more space to the coin name in profile and home
- [x] Improve graph usability
    - [x] Formatted DT on graph when dragging
    - [x] Fix change update and color
    - [x] Hover label position fix when reaching the edge of the screen
    - [x] Label, vertical line and domain padding
    - [x] Shadow when highlighting
    - [x] Double check data accuracy when highligting the graph


### 💅 UI Improvements

| Task | Reference |
|------|-----------|
| <li>[x] Improve Button Bar Design </li>| <details><summary>View Design</summary><img src="./ss/button_bar.jpg" width="400" alt="Button Bar Design"></details> |
| <li>[ ] Enhance Coins Detail Header </li>| <details><summary>View Design</summary><img src="./ss/coin_detals_header.png" width="400" alt="Coins Detail Header"></details> |
| <li>[ ] Update Chart Style </li>| <details><summary>View Design</summary><img src="./ss/chart_style.png" width="400" alt="Chart Style"></details> |
| <li>[ ] Implement Price Chart Highlight</li>| <details><summary>View Design</summary><img src="./ss/price_chart_highlight.jpg" width="400" alt="Price Chart Highlight"></details> |
| <li>[x] Create Profile Wallet Breakdown</li>  | <details><summary>View Design</summary><img src="./ss/profile_wallet_breakdown.png" width="400" alt="Profile Wallet Breakdown"></details> |


## hard reset
```bash 
rm -rf ./node_modules && yarn install && cd ios && rm -rf build Pods Podfile.lock && pod install && cd .. && yarn start --reset-cache
```

## Internal gRPC Security (Nginx to Backend TLS)

The gRPC communication between the Nginx reverse proxy and the Go backend (`golang` service) is secured using TLS (Transport Layer Security). This ensures that data exchanged between Nginx and the backend within the Docker network is encrypted.

**Key aspects of this setup:**

*   **Self-Signed Certificates:** The TLS setup currently uses self-signed certificates (`server.crt` for the public certificate and `server.key` for the private key). These are located in the `backend/certs/` directory.
    *   *Note for Production:* For a production environment, managing these certificates securely is crucial. Options include generating them at deployment time, using a private Certificate Authority (CA), or integrating with a secrets management system. Storing self-signed keys directly in the repository is suitable for development but not recommended for production.
*   **Backend Configuration:** The Go backend service is configured to use these certificates via environment variables:
    *   `GRPC_SERVER_CERT_FILE`: Specifies the path to the server's public certificate file (e.g., `/app/certs/server.crt` inside the container).
    *   `GRPC_SERVER_KEY_FILE`: Specifies the path to the server's private key file (e.g., `/app/certs/server.key` inside the container).
*   **Nginx Configuration:** Nginx is configured as a gRPC client for the backend. It's set up to:
    *   Use `grpcs` (gRPC over TLS) to communicate with the backend.
    *   Trust the backend's public certificate (`backend/certs/server.crt`, which is mounted into the Nginx container).
*   **Docker Compose:** The `deploy/docker-compose.yml` file orchestrates this setup by:
    *   Mounting the `backend/certs/` directory into the `golang` service container.
    *   Setting the `GRPC_SERVER_CERT_FILE` and `GRPC_SERVER_KEY_FILE` environment variables for the `golang` service.
    *   Mounting the `backend/certs/server.crt` file into the `nginx` service container so Nginx can use it as a trusted certificate for the backend connection.

This internal TLS mechanism enhances the security of the application by encrypting traffic between the reverse proxy and the backend service.

## Testing with grpcurl and curl

Once the application is running via `docker-compose up`, you can test the `CoinService.GetAvailableCoins` RPC method using `grpcurl` (for gRPC) and `curl` (for the Connect protocol's HTTP/JSON mapping). These commands assume Nginx is proxying requests from `corsairsoftware.io` to the backend.

### `grpcurl` (gRPC)

`grpcurl` allows you to interact with gRPC services.

```bash
grpcurl \
  -import-path proto \
  -proto proto/dankfolio/v1/coin.proto \
  -d '{"trending_only": false}' \
  corsairsoftware.io:443 \
  dankfolio.v1.CoinService/GetAvailableCoins
```

**Explanation:**

*   `-import-path proto`: Specifies the path to find imported `.proto` files (our protos are in `proto/dankfolio/v1`, so `proto` is the root import path).
*   `-proto proto/dankfolio/v1/coin.proto`: Specifies the main `.proto` file defining the service.
*   `-d '{"trending_only": false}'`: The JSON request body for the `GetAvailableCoinsRequest`.
*   `corsairsoftware.io:443`: The target host and port (Nginx).
*   `dankfolio.v1.CoinService/GetAvailableCoins`: The fully qualified service and method name.

**Local Testing Notes for `grpcurl`:**

*   **Domain Resolution:** If `corsairsoftware.io` does not resolve to your local Docker Nginx instance (e.g., `127.0.0.1`), you might need to add an entry to your `/etc/hosts` file: `127.0.0.1 corsairsoftware.io`.
*   **Certificate Trust:** The `corsairsoftware.io` in the Nginx configuration uses Let's Encrypt certificates. For local testing where Nginx might be using self-signed certificates or a different setup, you might encounter certificate trust issues.
    *   If Nginx is using the production Let's Encrypt certs locally and `corsairsoftware.io` resolves correctly, it should work.
    *   If you are testing against a local Nginx setup that does **not** use publicly trusted certificates for `corsairsoftware.io` (or if the backend itself was exposed directly with its self-signed cert), you might need to use the `-insecure` flag with `grpcurl`. However, the current Nginx setup is intended for `grpcs` to the backend, so `grpcurl` is interacting with Nginx's front-facing TLS.

### `curl` (Connect Protocol - HTTP/JSON)

The Connect protocol also exposes gRPC services as standard HTTP/JSON endpoints.

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"trending_only": false}' \
  https://corsairsoftware.io/dankfolio.v1.CoinService/GetAvailableCoins
```

**Explanation:**

*   `-X POST`: Specifies the HTTP POST method.
*   `-H "Content-Type: application/json"`: Sets the content type header.
*   `-d '{"trending_only": false}'`: The JSON request body.
*   `https://corsairsoftware.io/dankfolio.v1.CoinService/GetAvailableCoins`: The URL for the RPC method. The path is formed by `/Package.Service/Method`.

**Local Testing Notes for `curl`:**

*   **Domain Resolution:** Similar to `grpcurl`, ensure `corsairsoftware.io` resolves to your local Nginx.
*   **Certificate Trust:**
    *   If Nginx is using valid, publicly trusted certificates for `corsairsoftware.io`, the command should work as is.
    *   If you are testing locally and Nginx is using self-signed certificates or certificates not trusted by your system's CA store, you might need to use the `-k` (or `--insecure`) flag with `curl` to bypass certificate validation. Example: `curl -k -X POST ...`.

## CodeCoverage
```
→ yarn test --coverage
yarn run v1.22.22
$ jest --coverage
watchman warning:  Recrawled this watch 9 times, most recently because:
MustScanSubDirs UserDroppedTo resolve, please review the information on
https://facebook.github.io/watchman/docs/troubleshooting.html#recrawl
To clear this warning, run:
`watchman watch-del '/Users/nma/dev/dankfolio' ; watchman watch-project '/Users/nma/dev/dankfolio'`

 PASS  src/store/coins.test.ts
 PASS  src/components/Chart/CoinChart/index.test.tsx
 PASS  src/store/portfolio.test.ts
 PASS  src/screens/Profile/ProfileScreen.test.tsx
 PASS  src/utils/numberFormat.test.ts
 PASS  src/components/Common/TokenSelector/TokenSelector.test.tsx
 PASS  src/services/api.test.ts
 PASS  src/screens/CoinDetail/CoinDetailScreen.test.tsx
 PASS  src/screens/Home/HomeScreen.test.tsx
 PASS  src/components/Common/Navigation/navigation.test.tsx
 PASS  src/screens/Trade/TradeScreen.Confirmation.test.tsx
 PASS  src/screens/Trade/TradeScreen.test.tsx (7.823 s)
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------
All files                           |   61.69 |    55.13 |   66.14 |   61.96 |
 components/Chart/CoinChart         |   88.13 |    86.95 |   68.42 |   89.09 |
  index.tsx                         |   87.71 |    86.95 |   66.66 |   88.88 | 54-55,65,97,148-149
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Common/Icons            |   46.42 |        0 |       0 |   76.47 |
  index.tsx                         |   46.42 |        0 |       0 |   76.47 | 17-18,22-23,27-28,32-33
 components/Common/Navigation       |     100 |      100 |     100 |     100 |
  CustomHeader.tsx                  |     100 |      100 |     100 |     100 |
 components/Common/TokenSelector    |   97.26 |    81.13 |      96 |   97.14 |
  index.tsx                         |   96.22 |       75 |      95 |   96.07 | 14-15
  scripts.ts                        |     100 |      100 |     100 |     100 |
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Home/CoinCard           |     100 |       80 |     100 |     100 |
  coincard_styles.ts                |     100 |      100 |     100 |     100 |
  index.tsx                         |     100 |       80 |     100 |     100 | 34-44
 components/OTAupdate               |      25 |     3.84 |   42.85 |   27.77 |
  index.tsx                         |      75 |       50 |   66.66 |      75 | 16-17
  scripts.ts                        |    9.67 |        0 |      25 |   11.11 | 7-11,18-52
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeConfirmation |   85.71 |    82.14 |     100 |   87.17 |
  index.tsx                         |      85 |    82.14 |     100 |   86.84 | 45,56,62-67
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeStatusModal  |   72.72 |    59.37 |      80 |   71.42 |
  index.tsx                         |      70 |    59.37 |      75 |      70 | 24-26,30-32,42,88
  styles.ts                         |     100 |      100 |     100 |     100 |
 gen/dankfolio/v1                   |     100 |      100 |     100 |     100 |
  coin_pb.ts                        |     100 |      100 |     100 |     100 |
  price_pb.ts                       |     100 |      100 |     100 |     100 |
  trade_pb.ts                       |     100 |      100 |     100 |     100 |
  utility_pb.ts                     |     100 |      100 |     100 |     100 |
  wallet_pb.ts                      |     100 |      100 |     100 |     100 |
 hooks                              |   67.56 |    28.57 |     100 |   68.57 |
  useProxiedImage.ts                |   67.56 |    28.57 |     100 |   68.57 | 37-40,51-60
 screens/CoinDetail                 |   50.49 |    46.55 |   70.58 |   49.48 |
  coindetail_scripts.ts             |       6 |        0 |       0 |       6 | 32-88,98-128
  coindetail_styles.ts              |     100 |      100 |     100 |     100 |
  index.tsx                         |   93.87 |    81.81 |   91.66 |   95.65 | 50,89
 screens/Home                       |   94.73 |       60 |    92.3 |   94.44 |
  home_scripts.ts                   |   66.66 |      100 |       0 |   66.66 | 64
  home_styles.ts                    |     100 |      100 |     100 |     100 |
  index.tsx                         |   96.96 |       60 |     100 |   96.87 | 39
 screens/Profile                    |   56.45 |       50 |   68.42 |   57.14 |
  index.tsx                         |   62.85 |       60 |   66.66 |   63.63 | 42-53,102-103,125-126,168
  profile_scripts.ts                |      44 |       25 |   66.66 |   45.45 | 16-26,49-60
  profile_styles.ts                 |     100 |      100 |     100 |     100 |
 screens/Trade                      |   52.44 |     46.3 |   70.73 |   50.86 |
  index.tsx                         |   70.14 |    58.11 |   81.81 |   69.58 | ...169,183-184,188-189,198-199,210-211,214-215,219-220,229-230,239-240,262-263,277-284,291-292,313
  trade_scripts.ts                  |    11.7 |     3.12 |   14.28 |    11.7 | 20-25,37-92,106-109,117-119,133-168,179-187,205-256
  trade_styles.ts                   |     100 |      100 |     100 |     100 |
 services                           |    5.26 |        0 |    5.55 |    5.26 |
  grpcApi.ts                        |    5.26 |        0 |    5.55 |    5.26 | 12,21-346,363,379-394
 services/grpc                      |   56.52 |       25 |      75 |   56.52 |
  apiClient.ts                      |    87.5 |       50 |     100 |    87.5 | 4
  grpcUtils.ts                      |      50 |    23.07 |      75 |      50 | 11,50-51,55-75,91
 store                              |   86.55 |     60.6 |      95 |   85.45 |
  coins.ts                          |      92 |       60 |     100 |    91.3 | 47-50
  portfolio.ts                      |    82.6 |    61.11 |      90 |   81.25 | 43,52,66-70,78-88,94-95,121-122
 utils                              |   80.55 |    78.57 |      80 |   81.92 |
  constants.ts                      |     100 |      100 |     100 |     100 |
  logger.ts                         |   58.06 |    32.14 |   77.77 |   70.83 | 20-25,61-62,70
  numberFormat.ts                   |     100 |      100 |     100 |     100 |
  url.ts                            |      20 |        0 |       0 |      20 | 5,9-18
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------

Test Suites: 12 passed, 12 total
Tests:       81 passed, 81 total
Snapshots:   0 total
Time:        8.947 s, estimated 12 s
✨  Done in 9.53s.
```
