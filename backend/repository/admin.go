package repository

import (
	"fmt"
	"strings"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
)

func GetAdminDashboardStats() (model.AdminDashboardStatsFromDb, error) {
	db := middleware.DBConn
	var stats model.AdminDashboardStatsFromDb

	query := `
		SELECT
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND role = 'USER') AS total_users,
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND role = 'USER' AND last_login_at IS NOT NULL AND last_login_at >= now() - INTERVAL '30 days') AS active_users,
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND role = 'USER' AND (last_login_at IS NULL OR last_login_at < now() - INTERVAL '30 days')) AS inactive_users,
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND role = 'USER' AND verification_status = 'VERIFIED') AS verified_users,
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND role = 'USER' AND account_locked_until IS NOT NULL AND account_locked_until > now()) AS locked_users,
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND created_at >= date_trunc('week', now())) AS new_users_this_week,
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL AND created_at >= date_trunc('week', now()) - INTERVAL '7 days' AND created_at < date_trunc('week', now())) AS new_users_last_week,
			(SELECT COUNT(*)::int FROM public.listings WHERE status = 'AVAILABLE') AS active_listings,
			(SELECT COUNT(*)::int FROM public.listings WHERE created_at >= date_trunc('week', now())) AS new_listings_this_week,
			(SELECT COUNT(*)::int FROM public.listings WHERE created_at >= date_trunc('week', now()) - INTERVAL '7 days' AND created_at < date_trunc('week', now())) AS new_listings_last_week,
			(SELECT COUNT(*)::int FROM public.reports WHERE status = 'PENDING') AS pending_reports,
			(SELECT COUNT(*)::int FROM public.reports WHERE status = 'PENDING' AND created_at >= date_trunc('day', now())) AS pending_reports_today,
			(SELECT COUNT(*)::int FROM public.reports WHERE status = 'PENDING' AND created_at >= date_trunc('day', now()) - INTERVAL '1 day' AND created_at < date_trunc('day', now())) AS pending_reports_yesterday,
			(SELECT COUNT(*)::int FROM public.user_verifications WHERE verification_status = 'PENDING') AS pending_verifications,
			(SELECT COUNT(*)::int FROM public.user_verifications WHERE verification_status = 'PENDING' AND submitted_at >= date_trunc('day', now())) AS pending_verifications_today,
			(SELECT COUNT(*)::int FROM public.user_verifications WHERE verification_status = 'PENDING' AND submitted_at >= date_trunc('day', now()) - INTERVAL '1 day' AND submitted_at < date_trunc('day', now())) AS pending_verifications_yesterday
	`

	if err := db.Raw(query).Scan(&stats).Error; err != nil {
		return stats, fmt.Errorf("Failed to fetch admin dashboard stats")
	}

	return stats, nil
}

func GetAdminWeeklyNewUsers() ([]model.AdminWeeklyNewUsersFromDb, error) {
	db := middleware.DBConn
	rows := make([]model.AdminWeeklyNewUsersFromDb, 0, 7)

	query := `
		WITH week_days AS (
			SELECT generate_series(
				date_trunc('week', now())::date,
				date_trunc('week', now())::date + INTERVAL '6 days',
				INTERVAL '1 day'
			)::date AS day_date
		),
		user_counts AS (
			SELECT date_trunc('day', created_at)::date AS day_date, COUNT(*)::int AS count
			FROM public.users
			WHERE deleted_at IS NULL
				AND created_at >= date_trunc('week', now())
				AND created_at < date_trunc('week', now()) + INTERVAL '7 days'
			GROUP BY 1
		)
		SELECT
			TO_CHAR(wd.day_date, 'Dy') AS day,
			COALESCE(uc.count, 0)::int AS count,
			EXTRACT(ISODOW FROM wd.day_date)::int AS day_order
		FROM week_days wd
		LEFT JOIN user_counts uc ON uc.day_date = wd.day_date
		ORDER BY day_order ASC
	`

	if err := db.Raw(query).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch weekly new users")
	}

	for i := range rows {
		rows[i].Day = strings.TrimSpace(rows[i].Day)
	}

	return rows, nil
}

