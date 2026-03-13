package repository

import (
	"fmt"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
)

func GetProfileUserById(userId string) (model.ProfileUserFromDb, error) {
	db := middleware.DBConn
	var user model.ProfileUserFromDb
	selectQuery := `
		SELECT
			first_name,
			last_name,
			email,
			phone_number,
			bio,
			location_barangay,
			location_city,
			location_province,
			profile_image_url,
			cover_image_url,
			role,
			verification_status
		FROM public.users
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
