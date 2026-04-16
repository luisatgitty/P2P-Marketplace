package repository

import (
	"fmt"
	"strings"
	"time"

	"p2p_marketplace/backend/config"
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

func GetAdminUsers(query model.AdminUsersQuery) ([]model.AdminUserListItemFromDb, int, error) {
	db := middleware.DBConn
	users := make([]model.AdminUserListItemFromDb, 0)
	total := 0

	whereParts := []string{"u.role = 'USER'"}
	args := make([]any, 0)

	search := strings.ToLower(strings.TrimSpace(query.Search))
	if search != "" {
		likeSearch := "%" + search + "%"
		whereParts = append(whereParts, `
			(
				LOWER(TRIM(CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), '')))) LIKE ?
				OR LOWER(COALESCE(u.email, '')) LIKE ?
			)
		`)
		args = append(args, likeSearch, likeSearch)
	}

	verified := strings.ToUpper(strings.TrimSpace(query.Verified))
	if verified != "" && verified != "ALL" {
		whereParts = append(whereParts, "u.verification_status::text = ?")
		args = append(args, verified)
	}

	status := strings.ToUpper(strings.TrimSpace(query.Status))
	if status == "ACTIVE" {
		whereParts = append(whereParts, "u.is_active = TRUE")
	} else if status == "INACTIVE" {
		whereParts = append(whereParts, "u.is_active = FALSE")
	}

	whereClause := "WHERE " + strings.Join(whereParts, " AND ")

	countQuery := `
		SELECT COUNT(*)::int
		FROM public.users u
		` + whereClause

	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch user count")
	}

	selectQuery := `
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
			COALESCE(ct.client_transactions, 0)::int AS client_transactions,
			COALESCE(ot.owner_transactions, 0)::int AS owner_transactions,
			u.account_locked_until,
			u.last_login_at AS last_login,
			u.created_at AS joined,
			u.updated_at,
			u.deleted_at,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(du.first_name), ''), NULLIF(TRIM(du.last_name), ''))), ''), '') AS action_by_name,
			COALESCE(du.email, '') AS action_by_email,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(u.location_barangay), ''), NULLIF(TRIM(u.location_city), ''), NULLIF(TRIM(u.location_province), ''))) AS location
		FROM public.users u
		LEFT JOIN public.users du ON du.id = u.action_by_id
		LEFT JOIN (
			SELECT user_id, COUNT(*)::int AS listings
			FROM public.listings
			GROUP BY user_id
		) lc ON lc.user_id = u.id
		LEFT JOIN (
			SELECT client_id, COUNT(*)::int AS client_transactions
			FROM public.listing_transactions
			GROUP BY client_id
		) ct ON ct.client_id = u.id
		LEFT JOIN (
			SELECT l.user_id AS owner_id, COUNT(*)::int AS owner_transactions
			FROM public.listing_transactions lt
			INNER JOIN public.listings l ON l.id = lt.listing_id
			GROUP BY l.user_id
		) ot ON ot.owner_id = u.id
		` + whereClause + `
		ORDER BY u.created_at DESC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&users).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch users")
	}

	return users, total, nil
}

func SetAdminUserActive(userId string, isActive bool, actorUserId string) error {
	db := middleware.DBConn

	var targetRole string
	roleResult := db.Raw(`
		SELECT role::text
		FROM public.users
		WHERE id = $1
			AND deleted_at IS NULL
			AND role IN ('USER', 'ADMIN', 'SUPER_ADMIN')
		LIMIT 1
	`, userId).Scan(&targetRole)
	if roleResult.Error != nil {
		return fmt.Errorf("Failed to validate user")
	}
	if roleResult.RowsAffected == 0 {
		return fmt.Errorf("User not found")
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
			return fmt.Errorf("Cannot deactivate the last active super admin")
		}
	}

	applyUserBanFields := strings.EqualFold(strings.TrimSpace(targetRole), "USER")
	var lockUntil any
	if applyUserBanFields && !isActive {
		lockUntil = time.Now().AddDate(0, 0, 3)
	}

	updateQuery := `
		UPDATE public.users
		SET
			is_active = $1,
			updated_at = now(),
			failed_login_attempts = CASE WHEN $1 THEN 0 ELSE failed_login_attempts END,
			account_locked_until = CASE
				WHEN $3 AND $1 = FALSE THEN $5
				WHEN $3 AND $1 = TRUE THEN NULL
				WHEN $1 THEN NULL
				ELSE account_locked_until
			END,
			action_by_id = CASE
				WHEN $3 AND $1 = FALSE THEN $4
				WHEN $3 AND $1 = TRUE THEN NULL
				ELSE action_by_id
			END
		WHERE id = $2
			AND deleted_at IS NULL
			AND role IN ('USER', 'ADMIN', 'SUPER_ADMIN')
	`

	result := db.Exec(updateQuery, isActive, userId, applyUserBanFields, actorUserId, lockUntil)
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

func DeleteAdminUser(userId string, actorUserId string) error {
	db := middleware.DBConn

	var targetRole string
	roleResult := db.Raw(`
		SELECT role::text
		FROM public.users
		WHERE id = $1
			AND deleted_at IS NULL
			AND role IN ('USER', 'ADMIN', 'SUPER_ADMIN')
		LIMIT 1
	`, userId).Scan(&targetRole)
	if roleResult.Error != nil {
		return fmt.Errorf("Failed to validate user")
	}
	if roleResult.RowsAffected == 0 {
		return fmt.Errorf("User not found")
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
			return fmt.Errorf("Cannot delete the last super admin")
		}
	}

	updateQuery := `
		UPDATE public.users
		SET
			is_active = FALSE,
			deleted_at = $1,
			updated_at = $1,
			action_by_id = $2
		WHERE id = $3
			AND deleted_at IS NULL
			AND role IN ('USER', 'ADMIN', 'SUPER_ADMIN')
	`

	now := time.Now()
	result := db.Exec(updateQuery, now, actorUserId, userId)
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

func GetAdminAccounts(query model.AdminAccountsQuery) ([]model.AdminAccountListItemFromDb, int, error) {
	db := middleware.DBConn
	admins := make([]model.AdminAccountListItemFromDb, 0)
	total := 0

	whereParts := []string{"u.role IN ('ADMIN', 'SUPER_ADMIN')"}
	args := make([]any, 0)

	search := strings.ToLower(strings.TrimSpace(query.Search))
	if search != "" {
		likeSearch := "%" + search + "%"
		whereParts = append(whereParts, `
			(
				LOWER(COALESCE(u.first_name, '')) LIKE ?
				OR LOWER(COALESCE(u.last_name, '')) LIKE ?
				OR LOWER(COALESCE(u.email, '')) LIKE ?
				OR LOWER(TRIM(CONCAT_WS(' ', COALESCE(u.first_name, ''), COALESCE(u.last_name, '')))) LIKE ?
			)
		`)
		args = append(args, likeSearch, likeSearch, likeSearch, likeSearch)
	}

	roleFilter := strings.ToUpper(strings.TrimSpace(query.Role))
	if roleFilter != "" && roleFilter != "ALL" {
		whereParts = append(whereParts, "u.role::text = ?")
		args = append(args, roleFilter)
	}

	statusFilter := strings.ToUpper(strings.TrimSpace(query.Status))
	if statusFilter == "ACTIVE" {
		whereParts = append(whereParts, "u.deleted_at IS NULL AND u.is_active = TRUE")
	} else if statusFilter == "INACTIVE" {
		whereParts = append(whereParts, "u.deleted_at IS NULL AND u.is_active = FALSE")
	} else if statusFilter == "DELETED" {
		whereParts = append(whereParts, "u.deleted_at IS NOT NULL")
	}

	whereClause := "WHERE " + strings.Join(whereParts, " AND ")

	countQuery := `
		SELECT COUNT(*)::int
		FROM public.users u
		LEFT JOIN public.users du ON du.id = u.action_by_id
		` + whereClause

	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch admin account count")
	}

	selectQuery := `
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
			u.last_login_at AS last_login,
			u.updated_at,
			u.deleted_at,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(du.first_name), ''), NULLIF(TRIM(du.last_name), ''))), ''), '') AS deleted_by_name,
			COALESCE(du.email, '') AS deleted_by_email
		FROM public.users u
		LEFT JOIN public.users du ON du.id = u.action_by_id
		` + whereClause + `
		ORDER BY
			CASE WHEN u.deleted_at IS NULL THEN 0 ELSE 1 END ASC,
			CASE WHEN u.role = 'SUPER_ADMIN' THEN 0 ELSE 1 END ASC,
			u.created_at ASC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&admins).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch admin accounts")
	}

	for i := range admins {
		admins[i].Role = strings.ToUpper(strings.TrimSpace(admins[i].Role))
	}

	return admins, total, nil
}

