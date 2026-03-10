package middleware

import (
	"encoding/base64"
	"fmt"
	"net/mail"
	"strings"
	"unicode"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/model"
)

func ValidateSignUpInput(rcvUser *model.UserFromBody) error {
	// Trim whitespaces of user data
	rcvUser.FirstName = strings.TrimSpace(rcvUser.FirstName)
	rcvUser.LastName = strings.TrimSpace(rcvUser.LastName)
	rcvUser.Email = strings.TrimSpace(rcvUser.Email)
	rcvUser.Password = strings.TrimSpace(rcvUser.Password)

	// Validate first name and last name
	if err := validateUserName(rcvUser.FirstName, "First name"); err != nil {
		return err
	}
	if err := validateUserName(rcvUser.LastName, "Last name"); err != nil {
		return err
	}

	// Validate email format
	if err := ValidateEmail(rcvUser.Email); err != nil {
		return err
	}

	// NOTE: Disabled password complexity validation during development
	// Validate password complexity
	// if err := validatePasswordComplexity(rcvUser.Password); err != nil {
	// 	return err
	// }

	return nil
}
func validateUserName(name string, field string) error {
	// Check if name is at least the minimum length
	if len(name) < config.NameMinLength {
		return fmt.Errorf("%s must be at least %d characters", field, config.NameMinLength)
	}

	// Check if name is not more than the maximum length
	if len(name) > config.NameMaxLength {
		return fmt.Errorf("%s must not exceed %d characters", field, config.NameMaxLength)
	}

	// Check if the name contains only letters, spaces, or hyphens
	for _, ch := range name {
		if !(unicode.IsLetter(ch) || unicode.IsSpace(ch) || ch == '-') {
			return fmt.Errorf("%s can only contain letters, spaces, or hyphens", field)
		}
	}

	return nil
}

func ValidateEmail(email string) error {
	// Validate email length
	if len(email) > config.EmailMaxLength || len(email) < config.EmailMinLength {
		return fmt.Errorf("Invalid email length")
	}

	// Validate email local part and domain part lengths
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return fmt.Errorf("Invalid email format")
	}
	if len(parts[0]) > config.EmailLocalMaxLength {
		return fmt.Errorf("Invalid email local part length")
	}
	if len(parts[1]) > config.EmailDomainMaxLength {
		return fmt.Errorf("Invalid email domain part length")
	}

	// Validate email format using net/mail package
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("Invalid email format")
	}

	return nil
}

func ValidatePasswordLength(password string) error {
	if len(password) < config.PwdMinLength {
		return fmt.Errorf("Password must be at least %d characters", config.PwdMinLength)
	}
	if len(password) > config.PwdMaxLength {
		return fmt.Errorf("Password must not exceed %d characters", config.PwdMaxLength)
	}
	return nil
}

func ValidatePasswordComplexity(password string) error {
	// Validate password length before checking complexity
	if err := ValidatePasswordLength(password); err != nil {
		return err
	}

	// Check each character for uppercase, lowercase, digit, and special character
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		case containsRune(config.PwdSpecialChars, ch):
			hasSpecial = true
		}
	}

	// Validate password complexity requirements
	if !hasUpper {
		return fmt.Errorf("Password must contain at least one uppercase letter")
	}
	if !hasLower {
		return fmt.Errorf("Password must contain at least one lowercase letter")
	}
	if !hasDigit {
		return fmt.Errorf("Password must contain at least one number")
	}
	if !hasSpecial {
		return fmt.Errorf("Password must contain at least one special character")
	}

	return nil
}

func containsRune(s string, r rune) bool {
	// Check if password contains a specific special character
	for _, c := range s {
		if c == r {
			return true
		}
	}
	return false
}

func ValidateTokenFormat(token string) error {
	// Check if the token is empty
	if token == "" {
		return fmt.Errorf("Token cannot be empty")
	}

	// Check token length (Expected length is 43 chars for a 32-byte base64 string)
	if len(token) != config.SessionTokenExpLength {
		fmt.Println("Token length error: expected", config.SessionTokenExpLength, "got", len(token))
		return fmt.Errorf("Invalid token length")
	}

	// Check if token is valid base64
	if _, err := base64.RawURLEncoding.DecodeString(token); err != nil {
		return fmt.Errorf("Invalid token format")
	}

	return nil
}
