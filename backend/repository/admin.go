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
			COALESCE(u.profile_image_url, '') AS profile_image_url,
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
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(u.location_barangay), ''), NULLIF(TRIM(u.location_city), ''), NULLIF(TRIM(u.location_province), ''))) AS location
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

func GetAdminAccounts() ([]model.AdminAccountListItemFromDb, error) {
	db := middleware.DBConn
	admins := make([]model.AdminAccountListItemFromDb, 0)

	query := `
		SELECT
			u.id::text AS id,
			u.first_name,
			u.last_name,
			COALESCE(u.profile_image_url, '') AS profile_image_url,
			u.email,
			COALESCE(u.phone_number, '') AS phone,
			u.role::text AS role,
			u.is_active,
			u.created_at,
			u.last_login_at AS last_login
		FROM public.users u
		WHERE u.deleted_at IS NULL
			AND u.role IN ('ADMIN', 'SUPER_ADMIN')
		ORDER BY
			CASE WHEN u.role = 'SUPER_ADMIN' THEN 0 ELSE 1 END ASC,
			u.created_at ASC
	`

	if err := db.Raw(query).Scan(&admins).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch admin accounts")
	}

	for i := range admins {
		admins[i].Role = strings.ToUpper(strings.TrimSpace(admins[i].Role))
	}

	return admins, nil
}

func CreateAdminAccount(body model.AdminCreateAdminBody) (model.AdminAccountListItemFromDb, error) {
	db := middleware.DBConn
	created := model.AdminAccountListItemFromDb{}

	userInput := model.UserFromBody{
		FirstName: body.FirstName,
		LastName:  body.LastName,
		Email:     body.Email,
		Password:  body.Password,
	}
	if err := middleware.ValidateSignUpInput(&userInput); err != nil {
		return created, err
	}
	if err := middleware.ValidatePasswordLength(userInput.Password); err != nil {
		return created, err
	}

	role := strings.ToUpper(strings.TrimSpace(body.Role))
	if role != "ADMIN" && role != "SUPER_ADMIN" {
		return created, fmt.Errorf("Invalid role")
	}

	if err := IsUserExist(userInput.Email); err != nil {
		return created, err
	}

	hashedPassword := middleware.HashPassword(userInput.Password)

	insertQuery := `
		INSERT INTO public.users (
			first_name,
			last_name,
			email,
			phone_number,
			password_hash,
			role,
			is_email_verified,
			is_active,
			created_at,
			updated_at
		)
		VALUES (
			$1, $2, $3, NULLIF(TRIM($4), ''), $5, $6::user_role, TRUE, TRUE, now(), now()
		)
		RETURNING
			id::text AS id,
			first_name,
			last_name,
			COALESCE(profile_image_url, '') AS profile_image_url,
			email,
			COALESCE(phone_number, '') AS phone,
			role::text AS role,
			is_active,
			created_at,
			last_login_at AS last_login
	`

	if err := db.Raw(insertQuery, userInput.FirstName, userInput.LastName, userInput.Email, strings.TrimSpace(body.Phone), hashedPassword, role).Scan(&created).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return created, fmt.Errorf("User with email %s already exists", userInput.Email)
		}
		return created, fmt.Errorf("Failed to create admin account")
	}

	created.Role = strings.ToUpper(strings.TrimSpace(created.Role))
	return created, nil
}

