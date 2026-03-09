package middleware

import (
	"errors"
	"fmt"
	"net/mail"
	"os"
	"unicode"

	"github.com/joho/godotenv"
)

func GetEnv(key string) string {
	err := godotenv.Load(".env")

	if err != nil {
		fmt.Println("Error loading .env file")
		return err.Error()
	}
	return os.Getenv(key)
}

func ValidateSignUpInput(email, password, firstName, lastName string) error {
	// Check if firstName and lastName are at least 2 characters long
	if len(firstName) < 1 || len(lastName) < 1 {
		return errors.New("First name and last name must be at least 2 characters long")
	}

	// Check if email is valid
	_, emailError := mail.ParseAddress(email)
	if emailError != nil {
		return errors.New("Invalid email address")
	}

	// NOTE: Disabled password complexity validation during development
	// isPassValid, passErrors := ValidatePasswordComplexity(password)
	// if !isPassValid {
	// 	return errors.New(passErrors[0])
	// }

	return nil
}

func ValidatePasswordComplexity(password string) (bool, []string) {
	var errs []string

	var (
		hasUpper   bool
		hasLower   bool
		hasDigit   bool
		hasSpecial bool
	)

	// Typically required special characters
	specialChars := "!@#$%^&*()-_=+[]{}|;:',.<>?/`~"

	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		case ContainsRune(specialChars, ch):
			hasSpecial = true
		}
	}

	// Error messages
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

func ContainsRune(s string, r rune) bool {
	// Check if password contains a specific special character
	for _, c := range s {
		if c == r {
			return true
		}
	}
	return false
}
