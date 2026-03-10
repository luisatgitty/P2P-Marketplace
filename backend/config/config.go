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
)

// ─── Password ─────────────────────────────────────────
const (
	PwdMinLength    = 8
	PwdMaxLength    = 72
	PwdSpecialChars = "!@#$%^&*()-_=+[]{}|;:',.<>?/`~"
)

// ─── Session ──────────────────────────────────────────
const (
	SessionCookieName     = "session_token"
	SessionTokenLength    = 32
	SessionTokenExpLength = 43
	SessionDuration       = 7 * 24 * time.Hour
)

// ─── Password Reset ───────────────────────────────────
const (
	ResetTokenLength   = 32
	ResetTokenDuration = 15 * time.Minute
)
