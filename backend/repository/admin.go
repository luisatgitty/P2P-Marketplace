package repository

import (
	"fmt"

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
