package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/s3"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/imageproxy"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Parse command line flags
	var (
		imageURL    = flag.String("url", "", "Image URL to test (IPFS or HTTP)")
		mintAddress = flag.String("mint", "", "Mint address for the token")
	)
	flag.Parse()

	// Set up structured logging
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	})))

	// Default test values if not provided
	if *imageURL == "" {
		// Use an IPFS URL for testing
		*imageURL = "ipfs://QmYw8bZiAqLG8CZvhE6UYLrJgV5hSgMvQFchX5qzRPPKJE"
	}
	if *mintAddress == "" {
		// Example mint address
		*mintAddress = "TestIPFS" + fmt.Sprintf("%d", time.Now().Unix())
	}

	fmt.Printf("🧪 Testing Image to S3 Upload\n")
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("Image URL: %s\n", *imageURL)
	fmt.Printf("Mint Address: %s\n", *mintAddress)
	fmt.Printf("\n")

	// Initialize S3 client from environment
	fmt.Println("📦 Initializing S3 client...")
	s3Client, err := s3.NewClientFromEnv()
	if err != nil {
		log.Fatalf("❌ Failed to initialize S3 client: %v", err)
	}
	fmt.Println("✅ S3 client initialized")

	// Create image proxy service
	fmt.Println("\n🔧 Creating image proxy service...")
	imageProxy := imageproxy.NewService(s3Client)
	fmt.Println("✅ Image proxy service created")

	// Process and upload the image
	fmt.Println("\n🚀 Processing and uploading image...")
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second) // Increased timeout for IPFS
	defer cancel()

	startTime := time.Now()
	s3URL, err := imageProxy.ProcessAndUploadImage(ctx, *imageURL, *mintAddress)
	if err != nil {
		log.Fatalf("❌ Failed to process image: %v", err)
	}
	duration := time.Since(startTime)

	fmt.Printf("\n✅ Success! Image uploaded in %v\n", duration)
	fmt.Printf("📍 S3 URL: %s\n", s3URL)

	// Verify the image exists
	fmt.Println("\n🔍 Verifying image exists in S3...")
	key := fmt.Sprintf("tokens/%s.png", *mintAddress)
	exists, err := s3Client.ImageExists(ctx, key)
	if err != nil {
		fmt.Printf("⚠️  Failed to verify image existence: %v\n", err)
	} else if exists {
		fmt.Println("✅ Image verified in S3")
	} else {
		fmt.Println("❌ Image not found in S3")
	}

	// Test collision detection
	fmt.Println("\n🔄 Testing collision detection (re-uploading same image)...")
	startTime = time.Now()
	s3URL2, err := imageProxy.ProcessAndUploadImage(ctx, *imageURL, *mintAddress)
	if err != nil {
		log.Fatalf("❌ Failed on second upload: %v", err)
	}
	duration = time.Since(startTime)

	if s3URL == s3URL2 {
		fmt.Printf("✅ Collision detection working! Same URL returned in %v (should be faster)\n", duration)
	} else {
		fmt.Printf("⚠️  Different URLs returned: %s vs %s\n", s3URL, s3URL2)
	}

	fmt.Printf("\n🎉 Test completed successfully!\n")
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("\nYou can now view the uploaded image at:\n%s\n", s3URL)
}