package repository

import (
	"database/sql"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"

	"gorm.io/gorm"
)

func GetProfileUserById(userId string) (model.ProfileUserFromDb, error) {
	db := middleware.DBConn
	var user model.ProfileUserFromDb
	selectQuery := `
		SELECT
			first_name,
			last_name,
			email,
			COALESCE(is_active, FALSE) AS is_active,
			account_locked_until,
			phone_number,
			bio,
			location_barangay,
			location_city,
			location_province,
			profile_image_url,
			cover_image_url,
			role,
			verification_status,
			created_at,
			last_login_at,
			COALESCE(rv.avg_rating, 0) AS overall_rating,
			COALESCE(rv.review_count, 0) AS review_count
		FROM public.users
		LEFT JOIN LATERAL (
			SELECT
				AVG(r.rating)::float AS avg_rating,
				COUNT(*)::int AS review_count
			FROM public.reviews r
			WHERE r.reviewed_user_id = users.id
		) rv ON TRUE
		WHERE id=$1
	`

	result := db.Raw(selectQuery, userId).Scan(&user)
	if result.Error != nil {
		return user, fmt.Errorf("Failed to retrieve profile data")
	}
	if result.RowsAffected == 0 {
		return user, fmt.Errorf("User not found")
	}
	return user, nil
}

func GetUserListings(userId string) ([]model.ProfileListingFromDb, error) {
	db := middleware.DBConn
	listings := make([]model.ProfileListingFromDb, 0)

	selectQuery := `
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
		WHERE l.user_id = $1
		ORDER BY l.created_at DESC
	`

	if err := db.Raw(selectQuery, userId).Scan(&listings).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve listings")
	}
	return listings, nil
}

func GetUserBookmarks(userId string) ([]model.ProfileListingFromDb, error) {
	db := middleware.DBConn
	bookmarks := make([]model.ProfileListingFromDb, 0)

	selectQuery := `
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
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(owner.first_name, ''), ' ', COALESCE(owner.last_name, ''))) AS seller_name,
			COALESCE(rv.avg_rating, 5.0) AS seller_rating,
			LOWER(l.status::text) AS status
		FROM public.bookmarks b
		INNER JOIN public.listings l ON l.id = b.listing_id
		INNER JOIN public.users owner ON owner.id = l.user_id
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
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC
	`

	if err := db.Raw(selectQuery, userId).Scan(&bookmarks).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve bookmarks")
	}
	return bookmarks, nil
}

func GetUserReceivedReviews(userId string) ([]model.ProfileReviewFromDb, error) {
	db := middleware.DBConn
	reviews := make([]model.ProfileReviewFromDb, 0)

	selectQuery := `
		SELECT
			r.id,
			r.reviewer_id::text AS reviewer_id,
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(ru.first_name, ''), ' ', COALESCE(ru.last_name, ''))) AS reviewer_name,
			COALESCE(ru.profile_image_url, '') AS reviewer_image_url,
			LOWER(COALESCE(ru.verification_status::text, '')) AS reviewer_status,
			r.rating,
			COALESCE(r.comment, '') AS comment,
			TO_CHAR(r.created_at, 'Mon DD, YYYY') AS review_date,
			l.id::text AS listing_id,
			COALESCE(l.title, '') AS listing_title,
			COALESCE(l.price, 0) AS listing_price,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			COALESCE(li.image_url, '') AS listing_image_url,
			LOWER(COALESCE(l.listing_type::text, '')) AS listing_type,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(l.location_city, ''), NULLIF(l.location_province, ''))) AS listing_location
		FROM public.reviews r
		INNER JOIN public.users ru
			ON ru.id = r.reviewer_id
		INNER JOIN public.listings l
			ON l.id = r.listing_id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		WHERE r.reviewed_user_id = $1
		ORDER BY r.created_at DESC
	`

	if err := db.Raw(selectQuery, userId).Scan(&reviews).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve reviews")
	}

	return reviews, nil
}

func GetUserPersonalReviews(userId string) ([]model.ProfileReviewFromDb, error) {
	db := middleware.DBConn
	reviews := make([]model.ProfileReviewFromDb, 0)

	selectQuery := `
		SELECT
			r.id,
			r.reviewer_id::text AS reviewer_id,
			TRIM(BOTH ' ' FROM CONCAT(COALESCE(ru.first_name, ''), ' ', COALESCE(ru.last_name, ''))) AS reviewer_name,
			COALESCE(ru.profile_image_url, '') AS reviewer_image_url,
			LOWER(COALESCE(ru.verification_status::text, '')) AS reviewer_status,
			r.rating,
			COALESCE(r.comment, '') AS comment,
			TO_CHAR(r.created_at, 'Mon DD, YYYY') AS review_date,
			l.id::text AS listing_id,
			COALESCE(l.title, '') AS listing_title,
			COALESCE(l.price, 0) AS listing_price,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			COALESCE(li.image_url, '') AS listing_image_url,
			LOWER(COALESCE(l.listing_type::text, '')) AS listing_type,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(l.location_city, ''), NULLIF(l.location_province, ''))) AS listing_location
		FROM public.reviews r
		INNER JOIN public.users ru
			ON ru.id = r.reviewer_id
		INNER JOIN public.listings l
			ON l.id = r.listing_id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		WHERE r.reviewer_id = $1
		ORDER BY r.created_at DESC
	`

	if err := db.Raw(selectQuery, userId).Scan(&reviews).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve personal reviews")
	}

	return reviews, nil
}

