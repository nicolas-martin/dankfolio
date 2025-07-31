package s3

import (
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
)

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
	// Create custom resolver for Linode endpoint
	customResolver := aws.EndpointResolverWithOptionsFunc(
		func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			if service == s3.ServiceID {
				return aws.Endpoint{
					URL:               cfg.Endpoint,
					SigningRegion:     cfg.Region,
					HostnameImmutable: true,
				}, nil
			}
			return aws.Endpoint{}, fmt.Errorf("unknown endpoint requested")
		})

	// Load AWS config with custom endpoint
	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(cfg.Region),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true // Required for Linode Object Storage
	})

	return &Client{
		s3Client:        s3Client,
		bucketName:      cfg.BucketName,
		publicURLPrefix: strings.TrimSuffix(cfg.PublicURLPrefix, "/"),
	}, nil
}

// UploadImage uploads an image to S3 and returns the public URL
func (c *Client) UploadImage(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	_, err := c.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(c.bucketName),
		Key:          aws.String(key),
		Body:         data,
		ContentType:  aws.String(contentType),
		ACL:          "public-read", // Make the object publicly readable
		CacheControl: aws.String("public, max-age=31536000, immutable"), // Cache for 1 year with CDN optimization
	})
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