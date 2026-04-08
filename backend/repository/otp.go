package repository

import (
	"errors"
	"fmt"
	"time"

	"p2p_marketplace/backend/middleware"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrOTPNotFound    = errors.New("otp: record not found or already verified")
	ErrOTPExpired     = errors.New("otp: code has expired")
	ErrOTPMaxAttempts = errors.New("otp: too many incorrect attempts")
	ErrOTPInvalid     = errors.New("otp: incorrect code")
)

func UpsertOTP(userID string, phoneE164 string, rawOTP string) error {
	db := middleware.DBConn
	if db == nil {
		return fmt.Errorf("otp: database connection is not initialized")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(rawOTP), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("otp: bcrypt hash failed: %w", err)
	}

	query := `
		INSERT INTO public.phone_otps
			(user_id, phone_number, otp_hash, expires_at, attempts, max_attempts, is_verified, created_at)
		VALUES
			($1, $2, $3, now() + INTERVAL '10 minutes', 0, 5, false, now())
		ON CONFLICT (user_id, phone_number) WHERE is_verified = false
		DO UPDATE SET
			otp_hash    = EXCLUDED.otp_hash,
			expires_at  = EXCLUDED.expires_at,
			attempts    = 0,
			max_attempts = EXCLUDED.max_attempts,
			is_verified = false,
			verified_at = NULL,
			created_at  = now()
	`

	result := db.Exec(query, userID, phoneE164, string(hash))
	if result.Error != nil {
		return fmt.Errorf("otp: upsert failed: %w", result.Error)
	}

	return nil
}

func VerifyOTP(userID string, phoneE164 string, rawOTP string) error {
	db := middleware.DBConn
	if db == nil {
		return fmt.Errorf("otp: database connection is not initialized")
	}

	tx := db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("otp: begin tx: %w", tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var (
		otpRow struct {
			ID          string    `gorm:"column:id"`
			OTPHash     string    `gorm:"column:otp_hash"`
			ExpiresAt   time.Time `gorm:"column:expires_at"`
			Attempts    int       `gorm:"column:attempts"`
			MaxAttempts int       `gorm:"column:max_attempts"`
		}
	)

	query := `
		SELECT id::text AS id, otp_hash, expires_at, attempts, max_attempts
		FROM public.phone_otps
		WHERE user_id    = $1
		  AND phone_number = $2
		  AND is_verified  = false
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE
	`

	lookup := tx.Raw(query, userID, phoneE164).Scan(&otpRow)
	if lookup.Error != nil {
		tx.Rollback()
		return fmt.Errorf("otp: lookup failed: %w", lookup.Error)
	}
	if lookup.RowsAffected == 0 {
		tx.Rollback()
		return ErrOTPNotFound
	}

	if otpRow.ExpiresAt.Before(time.Now()) {
		tx.Rollback()
		return ErrOTPExpired
	}

	if otpRow.Attempts >= otpRow.MaxAttempts {
		tx.Rollback()
		return ErrOTPMaxAttempts
	}

	if err := tx.Exec(`UPDATE public.phone_otps SET attempts = attempts + 1 WHERE id = $1`, otpRow.ID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("otp: increment attempts: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(otpRow.OTPHash), []byte(rawOTP)); err != nil {
		if otpRow.Attempts+1 >= otpRow.MaxAttempts {
			if commitErr := tx.Commit().Error; commitErr != nil {
				return fmt.Errorf("otp: commit failed: %w", commitErr)
			}
			return ErrOTPMaxAttempts
		}
		if commitErr := tx.Commit().Error; commitErr != nil {
			return fmt.Errorf("otp: commit failed: %w", commitErr)
		}
		return ErrOTPInvalid
	}

	if err := tx.Exec(`UPDATE public.phone_otps SET is_verified = TRUE, verified_at = now() WHERE id = $1`, otpRow.ID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("otp: mark verified: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("otp: commit failed: %w", err)
	}

	return nil
}

func IsPhoneVerified(userID string, phoneE164 string) (bool, error) {
	db := middleware.DBConn
	if db == nil {
		return false, fmt.Errorf("otp: database connection is not initialized")
	}

	var count int
	if err := db.Raw(`
		SELECT COUNT(*)::int
		FROM public.phone_otps
		WHERE user_id = $1
			AND phone_number = $2
			AND is_verified = TRUE
			AND verified_at >= now() - INTERVAL '30 minutes'
	`, userID, phoneE164).Scan(&count).Error; err != nil {
		return false, fmt.Errorf("otp: check verified: %w", err)
	}

	return count > 0, nil
}

func DeleteExpiredOTPs() (int64, error) {
	db := middleware.DBConn
	if db == nil {
		return 0, fmt.Errorf("otp: database connection is not initialized")
	}

	result := db.Exec(`
		DELETE FROM public.phone_otps
		WHERE expires_at < now() - INTERVAL '1 hour'
	`)
	if result.Error != nil {
		return 0, fmt.Errorf("otp: cleanup failed: %w", result.Error)
	}

	return result.RowsAffected, nil
}
