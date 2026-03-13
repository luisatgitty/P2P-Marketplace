package repository

import (
	"fmt"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"time"

	"github.com/gofiber/fiber/v2"
)

func IsUserExist(email string) error {
	db := middleware.DBConn
	var count int
	selectQuery := "SELECT COUNT(*) FROM public.users WHERE email=$1"

	if err := db.Raw(selectQuery, email).Scan(&count).Error; err != nil {
		return fmt.Errorf("Failed checking if user exist. Please contact support.")
	}
	if count > 0 {
		return fmt.Errorf("User with email %s already exists", email)
	}
	return nil
}

func GetUserByEmail(email string) (model.UserFromDb, error) {
	db := middleware.DBConn
	var user model.UserFromDb
	selectQuery := "SELECT id, first_name, last_name, email, password_hash, role, verification_status, failed_login_attempts, account_locked_until, phone_number, bio, location_barangay, location_city, location_province, profile_image_url, cover_image_url FROM public.users WHERE email=$1"
	results := db.Raw(selectQuery, email).Scan(&user)

	if results.Error != nil {
		return user, fmt.Errorf("Failed to retrieve user. Please contact support.")
	}
	if results.RowsAffected == 0 {
		return user, fiber.NewError(404, "User does not exist. Please try again.")
	}
	return user, nil
}

func GetUserById(userId interface{}) (model.UserFromDb, error) {
	db := middleware.DBConn
	var user model.UserFromDb
	selectQuery := "SELECT id, first_name, last_name, email, password_hash, role, verification_status, failed_login_attempts, account_locked_until, phone_number, bio, location_barangay, location_city, location_province, profile_image_url, cover_image_url FROM public.users WHERE id=$1"
	results := db.Raw(selectQuery, userId).Scan(&user)

	if results.Error != nil {
		return user, fmt.Errorf("Failed to retrieve user. Please contact support.")
	}
	if results.RowsAffected == 0 {
		return user, fiber.NewError(404, "User not found. Please try again.")
	}
	return user, nil
}

func CreateUser(user model.UserFromBody) error {
	db := middleware.DBConn
	insertQuery := "INSERT INTO public.users (first_name, last_name, email, password_hash, is_email_verified, last_login_at) VALUES ($1,$2,$3,$4,$5,$6)"
	hashedPassword := middleware.HashPassword(user.Password)
	return db.Exec(insertQuery, user.FirstName, user.LastName, user.Email, hashedPassword, true, time.Now()).Error
}

func UpdateUserLastLogin(userId string) error {
	db := middleware.DBConn
	updateQuery := "UPDATE public.users SET last_login_at=$1, failed_login_attempts=0 WHERE id=$2"
	return db.Exec(updateQuery, time.Now(), userId).Error
}

func IncreaseUserFailedLogin(userId string) error {
	db := middleware.DBConn
	updateQuery := "UPDATE public.users SET failed_login_attempts = failed_login_attempts + 1 WHERE id=$1"
	return db.Exec(updateQuery, userId).Error
}

func LockedUserAccount(userId string) error {
	db := middleware.DBConn
	updateQuery := "UPDATE public.users SET failed_login_attempts=0, account_locked_until=$1 WHERE id=$2"
	// NOTE: Update lock duration after development and testing
	return db.Exec(updateQuery, time.Now().Add(30*time.Second), userId).Error
}
