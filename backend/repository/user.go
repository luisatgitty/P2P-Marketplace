package repository

import (
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model/data"
	"time"

	"github.com/gofiber/fiber/v2"
)

func IsUserExist(email string) error {
	db := middleware.DBConn
	var count int64
	selectQuery := "SELECT COUNT(*) FROM public.users WHERE email=$1"

	if err := db.Raw(selectQuery, email).Scan(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return fiber.NewError(409, "Email already exists")
	}
	return nil
}

func GetUserByEmail(email string) (data.UserFromDb, error) {
	db := middleware.DBConn
	var user data.UserFromDb
	selectQuery := "SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE email=$1"
	err := db.Raw(selectQuery, email).Scan(&user).Error
	return user, err
}

func GetUserById(userId interface{}) (data.UserFromDb, error) {
	db := middleware.DBConn
	var user data.UserFromDb
	selectQuery := "SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE id=$1"
	err := db.Raw(selectQuery, userId).Scan(&user).Error
	return user, err
}

func CreateUser(user data.UserFromReq) error {
	db := middleware.DBConn
	insertQuery := "INSERT INTO public.users (first_name, last_name, email, password_hash, last_login_at) VALUES ($1,$2,$3,$4,$5)"
	hashedPassword := middleware.HashPassword(user.Password)
	return db.Exec(insertQuery, user.FirstName, user.LastName, user.Email, hashedPassword, time.Now()).Error
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