func DeleteAdminAccount(userId string) error {
	db := middleware.DBConn

	var targetRole string
	roleResult := db.Raw(`
		SELECT role::text
		FROM public.users
		WHERE id = $1
			AND deleted_at IS NULL
			AND role IN ('ADMIN', 'SUPER_ADMIN')
		LIMIT 1
	`, userId).Scan(&targetRole)
	if roleResult.Error != nil {
		return fmt.Errorf("Failed to validate admin account")
	}
	if roleResult.RowsAffected == 0 {
		return fmt.Errorf("Admin account not found")
	}

	if strings.EqualFold(strings.TrimSpace(targetRole), "SUPER_ADMIN") {
		var superAdminCount int
		if err := db.Raw(`
			SELECT COUNT(*)::int
			FROM public.users
			WHERE deleted_at IS NULL
				AND role = 'SUPER_ADMIN'
		`).Scan(&superAdminCount).Error; err != nil {
			return fmt.Errorf("Failed to validate super admin count")
		}
		if superAdminCount <= 1 {
			return fmt.Errorf("Cannot delete the last super admin account")
		}
	}

	result := db.Exec(`
		UPDATE public.users
		SET
			is_active = FALSE,
			deleted_at = now(),
			updated_at = now()
		WHERE id = $1
			AND deleted_at IS NULL
			AND role IN ('ADMIN', 'SUPER_ADMIN')
	`, userId)

	if result.Error != nil {
		return fmt.Errorf("Failed to remove admin account")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Admin account not found")
	}

	if err := DeleteUserSessions(userId); err != nil {
		return fmt.Errorf("Failed to revoke admin sessions")
	}

	return nil
}

func SetAdminAccountActive(userId string, isActive bool) error {
	db := middleware.DBConn

	var targetRole string
	roleResult := db.Raw(`
		SELECT role::text
		FROM public.users
		WHERE id = $1
			AND deleted_at IS NULL
			AND role IN ('ADMIN', 'SUPER_ADMIN')
		LIMIT 1
	`, userId).Scan(&targetRole)
	if roleResult.Error != nil {
		return fmt.Errorf("Failed to validate admin account")
	}
	if roleResult.RowsAffected == 0 {
		return fmt.Errorf("Admin account not found")
	}

	if strings.EqualFold(strings.TrimSpace(targetRole), "SUPER_ADMIN") && !isActive {
		var activeSuperAdminCount int
		if err := db.Raw(`
			SELECT COUNT(*)::int
			FROM public.users
			WHERE deleted_at IS NULL
				AND role = 'SUPER_ADMIN'
				AND is_active = TRUE
		`).Scan(&activeSuperAdminCount).Error; err != nil {
			return fmt.Errorf("Failed to validate super admin count")
		}
		if activeSuperAdminCount <= 1 {
			return fmt.Errorf("Cannot deactivate the last active super admin account")
		}
	}

	result := db.Exec(`
		UPDATE public.users
		SET
			is_active = $1,
			updated_at = now(),
			failed_login_attempts = CASE WHEN $1 THEN 0 ELSE failed_login_attempts END,
			account_locked_until = CASE WHEN $1 THEN NULL ELSE account_locked_until END
		WHERE id = $2
			AND deleted_at IS NULL
			AND role IN ('ADMIN', 'SUPER_ADMIN')
	`, isActive, userId)

	if result.Error != nil {
		return fmt.Errorf("Failed to update admin account status")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Admin account not found")
	}

	if !isActive {
		if err := DeleteUserSessions(userId); err != nil {
			return fmt.Errorf("Failed to revoke admin sessions")
		}
	}

	return nil
}

func GetAdminListings() ([]model.AdminListingListItemFromDb, error) {
	db := middleware.DBConn
	listings := make([]model.AdminListingListItemFromDb, 0)

	query := `
		SELECT
			l.id::text AS id,
			l.title,
			l.listing_type::text AS type,
			COALESCE(c.name, 'Others') AS category,
			l.price,
			l.price_unit AS unit,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(l.location_city), ''), NULLIF(TRIM(l.location_province), ''))) AS location,
			l.status::text AS status,
			TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))) AS seller,
			COALESCE(l.view_count, 0)::int AS views,
			l.created_at AS created
		FROM public.listings l
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.users u ON u.id = l.user_id
		ORDER BY l.created_at DESC
	`

	if err := db.Raw(query).Scan(&listings).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch listings")
	}

	for i := range listings {
		listings[i].Type = strings.ToUpper(strings.TrimSpace(listings[i].Type))
		listings[i].Status = strings.ToUpper(strings.TrimSpace(listings[i].Status))
		if strings.TrimSpace(listings[i].Seller) == "" {
			listings[i].Seller = "Unknown Seller"
		}
	}

	return listings, nil
}

