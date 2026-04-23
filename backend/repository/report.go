package repository

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
)

func CreateListingReport(reporterId, listingId, reportedUserId, reason, description string) (string, error) {
	db := middleware.DBConn

	trimmedReason := strings.TrimSpace(reason)
	if trimmedReason == "" {
		return "", fmt.Errorf("Report reason is required")
	}

	normalizedReason := config.NormalizeReportReason(trimmedReason)
	if normalizedReason == "" {
		return "", fmt.Errorf("Invalid report reason")
	}

	trimmedDescription := strings.TrimSpace(description)
	if utf8.RuneCountInString(trimmedDescription) > config.ReportDescriptionMaxLength {
		return "", fmt.Errorf("Report details must be at most 500 characters")
	}

	descriptionWords := strings.Fields(trimmedDescription)
	if len(descriptionWords) > config.ReportDescriptionMaxWords {
		return "", fmt.Errorf("Report details must be at most 80 words")
	}

	targetReportedUserId := strings.TrimSpace(reportedUserId)

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

	if targetReportedUserId == "" {
		targetReportedUserId = strings.TrimSpace(listingOwnerId)
	}

	if targetReportedUserId == strings.TrimSpace(reporterId) {
		return "", fmt.Errorf("You cannot report your own listing")
	}

	duplicateCheckQuery := `
		SELECT COUNT(*)
		FROM public.reports
		WHERE reporter_id = $1
			AND reported_listing_id = $2
			AND status = 'PENDING'
	`
	var duplicateCount int
	if err := db.Raw(duplicateCheckQuery, reporterId, listingId).Scan(&duplicateCount).Error; err != nil {
		return "", fmt.Errorf("Failed to validate report")
	}
	if duplicateCount > 0 {
		return "", fmt.Errorf("You already submitted a report for this listing.")
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

	if err := db.Raw(insertQuery, reporterId, targetReportedUserId, listingId, normalizedReason, trimmedDescription).Scan(&reportId).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "uniq_reports_reporter_listing_user") || strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return "", fmt.Errorf("You already have a pending report for this listing")
		}
		return "", fmt.Errorf("Failed to submit report")
	}

	return reportId, nil
}
