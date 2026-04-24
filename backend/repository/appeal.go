package repository

import (
	"fmt"
	"strings"
	"time"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"

	"github.com/google/uuid"
)

func EnsureAppealsTable() error {
	db := middleware.DBConn
	if db == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	createTableQuery := `
		CREATE TABLE IF NOT EXISTS public.appeals (
			id uuid PRIMARY KEY,
			ticket_number text NOT NULL UNIQUE,
			user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
			full_name text NOT NULL,
			email text NOT NULL,
			phone text NULL,
			category text NOT NULL,
			subject text NOT NULL,
			message text NOT NULL,
			evidence_url text NULL,
			status text NOT NULL DEFAULT 'PENDING',
			resolution text NULL,
			admin_note text NULL,
			reviewed_by_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
			reviewed_at timestamptz NULL,
			email_notification_status text NOT NULL DEFAULT 'PENDING',
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)
	`

	if err := db.Exec(createTableQuery).Error; err != nil {
		return fmt.Errorf("failed to ensure appeals table: %w", err)
	}

	indexQueries := []string{
		`CREATE INDEX IF NOT EXISTS idx_appeals_email_created_at ON public.appeals (LOWER(email), created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_appeals_status_created_at ON public.appeals (status, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON public.appeals (user_id)`,
	}

	for _, query := range indexQueries {
		if err := db.Exec(query).Error; err != nil {
			return fmt.Errorf("failed to ensure appeals indexes: %w", err)
		}
	}

	return nil
}

func generateAppealTicketNumber() string {
	timestamp := time.Now().UTC().Format("20060102-150405")
	suffix := strings.ToUpper(uuid.NewString()[:6])
	return fmt.Sprintf("%s-%s-%s", config.AppealTicketPrefix, timestamp, suffix)
}

func normalizeOptionalString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func CreateAppeal(body model.AppealCreateBody) (model.AppealTicketFromDb, error) {
	db := middleware.DBConn
	created := model.AppealTicketFromDb{}

	insertQuery := `
		INSERT INTO public.appeals (
			id,
			ticket_number,
			user_id,
			full_name,
			email,
			phone,
			category,
			subject,
			message,
			evidence_url,
			status,
			email_notification_status,
			created_at,
			updated_at
		)
		VALUES (
			$1::uuid,
			$2,
			NULLIF($3, '')::uuid,
			$4,
			$5,
			$6,
			$7,
			$8,
			$9,
			$10,
			'PENDING',
			'PENDING',
			now(),
			now()
		)
		RETURNING
			id::text AS id,
			ticket_number,
			user_id::text AS user_id,
			full_name,
			email,
			phone,
			category,
			subject,
			message,
			evidence_url,
			status,
			resolution,
			admin_note,
			NULL::text AS reviewed_by,
			reviewed_at,
			created_at,
			updated_at,
			email_notification_status
	`

	id := uuid.NewString()
	ticketNumber := generateAppealTicketNumber()
	if err := db.Raw(
		insertQuery,
		id,
		ticketNumber,
		strings.TrimSpace(body.UserId),
		strings.TrimSpace(body.FullName),
		strings.TrimSpace(body.Email),
		normalizeOptionalString(body.Phone),
		strings.TrimSpace(body.Category),
		strings.TrimSpace(body.Subject),
		strings.TrimSpace(body.Message),
		normalizeOptionalString(body.EvidenceURL),
	).Scan(&created).Error; err != nil {
		return created, fmt.Errorf("Failed to create appeal")
	}

	return created, nil
}

