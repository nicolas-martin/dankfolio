package s3

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go/middleware"
	smithyhttp "github.com/aws/smithy-go/transport/http"
)

// withContentMD5 removes all flexible checksum procedures from an operation
// This is needed for Linode S3 compatibility
func withContentMD5(o *s3.Options) {
	o.APIOptions = append(o.APIOptions, func(stack *middleware.Stack) error {
		stack.Initialize.Remove("AWSChecksum:SetupInputContext")
		stack.Build.Remove("AWSChecksum:RequestMetricsTracking")
		stack.Finalize.Remove("AWSChecksum:ComputeInputPayloadChecksum")
		stack.Finalize.Remove("addInputChecksumTrailer")
		return smithyhttp.AddContentChecksumMiddleware(stack)
	})
}

type Client struct {
	s3Client       *s3.Client
	bucketName     string
	publicURLPrefix string
}

type Config struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	Region          string
	PublicURLPrefix string
}

// NewClient creates a new S3 client configured for Linode Object Storage
func NewClient(cfg Config) (*Client, error) {
	// Load AWS config with credentials
	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client with custom endpoint
	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(cfg.Endpoint)
		o.UsePathStyle = true
		o.Region = cfg.Region
	})

	return &Client{
		s3Client:        s3Client,
		bucketName:      cfg.BucketName,
		publicURLPrefix: strings.TrimSuffix(cfg.PublicURLPrefix, "/"),
	}, nil
}

// UploadImage uploads an image to S3 and returns the public URL
func (c *Client) UploadImage(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	// Buffer the entire content to ensure proper content length
	buf := new(bytes.Buffer)
	_, err := io.Copy(buf, data)
	if err != nil {
		return "", fmt.Errorf("failed to buffer image data: %w", err)
	}
	
	input := &s3.PutObjectInput{
		Bucket:       aws.String(c.bucketName),
		Key:          aws.String(key),
		Body:         bytes.NewReader(buf.Bytes()),
		ContentType:  aws.String(contentType),
		ContentLength: aws.Int64(int64(buf.Len())),
		ACL:          types.ObjectCannedACLPublicRead, // Make object publicly readable
	}
	
	slog.Debug("Uploading to S3", 
		"bucket", c.bucketName,
		"key", key,
		"contentType", contentType,
		"size", buf.Len())
	
	// Use withContentMD5 to disable new checksum behavior for Linode compatibility
	_, err = c.s3Client.PutObject(ctx, input, withContentMD5)
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	publicURL := fmt.Sprintf("%s/%s", c.publicURLPrefix, key)
	slog.Info("Successfully uploaded image to S3", 
		"key", key,
		"url", publicURL)
	
	return publicURL, nil
}

// ImageExists checks if an image already exists in S3
func (c *Client) ImageExists(ctx context.Context, key string) (bool, error) {
	_, err := c.s3Client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check if it's a not found error
		if strings.Contains(err.Error(), "NotFound") {
			return false, nil
		}
		return false, fmt.Errorf("failed to check if image exists: %w", err)
	}
	return true, nil
}

// GetImageURL returns the public URL for an image
func (c *Client) GetImageURL(key string) string {
	return fmt.Sprintf("%s/%s", c.publicURLPrefix, key)
}

// NewClientFromEnv creates a new S3 client from environment variables
func NewClientFromEnv() (*Client, error) {
	cfg := Config{
		Endpoint:        os.Getenv("S3_ENDPOINT"),
		AccessKeyID:     os.Getenv("S3_ACCESS_KEY_ID"),
		SecretAccessKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
		BucketName:      os.Getenv("S3_BUCKET_NAME"),
		Region:          os.Getenv("S3_REGION"),
		PublicURLPrefix: os.Getenv("S3_PUBLIC_URL_PREFIX"),
	}

	// Validate required fields
	if cfg.Endpoint == "" || cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" || 
	   cfg.BucketName == "" || cfg.Region == "" || cfg.PublicURLPrefix == "" {
		return nil, fmt.Errorf("missing required S3 configuration in environment variables")
	}

	return NewClient(cfg)
}