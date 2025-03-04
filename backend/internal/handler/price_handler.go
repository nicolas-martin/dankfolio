package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/nicolas-martin/dankfolio/internal/service/price"
)

type PriceHandler struct {
	priceService *price.Service
}

func NewPriceHandler(priceService *price.Service) *PriceHandler {
	return &PriceHandler{
		priceService: priceService,
	}
}

func (h *PriceHandler) GetOHLCV(c *gin.Context) {
	baseAddress := c.Query("base_address")
	quoteAddress := c.Query("quote_address")
	if baseAddress == "" || quoteAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "base_address and quote_address are required"})
		return
	}

	ohlcvType := c.DefaultQuery("type", "1h")
	timeFrom := c.DefaultQuery("time_from", "0")
	timeTo := c.DefaultQuery("time_to", "0")

	timeFromInt, err := strconv.ParseInt(timeFrom, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid time_from parameter"})
		return
	}

	timeToInt, err := strconv.ParseInt(timeTo, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid time_to parameter"})
		return
	}

	response, err := h.priceService.GetOHLCV(c.Request.Context(), baseAddress, quoteAddress, ohlcvType, timeFromInt, timeToInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}
