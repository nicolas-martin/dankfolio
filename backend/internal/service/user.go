package service

import (
	"context"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type UserService struct {
	// Add dependencies here
}

func NewUserService() *UserService {
	return &UserService{}
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*model.User, error) {
	// Implement get profile logic here
	return &model.User{
		ID:       userID,
		Username: "test_user",
	}, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, userID string, req model.ProfileUpdateRequest) (*model.User, error) {
	// Implement update profile logic here
	return &model.User{
		ID:       userID,
		Username: req.Username,
	}, nil
}

func (s *UserService) ChangePassword(ctx context.Context, userID string, req model.ChangePasswordRequest) error {
	// Implement change password logic here
	return nil
}
