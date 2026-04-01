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

	if err := saveListingTimeWindowsTx(tx, listingId, body.TimeWindows); err != nil {
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
			INSERT INTO public.listing_rent_details (listing_id, min_rental_period, available_from, deposit, delivery_method, days_off)
			VALUES ($1,$2,$3,$4,$5,$6)
		`
		return tx.Exec(insertRentQuery, listingId, minPeriod, availableFrom, body.RentData.Deposit, deliveryMethod, strings.TrimSpace(body.RentData.DaysOff)).Error
	case "service":
		if body.ServiceData == nil {
			return fmt.Errorf("Missing service data")
		}

		if strings.TrimSpace(body.ServiceData.Availability) == "" {
			return fmt.Errorf("Availability date is required")
		}

		parsedDate, err := time.Parse("2006-01-02", body.ServiceData.Availability)
		if err != nil {
			return fmt.Errorf("Invalid availability date")
		}

		insertServiceQuery := `
			INSERT INTO public.listing_service_details (listing_id, available_from, turnaround_time, service_area, arrangements, days_off)
			VALUES ($1,$2,$3,$4,$5,$6)
		`
		return tx.Exec(
			insertServiceQuery,
			listingId,
			parsedDate,
			body.ServiceData.Turnaround,
			body.ServiceData.ServiceArea,
			body.ServiceData.Arrangement,
			strings.TrimSpace(body.ServiceData.DaysOff),
		).Error
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

func normalizeTimeWindow(value string) (string, error) {
	timeValue := strings.TrimSpace(value)
	if timeValue == "" {
		return "", fmt.Errorf("Time window start and end are required")
	}

	if len(timeValue) == 5 {
		timeValue += ":00"
	}

	parsed, err := time.Parse("15:04:05", timeValue)
	if err != nil {
		return "", fmt.Errorf("Invalid time window value")
	}

	return parsed.Format("15:04:05"), nil
}

func saveListingTimeWindowsTx(tx *gorm.DB, listingId string, windows []model.ListingTimeWindow) error {
	if len(windows) == 0 {
		return nil
	}

	insertWindowQuery := `
		INSERT INTO public.listing_time_windows (listing_id, start_time, end_time)
		VALUES ($1, $2, $3)
	`

	for _, window := range windows {
		startTime, err := normalizeTimeWindow(window.StartTime)
		if err != nil {
			return err
		}

		endTime, err := normalizeTimeWindow(window.EndTime)
		if err != nil {
			return err
		}

		if startTime >= endTime {
			return fmt.Errorf("End time must be later than start time")
		}

		if err := tx.Exec(insertWindowQuery, listingId, startTime, endTime).Error; err != nil {
			return fmt.Errorf("Failed to save listing time windows")
		}
	}

	return nil
}

func GetListingEditDataById(userId, listingId string) (model.ListingEditFromDb, error) {
	db := middleware.DBConn
	var listing model.ListingEditFromDb

	selectQuery := `
		SELECT
			l.id,
			LOWER(l.listing_type::text) AS type,
			l.title,
			COALESCE(c.name, 'Others') AS category,
			l.price,
			l.price_unit,
			l.description,
			COALESCE(l.highlights, '[]') AS highlights,
			COALESCE(l.included, '[]') AS included,
			COALESCE(l.location_barangay, '') AS location_barangay,
			COALESCE(l.location_city, '') AS location_city,
			COALESCE(l.location_province, '') AS location_province,
			COALESCE(lsd.condition::text, '') AS condition,
			COALESCE(lsd.delivery_method::text, lrd.delivery_method::text, '') AS delivery_method,
			COALESCE(lrd.min_rental_period, 0) AS min_rental_period,
			COALESCE(lrd.available_from, lsrv.available_from) AS available_from,
			COALESCE(lrd.days_off, lsrv.days_off, '[]') AS days_off,
			COALESCE(lrd.deposit, '') AS deposit,
			COALESCE(lsrv.turnaround_time, '') AS turnaround_time,
			COALESCE(lsrv.service_area, '') AS service_area,
			COALESCE(lsrv.arrangements, '') AS arrangements,
			LOWER(l.status::text) AS status
		FROM public.listings l
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.listing_sell_details lsd ON lsd.listing_id = l.id
		LEFT JOIN public.listing_rent_details lrd ON lrd.listing_id = l.id
		LEFT JOIN public.listing_service_details lsrv ON lsrv.listing_id = l.id
		WHERE l.id = $1
			AND l.user_id = $2
		LIMIT 1
	`

	result := db.Raw(selectQuery, listingId, userId).Scan(&listing)
	if result.Error != nil {
		return listing, fmt.Errorf("Failed to retrieve listing edit data")
	}
	if result.RowsAffected == 0 {
		return listing, fmt.Errorf("Listing not found or unauthorized")
	}

	return listing, nil
}

func UpdateListing(userId, listingId string, body model.CreateListingBody) error {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var currentType string
	var currentSellStatus string
	ownerCheckQuery := `
		SELECT
			LOWER(l.listing_type::text) AS listing_type,
			LOWER(COALESCE(l.status::text, '')) AS sell_status
		FROM public.listings l
		WHERE l.id = $1 AND l.user_id = $2
		LIMIT 1
	`
	ownerCheckResult := tx.Raw(ownerCheckQuery, listingId, userId).Row()
	if err := ownerCheckResult.Scan(&currentType, &currentSellStatus); err != nil {
		tx.Rollback()
		return fmt.Errorf("Listing not found or unauthorized")
	}

	if currentType == "sell" && strings.EqualFold(strings.TrimSpace(currentSellStatus), "SOLD") {
		tx.Rollback()
		return fmt.Errorf("Sold listings can no longer be edited")
	}

	bodyType := strings.ToLower(strings.TrimSpace(body.Type))
	if bodyType == "" {
		bodyType = currentType
	}
	if bodyType != strings.ToLower(strings.TrimSpace(currentType)) {
		tx.Rollback()
		return fmt.Errorf("Listing type cannot be changed")
	}

	categoryId, err := getOrCreateCategoryIDTx(tx, body.Category)
	if err != nil {
		tx.Rollback()
		return err
	}

	highlightsJson, err := json.Marshal(body.Highlights)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to encode highlights")
	}

	includedJson, err := json.Marshal(body.Inclusions)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to encode inclusions")
	}

	if bodyType == "rent" {
		includedJson, err = json.Marshal(body.Amenities)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to encode amenities")
		}
	}

	updateListingQuery := `
		UPDATE public.listings
		SET
			title = $1,
			description = $2,
			category_id = $3,
			price = $4,
			price_unit = $5,
			included = $6,
			highlights = $7,
			location_barangay = $8,
			location_city = $9,
			location_province = $10,
			updated_at = NOW()
		WHERE id = $11 AND user_id = $12
	`

	if err := tx.Exec(
		updateListingQuery,
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
		listingId,
		userId,
	).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to update listing")
	}

	if err := updateTypeDetailsTx(tx, listingId, body, bodyType); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Exec(`DELETE FROM public.listing_time_windows WHERE listing_id = $1`, listingId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove previous listing time windows")
	}

	if err := saveListingTimeWindowsTx(tx, listingId, body.TimeWindows); err != nil {
		tx.Rollback()
		return err
	}

	if len(body.Images) > 0 {
		if err := deleteListingImagesTx(tx, listingId); err != nil {
			tx.Rollback()
			return err
		}
		if err := saveListingImagesTx(tx, listingId, body.Images); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func updateTypeDetailsTx(tx *gorm.DB, listingId string, body model.CreateListingBody, listingType string) error {
	switch listingType {
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
		updateSellQuery := `
			UPDATE public.listing_sell_details
			SET condition = $1, delivery_method = $2
			WHERE listing_id = $3
		`
		res := tx.Exec(updateSellQuery, condition, deliveryMethod, listingId)
		if res.Error != nil {
			return fmt.Errorf("Failed to update sell details")
		}
		if res.RowsAffected == 0 {
			insertSellQuery := `
				INSERT INTO public.listing_sell_details (listing_id, condition, delivery_method)
				VALUES ($1,$2,$3)
			`
			if err := tx.Exec(insertSellQuery, listingId, condition, deliveryMethod).Error; err != nil {
				return fmt.Errorf("Failed to update sell details")
			}
		}
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

		updateRentQuery := `
			UPDATE public.listing_rent_details
			SET min_rental_period = $1, available_from = $2, deposit = $3, delivery_method = $4, days_off = $5
			WHERE listing_id = $6
		`
		res := tx.Exec(updateRentQuery, minPeriod, availableFrom, body.RentData.Deposit, deliveryMethod, strings.TrimSpace(body.RentData.DaysOff), listingId)
		if res.Error != nil {
			return fmt.Errorf("Failed to update rent details")
		}
		if res.RowsAffected == 0 {
			insertRentQuery := `
				INSERT INTO public.listing_rent_details (listing_id, min_rental_period, available_from, deposit, delivery_method, days_off)
				VALUES ($1,$2,$3,$4,$5,$6)
			`
			if err := tx.Exec(insertRentQuery, listingId, minPeriod, availableFrom, body.RentData.Deposit, deliveryMethod, strings.TrimSpace(body.RentData.DaysOff)).Error; err != nil {
				return fmt.Errorf("Failed to update rent details")
			}
		}
	case "service":
		if body.ServiceData == nil {
			return fmt.Errorf("Missing service data")
		}

		if strings.TrimSpace(body.ServiceData.Availability) == "" {
			return fmt.Errorf("Availability date is required")
		}

		parsedDate, err := time.Parse("2006-01-02", body.ServiceData.Availability)
		if err != nil {
			return fmt.Errorf("Invalid availability date")
		}

		updateServiceQuery := `
			UPDATE public.listing_service_details
			SET available_from = $1, turnaround_time = $2, service_area = $3, arrangements = $4, days_off = $5
			WHERE listing_id = $6
		`
		res := tx.Exec(
			updateServiceQuery,
			parsedDate,
			body.ServiceData.Turnaround,
			body.ServiceData.ServiceArea,
			body.ServiceData.Arrangement,
			strings.TrimSpace(body.ServiceData.DaysOff),
			listingId,
		)
		if res.Error != nil {
			return fmt.Errorf("Failed to update service details")
		}
		if res.RowsAffected == 0 {
			insertServiceQuery := `
				INSERT INTO public.listing_service_details (listing_id, available_from, turnaround_time, service_area, arrangements, days_off)
				VALUES ($1,$2,$3,$4,$5,$6)
			`
			if err := tx.Exec(
				insertServiceQuery,
				listingId,
				parsedDate,
				body.ServiceData.Turnaround,
				body.ServiceData.ServiceArea,
				body.ServiceData.Arrangement,
				strings.TrimSpace(body.ServiceData.DaysOff),
			).Error; err != nil {
				return fmt.Errorf("Failed to update service details")
			}
		}
	default:
		return fmt.Errorf("Invalid listing type")
	}

	return nil
}

func deleteListingImagesTx(tx *gorm.DB, listingId string) error {
	rows := make([]struct {
		ImageURL string `gorm:"column:image_url"`
	}, 0)

	if err := tx.Raw(`SELECT image_url FROM public.listing_images WHERE listing_id = $1`, listingId).Scan(&rows).Error; err != nil {
		return fmt.Errorf("Failed to retrieve existing listing images")
	}

	for _, row := range rows {
		url := strings.TrimSpace(row.ImageURL)
		if !strings.HasPrefix(url, "/uploads/") {
			continue
		}

		relPath := strings.TrimPrefix(url, "/")
		if err := os.Remove(filepath.Clean(relPath)); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("Failed to remove previous listing image")
		}
	}

	if err := tx.Exec(`DELETE FROM public.listing_images WHERE listing_id = $1`, listingId).Error; err != nil {
		return fmt.Errorf("Failed to remove previous listing image references")
	}

	return nil
}

func DeleteListing(userId, listingId string) error {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var existingId string
	var listingType string
	var sellStatus string
	ownerCheckQuery := `
		SELECT
			l.id,
			LOWER(l.listing_type::text) AS listing_type,
			LOWER(COALESCE(l.status::text, '')) AS sell_status
		FROM public.listings l
		WHERE l.id = $1 AND l.user_id = $2
		LIMIT 1
	`
	ownerCheckResult := tx.Raw(ownerCheckQuery, listingId, userId).Row()
	if err := ownerCheckResult.Scan(&existingId, &listingType, &sellStatus); err != nil {
		tx.Rollback()
		return fmt.Errorf("Listing not found or unauthorized")
	}

	if listingType == "sell" && strings.EqualFold(strings.TrimSpace(sellStatus), "SOLD") {
		tx.Rollback()
		return fmt.Errorf("Sold listings can no longer be removed")
	}

	if err := tx.Exec(`DELETE FROM public.bookmarks WHERE listing_id = $1`, listingId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove listing bookmarks")
	}

	if err := tx.Exec(`DELETE FROM public.listing_sell_details WHERE listing_id = $1`, listingId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove listing sell details")
	}
	if err := tx.Exec(`DELETE FROM public.listing_rent_details WHERE listing_id = $1`, listingId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove listing rent details")
	}
	if err := tx.Exec(`DELETE FROM public.listing_service_details WHERE listing_id = $1`, listingId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove listing service details")
	}

	if err := deleteListingImagesTx(tx, listingId); err != nil {
		tx.Rollback()
		return err
	}

	deleteListingQuery := `
		DELETE FROM public.listings
		WHERE id = $1 AND user_id = $2
	`
	deleteResult := tx.Exec(deleteListingQuery, listingId, userId)
	if deleteResult.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove listing")
	}
	if deleteResult.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Listing not found or unauthorized")
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func MarkListingAsComplete(userId, listingId string) ([]string, bool, error) {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return nil, false, tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var ownerId string
	var listingType string
	var sellStatus string

	checkQuery := `
		SELECT
			l.user_id::text AS owner_id,
			LOWER(l.listing_type::text) AS listing_type,
			COALESCE(l.status::text, 'AVAILABLE') AS sell_status
		FROM public.listings l
		WHERE l.id = $1
		LIMIT 1
	`

	row := tx.Raw(checkQuery, listingId).Row()
	if err := row.Scan(&ownerId, &listingType, &sellStatus); err != nil {
		tx.Rollback()
		return nil, false, fmt.Errorf("Listing not found")
	}

	if strings.TrimSpace(ownerId) != strings.TrimSpace(userId) {
		tx.Rollback()
		return nil, false, fmt.Errorf("Only the seller can complete this listing transaction")
	}

	var confirmedCount int
	confirmedQuery := `
		SELECT COUNT(*)
		FROM public.listing_transactions
		WHERE listing_id = $1
			AND status = 'CONFIRMED'
	`
	if err := tx.Raw(confirmedQuery, listingId).Scan(&confirmedCount).Error; err != nil {
		tx.Rollback()
		return nil, false, fmt.Errorf("Failed to verify listing transaction")
	}
	if confirmedCount == 0 {
		tx.Rollback()
		return nil, false, fmt.Errorf("A confirmed transaction is required before completing this listing transaction")
	}

	if listingType == "sell" && strings.EqualFold(strings.TrimSpace(sellStatus), "SOLD") {
		tx.Rollback()
		return nil, false, fmt.Errorf("Listing is already marked as sold")
	}

	affectedRows := make([]struct {
		ConversationId string `gorm:"column:conversation_id"`
		BuyerId        string `gorm:"column:buyer_id"`
	}, 0)
	affectedQuery := `
		SELECT DISTINCT
			c.id::text AS conversation_id,
			c.buyer_id::text AS buyer_id
		FROM public.listing_transactions lt
		JOIN public.conversations c
			ON c.listing_id = lt.listing_id
			AND c.buyer_id = lt.client_id
		WHERE lt.listing_id = $1
			AND lt.status = 'CONFIRMED'
	`
	if err := tx.Raw(affectedQuery, listingId).Scan(&affectedRows).Error; err != nil {
		tx.Rollback()
		return nil, false, fmt.Errorf("Failed to resolve confirmed transaction conversation")
	}

	actorFirstName, err := getUserFirstNameTx(tx, userId)
	if err != nil {
		tx.Rollback()
		return nil, false, err
	}

	actionContent := fmt.Sprintf("__SOLD_ACTION__:%s completed the transaction", actorFirstName)
	switch listingType {
	case "sell":
		actionContent = fmt.Sprintf("__SOLD_ACTION__:%s sold the item", actorFirstName)
	case "rent":
		actionContent = fmt.Sprintf("__SOLD_ACTION__:%s fulfilled the rental", actorFirstName)
	case "service":
		actionContent = fmt.Sprintf("__SOLD_ACTION__:%s fulfilled the service", actorFirstName)
	}
	affectedConversationIds := make([]string, 0, len(affectedRows))
	for _, row := range affectedRows {
		conversationId := strings.TrimSpace(row.ConversationId)
		buyerId := strings.TrimSpace(row.BuyerId)
		if conversationId == "" || buyerId == "" {
			continue
		}

		actionMessage, insertErr := insertConversationMessageTx(tx, conversationId, userId, buyerId, actionContent)
		if insertErr != nil {
			tx.Rollback()
			return nil, false, insertErr
		}

		updateConversationQuery := `
			UPDATE public.conversations
			SET
				last_message_id = $2,
				last_message = $3,
				last_message_sender_id = $4,
				last_message_at = $5,
				updated_at = now()
			WHERE id = $1
		`
		if err := tx.Exec(updateConversationQuery, conversationId, actionMessage.Id, strings.TrimSpace(actionMessage.Content), userId, actionMessage.CreatedAt).Error; err != nil {
			tx.Rollback()
			return nil, false, fmt.Errorf("Failed to update conversation metadata")
		}

		affectedConversationIds = append(affectedConversationIds, conversationId)
	}

	listingMarkedSold := false
	if listingType == "sell" {
		updateListingQuery := `
			UPDATE public.listings
			SET status = 'SOLD',
				updated_at = now()
			WHERE id = $1
		`
		if err := tx.Exec(updateListingQuery, listingId).Error; err != nil {
			tx.Rollback()
			return nil, false, fmt.Errorf("Failed to update listing status")
		}
		listingMarkedSold = true
	}

	completeTransactionQuery := `
		UPDATE public.listing_transactions
		SET
			status = 'COMPLETED',
			completed_at = now()
		WHERE listing_id = $1
			AND status = 'CONFIRMED'
	`
	if err := tx.Exec(completeTransactionQuery, listingId).Error; err != nil {
		tx.Rollback()
		return nil, false, fmt.Errorf("Failed to complete listing transaction")
	}

	if err := tx.Commit().Error; err != nil {
		return nil, false, err
	}

	return affectedConversationIds, listingMarkedSold, nil
}

func GetListingDetailById(listingId string) (model.ListingDetailFromDb, error) {
	db := middleware.DBConn
	var listing model.ListingDetailFromDb

	selectQuery := `
		SELECT
			l.id,
			l.user_id AS seller_id,
			l.title,
			l.price,
			l.price_unit,
			LOWER(l.listing_type::text) AS type,
			COALESCE(c.name, 'Others') AS category,
			l.category_id,
			l.description,
			l.location_city,
			l.location_province,
			l.created_at,
			l.view_count,
			LOWER(l.status::text) AS status,
			LOWER(COALESCE(l.status::text, '')) AS sell_status,
			COALESCE(l.highlights, '[]') AS highlights,
			COALESCE(l.included, '[]') AS included,
			COALESCE(lsd.condition::text, '') AS condition,
			COALESCE(lsd.delivery_method::text, lrd.delivery_method::text, '') AS delivery_method,
			COALESCE(lrd.min_rental_period, 0) AS min_rental_period,
			COALESCE(lrd.available_from, lsrv.available_from) AS available_from,
			COALESCE(lrd.days_off, lsrv.days_off, '[]') AS days_off,
			COALESCE(lrd.deposit, '') AS deposit,
			COALESCE(lsrv.turnaround_time, '') AS turnaround_time,
			COALESCE(lsrv.service_area, '') AS service_area,
			COALESCE(lsrv.arrangements, '') AS arrangements,
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS seller_name,
			COALESCE(u.profile_image_url, '') AS seller_profile_image_url,
			COALESCE(rv.avg_rating, 0) AS seller_rating,
			(u.verification_status = 'VERIFIED') AS seller_verified
		FROM public.listings l
		INNER JOIN public.users u ON u.id = l.user_id
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.listing_sell_details lsd ON lsd.listing_id = l.id
		LEFT JOIN public.listing_rent_details lrd ON lrd.listing_id = l.id
		LEFT JOIN public.listing_service_details lsrv ON lsrv.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT AVG(r.rating)::float AS avg_rating
			FROM public.reviews r
			WHERE r.reviewed_user_id = l.user_id
		) rv ON TRUE
		WHERE l.id = $1
		LIMIT 1
	`

	result := db.Raw(selectQuery, listingId).Scan(&listing)
	if result.Error != nil {
		return listing, fmt.Errorf("Failed to retrieve listing details")
	}
	if result.RowsAffected == 0 {
		return listing, fmt.Errorf("Listing not found")
	}

	return listing, nil
}

func GetListingImages(listingId string) ([]string, error) {
	db := middleware.DBConn
	rows := make([]struct {
		ImageURL string `gorm:"column:image_url"`
	}, 0)

	query := `
		SELECT image_url
		FROM public.listing_images
		WHERE listing_id = $1
		ORDER BY is_primary DESC, id ASC
	`

	if err := db.Raw(query, listingId).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve listing images")
	}

	images := make([]string, 0, len(rows))
	for _, row := range rows {
		images = append(images, row.ImageURL)
	}
	return images, nil
}

func GetListingTimeWindows(listingId string) ([]model.ListingTimeWindow, error) {
	db := middleware.DBConn
	rows := make([]model.ListingTimeWindow, 0)

	query := `
		SELECT
			TO_CHAR(start_time, 'HH24:MI:SS') AS start_time,
			TO_CHAR(end_time, 'HH24:MI:SS') AS end_time
		FROM public.listing_time_windows
		WHERE listing_id = $1
		ORDER BY start_time ASC
	`

	if err := db.Raw(query, listingId).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve listing time windows")
	}

	return rows, nil
}

func GetRelatedListings(listingId, categoryId, listingType, excludeUserId string) ([]model.ProfileListingFromDb, error) {
	db := middleware.DBConn
	related := make([]model.ProfileListingFromDb, 0)

	baseQuery := `
		SELECT
			l.id,
			l.title,
			l.price,
			l.price_unit,
			LOWER(l.listing_type::text) AS type,
			COALESCE(c.name, 'Others') AS category,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(l.location_city, ''), NULLIF(l.location_province, ''))) AS location,
			TO_CHAR(l.created_at, 'Mon DD, YYYY') AS posted_at,
			COALESCE(li.image_url, '') AS image_url,
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS seller_name,
			COALESCE(rv.avg_rating, 5.0) AS seller_rating,
			LOWER(l.status::text) AS status
		FROM public.listings l
		INNER JOIN public.users u ON u.id = l.user_id
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.listing_sell_details lsd ON lsd.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		LEFT JOIN LATERAL (
			SELECT AVG(r.rating)::float AS avg_rating
			FROM public.reviews r
			WHERE r.reviewed_user_id = l.user_id
		) rv ON TRUE
		WHERE l.id <> $1
			AND (l.category_id = $2 OR l.listing_type::text = $3)
			AND NOT (
				l.listing_type = 'SELL'
				AND l.status = 'SOLD'
			)
	`

	query := baseQuery
	args := []any{listingId, categoryId, strings.ToUpper(listingType)}
	if strings.TrimSpace(excludeUserId) != "" {
		query += "\n\t\t\tAND l.user_id <> $4"
		args = append(args, excludeUserId)
	}

	query += `
		ORDER BY l.created_at DESC
		LIMIT 8
	`

	if err := db.Raw(query, args...).Scan(&related).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve related listings")
	}

	return related, nil
}

func IsListingBookmarked(userId, listingId string) (bool, error) {
	db := middleware.DBConn

	var exists bool
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM public.bookmarks
			WHERE user_id = $1 AND listing_id = $2
		)
	`

	if err := db.Raw(query, userId, listingId).Scan(&exists).Error; err != nil {
		return false, fmt.Errorf("Failed to check bookmark status")
	}

	return exists, nil
}