func GetAppeals(query model.AppealQuery) ([]model.AppealTicketFromDb, int, error) {
	db := middleware.DBConn
	appeals := make([]model.AppealTicketFromDb, 0)
	total := 0

	conditions := []string{"1=1"}
	args := make([]any, 0)

	if trimmedEmail := strings.TrimSpace(query.Email); trimmedEmail != "" {
		conditions = append(conditions, "LOWER(a.email) = LOWER(?)")
		args = append(args, trimmedEmail)
	}

	if trimmedStatus := strings.ToUpper(strings.TrimSpace(query.Status)); trimmedStatus != "" && trimmedStatus != "ALL" {
		conditions = append(conditions, "a.status = ?")
		args = append(args, trimmedStatus)
	}

	if trimmedCategory := strings.ToUpper(strings.TrimSpace(query.Category)); trimmedCategory != "" && trimmedCategory != "ALL" {
		conditions = append(conditions, "a.category = ?")
		args = append(args, trimmedCategory)
	}

	if trimmedSearch := strings.ToLower(strings.TrimSpace(query.Search)); trimmedSearch != "" {
		like := "%" + trimmedSearch + "%"
		conditions = append(conditions, `
			(
				LOWER(a.ticket_number) LIKE ?
				OR LOWER(a.full_name) LIKE ?
				OR LOWER(a.email) LIKE ?
				OR LOWER(a.subject) LIKE ?
				OR LOWER(a.message) LIKE ?
			)
		`)
		args = append(args, like, like, like, like, like)
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	countQuery := `SELECT COUNT(*)::int FROM public.appeals a ` + whereClause
	if err := db.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to count appeals")
	}

	selectQuery := `
		SELECT
			a.id::text AS id,
			a.ticket_number,
			a.user_id::text AS user_id,
			a.full_name,
			a.email,
			a.phone,
			a.category,
			a.subject,
			a.message,
			a.evidence_url,
			a.status,
			a.resolution,
			a.admin_note,
			COALESCE(
				NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(ru.first_name), ''), NULLIF(TRIM(ru.last_name), ''))), ''),
				ru.email,
				''
			) AS reviewed_by,
			a.reviewed_at,
			a.created_at,
			a.updated_at,
			a.email_notification_status
		FROM public.appeals a
		LEFT JOIN public.users ru ON ru.id = a.reviewed_by_id
		` + whereClause + `
		ORDER BY a.created_at DESC
		LIMIT ?
		OFFSET ?
	`

	selectArgs := append([]any{}, args...)
	selectArgs = append(selectArgs, query.Limit, query.Offset)

	if err := db.Raw(selectQuery, selectArgs...).Scan(&appeals).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to fetch appeals")
	}

	return appeals, total, nil
}

func GetAppealSummary() (model.AppealSummaryFromDb, error) {
	db := middleware.DBConn
	summary := model.AppealSummaryFromDb{}

	query := `
		SELECT
			COUNT(*)::int AS total,
			COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
			COUNT(*) FILTER (WHERE status = 'REACTIVATED')::int AS reactivated,
			COUNT(*) FILTER (WHERE status = 'DECLINED')::int AS declined
		FROM public.appeals
	`

	if err := db.Raw(query).Scan(&summary).Error; err != nil {
		return summary, fmt.Errorf("Failed to fetch appeal summary")
	}

	return summary, nil
}

func GetAppealById(appealId string) (model.AppealTicketFromDb, error) {
	db := middleware.DBConn
	appeal := model.AppealTicketFromDb{}

	query := `
		SELECT
			a.id::text AS id,
			a.ticket_number,
			a.user_id::text AS user_id,
			a.full_name,
			a.email,
			a.phone,
			a.category,
			a.subject,
			a.message,
			a.evidence_url,
			a.status,
			a.resolution,
			a.admin_note,
			COALESCE(
				NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(ru.first_name), ''), NULLIF(TRIM(ru.last_name), ''))), ''),
				ru.email,
				''
			) AS reviewed_by,
			a.reviewed_at,
			a.created_at,
			a.updated_at,
			a.email_notification_status
		FROM public.appeals a
		LEFT JOIN public.users ru ON ru.id = a.reviewed_by_id
		WHERE a.id = $1::uuid
		LIMIT 1
	`

	result := db.Raw(query, appealId).Scan(&appeal)
	if result.Error != nil {
		return appeal, fmt.Errorf("Failed to fetch appeal")
	}
	if result.RowsAffected == 0 {
		return appeal, fmt.Errorf("Appeal not found")
	}

	return appeal, nil
}

