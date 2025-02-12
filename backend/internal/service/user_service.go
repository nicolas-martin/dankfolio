package service

import (
	"context"
	"fmt"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*model.Profile, error) {
	return s.userRepo.GetProfile(ctx, userID)
}

func (s *UserService) UpdateProfile(ctx context.Context, userID string, req model.ProfileUpdateRequest) (*model.Profile, error) {
	err := s.userRepo.UpdateProfile(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	return s.GetProfile(ctx, userID)
}

func (s *UserService) ChangePassword(ctx context.Context, userID string, req model.ChangePasswordRequest) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return fmt.Errorf("invalid current password")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	return s.userRepo.UpdatePassword(ctx, userID, string(newHash))
}

func (s *UserService) UpdateNotificationSettings(ctx context.Context, userID string, settings model.NotificationSettings) (*model.NotificationSettings, error) {
	return s.userRepo.UpdateNotificationSettings(ctx, userID, settings)
}
