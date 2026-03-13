package repository

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"

	"gorm.io/gorm"
)

func CreateListing(userId string, body model.CreateListingBody) (string, error) {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return "", tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	categoryId, err := getOrCreateCategoryIDTx(tx, body.Category)
	if err != nil {
		tx.Rollback()
		return "", err
	}

	highlightsJson, err := json.Marshal(body.Highlights)
	if err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to encode highlights")
	}

	includedJson, err := json.Marshal(body.Inclusions)
	if err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to encode inclusions")
	}

	if strings.EqualFold(body.Type, "rent") {
		includedJson, err = json.Marshal(body.Amenities)
		if err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to encode amenities")
		}
	}

	listingType, err := mapListingType(body.Type)
	if err != nil {
		tx.Rollback()
		return "", err
	}

	var listingId string
	insertListingQuery := `
		INSERT INTO public.listings (
			user_id,
			listing_type,
			title,
			description,
			category_id,
			price,
			price_unit,
			included,
			highlights,
			location_barangay,
			location_city,
			location_province
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id
	`
	if err := tx.Raw(
		insertListingQuery,
		userId,
		listingType,
		body.Title,
		body.Description,
		categoryId,
		body.Price,
		body.PriceUnit,
		string(includedJson),
		string(highlightsJson),
		body.LocationBrgy,
		body.LocationCity,
		body.LocationProv,
	).Scan(&listingId).Error; err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to create listing")
	}

	if err := insertTypeDetailsTx(tx, listingId, body); err != nil {
		tx.Rollback()
		return "", err
	}

	if err := saveListingImagesTx(tx, listingId, body.Images); err != nil {
		tx.Rollback()
		return "", err
	}

	if err := tx.Commit().Error; err != nil {
		return "", err
	}

	return listingId, nil
}

func getOrCreateCategoryIDTx(tx *gorm.DB, category string) (string, error) {
	category = strings.TrimSpace(category)
	if category == "" {
		return "", fmt.Errorf("Category is required")
	}

	var categoryId string
	selectCategoryQuery := `
		SELECT id
		FROM public.categories
		WHERE LOWER(name) = LOWER($1) AND parent_id IS NULL
		LIMIT 1
	`
	result := tx.Raw(selectCategoryQuery, category).Scan(&categoryId)
	if result.Error != nil {
		return "", fmt.Errorf("Failed to retrieve category")
	}
	if result.RowsAffected > 0 {
		return categoryId, nil
	}

	insertCategoryQuery := `
		INSERT INTO public.categories (name, parent_id)
		VALUES ($1, NULL)
		RETURNING id
	`
	if err := tx.Raw(insertCategoryQuery, category).Scan(&categoryId).Error; err != nil {
		return "", fmt.Errorf("Failed to create category")
	}
	return categoryId, nil
}

func insertTypeDetailsTx(tx *gorm.DB, listingId string, body model.CreateListingBody) error {
	switch strings.ToLower(strings.TrimSpace(body.Type)) {
	case "sell":
		if body.SellData == nil {
			return fmt.Errorf("Missing sell data")
		}
		condition, err := mapCondition(body.SellData.Condition)
		if err != nil {
			return err
		}
		deliveryMethod, err := mapDeliveryMethod(body.SellData.DeliveryMethod)
		if err != nil {
			return err
		}
		insertSellQuery := `
			INSERT INTO public.listing_sell_details (listing_id, condition, delivery_method)
			VALUES ($1,$2,$3)
		`
		return tx.Exec(insertSellQuery, listingId, condition, deliveryMethod).Error
	case "rent":
		if body.RentData == nil {
			return fmt.Errorf("Missing rent data")
		}
		minPeriod, err := parseMinRentalPeriod(body.RentData.MinPeriod)
		if err != nil {
			return err
		}
		deliveryMethod, err := mapDeliveryMethod(body.RentData.DeliveryMethod)
		if err != nil {
			return err
		}

		var availableFrom any = nil
		if strings.TrimSpace(body.RentData.Availability) != "" {
			parsedDate, err := time.Parse("2006-01-02", body.RentData.Availability)
			if err != nil {
				return fmt.Errorf("Invalid availability date")
			}
			availableFrom = parsedDate
		}

		insertRentQuery := `
			INSERT INTO public.listing_rent_details (listing_id, min_rental_period, available_from, deposit, delivery_method)
			VALUES ($1,$2,$3,$4,$5)
		`
		return tx.Exec(insertRentQuery, listingId, minPeriod, availableFrom, body.RentData.Deposit, deliveryMethod).Error
	case "service":
		if body.ServiceData == nil {
			return fmt.Errorf("Missing service data")
		}
		insertServiceQuery := `
			INSERT INTO public.listing_service_details (listing_id, turnaround_time, service_area)
			VALUES ($1,$2,$3)
		`
		return tx.Exec(insertServiceQuery, listingId, body.ServiceData.Turnaround, body.ServiceData.ServiceArea).Error
	default:
		return fmt.Errorf("Invalid listing type")
	}
}

