package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

func (r *Router) handlePreviewTrade() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var tradeReq model.TradeRequest
		if err := json.NewDecoder(req.Body).Decode(&tradeReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		user := getUserFromContext(req.Context())
		tradeReq.UserID = user.ID

		preview, err := r.tradeService.PreviewTrade(req.Context(), tradeReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, preview)
	}
}

func (r *Router) handleExecuteTrade() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var tradeReq model.TradeRequest
		if err := json.NewDecoder(req.Body).Decode(&tradeReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		user := getUserFromContext(req.Context())
		tradeReq.UserID = user.ID

		trade, err := r.tradeService.ExecuteTrade(req.Context(), tradeReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, trade)
	}
}

func (r *Router) handleGetTradeHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())

		trades, err := r.tradeService.GetTradeHistory(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, trades)
	}
}

func (r *TradeRouter) PreviewTrade(c *gin.Context) {
	user := c.MustGet("user").(*model.User)

	var req model.TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid request: %v", err)})
		return
	}

	req.UserID = user.ID // Using UUID directly

	preview, err := r.tradeService.PreviewTrade(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to preview trade: %v", err)})
		return
	}

	c.JSON(http.StatusOK, preview)
}

func (r *TradeRouter) ExecuteTrade(c *gin.Context) {
	user := c.MustGet("user").(*model.User)

	var req model.TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid request: %v", err)})
		return
	}

	req.UserID = user.ID // Using UUID directly

	trade, err := r.tradeService.ExecuteTrade(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to execute trade: %v", err)})
		return
	}

	c.JSON(http.StatusOK, trade)
}