func GetAdminWeeklyNewListings() ([]model.AdminWeeklyNewUsersFromDb, error) {
	db := middleware.DBConn
	rows := make([]model.AdminWeeklyNewUsersFromDb, 0, 7)

	query := `
		WITH week_days AS (
			SELECT generate_series(
				date_trunc('week', now())::date,
				date_trunc('week', now())::date + INTERVAL '6 days',
				INTERVAL '1 day'
			)::date AS day_date
		),
		listing_counts AS (
			SELECT date_trunc('day', created_at)::date AS day_date, COUNT(*)::int AS count
			FROM public.listings
			WHERE created_at >= date_trunc('week', now())
				AND created_at < date_trunc('week', now()) + INTERVAL '7 days'
			GROUP BY 1
		)
		SELECT
			TO_CHAR(wd.day_date, 'Dy') AS day,
			COALESCE(lc.count, 0)::int AS count,
			EXTRACT(ISODOW FROM wd.day_date)::int AS day_order
		FROM week_days wd
		LEFT JOIN listing_counts lc ON lc.day_date = wd.day_date
		ORDER BY day_order ASC
	`

	if err := db.Raw(query).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch weekly new listings")
	}

	for i := range rows {
		rows[i].Day = strings.TrimSpace(rows[i].Day)
	}

	return rows, nil
}

func GetAdminListingTypeBreakdown() ([]model.AdminListingTypeBreakdownItem, int, error) {
	db := middleware.DBConn
	rows := make([]model.AdminListingTypeCountFromDb, 0)

	query := `
		SELECT
			listing_type::text AS listing_type,
			COUNT(*)::int AS count
		FROM public.listings
		WHERE status = 'AVAILABLE'
		GROUP BY listing_type
	`

	if err := db.Raw(query).Scan(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch listing type breakdown")
	}

	counts := map[string]int{
		"SELL":    0,
		"RENT":    0,
		"SERVICE": 0,
	}

	total := 0
	for _, row := range rows {
		typeKey := strings.ToUpper(strings.TrimSpace(row.ListingType))
		if _, ok := counts[typeKey]; !ok {
			continue
		}
		counts[typeKey] = row.Count
		total += row.Count
	}

	items := []model.AdminListingTypeBreakdownItem{
		{Type: "SELL", Count: counts["SELL"], Pct: 0},
		{Type: "RENT", Count: counts["RENT"], Pct: 0},
		{Type: "SERVICE", Count: counts["SERVICE"], Pct: 0},
	}

	if total > 0 {
		for i := range items {
			items[i].Pct = (float64(items[i].Count) / float64(total)) * 100
		}
	}

	return items, total, nil
}

func GetAdminUsers() ([]model.AdminUserListItemFromDb, error) {
	db := middleware.DBConn
	users := make([]model.AdminUserListItemFromDb, 0)

	query := `
		SELECT
			u.id::text AS id,
			u.first_name,
			u.last_name,
			u.email,
			COALESCE(u.phone_number, '') AS phone,
			u.role::text AS role,
			u.verification_status::text AS verification,
			u.is_active,
			u.is_email_verified,
			u.failed_login_attempts AS failed_login,
			COALESCE(lc.listings, 0)::int AS listings,
			u.last_login_at AS last_login,
			u.created_at AS joined,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(u.location_city), ''), NULLIF(TRIM(u.location_province), ''))) AS location
		FROM public.users u
		LEFT JOIN (
			SELECT user_id, COUNT(*)::int AS listings
			FROM public.listings
			GROUP BY user_id
		) lc ON lc.user_id = u.id
		WHERE u.deleted_at IS NULL
			AND u.role = 'USER'
		ORDER BY u.created_at DESC
	`

	if err := db.Raw(query).Scan(&users).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch users")
	}

	return users, nil
}

func SetAdminUserActive(userId string, isActive bool) error {
	db := middleware.DBConn

	updateQuery := `
		UPDATE public.users
		SET
			is_active = $1,
			updated_at = now(),
			failed_login_attempts = CASE WHEN $1 THEN 0 ELSE failed_login_attempts END,
			account_locked_until = CASE WHEN $1 THEN NULL ELSE account_locked_until END
		WHERE id = $2
			AND deleted_at IS NULL
			AND role = 'USER'
	`

	result := db.Exec(updateQuery, isActive, userId)
	if result.Error != nil {
		return fmt.Errorf("Failed to update user status")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("User not found")
	}

	if !isActive {
		if err := DeleteUserSessions(userId); err != nil {
			return fmt.Errorf("Failed to revoke user sessions")
		}
	}

	return nil
}

func DeleteAdminUser(userId string) error {
	db := middleware.DBConn

	updateQuery := `
		UPDATE public.users
		SET
			is_active = FALSE,
			deleted_at = $1,
			updated_at = $1
		WHERE id = $2
			AND deleted_at IS NULL
			AND role = 'USER'
	`

	now := time.Now()
	result := db.Exec(updateQuery, now, userId)
	if result.Error != nil {
		return fmt.Errorf("Failed to delete user")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("User not found")
	}

	if err := DeleteUserSessions(userId); err != nil {
		return fmt.Errorf("Failed to revoke user sessions")
	}

	return nil
}