func AddBookmark(userId, listingId string) error {
	db := middleware.DBConn

	query := `
		INSERT INTO public.bookmarks (user_id, listing_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, listing_id) DO NOTHING
	`

	if err := db.Exec(query, userId, listingId).Error; err != nil {
		return fmt.Errorf("Failed to bookmark listing")
	}

	return nil
}

func RemoveBookmark(userId, listingId string) error {
	db := middleware.DBConn

	query := `
		DELETE FROM public.bookmarks
		WHERE user_id = $1 AND listing_id = $2
	`

	if err := db.Exec(query, userId, listingId).Error; err != nil {
		return fmt.Errorf("Failed to remove bookmark")
	}

	return nil
}

func GetAllListings(excludeUserId string, filter model.ListingsFilter) ([]model.HomeListingFromDb, error) {
	db := middleware.DBConn
	listings := make([]model.HomeListingFromDb, 0)

	baseQuery := `
		SELECT
			l.id,
			l.title,
			l.price,
			COALESCE(l.price_unit, '') AS price_unit,
			LOWER(l.listing_type::text) AS type,
			LOWER(l.status::text) AS status,
			COALESCE(c.name, 'Others') AS category,
			COALESCE(lsd.condition::text, '') AS condition,
			COALESCE(l.location_city, '') AS location_city,
			COALESCE(l.location_province, '') AS location_province,
			l.created_at,
			COALESCE(li.image_url, '') AS image_url,
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS seller_name,
			COALESCE(rv.avg_rating, 5.0) AS seller_rating,
			(u.verification_status = 'VERIFIED') AS seller_is_pro
		FROM public.listings l
		INNER JOIN public.users u ON u.id = l.user_id
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.listing_sell_details lsd ON lsd.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		LEFT JOIN LATERAL (
			SELECT AVG(r.rating)::float AS avg_rating
			FROM public.reviews r
			WHERE r.reviewed_user_id = l.user_id
		) rv ON TRUE
		WHERE l.status <> 'HIDDEN'
			AND NOT (
				l.listing_type = 'SELL'
				AND l.status = 'SOLD'
			)
	`

	query := baseQuery
	args := make([]any, 0)
	addArg := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}

	if strings.TrimSpace(excludeUserId) != "" {
		query += "\n\t\t\tAND l.user_id <> " + addArg(excludeUserId)
	}

	listingType := strings.ToLower(strings.TrimSpace(filter.Type))
	if listingType != "" && listingType != "all" {
		query += "\n\t\t\tAND LOWER(l.listing_type::text) = " + addArg(listingType)
	}

	keyword := strings.ToLower(strings.TrimSpace(filter.Keyword))
	if keyword != "" {
		query += "\n\t\t\tAND LOWER(l.title) LIKE " + addArg("%"+keyword+"%")
	}

	category := strings.ToLower(strings.TrimSpace(filter.Category))
	if category != "" && category != "all categories" {
		query += "\n\t\t\tAND LOWER(COALESCE(c.name, 'Others')) = " + addArg(category)
	}

	conditionRaw := strings.TrimSpace(filter.Condition)
	if conditionRaw != "" && !strings.EqualFold(conditionRaw, "Any Condition") {
		conditionDbValue := ""
		switch strings.ToLower(conditionRaw) {
		case "new":
			conditionDbValue = "NEW"
		case "like new":
			conditionDbValue = "LIKE_NEW"
		case "lightly used":
			conditionDbValue = "LIGHTLY_USED"
		case "well used":
			conditionDbValue = "WELL_USED"
		case "heavily used":
			conditionDbValue = "HEAVILY_USED"
		}

		if conditionDbValue != "" {
			query += "\n\t\t\tAND COALESCE(lsd.condition::text, '') = " + addArg(conditionDbValue)
		}
	}

	province := strings.ToLower(strings.TrimSpace(filter.Province))
	if province != "" && province != "province" {
		query += "\n\t\t\tAND LOWER(COALESCE(l.location_province, '')) = " + addArg(province)
	}

	city := strings.ToLower(strings.TrimSpace(filter.City))
	if city != "" && city != "city/municipality" {
		query += "\n\t\t\tAND LOWER(COALESCE(l.location_city, '')) = " + addArg(city)
	}

	if filter.PriceMin != nil {
		query += "\n\t\t\tAND l.price >= " + addArg(*filter.PriceMin)
	}

	if filter.PriceMax != nil {
		query += "\n\t\t\tAND l.price <= " + addArg(*filter.PriceMax)
	}

	orderBy := "l.created_at DESC"
	switch strings.ToLower(strings.TrimSpace(filter.Sort)) {
	case "latest":
		orderBy = "l.created_at DESC"
	case "cheapest":
		orderBy = "l.price ASC, l.created_at DESC"
	case "expensive":
		orderBy = "l.price DESC, l.created_at DESC"
	case "top-rated":
		orderBy = "COALESCE(rv.avg_rating, 0) DESC, l.created_at DESC"
	}

	query += "\n\t\tORDER BY " + orderBy

	if err := db.Raw(query, args...).Scan(&listings).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve listings")
	}

	return listings, nil
}