func mapListingType(listingType string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(listingType)) {
	case "sell":
		return "SELL", nil
	case "rent":
		return "RENT", nil
	case "service":
		return "SERVICE", nil
	default:
		return "", fmt.Errorf("Invalid listing type")
	}
}

func mapCondition(condition string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(condition)) {
	case "new":
		return "NEW", nil
	case "like new":
		return "LIKE_NEW", nil
	case "lightly used":
		return "LIGHTLY_USED", nil
	case "well used":
		return "WELL_USED", nil
	case "heavily used":
		return "HEAVILY_USED", nil
	default:
		return "", fmt.Errorf("Invalid condition")
	}
}

func mapDeliveryMethod(method string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(method)) {
	case "meet-up only":
		return "MEETUP", nil
	case "delivery available":
		return "SHIPPING", nil
	case "meet-up or delivery":
		return "BOTH", nil
	default:
		return "", fmt.Errorf("Invalid delivery method")
	}
}

func parseMinRentalPeriod(minPeriod string) (int, error) {
	cleaned := strings.TrimSpace(minPeriod)
	if cleaned == "" {
		return 0, fmt.Errorf("Minimum rental period is required")
	}

	r := regexp.MustCompile(`\d+`)
	num := r.FindString(cleaned)
	if num == "" {
		return 0, fmt.Errorf("Minimum rental period must contain a number")
	}

	parsed, err := strconv.Atoi(num)
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("Invalid minimum rental period")
	}
	return parsed, nil
}

func saveListingImagesTx(tx *gorm.DB, listingId string, images []model.ListingImageBody) error {
	if len(images) == 0 {
		return fmt.Errorf("At least one image is required")
	}

	baseDir := filepath.Join("uploads", "listings")
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return fmt.Errorf("Failed to create upload directory")
	}

	insertImageQuery := `
		INSERT INTO public.listing_images (listing_id, image_url, is_primary)
		VALUES ($1,$2,$3)
	`

	for i, img := range images {
		if strings.TrimSpace(img.Data) == "" {
			return fmt.Errorf("Image payload is empty")
		}

		ext, err := extFromMime(img.MimeType)
		if err != nil {
			return err
		}

		decoded, err := base64.StdEncoding.DecodeString(img.Data)
		if err != nil {
			return fmt.Errorf("Failed to decode image payload")
		}

		randomName, err := randomHex(10)
		if err != nil {
			return fmt.Errorf("Failed to generate image filename")
		}

		fileName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randomName, ext)
		filePath := filepath.Join(baseDir, fileName)
		if err := os.WriteFile(filePath, decoded, 0644); err != nil {
			return fmt.Errorf("Failed to save image file")
		}

		imageURL := fmt.Sprintf("/uploads/listings/%s", fileName)
		isPrimary := i == 0
		if err := tx.Exec(insertImageQuery, listingId, imageURL, isPrimary).Error; err != nil {
			return fmt.Errorf("Failed to save listing image reference")
		}
	}

	return nil
}

func extFromMime(mimeType string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/jpeg", "image/jpg":
		return ".jpg", nil
	case "image/png":
		return ".png", nil
	case "image/webp":
		return ".webp", nil
	default:
		return "", fmt.Errorf("Unsupported image type")
	}
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
