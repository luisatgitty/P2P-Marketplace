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
			lrd.available_from,
			COALESCE(lrd.deposit, '') AS deposit,
			COALESCE(lsrv.turnaround_time, '') AS turnaround_time,
			COALESCE(lsrv.service_area, '') AS service_area,
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
	ownerCheckQuery := `
		SELECT LOWER(listing_type::text)
		FROM public.listings
		WHERE id = $1 AND user_id = $2
		LIMIT 1
	`
	ownerCheckResult := tx.Raw(ownerCheckQuery, listingId, userId).Scan(&currentType)
	if ownerCheckResult.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to validate listing ownership")
	}
	if ownerCheckResult.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Listing not found or unauthorized")
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
			SET min_rental_period = $1, available_from = $2, deposit = $3, delivery_method = $4
			WHERE listing_id = $5
		`
		res := tx.Exec(updateRentQuery, minPeriod, availableFrom, body.RentData.Deposit, deliveryMethod, listingId)
		if res.Error != nil {
			return fmt.Errorf("Failed to update rent details")
		}
		if res.RowsAffected == 0 {
			insertRentQuery := `
				INSERT INTO public.listing_rent_details (listing_id, min_rental_period, available_from, deposit, delivery_method)
				VALUES ($1,$2,$3,$4,$5)
			`
			if err := tx.Exec(insertRentQuery, listingId, minPeriod, availableFrom, body.RentData.Deposit, deliveryMethod).Error; err != nil {
				return fmt.Errorf("Failed to update rent details")
			}
		}
	case "service":
		if body.ServiceData == nil {
			return fmt.Errorf("Missing service data")
		}
		updateServiceQuery := `
			UPDATE public.listing_service_details
			SET turnaround_time = $1, service_area = $2
			WHERE listing_id = $3
		`
		res := tx.Exec(updateServiceQuery, body.ServiceData.Turnaround, body.ServiceData.ServiceArea, listingId)
		if res.Error != nil {
			return fmt.Errorf("Failed to update service details")
		}
		if res.RowsAffected == 0 {
			insertServiceQuery := `
				INSERT INTO public.listing_service_details (listing_id, turnaround_time, service_area)
				VALUES ($1,$2,$3)
			`
			if err := tx.Exec(insertServiceQuery, listingId, body.ServiceData.Turnaround, body.ServiceData.ServiceArea).Error; err != nil {
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
	ownerCheckQuery := `
		SELECT id
		FROM public.listings
		WHERE id = $1 AND user_id = $2
		LIMIT 1
	`
	ownerCheckResult := tx.Raw(ownerCheckQuery, listingId, userId).Scan(&existingId)
	if ownerCheckResult.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to validate listing ownership")
	}
	if ownerCheckResult.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Listing not found or unauthorized")
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

func GetListingDetailById(listingId string) (model.ListingDetailFromDb, error) {
	db := middleware.DBConn
	var listing model.ListingDetailFromDb

	selectQuery := `
		SELECT
			l.id,
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
			COALESCE(l.highlights, '[]') AS highlights,
			COALESCE(l.included, '[]') AS included,
			COALESCE(lsd.condition::text, '') AS condition,
			COALESCE(lsd.delivery_method::text, lrd.delivery_method::text, '') AS delivery_method,
			COALESCE(lrd.min_rental_period, 0) AS min_rental_period,
			lrd.available_from,
			COALESCE(lrd.deposit, '') AS deposit,
			COALESCE(lsrv.turnaround_time, '') AS turnaround_time,
			COALESCE(lsrv.service_area, '') AS service_area,
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS seller_name,
			COALESCE(rv.avg_rating, 5.0) AS seller_rating,
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

func GetAllListings(excludeUserId string) ([]model.HomeListingFromDb, error) {
	db := middleware.DBConn
	listings := make([]model.HomeListingFromDb, 0)

	baseQuery := `
		SELECT
			l.id,
			l.title,
			l.price,
			COALESCE(l.price_unit, '') AS price_unit,
			LOWER(l.listing_type::text) AS type,
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
	`

	query := baseQuery
	args := make([]any, 0)
	if strings.TrimSpace(excludeUserId) != "" {
		query += "\n\t\t\tAND l.user_id <> $1"
		args = append(args, excludeUserId)
	}

	query += `
		ORDER BY l.created_at DESC
	`

	if err := db.Raw(query, args...).Scan(&listings).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve listings")
	}

	return listings, nil
}
