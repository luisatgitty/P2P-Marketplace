package repository

import (
	"fmt"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"time"
)

func InsertEmailVerif(email, otpHash string, expiresAt time.Time) error {
	db := middleware.DBConn
	// Replace existing OTP if user requests resend
	query := "INSERT INTO public.email_verifications (email, otp_hash, expires_at) " +
		"VALUES ($1, $2, $3) " +
		"ON CONFLICT (email) " +
		"DO UPDATE SET otp_hash=$2, expires_at=$3"
	return db.Exec(query, email, otpHash, expiresAt).Error
}

func VerifyEmailVerif(email, otp string) error {
	db := middleware.DBConn
	var verif model.EmailVerifFromDb
	hashedOTP := middleware.HashToken(otp)

	selectQuery := "SELECT email, expires_at FROM public.email_verifications WHERE email=$1 AND otp_hash=$2"
	results := db.Raw(selectQuery, email, hashedOTP).Scan(&verif)

	// Check for errors and if any record was found
	if results.Error != nil {
		return fmt.Errorf("Failed to retrieve OTP record from database")
	}
	if results.RowsAffected == 0 {
		return fmt.Errorf("Invalid OTP")
	}
	if verif.ExpiresAt.Before(time.Now()) {
		return fmt.Errorf("OTP has expired")
	}
	return nil
}

func DeleteEmailVerif(email string) error {
	db := middleware.DBConn
	deleteQuery := "DELETE FROM public.email_verifications WHERE email=$1"
	return db.Exec(deleteQuery, email).Error
}