func CreateAdminAccount(body model.AdminCreateAdminBody) (model.AdminAccountListItemFromDb, error) {
	db := middleware.DBConn
	created := model.AdminAccountListItemFromDb{}

	if err := middleware.ValidateCreateAdminInput(&body); err != nil {
		return created, err
	}

	if err := IsUserExist(body.Email); err != nil {
		return created, err
	}

	hashedPassword := middleware.HashPassword(body.Password)

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
			last_login_at AS last_login,
			updated_at,
			deleted_at,
			''::text AS deleted_by_name,
			''::text AS deleted_by_email
	`

	if err := db.Raw(insertQuery, body.FirstName, body.LastName, body.Email, body.Phone, hashedPassword, body.Role).Scan(&created).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return created, fmt.Errorf("User with email %s already exists", body.Email)
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

func GetAdminListings(query model.AdminListingsQuery) ([]model.AdminListingListItemFromDb, int, error) {
	db := middleware.DBConn
	listings := make([]model.AdminListingListItemFromDb, 0)
	total := 0

	whereParts := make([]string, 0)
	args := make([]any, 0)

	search := strings.ToLower(strings.TrimSpace(query.Search))
	if search != "" {
		likeSearch := "%" + search + "%"
		whereParts = append(whereParts, `
			(
				LOWER(l.title) LIKE ?
				OR LOWER(COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))), ''), u.email, '')) LIKE ?
			)
		`)
		args = append(args, likeSearch, likeSearch)
	}

	typeFilter := strings.ToUpper(strings.TrimSpace(query.Type))
	if typeFilter != "" && typeFilter != "ALL" {
		whereParts = append(whereParts, "l.listing_type::text = ?")
		args = append(args, typeFilter)
	}

	statusFilter := strings.ToUpper(strings.TrimSpace(query.Status))
	if statusFilter != "" && statusFilter != "ALL" {
		whereParts = append(whereParts, "l.status::text = ?")
		args = append(args, statusFilter)
	}

	categoryFilter := strings.ToLower(strings.TrimSpace(query.Category))
	if categoryFilter != "" && categoryFilter != "all" {
		whereParts = append(whereParts, "LOWER(COALESCE(c.name, 'Others')) = ?")
		args = append(args, categoryFilter)
	}

	whereClause := ""
	if len(whereParts) > 0 {
		whereClause = "WHERE " + strings.Join(whereParts, " AND ")
	}

	countQuery := `
		SELECT COUNT(*)::int
		FROM public.listings l
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.users u ON u.id = l.user_id
		` + whereClause

	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch listing count")
	}

	selectQuery := `
		SELECT
			l.id::text AS id,
			l.title,
			l.listing_type::text AS type,
			COALESCE(c.name, 'Others') AS category,
			l.price,
			l.price_unit AS unit,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(l.location_city), ''), NULLIF(TRIM(l.location_province), ''))) AS location,
			l.status::text AS status,
			COALESCE(li.image_url, '') AS listing_image_url,
			COALESCE(u.id::text, '') AS seller_id,
			TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))) AS seller,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(u.location_city), ''), NULLIF(TRIM(u.location_province), ''))) AS seller_location,
			COALESCE(u.profile_image_url, '') AS seller_profile_image_url,
			COALESCE(tx.transaction_count, 0)::int AS transaction_count,
			COALESCE(rv.review_count, 0)::int AS review_count,
			l.created_at AS created,
			l.updated_at AS updated_at,
			l.banned_until AS banned_until,
			l.deleted_at AS deleted_at,
			COALESCE(l.action_by_id::text, '') AS action_by_id
		FROM public.listings l
		LEFT JOIN public.categories c ON c.id = l.category_id
		LEFT JOIN public.users u ON u.id = l.user_id
		LEFT JOIN (
			SELECT
				listing_id,
				COUNT(*)::int AS transaction_count
			FROM public.listing_transactions
			GROUP BY listing_id
		) tx ON tx.listing_id = l.id
		LEFT JOIN (
			SELECT
				listing_id,
				COUNT(*)::int AS review_count
			FROM public.reviews
			GROUP BY listing_id
		) rv ON rv.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		` + whereClause + `
		ORDER BY l.created_at DESC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&listings).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch listings")
	}

	for i := range listings {
		listings[i].Type = strings.ToUpper(strings.TrimSpace(listings[i].Type))
		listings[i].Status = strings.ToUpper(strings.TrimSpace(listings[i].Status))
		if strings.TrimSpace(listings[i].Seller) == "" {
			listings[i].Seller = "Unknown Seller"
		}
		if strings.TrimSpace(listings[i].SellerLocation) == "" {
			listings[i].SellerLocation = "-"
		}
	}

	return listings, total, nil
}

