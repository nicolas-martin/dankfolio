package api

import (
	"encoding/json"
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/errors"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type AuthHandlers struct {
	authService *service.AuthService
}

func NewAuthHandlers(authService *service.AuthService) *AuthHandlers {
	return &AuthHandlers{
		authService: authService,
	}
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

func (h *AuthHandlers) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	registerReq := model.RegisterRequest{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
	}

	_, err := h.authService.RegisterUser(r.Context(), registerReq)
	if err != nil {
		http.Error(w, "Failed to register user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	authResp, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, AuthResponse{
		Token: authResp.Token,
		User:  authResp.User,
	})
}

func (h *AuthHandlers) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	authResp, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	respondJSON(w, http.StatusOK, AuthResponse{
		Token: authResp.Token,
		User:  authResp.User,
	})
}

func (h *AuthHandlers) SocialLogin(w http.ResponseWriter, r *http.Request) {
	var socialReq struct {
		Provider string `json:"provider"`
		Token    string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&socialReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	authResp, err := h.authService.SocialLogin(r.Context(), socialReq.Provider, socialReq.Token)
	if err != nil {
		var status int
		var message string

		switch e := err.(type) {
		case *errors.AppError:
			status = e.Code
			message = e.Message
		default:
			status = http.StatusUnauthorized
			message = err.Error()
		}

		http.Error(w, message, status)
		return
	}

	respondJSON(w, http.StatusOK, authResp)
}