func UpdateProfile(userId string, body model.UpdateProfileBody) error {
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

	if strings.TrimSpace(body.NewPassword) != "" {
		user, err := GetUserById(userId)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to validate current password")
		}

		if !middleware.IsPasswordMatch(body.CurrentPassword, user.Password) {
			tx.Rollback()
			return fmt.Errorf("Current password is incorrect")
		}
	}

	updateQuery := `
		UPDATE public.users
		SET
			first_name = $1,
			last_name = $2,
			phone_number = $3,
			bio = $4,
			location_province = $5,
			location_city = $6,
			location_barangay = $7,
			updated_at = $8
		WHERE id = $9
	`

	if err := tx.Exec(
		updateQuery,
		strings.TrimSpace(body.FirstName),
		strings.TrimSpace(body.LastName),
		strings.TrimSpace(body.PhoneNumber),
		strings.TrimSpace(body.Bio),
		strings.TrimSpace(body.LocationProv),
		strings.TrimSpace(body.LocationCity),
		strings.TrimSpace(body.LocationBrgy),
		time.Now(),
		userId,
	).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to update profile")
	}

	if strings.TrimSpace(body.NewPassword) != "" {
		passwordQuery := `
			UPDATE public.users
			SET password_hash = $1, updated_at = $2
			WHERE id = $3
		`
		hashedPassword := middleware.HashPassword(strings.TrimSpace(body.NewPassword))
		if err := tx.Exec(passwordQuery, hashedPassword, time.Now(), userId).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to update password")
		}
	}

	if err := upsertUserImageTx(tx, userId, body.ProfileImage, "profile_image_url", "profiles"); err != nil {
		tx.Rollback()
		return err
	}

	if err := upsertUserImageTx(tx, userId, body.CoverImage, "cover_image_url", "covers"); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func UpdateProfileImages(userId string, body model.UpdateProfileImagesBody) error {
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

	if body.ProfileImage == nil && body.CoverImage == nil && !body.RemoveProfileImage && !body.RemoveCoverImage {
		tx.Rollback()
		return fmt.Errorf("No image provided")
	}

	if body.RemoveProfileImage {
		if err := clearUserImageTx(tx, userId, "profile_image_url"); err != nil {
			tx.Rollback()
			return err
		}
	}

	if body.RemoveCoverImage {
		if err := clearUserImageTx(tx, userId, "cover_image_url"); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := upsertUserImageTx(tx, userId, body.ProfileImage, "profile_image_url", "profiles"); err != nil {
		tx.Rollback()
		return err
	}

	if err := upsertUserImageTx(tx, userId, body.CoverImage, "cover_image_url", "covers"); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func clearUserImageTx(tx *gorm.DB, userId, columnName string) error {
	if columnName != "profile_image_url" && columnName != "cover_image_url" {
		return fmt.Errorf("Invalid image column")
	}

	uploadRoot := getUploadRootDir()

	var previousURL sql.NullString
	selectQuery := fmt.Sprintf("SELECT %s FROM public.users WHERE id = $1", columnName)
	if err := tx.Raw(selectQuery, userId).Scan(&previousURL).Error; err != nil {
		return fmt.Errorf("Failed to retrieve previous user image")
	}

	removeLocalUpload(uploadRoot, previousURL.String)

	updateQuery := fmt.Sprintf("UPDATE public.users SET %s = NULL, updated_at = $1 WHERE id = $2", columnName)
	if err := tx.Exec(updateQuery, time.Now(), userId).Error; err != nil {
		return fmt.Errorf("Failed to clear user image reference")
	}

	return nil
}

func upsertUserImageTx(tx *gorm.DB, userId string, image *model.ListingImageBody, columnName, folder string) error {
	if image == nil || strings.TrimSpace(image.Data) == "" {
		return nil
	}

	if columnName != "profile_image_url" && columnName != "cover_image_url" {
		return fmt.Errorf("Invalid image column")
	}

	uploadRoot := getUploadRootDir()
	baseDir := filepath.Join(uploadRoot, "users", folder)
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return fmt.Errorf("Failed to create user image upload directory")
	}

	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(image.Data))
	if err != nil {
		return fmt.Errorf("Failed to decode user image payload")
	}

	ext, err := extFromMime(image.MimeType)
	if err != nil {
		return err
	}

	randPart, err := randomHex(10)
	if err != nil {
		return fmt.Errorf("Failed to generate user image filename")
	}

	fileName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randPart, ext)
	filePath := filepath.Join(baseDir, fileName)
	if err := os.WriteFile(filePath, decoded, 0644); err != nil {
		return fmt.Errorf("Failed to save user image file")
	}

	var previousURL sql.NullString
	selectQuery := fmt.Sprintf("SELECT %s FROM public.users WHERE id = $1", columnName)
	if err := tx.Raw(selectQuery, userId).Scan(&previousURL).Error; err != nil {
		return fmt.Errorf("Failed to retrieve previous user image")
	}
	removeLocalUpload(uploadRoot, previousURL.String)

	newURL := fmt.Sprintf("/uploads/users/%s/%s", folder, fileName)
	updateQuery := fmt.Sprintf("UPDATE public.users SET %s = $1, updated_at = $2 WHERE id = $3", columnName)
	if err := tx.Exec(updateQuery, newURL, time.Now(), userId).Error; err != nil {
		return fmt.Errorf("Failed to save user image reference")
	}

	return nil
}

