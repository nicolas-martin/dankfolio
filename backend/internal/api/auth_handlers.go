package api

import (
	"encoding/json"
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/errors"
)

func (r *Router) handleRegister() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var registerReq model.RegisterRequest
		if err := json.NewDecoder(req.Body).Decode(&registerReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		user, err := r.authService.RegisterUser(req.Context(), registerReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusCreated, user)
	}
}

func (r *Router) handleLogin() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var loginReq model.LoginRequest
		if err := json.NewDecoder(req.Body).Decode(&loginReq); err != nil {
			respondError(w, errors.NewValidationError("Invalid request body"))
			return
		}

		authResp, err := r.authService.Login(req.Context(), loginReq.Email, loginReq.Password)
		if err != nil {
			if err == errors.ErrorTypeAuth {
				respondError(w, errors.NewAuthError(err.Error()))
			} else {
				respondError(w, errors.NewInternalError(err))
			}
			return
		}

		respondJSON(w, http.StatusOK, authResp)
	}
}

func (r *Router) handleSocialLogin() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var socialReq struct {
			Provider string `json:"provider"`
			Token    string `json:"token"`
		}
		if err := json.NewDecoder(req.Body).Decode(&socialReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		authResp, err := r.authService.SocialLogin(req.Context(), socialReq.Provider, socialReq.Token)
		if err != nil {
			respondError(w, http.StatusUnauthorized, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, authResp)
	}
} 