func ToggleAdminListingVisibility(listingId, actorUserId string) (string, error) {
	normalized, err := getListingStatusById(listingId)
	if err != nil {
		return "", err
	}

	if normalized == "DELETED" {
		return "", fmt.Errorf("Cannot update visibility for deleted listing")
	}
	if normalized != "AVAILABLE" && normalized != "BANNED" {
		return "", fmt.Errorf("Listing cannot be shadow banned from current status")
	}

	nextStatus := "BANNED"
	if normalized == "BANNED" {
		nextStatus = "UNAVAILABLE"
	}

	if err := applyListingVisibilityStatus(listingId, nextStatus, actorUserId); err != nil {
		return "", err
	}

	return nextStatus, nil
}

func getListingStatusById(listingId string) (string, error) {
	db := middleware.DBConn

	var currentStatus string
	result := db.Raw(`
		SELECT status::text AS status
		FROM public.listings
		WHERE id = $1
		LIMIT 1
	`, listingId).Scan(&currentStatus)
	if result.Error != nil {
		return "", fmt.Errorf("Failed to validate listing")
	}
	if result.RowsAffected == 0 {
		return "", fmt.Errorf("Listing not found")
	}

	return strings.ToUpper(strings.TrimSpace(currentStatus)), nil
}

func applyListingVisibilityStatus(listingId, nextStatus, actorUserId string) error {
	db := middleware.DBConn

	updateResult := db.Exec(`
		UPDATE public.listings
		SET
			status = $1::listing_status,
			banned_until = CASE WHEN $1 = 'BANNED' THEN now() + INTERVAL '3 days' ELSE NULL END,
			action_by_id = $3,
			updated_at = now()
		WHERE id = $2
	`, nextStatus, listingId, actorUserId)
	if updateResult.Error != nil {
		return fmt.Errorf("Failed to update listing visibility")
	}
	if updateResult.RowsAffected == 0 {
		return fmt.Errorf("Listing not found")
	}

	return nil
}

