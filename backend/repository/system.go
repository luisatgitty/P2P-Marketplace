package repository

import (
	"fmt"
	"os"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"

	"golang.org/x/crypto/bcrypt"
)

func EnsureSystemGeneratedUser() error {
	db := middleware.DBConn
	if db == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(os.Getenv("PASS")), bcrypt.MinCost)
	if err != nil {
		return fmt.Errorf("failed to generate system user password hash")
	}

	insertQuery := `
		INSERT INTO public.users (
			id,
			first_name,
			last_name,
			email,
			password_hash,
			role,
			verification_status,
			is_email_verified,
			is_active,
			created_at,
			updated_at
		)
		VALUES (
			?,
			'System',
			'Generated',
			?,
			?,
			'SUPER_ADMIN',
			'VERIFIED',
			TRUE,
			TRUE,
			now(),
			now()
		)
		ON CONFLICT (id) DO NOTHING
	`

	if err := db.Exec(insertQuery, config.SystemGeneratedActorID, os.Getenv("EMAIL"), string(hashedPassword)).Error; err != nil {
		return fmt.Errorf("failed to ensure system-generated user: %w", err)
	}

	return nil
}
