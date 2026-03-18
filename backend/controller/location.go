package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"p2p_marketplace/backend/model"

	"github.com/gofiber/fiber/v2"
)

type psgcItem struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

func GetProvinces(c *fiber.Ctx) error {
	items, err := fetchPSGCList("https://psgc.gitlab.io/api/provinces/")
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to fetch provinces", err)
	}

	return SendSuccessResponse(c, 200, "Provinces fetched successfully", items)
}

func GetCitiesMunicipalities(c *fiber.Ctx) error {
	provinceCode := strings.TrimSpace(c.Query("provinceCode"))
	if provinceCode == "" {
		return SendErrorResponse(c, 400, "provinceCode is required", nil)
	}

	endpoint := fmt.Sprintf("https://psgc.gitlab.io/api/provinces/%s/cities-municipalities/", url.PathEscape(provinceCode))
	items, err := fetchPSGCList(endpoint)
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to fetch cities/municipalities", err)
	}

	return SendSuccessResponse(c, 200, "Cities and municipalities fetched successfully", items)
}

func GetBarangays(c *fiber.Ctx) error {
	cityCode := strings.TrimSpace(c.Query("cityCode"))
	if cityCode == "" {
		return SendErrorResponse(c, 400, "cityCode is required", nil)
	}

	endpoint := fmt.Sprintf("https://psgc.gitlab.io/api/cities-municipalities/%s/barangays/", url.PathEscape(cityCode))
	items, err := fetchPSGCList(endpoint)
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to fetch barangays", err)
	}

	return SendSuccessResponse(c, 200, "Barangays fetched successfully", items)
}

func fetchPSGCList(endpoint string) ([]model.LocationOption, error) {
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Get(endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("PSGC returned status %d", resp.StatusCode)
	}

	var parsed []psgcItem
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	items := make([]model.LocationOption, 0, len(parsed))
	for _, item := range parsed {
		name := strings.TrimSpace(item.Name)
		code := strings.TrimSpace(item.Code)
		if name == "" || code == "" {
			continue
		}
		items = append(items, model.LocationOption{Code: code, Name: name})
	}

	return items, nil
}