func SetAppealEmailNotificationStatus(appealId, status string) error {
	db := middleware.DBConn

	if err := db.Exec(`
		UPDATE public.appeals
		SET
			email_notification_status = $1,
			updated_at = now()
		WHERE id = $2::uuid
	`, strings.ToUpper(strings.TrimSpace(status)), appealId).Error; err != nil {
		return fmt.Errorf("Failed to update appeal email status")
	}

	return nil
}

func ReviewAppeal(appealId, resolution, adminNote, reviewedById string) (model.AppealTicketFromDb, error) {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return model.AppealTicketFromDb{}, tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	current := struct {
		UserId *string `gorm:"column:user_id"`
		Email  string  `gorm:"column:email"`
		Status string  `gorm:"column:status"`
	}{}

	if err := tx.Raw(`
		SELECT user_id::text AS user_id, email, status
		FROM public.appeals
		WHERE id = $1::uuid
		LIMIT 1
	`, appealId).Scan(&current).Error; err != nil {
		tx.Rollback()
		return model.AppealTicketFromDb{}, fmt.Errorf("Failed to validate appeal")
	}
	if strings.TrimSpace(current.Email) == "" {
		tx.Rollback()
		return model.AppealTicketFromDb{}, fmt.Errorf("Appeal not found")
	}
	if strings.ToUpper(strings.TrimSpace(current.Status)) != "PENDING" {
		tx.Rollback()
		return model.AppealTicketFromDb{}, fmt.Errorf("Appeal has already been reviewed")
	}

	nextStatus := "DECLINED"
	if strings.EqualFold(strings.TrimSpace(resolution), "REACTIVATE") {
		nextStatus = "REACTIVATED"
	}

	if nextStatus == "REACTIVATED" && current.UserId != nil && strings.TrimSpace(*current.UserId) != "" {
		if err := tx.Exec(`
			UPDATE public.users
			SET
				is_active = TRUE,
				deleted_at = NULL,
				failed_login_attempts = 0,
				account_locked_until = NULL,
				updated_at = now(),
				action_by_id = $2::uuid
			WHERE id = $1::uuid
		`, strings.TrimSpace(*current.UserId), reviewedById).Error; err != nil {
			tx.Rollback()
			return model.AppealTicketFromDb{}, fmt.Errorf("Failed to reactivate user account")
		}
	}

	if current.UserId != nil && strings.TrimSpace(*current.UserId) != "" {
		notificationMessage := "Your appeal has been reviewed."
		if nextStatus == "REACTIVATED" {
			notificationMessage = "Your appeal has been approved and your account was reactivated."
		} else if strings.TrimSpace(adminNote) != "" {
			notificationMessage = fmt.Sprintf("Your appeal was declined. Reason: %s", strings.TrimSpace(adminNote))
		}

		if err := InsertAppealNotificationTx(tx, strings.TrimSpace(*current.UserId), notificationMessage, "/support"); err != nil {
			tx.Rollback()
			return model.AppealTicketFromDb{}, err
		}
	}

	if err := tx.Exec(`
		UPDATE public.appeals
		SET
			status = $1,
			resolution = $2,
			admin_note = $3,
			reviewed_by_id = $4::uuid,
			reviewed_at = now(),
			email_notification_status = 'PENDING',
			updated_at = now()
		WHERE id = $5::uuid
	`, nextStatus, strings.ToUpper(strings.TrimSpace(resolution)), strings.TrimSpace(adminNote), reviewedById, appealId).Error; err != nil {
		tx.Rollback()
		return model.AppealTicketFromDb{}, fmt.Errorf("Failed to review appeal")
	}

	if err := tx.Commit().Error; err != nil {
		return model.AppealTicketFromDb{}, err
	}

	return GetAppealById(appealId)
}