func GetAdminTransactions(query model.AdminTransactionsQuery) ([]model.AdminTransactionListItemFromDb, int, error) {
	db := middleware.DBConn
	transactions := make([]model.AdminTransactionListItemFromDb, 0)
	total := 0

	whereParts := make([]string, 0)
	args := make([]any, 0)

	search := strings.ToLower(strings.TrimSpace(query.Search))
	if search != "" {
		likeSearch := "%" + search + "%"
		whereParts = append(whereParts, `
			(
				LOWER(COALESCE(l.title, '')) LIKE ?
				OR LOWER(COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(buyer.first_name), ''), NULLIF(TRIM(buyer.last_name), ''))), ''), buyer.email, '')) LIKE ?
				OR LOWER(COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(owner.first_name), ''), NULLIF(TRIM(owner.last_name), ''))), ''), owner.email, '')) LIKE ?
			)
		`)
		args = append(args, likeSearch, likeSearch, likeSearch)
	}

	typeFilter := strings.ToUpper(strings.TrimSpace(query.Type))
	if typeFilter != "" && typeFilter != "ALL" {
		whereParts = append(whereParts, "l.listing_type::text = ?")
		args = append(args, typeFilter)
	}

	statusFilter := strings.ToUpper(strings.TrimSpace(query.Status))
	if statusFilter != "" && statusFilter != "ALL" {
		whereParts = append(whereParts, "lt.status::text = ?")
		args = append(args, statusFilter)
	}

	whereClause := ""
	if len(whereParts) > 0 {
		whereClause = "WHERE " + strings.Join(whereParts, " AND ")
	}

	countQuery := `
		SELECT COUNT(*)::int
		FROM public.listing_transactions lt
		JOIN public.listings l ON l.id = lt.listing_id
		JOIN public.users buyer ON buyer.id = lt.client_id
		JOIN public.users owner ON owner.id = l.user_id
		` + whereClause

	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch transaction count")
	}

	selectQuery := `
		SELECT
			lt.id::text AS id,
			l.id::text AS listing_id,
			l.listing_type::text AS listing_type,
			COALESCE(l.title, 'Untitled Listing') AS listing_title,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			COALESCE(li.image_url, '') AS listing_image_url,
			buyer.id::text AS client_user_id,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(buyer.first_name), ''), NULLIF(TRIM(buyer.last_name), ''))), ''), buyer.email, 'Unknown User') AS client_full_name,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(buyer.location_city), ''), NULLIF(TRIM(buyer.location_province), ''))) AS client_location,
			COALESCE(buyer.profile_image_url, '') AS client_profile_image_url,
			owner.id::text AS owner_user_id,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(owner.first_name), ''), NULLIF(TRIM(owner.last_name), ''))), ''), owner.email, 'Unknown User') AS owner_full_name,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(owner.location_city), ''), NULLIF(TRIM(owner.location_province), ''))) AS owner_location,
			COALESCE(owner.profile_image_url, '') AS owner_profile_image_url,
			lt.start_date,
			lt.end_date,
			CASE
				WHEN lt.start_date IS NULL OR lt.end_date IS NULL THEN ''
				ELSE TO_CHAR(lt.start_date, 'HH24:MI') || ' - ' || TO_CHAR(lt.end_date, 'HH24:MI')
			END AS selected_time_window,
			COALESCE(lt.total_price, 0)::int AS total_price,
			CASE
				WHEN lt.start_date IS NULL OR lt.end_date IS NULL THEN 1
				ELSE GREATEST(1, (DATE(lt.end_date) - DATE(lt.start_date) + 1))::int
			END AS schedule_units,
			COALESCE(lt.provider_agreed, FALSE) AS provider_agreed,
			COALESCE(lt.client_agreed, FALSE) AS client_agreed,
			lt.status::text AS status,
			lt.completed_at,
			lt.created_at
		FROM public.listing_transactions lt
		JOIN public.listings l
			ON l.id = lt.listing_id
		JOIN public.users buyer
			ON buyer.id = lt.client_id
		JOIN public.users owner
			ON owner.id = l.user_id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		` + whereClause + `
		ORDER BY lt.created_at DESC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&transactions).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch transactions")
	}

	for i := range transactions {
		transactions[i].ListingType = strings.ToUpper(strings.TrimSpace(transactions[i].ListingType))
		transactions[i].Status = strings.ToUpper(strings.TrimSpace(transactions[i].Status))
		if strings.TrimSpace(transactions[i].ClientLocation) == "" {
			transactions[i].ClientLocation = "-"
		}
		if strings.TrimSpace(transactions[i].OwnerLocation) == "" {
			transactions[i].OwnerLocation = "-"
		}
	}

	return transactions, total, nil
}

func DeleteAdminListing(listingId, actorUserId string) error {
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

	var ownerId string
	ownerResult := tx.Raw(`
		SELECT user_id::text
		FROM public.listings
		WHERE id = $1
		LIMIT 1
	`, listingId).Scan(&ownerId)
	if ownerResult.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to validate listing")
	}
	if ownerResult.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Listing not found")
	}

	result := tx.Exec(`
		UPDATE public.listings
		SET
			status = 'DELETED'::listing_status,
			deleted_at = now(),
			action_by_id = $2,
			updated_at = now()
		WHERE id = $1
	`, listingId, actorUserId)
	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to delete listing")
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Listing not found")
	}

	if strings.TrimSpace(ownerId) != "" {
		if err := InsertListingNotificationTx(
			tx,
			strings.TrimSpace(ownerId),
			"Your listing was removed by an administrator.",
			"/listing/"+strings.TrimSpace(listingId),
		); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func GetAdminReports(query model.AdminReportsQuery) ([]model.AdminReportListItemFromDb, int, error) {
	db := middleware.DBConn
	reports := make([]model.AdminReportListItemFromDb, 0)
	total := 0

	whereParts := make([]string, 0)
	args := make([]any, 0)

	search := strings.ToLower(strings.TrimSpace(query.Search))
	if search != "" {
		likeSearch := "%" + search + "%"
		whereParts = append(whereParts, `
			(
				LOWER(COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(rep.first_name), ''), NULLIF(TRIM(rep.last_name), ''))), ''), rep.email, '')) LIKE ?
				OR LOWER(COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(owner.first_name), ''), NULLIF(TRIM(owner.last_name), ''))), ''), owner.email, '')) LIKE ?
				OR LOWER(
					CASE
						WHEN r.reported_listing_id IS NOT NULL THEN COALESCE(l.title, 'Unknown Listing')
						ELSE COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(ru.first_name), ''), NULLIF(TRIM(ru.last_name), ''))), ''), ru.email, 'Unknown User')
					END
				) LIKE ?
				OR LOWER(COALESCE(r.reason, '')) LIKE ?
			)
		`)
		args = append(args, likeSearch, likeSearch, likeSearch, likeSearch)
	}

	statusFilter := strings.ToUpper(strings.TrimSpace(query.Status))
	if statusFilter != "" && statusFilter != "ALL" {
		whereParts = append(whereParts, "r.status::text = ?")
		args = append(args, statusFilter)
	}

	reasonFilter := strings.TrimSpace(query.Reason)
	if reasonFilter != "" && !strings.EqualFold(reasonFilter, "ALL") {
		whereParts = append(whereParts, "r.reason = ?")
		args = append(args, reasonFilter)
	}

	whereClause := ""
	if len(whereParts) > 0 {
		whereClause = "WHERE " + strings.Join(whereParts, " AND ")
	}

	countQuery := `
		SELECT COUNT(*)::int
		FROM public.reports r
		LEFT JOIN public.users rep ON rep.id = r.reporter_id
		LEFT JOIN public.listings l ON l.id = r.reported_listing_id
		LEFT JOIN public.users owner ON owner.id = l.user_id
		LEFT JOIN public.users ru ON ru.id = r.reported_user_id
		` + whereClause

	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch report count")
	}

	selectQuery := `
		SELECT
			r.id::text AS id,
			COALESCE(r.reporter_id::text, '') AS reporter_id,
			TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(rep.first_name), ''), NULLIF(TRIM(rep.last_name), ''))) AS reporter,
			COALESCE(rep.email, '') AS reporter_email,
			COALESCE(rep.profile_image_url, '') AS reporter_profile_image_url,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(rep.location_city), ''), NULLIF(TRIM(rep.location_province), ''))) AS reporter_location,
			COALESCE(ru.id::text, '') AS reported_user_id,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(ru.first_name), ''), NULLIF(TRIM(ru.last_name), ''))), ''), ru.email, 'Unknown User') AS reported_name,
			COALESCE(ru.email, '') AS reported_email,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(ru.location_city), ''), NULLIF(TRIM(ru.location_province), ''))) AS reported_location,
			CASE WHEN r.reported_listing_id IS NOT NULL THEN 'LISTING' ELSE 'USER' END AS target_type,
			CASE
				WHEN r.reported_listing_id IS NOT NULL THEN COALESCE(l.title, 'Unknown Listing')
				ELSE COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(ru.first_name), ''), NULLIF(TRIM(ru.last_name), ''))), ''), ru.email, 'Unknown User')
			END AS target_name,
			COALESCE(r.reported_listing_id::text, r.reported_user_id::text, '') AS target_id,
			COALESCE(l.title, '') AS listing_title,
			COALESCE(l.status::text, '') AS listing_status,
			COALESCE(li.image_url, '') AS listing_image_url,
			COALESCE(l.price, 0)::int AS listing_price,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			COALESCE(owner.id::text, '') AS listing_owner_id,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(owner.first_name), ''), NULLIF(TRIM(owner.last_name), ''))), ''), owner.email, '—') AS listing_owner,
			COALESCE(owner.profile_image_url, '') AS listing_owner_profile_image_url,
			TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(owner.location_city), ''), NULLIF(TRIM(owner.location_province), ''))) AS listing_owner_location,
			r.reason,
			r.description,
			r.status::text AS status,
			NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(rev.first_name), ''), NULLIF(TRIM(rev.last_name), ''))), '') AS reviewed_by,
			r.reviewed_at,
			r.created_at,
			r.created_at AS submitted_at,
			NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(res.first_name), ''), NULLIF(TRIM(res.last_name), ''))), '') AS resolved_by,
			r.resolved_at,
			CASE
				WHEN r.action_taken::text = 'HIDE_LISTING' THEN 'BAN_LISTING'
				ELSE r.action_taken::text
			END AS action_taken,
			r.action_reason
		FROM public.reports r
		LEFT JOIN public.users rep ON rep.id = r.reporter_id
		LEFT JOIN public.listings l ON l.id = r.reported_listing_id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		LEFT JOIN public.users owner ON owner.id = l.user_id
		LEFT JOIN public.users ru ON ru.id = r.reported_user_id
		LEFT JOIN public.users rev ON rev.id = r.reviewed_by_id
		LEFT JOIN public.users res ON res.id = r.resolved_by_id
		` + whereClause + `
		ORDER BY r.created_at DESC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&reports).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch reports")
	}

	for i := range reports {
		reports[i].TargetType = strings.ToUpper(strings.TrimSpace(reports[i].TargetType))
		reports[i].Status = strings.ToUpper(strings.TrimSpace(reports[i].Status))
		reports[i].ListingStatus = strings.ToUpper(strings.TrimSpace(reports[i].ListingStatus))
		if strings.TrimSpace(reports[i].Reporter) == "" {
			reports[i].Reporter = "Unknown Reporter"
		}
		if strings.TrimSpace(reports[i].ReporterLocation) == "" {
			reports[i].ReporterLocation = "-"
		}
		if strings.TrimSpace(reports[i].ReportedLocation) == "" {
			reports[i].ReportedLocation = "-"
		}
		if strings.TrimSpace(reports[i].ListingOwnerLocation) == "" {
			reports[i].ListingOwnerLocation = "-"
		}
	}

	return reports, total, nil
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

