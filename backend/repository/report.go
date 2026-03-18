package repository

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/middleware"
)

func CreateListingReport(reporterId, listingId, reason, description string) (string, error) {
	db := middleware.DBConn

	trimmedReason := strings.TrimSpace(reason)
	if trimmedReason == "" {
		return "", fmt.Errorf("Report reason is required")
	}

	trimmedDescription := strings.TrimSpace(description)

	var listingOwnerId string
	ownerQuery := `
		SELECT user_id::text
		FROM public.listings
		WHERE id = $1
		LIMIT 1
	`
	ownerResult := db.Raw(ownerQuery, listingId).Scan(&listingOwnerId)
	if ownerResult.Error != nil {
		return "", fmt.Errorf("Failed to validate listing")
	}
	if ownerResult.RowsAffected == 0 {
		return "", fmt.Errorf("Listing not found")
	}
	if strings.TrimSpace(listingOwnerId) == strings.TrimSpace(reporterId) {
		return "", fmt.Errorf("You cannot report your own listing")
	}

	var reportId string
	insertQuery := `
		INSERT INTO public.reports (
			reporter_id,
			reported_user_id,
			reported_listing_id,
			reason,
			description,
			status,
			created_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			NULLIF($5, ''),
			'PENDING',
			now()
		)
		RETURNING id
	`

	if err := db.Raw(insertQuery, reporterId, listingOwnerId, listingId, trimmedReason, trimmedDescription).Scan(&reportId).Error; err != nil {
		return "", fmt.Errorf("Failed to submit report")
	}

	return reportId, nil
}
