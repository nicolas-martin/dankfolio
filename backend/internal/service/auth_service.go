package service

import (
	"context"
	"fmt"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gagliardetto/solana-go"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	db          db.DB
	jwtSecret   []byte
	tokenExpiry time.Duration
}

func NewAuthService(db db.DB, jwtSecret string) *AuthService {
	return &AuthService{
		db:          db,
		jwtSecret:   []byte(jwtSecret),
		tokenExpiry: 24 * time.Hour,
	}
}

func (s *AuthService) RegisterUser(ctx context.Context, req model.RegisterRequest) (*model.User, error) {
	// Check if user already exists
	exists, err := s.userExists(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("user with email %s already exists", req.Email)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create user
	user := &model.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now(),
	}

	err = s.createUser(ctx, tx, user)
	if err != nil {
		return nil, err
	}

	// Create wallet for user
	err = s.createUserWallet(ctx, tx, user.ID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return user, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*model.AuthResponse, error) {
	user, err := s.getUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(password),
	); err != nil {
		return nil, fmt.Errorf("invalid password")
	}

	token, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

func (s *AuthService) SocialLogin(ctx context.Context, provider string, token string) (*model.AuthResponse, error) {
	// Verify token with provider
	socialUser, err := s.verifySocialToken(ctx, provider, token)
	if err != nil {
		return nil, err
	}

	// Check if user exists
	user, err := s.getUserByEmail(ctx, socialUser.Email)
	if err != nil {
		// Create new user if not exists
		user, err = s.createSocialUser(ctx, socialUser)
		if err != nil {
			return nil, err
		}
	}

	// Generate JWT
	jwtToken, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		User:  user,
		Token: jwtToken,
	}, nil
}

func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*model.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID := claims["user_id"].(string)
		return s.getUserByID(ctx, userID)
	}

	return nil, fmt.Errorf("invalid token claims")
}

func (s *AuthService) generateJWT(user *model.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(s.tokenExpiry).Unix(),
	})

	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) userExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
	`, email).Scan(&exists)

	if err != nil {
		return false, fmt.Errorf("failed to check user existence: %w", err)
	}

	return exists, nil
}

func (s *AuthService) createUser(ctx context.Context, tx pgx.Tx, user *model.User) error {
	var userID string
	var query string
	var args []interface{}

	if user.PasswordHash != "" {
		query = `
			INSERT INTO users (id, email, username, password_hash)
			VALUES ($1, $2, $3, $4)
			RETURNING id, created_at
		`
		args = []interface{}{user.ID, user.Email, user.Username, user.PasswordHash}
	} else {
		// For social users without password
		query = `
			INSERT INTO users (id, email, username)
			VALUES ($1, $2, $3)
			RETURNING id, created_at
		`
		args = []interface{}{user.ID, user.Email, user.Username}
	}

	err := tx.QueryRow(ctx, query, args...).Scan(&userID, &user.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	user.ID = userID
	return nil
}

func (s *AuthService) createUserWallet(ctx context.Context, tx pgx.Tx, userID string) error {
	// Generate a new keypair
	keypair, err := generateSolanaKeypair()
	if err != nil {
		return fmt.Errorf("failed to generate wallet keypair: %w", err)
	}

	// Encrypt the private key
	encryptedPrivateKey, err := encryptPrivateKey(keypair.PrivateKey)
	if err != nil {
		return fmt.Errorf("failed to encrypt private key: %w", err)
	}

	walletID := uuid.New().String()
	_, err = tx.Exec(ctx, `
		INSERT INTO wallets (id, user_id, public_key, private_key, encrypted_private_key, balance, created_at, last_updated)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, walletID, userID, keypair.PublicKey, keypair.PrivateKey, encryptedPrivateKey, 0.0, time.Now(), time.Now())

	if err != nil {
		return fmt.Errorf("failed to create user wallet: %w", err)
	}

	return nil
}

// Helper functions for wallet creation
type SolanaKeypair struct {
	PublicKey  string
	PrivateKey string
}

func generateSolanaKeypair() (*SolanaKeypair, error) {
	// Generate a new Solana keypair using the Solana SDK
	keypair := solana.NewWallet()
	if keypair == nil {
		return nil, fmt.Errorf("failed to generate Solana keypair")
	}

	return &SolanaKeypair{
		PublicKey:  keypair.PublicKey().String(),
		PrivateKey: keypair.PrivateKey.String(),
	}, nil
}

func encryptPrivateKey(privateKey string) (string, error) {
	// For testing purposes, just append a prefix
	// In production, this should use proper encryption like AES-GCM
	return "encrypted_" + privateKey, nil
}

func (s *AuthService) getUserByEmail(ctx context.Context, email string) (*model.User, error) {
	user := &model.User{}
	err := s.db.QueryRow(ctx, `
		SELECT id, email, username, password_hash, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (s *AuthService) getUserByID(ctx context.Context, userID string) (*model.User, error) {
	user := &model.User{}
	err := s.db.QueryRow(ctx, `
		SELECT id, email, username, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

type SocialUserInfo struct {
	Email     string
	Username  string
	AvatarURL string
}

func (s *AuthService) verifySocialToken(ctx context.Context, provider string, token string) (*SocialUserInfo, error) {
	// TODO: Implement social token verification with providers
	// This is a placeholder implementation
	return &SocialUserInfo{
		Email:     "user@example.com",
		Username:  "socialuser",
		AvatarURL: "https://example.com/avatar.jpg",
	}, nil
}

func (s *AuthService) createSocialUser(ctx context.Context, socialUser *SocialUserInfo) (*model.User, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create user
	user := &model.User{
		ID:       uuid.New().String(),
		Email:    socialUser.Email,
		Username: socialUser.Username,
	}

	err = s.createUser(ctx, tx, user)
	if err != nil {
		return nil, err
	}

	// Create wallet for user
	err = s.createUserWallet(ctx, tx, user.ID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return user, nil
}
