package model

import "time"

type UserFromBody struct {
	UserId    string `json:"userId"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Password  string `json:"password"`
	Email     string `json:"email"`
	IpAddress string `json:"ipAddress"`
	UserAgent string `json:"userAgent"`
}

type UserFromDb struct {
	UserId      string    `gorm:"column:id"                      json:"userId"`
	FirstName   string    `gorm:"column:first_name"              json:"firstName"`
	LastName    string    `gorm:"column:last_name"               json:"lastName"`
	Password    string    `gorm:"column:password_hash"           json:"password"`
	Email       string    `gorm:"column:email"                   json:"email"`
	Role        string    `gorm:"column:role"                    json:"role"`
	Status      string    `gorm:"column:verification_status"     json:"status"`
	FailedLogin int       `gorm:"column:failed_login_attempts"   json:"failedLoginAttempts"`
	LockedUntil time.Time `gorm:"column:account_locked_until"    json:"lockedUntil"`
}

type SessionFromDb struct {
	UserId    string    `gorm:"column:user_id"       json:"userId"`
	IsRevoked bool      `gorm:"column:is_revoked"    json:"isRevoked"`
	ExpiresAt time.Time `gorm:"column:expires_at"    json:"expiresAt"`
}

type PwdResetFromDb struct {
	UserId    string    `gorm:"column:user_id"`
	ExpiresAt time.Time `gorm:"column:expires_at"`
}

type PwdResetFromBody struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}