func DeleteAdminListing(listingId string) error {
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
	if err := tx.Raw(`SELECT id::text FROM public.listings WHERE id = $1 LIMIT 1`, listingId).Scan(&existingId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to validate listing")
	}
	if strings.TrimSpace(existingId) == "" {
		tx.Rollback()
		return fmt.Errorf("Listing not found")
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

	deleteResult := tx.Exec(`DELETE FROM public.listings WHERE id = $1`, listingId)
	if deleteResult.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to remove listing")
	}
	if deleteResult.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Listing not found")
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func GetAdminReports() ([]model.AdminReportListItemFromDb, error) {
	db := middleware.DBConn
	reports := make([]model.AdminReportListItemFromDb, 0)

	query := `
		SELECT
			r.id::text AS id,
			COALESCE(r.reporter_id::text, '') AS reporter_id,
			TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(rep.first_name), ''), NULLIF(TRIM(rep.last_name), ''))) AS reporter,
			COALESCE(rep.profile_image_url, '') AS reporter_profile_image_url,
			CASE WHEN r.reported_listing_id IS NOT NULL THEN 'LISTING' ELSE 'USER' END AS target_type,
			CASE
				WHEN r.reported_listing_id IS NOT NULL THEN COALESCE(l.title, 'Unknown Listing')
				ELSE COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(ru.first_name), ''), NULLIF(TRIM(ru.last_name), ''))), ''), ru.email, 'Unknown User')
			END AS target_name,
			COALESCE(r.reported_listing_id::text, r.reported_user_id::text, '') AS target_id,
			COALESCE(owner.id::text, '') AS listing_owner_id,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(owner.first_name), ''), NULLIF(TRIM(owner.last_name), ''))), ''), owner.email, '—') AS listing_owner,
			COALESCE(owner.profile_image_url, '') AS listing_owner_profile_image_url,
			r.reason,
			r.description,
			r.status::text AS status,
			NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(rev.first_name), ''), NULLIF(TRIM(rev.last_name), ''))), '') AS reviewed_by,
			r.reviewed_at,
			r.created_at,
			r.reported_user_id::text AS reported_user_id
		FROM public.reports r
		LEFT JOIN public.users rep ON rep.id = r.reporter_id
		LEFT JOIN public.listings l ON l.id = r.reported_listing_id
		LEFT JOIN public.users owner ON owner.id = l.user_id
		LEFT JOIN public.users ru ON ru.id = r.reported_user_id
		LEFT JOIN public.users rev ON rev.id = r.reviewed_by_id
		ORDER BY r.created_at DESC
	`

	if err := db.Raw(query).Scan(&reports).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch reports")
	}

	for i := range reports {
		reports[i].TargetType = strings.ToUpper(strings.TrimSpace(reports[i].TargetType))
		reports[i].Status = strings.ToUpper(strings.TrimSpace(reports[i].Status))
		if strings.TrimSpace(reports[i].Reporter) == "" {
			reports[i].Reporter = "Unknown Reporter"
		}
	}

	return reports, nil
}

func SetAdminReportStatus(reportId, reviewedById, status string) error {
	db := middleware.DBConn

	normalizedStatus := strings.ToUpper(strings.TrimSpace(status))
	if normalizedStatus != "RESOLVED" && normalizedStatus != "DISMISSED" {
		return fmt.Errorf("Invalid report status")
	}

	result := db.Exec(`
		UPDATE public.reports
		SET
			status = $1::report_status,
			reviewed_by_id = $2,
			reviewed_at = now()
		WHERE id = $3
	`, normalizedStatus, reviewedById, reportId)

	if result.Error != nil {
		return fmt.Errorf("Failed to update report status")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Report not found")
	}

	return nil
}
