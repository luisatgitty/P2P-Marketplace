package repository

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
)

type reviewContext struct {
	ListingOwnerId string
}

func getReviewContext(listingId string) (reviewContext, error) {
	db := middleware.DBConn
	ctx := reviewContext{}

	query := `
		SELECT
			l.user_id::text AS listing_owner_id
		FROM public.listings l
		WHERE l.id = $1
		LIMIT 1
	`

	result := db.Raw(query, listingId).Scan(&ctx)
	if result.Error != nil {
		return ctx, fmt.Errorf("Failed to validate listing")
	}
	if result.RowsAffected == 0 {
		return ctx, fmt.Errorf("Listing not found")
	}

	return ctx, nil
}

func validateBuyerCanReview(reviewerId, listingId string) (string, error) {
	reviewerId = strings.TrimSpace(reviewerId)
	listingId = strings.TrimSpace(listingId)

	if reviewerId == "" {
		return "", fmt.Errorf("User is not authenticated")
	}
	if listingId == "" {
		return "", fmt.Errorf("Listing ID is required")
	}

	ctx, err := getReviewContext(listingId)
	if err != nil {
		return "", err
	}

	if strings.TrimSpace(ctx.ListingOwnerId) == reviewerId {
		return "", fmt.Errorf("You cannot review your own listing")
	}

	db := middleware.DBConn
	var hasCompletedTransaction bool
	completedTransactionQuery := `
		SELECT EXISTS(
			SELECT 1
			FROM public.listing_transactions lt
			WHERE lt.listing_id = $1
				AND lt.client_id = $2
				AND lt.status = 'COMPLETED'
		)
	`

	if err := db.Raw(completedTransactionQuery, listingId, reviewerId).Scan(&hasCompletedTransaction).Error; err != nil {
		return "", fmt.Errorf("Failed to validate review permission")
	}
	if !hasCompletedTransaction {
		return "", fmt.Errorf("Only users with a completed transaction on this listing can review")
	}

	return strings.TrimSpace(ctx.ListingOwnerId), nil
}

func GetMyListingReview(reviewerId, listingId string) (model.ListingReviewFromDb, error) {
	db := middleware.DBConn
	var review model.ListingReviewFromDb

	if _, err := validateBuyerCanReview(reviewerId, listingId); err != nil {
		return review, err
	}

	query := `
		SELECT
			id,
			rating,
			COALESCE(comment, '') AS comment,
			reviewer_id::text AS reviewer_id,
			reviewed_user_id::text AS reviewed_user_id,
			listing_id::text AS listing_id
		FROM public.reviews
		WHERE reviewer_id = $1
			AND listing_id = $2
		LIMIT 1
	`

	result := db.Raw(query, reviewerId, listingId).Scan(&review)
	if result.Error != nil {
		return review, fmt.Errorf("Failed to retrieve review")
	}
	if result.RowsAffected == 0 {
		return review, fmt.Errorf("Review not found")
	}

	return review, nil
}

func CreateListingReview(reviewerId, listingId string, rating int, comment string) (model.ListingReviewFromDb, error) {
	db := middleware.DBConn
	var review model.ListingReviewFromDb

	if rating < 1 || rating > 5 {
		return review, fmt.Errorf("Rating must be between 1 and 5")
	}

	reviewedUserId, err := validateBuyerCanReview(reviewerId, listingId)
	if err != nil {
		return review, err
	}

	query := `
		INSERT INTO public.reviews (
			reviewer_id,
			reviewed_user_id,
			listing_id,
			rating,
			comment,
			created_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			NULLIF($5, ''),
			now()
		)
		RETURNING
			id,
			rating,
			COALESCE(comment, '') AS comment,
			reviewer_id::text AS reviewer_id,
			reviewed_user_id::text AS reviewed_user_id,
			listing_id::text AS listing_id
	`

	trimmedComment := strings.TrimSpace(comment)
	tx := db.Begin()
	if tx.Error != nil {
		return review, tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Raw(query, reviewerId, reviewedUserId, listingId, rating, trimmedComment).Scan(&review).Error; err != nil {
		tx.Rollback()
		if strings.Contains(strings.ToLower(err.Error()), "uniq_reviews_reviewer_listing") || strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return review, fmt.Errorf("Review already exists for this listing")
		}
		return review, fmt.Errorf("Failed to submit review")
	}

	if err := InsertReviewNotificationTx(
		tx,
		reviewedUserId,
		fmt.Sprintf("You received a new %d-star review on your listing.", rating),
		"/listing/"+strings.TrimSpace(listingId),
	); err != nil {
		tx.Rollback()
		return review, err
	}

	if err := tx.Commit().Error; err != nil {
		return review, err
	}

	return review, nil
}

func UpdateListingReview(reviewerId, listingId string, rating int, comment string) (model.ListingReviewFromDb, error) {
	db := middleware.DBConn
	var review model.ListingReviewFromDb

	if rating < 1 || rating > 5 {
		return review, fmt.Errorf("Rating must be between 1 and 5")
	}

	if _, err := validateBuyerCanReview(reviewerId, listingId); err != nil {
		return review, err
	}

	query := `
		UPDATE public.reviews
		SET
			rating = $1,
			comment = NULLIF($2, '')
		WHERE reviewer_id = $3
			AND listing_id = $4
		RETURNING
			id,
			rating,
			COALESCE(comment, '') AS comment,
			reviewer_id::text AS reviewer_id,
			reviewed_user_id::text AS reviewed_user_id,
			listing_id::text AS listing_id
	`

	trimmedComment := strings.TrimSpace(comment)
	result := db.Raw(query, rating, trimmedComment, reviewerId, listingId).Scan(&review)
	if result.Error != nil {
		return review, fmt.Errorf("Failed to update review")
	}
	if result.RowsAffected == 0 {
		return review, fmt.Errorf("Review not found")
	}

	return review, nil
}

func DeleteListingReview(reviewerId, listingId string) error {
	db := middleware.DBConn

	if _, err := validateBuyerCanReview(reviewerId, listingId); err != nil {
		return err
	}

	query := `
		DELETE FROM public.reviews
		WHERE reviewer_id = $1
			AND listing_id = $2
	`

	result := db.Exec(query, reviewerId, listingId)
	if result.Error != nil {
		return fmt.Errorf("Failed to delete review")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Review not found")
	}

	return nil
}
