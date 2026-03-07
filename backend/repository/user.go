package repository

import (
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model/data"

	"github.com/gofiber/fiber/v2"
)

func IsUserExist(email string) error {
	db := middleware.DBConn
	var count int64
	query := "SELECT COUNT(*) FROM public.users WHERE email=$1"

	if err := db.Raw(query, email).Scan(&count).Error; err != nil {
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
	query := "SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE email=$1"
	err := db.Raw(query, email).Scan(&user).Error
	return user, err
}

func GetUserById(userId interface{}) (data.UserFromDb, error) {
	db := middleware.DBConn
	var user data.UserFromDb
	query := "SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE id=$1"
	err := db.Raw(query, userId).Scan(&user).Error
	return user, err
}

func CreateUser(user data.UserFromReq) error {
	db := middleware.DBConn
	query := "INSERT INTO public.users (first_name, last_name, email, password_hash) VALUES ($1,$2,$3,$4)"
	hashedPassword := middleware.HashPassword(user.Password)
	return db.Exec(query, user.FirstName, user.LastName, user.Email, hashedPassword).Error
}
