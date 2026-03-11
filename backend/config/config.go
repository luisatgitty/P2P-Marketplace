package config

import (
	"time"
)

// ─── Name ─────────────────────────────────────────────
const (
	NameMinLength = 2
	NameMaxLength = 50
)

// ─── Email ────────────────────────────────────────────
const (
	EmailMinLength       = 5
	EmailMaxLength       = 254
	EmailLocalMaxLength  = 64
	EmailDomainMaxLength = 255
	EmailOTPLength       = 6
	EmailOTPDuration     = 10 * time.Minute
)

// ─── Password ─────────────────────────────────────────
const (
	PwdMinLength          = 8
	PwdMaxLength          = 72
	PwdSpecialChars       = "!@#$%^&*()-_=+[]{}|;:',.<>?/`~"
	PwdResetTokenLength   = 32
	PwdResetTokenDuration = 15 * time.Minute
)

// ─── Session ──────────────────────────────────────────
const (
	SessionCookieName     = "session_token"
	SessionTokenLength    = 32
	SessionTokenExpLength = 43
	SessionDuration       = 7 * 24 * time.Hour
)