func SetAdminReportAction(reportId, adminUserId, action, reason string) error {
	db := middleware.DBConn

	requestAction := strings.ToUpper(strings.TrimSpace(action))
	allowedRequestAction := map[string]bool{
		"DISMISS":        true,
		"BAN_LISTING":    true,
		"DELETE_LISTING": true,
		"LOCK_3":         true,
		"LOCK_7":         true,
		"LOCK_30":        true,
		"PERMANENT_BAN":  true,
	}
	if !allowedRequestAction[requestAction] {
		return fmt.Errorf("Invalid report action")
	}

	normalizedAction := requestAction
	if normalizedAction == "BAN_LISTING" {
		normalizedAction = "HIDE_LISTING"
	}
	trimmedReason := strings.TrimSpace(reason)
	if trimmedReason == "" {
		return fmt.Errorf("Reason is required")
	}
	if len(trimmedReason) > config.AdminReasonMaxLength {
		return fmt.Errorf("Reason must not exceed %d characters", config.AdminReasonMaxLength)
	}

	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	type reportTarget struct {
		ReportedUserId    *string `gorm:"column:reported_user_id"`
		ReportedListingId *string `gorm:"column:reported_listing_id"`
		ListingOwnerId    *string `gorm:"column:listing_owner_id"`
		ReportReason      string  `gorm:"column:report_reason"`
		Status            string  `gorm:"column:status"`
	}

	var target reportTarget
	targetQuery := `
		SELECT
			r.reported_user_id::text AS reported_user_id,
			r.reported_listing_id::text AS reported_listing_id,
			l.user_id::text AS listing_owner_id,
			COALESCE(NULLIF(TRIM(r.reason), ''), 'Policy violation') AS report_reason,
			r.status::text AS status
		FROM public.reports r
		LEFT JOIN public.listings l ON l.id = r.reported_listing_id
		WHERE r.id = $1
		LIMIT 1
	`
	result := tx.Raw(targetQuery, reportId).Scan(&target)
	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to validate report")
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Report not found")
	}

	if strings.EqualFold(strings.TrimSpace(target.Status), "RESOLVED") || strings.EqualFold(strings.TrimSpace(target.Status), "DISMISSED") {
		tx.Rollback()
		return fmt.Errorf("Report is already finalized")
	}

	var targetUserId string
	if target.ReportedUserId != nil && strings.TrimSpace(*target.ReportedUserId) != "" {
		targetUserId = strings.TrimSpace(*target.ReportedUserId)
	} else if target.ListingOwnerId != nil && strings.TrimSpace(*target.ListingOwnerId) != "" {
		targetUserId = strings.TrimSpace(*target.ListingOwnerId)
	}

	targetListingId := ""
	if target.ReportedListingId != nil {
		targetListingId = strings.TrimSpace(*target.ReportedListingId)
	}
	reportLink := "/notifications"
	if targetListingId != "" {
		reportLink = "/listing/" + targetListingId
	}
	reportReason := strings.TrimSpace(target.ReportReason)
	if reportReason == "" {
		reportReason = "Policy violation"
	}

	effectiveAction := normalizedAction
	now := time.Now()

	if (effectiveAction == "LOCK_3" || effectiveAction == "LOCK_7" || effectiveAction == "LOCK_30") && targetUserId == "" {
		tx.Rollback()
		return fmt.Errorf("Reported user is required for account lockout")
	}
	if (effectiveAction == "HIDE_LISTING" || effectiveAction == "DELETE_LISTING") && targetListingId == "" {
		tx.Rollback()
		return fmt.Errorf("Reported listing is required for listing action")
	}
	if effectiveAction == "PERMANENT_BAN" && targetUserId == "" {
		tx.Rollback()
		return fmt.Errorf("Reported user is required for account ban")
	}

	if effectiveAction == "HIDE_LISTING" {
		updateListingResult := tx.Exec(`
			UPDATE public.listings
			SET
				status = 'BANNED'::listing_status,
				banned_until = now() + INTERVAL '1 day',
				action_by_id = $2,
				updated_at = now()
			WHERE id = $1
		`, targetListingId, adminUserId)
		if updateListingResult.Error != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to shadow ban listing")
		}
		if updateListingResult.RowsAffected == 0 {
			tx.Rollback()
			return fmt.Errorf("Listing not found")
		}
	}

	if effectiveAction == "DELETE_LISTING" {
		updateListingResult := tx.Exec(`
			UPDATE public.listings
			SET
				status = 'DELETED'::listing_status,
				deleted_at = now(),
				action_by_id = $2,
				updated_at = now()
			WHERE id = $1
		`, targetListingId, adminUserId)
		if updateListingResult.Error != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to delete listing")
		}
		if updateListingResult.RowsAffected == 0 {
			tx.Rollback()
			return fmt.Errorf("Listing not found")
		}

		if targetUserId != "" {
			if err := InsertReportNotificationTx(tx, targetUserId, fmt.Sprintf("Your listing was removed due to %s.", reportReason), reportLink); err != nil {
				tx.Rollback()
				return fmt.Errorf("Failed to notify listing owner")
			}
		}
	}

	if effectiveAction == "LOCK_3" || effectiveAction == "LOCK_7" || effectiveAction == "LOCK_30" {
		var priorLockoutCount int
		if err := tx.Raw(`
			SELECT COUNT(*)::int
			FROM public.reports r
			LEFT JOIN public.listings l ON l.id = r.reported_listing_id
			WHERE r.status IN ('RESOLVED', 'DISMISSED')
				AND r.action_taken IN ('LOCK_3', 'LOCK_7', 'LOCK_30')
				AND COALESCE(r.reported_user_id, l.user_id) = $1::uuid
		`, targetUserId).Scan(&priorLockoutCount).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to validate prior account lockouts")
		}

		if priorLockoutCount >= 2 {
			effectiveAction = "PERMANENT_BAN"
		} else {
			lockDays := 3
			switch effectiveAction {
			case "LOCK_7":
				lockDays = 7
			case "LOCK_30":
				lockDays = 30
			}
			lockUntil := now.Add(time.Duration(lockDays) * 24 * time.Hour)

			lockResult := tx.Exec(`
				UPDATE public.users
				SET
					account_locked_until = $1,
					updated_at = now()
				WHERE id = $2
					AND deleted_at IS NULL
			`, lockUntil, targetUserId)
			if lockResult.Error != nil {
				tx.Rollback()
				return fmt.Errorf("Failed to lock reported account")
			}
			if lockResult.RowsAffected == 0 {
				tx.Rollback()
				return fmt.Errorf("Reported user not found")
			}

			if err := tx.Exec(`DELETE FROM public.sessions WHERE user_id = $1`, targetUserId).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("Failed to revoke user sessions")
			}

			if err := InsertReportNotificationTx(tx, targetUserId, fmt.Sprintf("Your account has been temporarily locked for %d day(s) due to %s.", lockDays, reportReason), reportLink); err != nil {
				tx.Rollback()
				return fmt.Errorf("Failed to notify locked user")
			}
		}
	}

	if effectiveAction == "PERMANENT_BAN" {
		banResult := tx.Exec(`
			UPDATE public.users
			SET
				is_active = FALSE,
				account_locked_until = NULL,
				deleted_at = now(),
				updated_at = now()
			WHERE id = $1
				AND deleted_at IS NULL
		`, targetUserId)
		if banResult.Error != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to permanently ban reported user")
		}
		if banResult.RowsAffected == 0 {
			tx.Rollback()
			return fmt.Errorf("Reported user not found")
		}

		if err := tx.Exec(`DELETE FROM public.sessions WHERE user_id = $1`, targetUserId).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to revoke user sessions")
		}

		if err := InsertReportNotificationTx(tx, targetUserId, fmt.Sprintf("Your account has been permanently banned due to %s.", reportReason), reportLink); err != nil {
			tx.Rollback()
			return fmt.Errorf("Failed to notify banned user")
		}
	}

	nextStatus := "RESOLVED"
	if effectiveAction == "DISMISS" {
		nextStatus = "DISMISSED"
	}

	result = tx.Exec(`
		UPDATE public.reports
		SET
			status = $1::report_status,
			reviewed_by_id = $2,
			reviewed_at = now(),
			resolved_by_id = $2,
			resolved_at = now(),
			action_taken = $3::report_action,
			action_reason = $4
		WHERE id = $5
	`, nextStatus, adminUserId, effectiveAction, trimmedReason, reportId)

	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to apply report action")
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Report not found")
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

