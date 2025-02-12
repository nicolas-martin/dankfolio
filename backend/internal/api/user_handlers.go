package api

import (
	"encoding/json"
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/errors"
)

func (r *Router) handleGetProfile() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		profile, err := r.userService.GetProfile(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, profile)
	}
}

func (r *Router) handleUpdateProfile() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		var updateReq model.ProfileUpdateRequest
		if err := json.NewDecoder(req.Body).Decode(&updateReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		profile, err := r.userService.UpdateProfile(req.Context(), user.ID, updateReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, profile)
	}
}

func (r *Router) handleChangePassword() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		var pwdReq model.ChangePasswordRequest
		if err := json.NewDecoder(req.Body).Decode(&pwdReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if err := r.userService.ChangePassword(req.Context(), user.ID, pwdReq); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "Password updated successfully"})
	}
}

func (r *Router) handleUpdateNotificationSettings() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		var settings model.NotificationSettings
		if err := json.NewDecoder(req.Body).Decode(&settings); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		updatedSettings, err := r.userService.UpdateNotificationSettings(req.Context(), user.ID, settings)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, updatedSettings)
	}
} 