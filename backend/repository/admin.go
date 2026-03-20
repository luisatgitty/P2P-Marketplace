package repository

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
)

func GetAdminDashboardStats() (model.AdminDashboardStatsFromDb, error) {
	db := middleware.DBConn
	var stats model.AdminDashboardStatsFromDb

	query := `
		SELECT
			(SELECT COUNT(*)::int FROM public.users WHERE deleted_at IS NULL) AS total_users,
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