func GetAdminVerifications(query model.AdminVerificationsQuery) ([]model.AdminVerificationListItemFromDb, int, error) {
	db := middleware.DBConn
	rows := make([]model.AdminVerificationListItemFromDb, 0)
	total := 0

	whereParts := make([]string, 0)
	args := make([]any, 0)

	search := strings.ToLower(strings.TrimSpace(query.Search))
	if search != "" {
		likeSearch := "%" + search + "%"
		whereParts = append(whereParts, `
			(
				LOWER(COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))), ''), u.email, '')) LIKE ?
				OR LOWER(COALESCE(u.email, '')) LIKE ?
			)
		`)
		args = append(args, likeSearch, likeSearch)
	}

	statusFilter := strings.ToUpper(strings.TrimSpace(query.Status))
	if statusFilter != "" && statusFilter != "ALL" {
		whereParts = append(whereParts, "uv.verification_status::text = ?")
		args = append(args, statusFilter)
	}

	idTypeFilter := strings.ToLower(strings.TrimSpace(query.IdType))
	if idTypeFilter != "" && idTypeFilter != "all" {
		whereParts = append(whereParts, "LOWER(COALESCE(uv.id_type, '')) = ?")
		args = append(args, idTypeFilter)
	}

	whereClause := ""
	if len(whereParts) > 0 {
		whereClause = "WHERE " + strings.Join(whereParts, " AND ")
	}

	countQuery := `
		SELECT COUNT(*)::int
		FROM public.user_verifications uv
		INNER JOIN public.users u ON u.id = uv.user_id
		` + whereClause

	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch verification count")
	}

	selectQuery := `
		SELECT
			uv.id::text AS id,
			uv.user_id::text AS user_id,
			TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))) AS user_name,
			COALESCE(u.email, '') AS user_email,
			COALESCE(u.profile_image_url, '') AS profile_image_url,
			COALESCE(uv.id_first_name, '') AS id_first_name,
			COALESCE(uv.id_last_name, '') AS id_last_name,
			uv.id_birthdate,
			COALESCE(uv.mobile_number, '') AS mobile_number,
			COALESCE(uv.id_type, '') AS id_type,
			COALESCE(uv.id_number, '') AS id_number,
			COALESCE(uv.id_image_front_url, '') AS id_image_front_url,
			COALESCE(uv.id_image_back_url, '') AS id_image_back_url,
			COALESCE(uv.selfie_url, '') AS selfie_url,
			COALESCE(uv.ip_address, '') AS ip_address,
			COALESCE(uv.user_agent, '') AS user_agent,
			COALESCE(uv.hardware_info, '') AS hardware_info,
			uv.verification_status::text AS status,
			NULLIF(TRIM(uv.reason), '') AS rejection_reason,
			NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(rev.first_name), ''), NULLIF(TRIM(rev.last_name), ''))), '') AS reviewed_by,
			uv.reviewed_at,
			uv.submitted_at
		FROM public.user_verifications uv
		INNER JOIN public.users u ON u.id = uv.user_id
		LEFT JOIN public.users rev ON rev.id = uv.reviewed_by_id
		` + whereClause + `
		ORDER BY uv.submitted_at DESC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch verifications")
	}

	for i := range rows {
		decryptedIDNumber, err := middleware.DecryptVerificationPII(rows[i].IdNumber)
		if err != nil {
			return nil, 0, fmt.Errorf("Failed to decrypt verification data")
		}
		decryptedIDFirstName, err := middleware.DecryptVerificationPII(rows[i].IdFirstName)
		if err != nil {
			return nil, 0, fmt.Errorf("Failed to decrypt verification data")
		}
		decryptedIDLastName, err := middleware.DecryptVerificationPII(rows[i].IdLastName)
		if err != nil {
			return nil, 0, fmt.Errorf("Failed to decrypt verification data")
		}
		decryptedBirthdate, err := middleware.DecryptVerificationPII(rows[i].IdBirthdate)
		if err != nil {
			return nil, 0, fmt.Errorf("Failed to decrypt verification data")
		}
		decryptedMobileNumber, err := middleware.DecryptVerificationPII(rows[i].MobileNumber)
		if err != nil {
			return nil, 0, fmt.Errorf("Failed to decrypt verification data")
		}

		rows[i].IdNumber = strings.TrimSpace(decryptedIDNumber)
		rows[i].IdFirstName = strings.TrimSpace(decryptedIDFirstName)
		rows[i].IdLastName = strings.TrimSpace(decryptedIDLastName)
		rows[i].IdBirthdate = strings.TrimSpace(decryptedBirthdate)
		rows[i].MobileNumber = strings.TrimSpace(decryptedMobileNumber)

		rows[i].Status = strings.ToUpper(strings.TrimSpace(rows[i].Status))
		if strings.TrimSpace(rows[i].UserName) == "" {
			rows[i].UserName = strings.TrimSpace(rows[i].IdFirstName + " " + rows[i].IdLastName)
		}
	}

	return rows, total, nil
}

func SetAdminVerificationStatus(verificationId, reviewedById, status, reason string) error {
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

	normalizedStatus := strings.ToUpper(strings.TrimSpace(status))
	trimmedReason := strings.TrimSpace(reason)

	if normalizedStatus != "VERIFIED" && normalizedStatus != "REJECTED" {
		tx.Rollback()
		return fmt.Errorf("Invalid verification status")
	}
	if trimmedReason == "" {
		tx.Rollback()
		return fmt.Errorf("Reason is required")
	}
	if len(trimmedReason) > config.AdminReasonMaxLength {
		tx.Rollback()
		return fmt.Errorf("Reason must not exceed %d characters", config.AdminReasonMaxLength)
	}

	var verificationRow struct {
		Status string `gorm:"column:status"`
		UserID string `gorm:"column:user_id"`
	}
	if err := tx.Raw(`
		SELECT verification_status::text AS status, user_id::text AS user_id
		FROM public.user_verifications
		WHERE id = $1
		LIMIT 1
	`, verificationId).Scan(&verificationRow).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to validate verification")
	}
	if strings.TrimSpace(verificationRow.UserID) == "" {
		tx.Rollback()
		return fmt.Errorf("Verification not found")
	}
	if !strings.EqualFold(strings.TrimSpace(verificationRow.Status), "PENDING") {
		tx.Rollback()
		return fmt.Errorf("Verification is already reviewed")
	}

	storedReason := ""
	if normalizedStatus == "REJECTED" {
		storedReason = trimmedReason
	}

	updateResult := tx.Exec(`
		UPDATE public.user_verifications
		SET
			verification_status = $1::verification_status,
			reason = NULLIF(TRIM($2), ''),
			reviewed_by_id = $3,
			reviewed_at = now()
		WHERE id = $4
			AND verification_status = 'PENDING'
	`, normalizedStatus, storedReason, reviewedById, verificationId)

	if updateResult.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to update verification status")
	}
	if updateResult.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Verification is already reviewed")
	}

	if err := tx.Exec(`
		UPDATE public.users
		SET
			verification_status = $1::verification_status,
			updated_at = now()
		WHERE id = $2
	`, normalizedStatus, verificationRow.UserID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to update user verification status")
	}

	if err := InsertVerificationNotificationTx(tx, verificationRow.UserID, normalizedStatus, trimmedReason); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}