func removeLocalUpload(uploadRoot, rawURL string) {
	trimmed := strings.TrimSpace(rawURL)
	if !strings.HasPrefix(trimmed, "/uploads/") {
		return
	}

	relPath := strings.TrimPrefix(trimmed, "/uploads/")
	fullPath := filepath.Join(uploadRoot, relPath)
	if err := os.Remove(filepath.Clean(fullPath)); err != nil && !os.IsNotExist(err) {
		fmt.Println("Failed to remove previous user image:", err)
	}
}

func getUploadRootDir() string {
	preferred := filepath.Clean(filepath.Join("backend", "uploads"))
	if _, err := os.Stat(preferred); err == nil {
		return preferred
	}
	return filepath.Clean("uploads")
}

func DeactivateAccount(userId string) error {
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

	deactivateQuery := `
		UPDATE public.users
		SET
			is_active = FALSE,
			failed_login_attempts = 0,
			account_locked_until = NULL,
			updated_at = $1
		WHERE id = $2
	`
	result := tx.Exec(deactivateQuery, time.Now(), userId)
	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to deactivate account")
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("User not found")
	}

	if err := tx.Exec(`DELETE FROM public.sessions WHERE user_id = $1`, userId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to revoke user sessions")
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func SubmitUserVerification(userId string, body model.SubmitVerificationBody) error {
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

	birthdate, err := time.Parse("2006-01-02", strings.TrimSpace(body.IdBirthdate))
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("Invalid birthdate format")
	}

	frontURL, err := saveVerificationImageTx(tx, userId, body.IdImageFront, "id-front")
	if err != nil {
		tx.Rollback()
		return err
	}

	backURL, err := saveVerificationImageTx(tx, userId, body.IdImageBack, "id-back")
	if err != nil {
		tx.Rollback()
		return err
	}

	selfieURL, err := saveVerificationImageTx(tx, userId, body.SelfieImage, "selfie")
	if err != nil {
		tx.Rollback()
		return err
	}

	insertQuery := `
		INSERT INTO public.user_verifications (
			user_id,
			id_type,
			id_number,
			id_first_name,
			id_last_name,
			id_birthdate,
			mobile_number,
			id_image_front_url,
			id_image_back_url,
			selfie_url,
			user_agent,
			ip_address,
			hardware_info,
			verification_status,
			submitted_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10,
			$11, $12, $13,
			'PENDING', now()
		)
	`

	if err := tx.Exec(
		insertQuery,
		userId,
		strings.TrimSpace(body.IdType),
		strings.TrimSpace(body.IdNumber),
		strings.TrimSpace(body.IdFirstName),
		strings.TrimSpace(body.IdLastName),
		birthdate,
		body.MobileNumber,
		frontURL,
		backURL,
		selfieURL,
		strings.TrimSpace(body.UserAgent),
		strings.TrimSpace(body.IpAddress),
		strings.TrimSpace(body.HardwareInfo),
	).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to save verification submission")
	}

	if err := tx.Exec(`
		UPDATE public.users
		SET
			verification_status = 'PENDING',
			updated_at = now()
		WHERE id = $1
	`, userId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to update user verification status")
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func saveVerificationImageTx(tx *gorm.DB, userId string, image *model.ListingImageBody, kind string) (string, error) {
	if image == nil || strings.TrimSpace(image.Data) == "" {
		return "", fmt.Errorf("Missing verification image")
	}

	uploadRoot := getUploadRootDir()
	baseDir := filepath.Join(uploadRoot, "verifications", userId, kind)
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return "", fmt.Errorf("Failed to create verification upload directory")
	}

	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(image.Data))
	if err != nil {
		return "", fmt.Errorf("Failed to decode verification image payload")
	}

	ext, err := extFromMime(image.MimeType)
	if err != nil {
		return "", err
	}

	randPart, err := randomHex(10)
	if err != nil {
		return "", fmt.Errorf("Failed to generate verification image filename")
	}

	fileName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randPart, ext)
	filePath := filepath.Join(baseDir, fileName)
	if err := os.WriteFile(filePath, decoded, 0644); err != nil {
		return "", fmt.Errorf("Failed to save verification image file")
	}

	return fmt.Sprintf("/uploads/verifications/%s/%s/%s", userId, kind, fileName), nil
}
