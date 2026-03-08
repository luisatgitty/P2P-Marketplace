package middleware

import (
	"fmt"
	"net/mail"
	"os"
	"p2p_marketplace/backend/model/data"
	"strings"
	"unicode"

	"github.com/joho/godotenv"
)

func GetEnv(key string) string {
	// Load .env file and get the value of the specified key
	if err := godotenv.Load(".env"); err != nil {
		fmt.Println("Error loading .env file")
		return err.Error()
	}
	return os.Getenv(key)
}

func ValidateSignUpInput(rcvUser *data.UserFromReq) error {
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
	// Check if firstName and lastName are at least 2 characters
	if len(name) < 2 {
		return fmt.Errorf("%s must be at least 2 characters", field)
	}

	// Check if firstName and lastName are not more than 50 characters
	if len(name) > 50 {
		return fmt.Errorf("%s must not exceed 50 characters", field)
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
	if len(email) > 254 || len(email) < 3 {
		return fmt.Errorf("Invalid email length")
	}

	// Validate email local part and domain part lengths
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return fmt.Errorf("Invalid email format")
	}
	if len(parts[0]) > 64 {
		return fmt.Errorf("Invalid email local part length")
	}
	if len(parts[1]) > 255 {
		return fmt.Errorf("Invalid email domain part length")
	}

	// Validate email format using net/mail package
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("Invalid email format")
	}

	return nil
}

func ValidatePasswordLength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("Password must be at least 8 characters")
	}
	if len(password) > 72 {
		return fmt.Errorf("Password must not exceed 72 characters")
	}
	return nil
}

func validatePasswordComplexity(password string) error {
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	specialChars := "!@#$%^&*()-_=+[]{}|;:',.<>?/`~"

	// Validate password length before checking complexity
	if err := ValidatePasswordLength(password); err != nil {
		return err
	}

	// Check each character for uppercase, lowercase, digit, and special character
	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		case containsRune(specialChars, ch):
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
