package middleware

import (
	"errors"
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

	// Check if firstName and lastName are at least 2 characters long
	if len(rcvUser.FirstName) < 1 || len(rcvUser.LastName) < 1 {
		return errors.New("First name and last name must be at least 2 characters long")
	}

	// Check if email is valid
	_, emailError := mail.ParseAddress(rcvUser.Email)
	if emailError != nil {
		return errors.New("Invalid email address")
	}

	// NOTE: Disabled password complexity validation during development
	// isPassValid, passErrors := validatePasswordComplexity(rcvUser.Password)
	// if !isPassValid {
	// 	return errors.New(passErrors[0])
	// }

	return nil
}

func validatePasswordComplexity(password string) (bool, []string) {
	var errs []string
	var (
		hasUpper   bool
		hasLower   bool
		hasDigit   bool
		hasSpecial bool
	)

	// Typically required special characters
	specialChars := "!@#$%^&*()-_=+[]{}|;:',.<>?/`~"

	// Check for uppercase, lowercase, digit, and special character
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

	// Append error messages for any unmet criteria
	if len(password) < 8 {
		errs = append(errs, "Password must be at least 8 characters long")
	}
	if len(password) > 64 {
		errs = append(errs, "Password must not exceed 64 characters")
	}
	if !hasUpper {
		errs = append(errs, "Password must contain at least one uppercase letter")
	}
	if !hasLower {
		errs = append(errs, "Password must contain at least one lowercase letter")
	}
	if !hasDigit {
		errs = append(errs, "Password must contain at least one number")
	}
	if !hasSpecial {
		errs = append(errs, "Password must contain at least one special character (!@#$%^&*...)")
	}

	return len(errs) == 0, errs
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
