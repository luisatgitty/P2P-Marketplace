package controller

import (
	"crypto/rand"
	"errors"
	"fmt"
	"regexp"
	"strings"

	// "p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

var phoneRegex = regexp.MustCompile(`^9\d{9}$`)
var otpCodeRegex = regexp.MustCompile(`^\d{6}$`)

func normalizePHLocalNumber(value string) string {
	digitsOnly := regexp.MustCompile(`\D`).ReplaceAllString(strings.TrimSpace(value), "")

	switch {
	case len(digitsOnly) == 10 && strings.HasPrefix(digitsOnly, "9"):
		return digitsOnly
	case len(digitsOnly) == 11 && strings.HasPrefix(digitsOnly, "09"):
		return digitsOnly[1:]
	case len(digitsOnly) == 12 && strings.HasPrefix(digitsOnly, "639"):
		return digitsOnly[2:]
	default:
		return ""
	}
}

func toE164(localDigits string) string { return "+63" + localDigits }

func generateOTP() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random otp bytes: %w", err)
	}
	n := (int(b[0])<<16 | int(b[1])<<8 | int(b[2])) % 1_000_000
	return fmt.Sprintf("%06d", n), nil
}

func SendOTP(c *fiber.Ctx) error {
	var req model.SendOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userID := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
	if userID == "" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	digits := normalizePHLocalNumber(req.PhoneNumber)
	if !phoneRegex.MatchString(digits) {
		return SendErrorResponse(c, 400, "Invalid Philippine mobile number. Must be 10 digits starting with 9.", nil)
	}

	rawOTP, err := generateOTP()
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to generate OTP. Please try again.", err)
	}

	phoneE164 := toE164(digits)
	if err = repository.UpsertOTP(userID, phoneE164, rawOTP); err != nil {
		return SendErrorResponse(c, 500, "Failed to store OTP. Please try again.", err)
	}

	// TODO: Replace this with actual SMS service integration
	// smsBody := fmt.Sprintf(
	// 	"Your P2P Marketplace verification code is: %s\n\nThis code expires in 10 minutes. Do not share it with anyone.",
	// 	rawOTP,
	// )
	// if err = middleware.SendSMS(phoneE164, smsBody); err != nil {
	// 	return SendErrorResponse(c, 502, "Failed to send SMS. Please check your number and try again.", err)
	// }

	// NOTE: Only used for development/testing since we don't have a real SMS service integrated yet.
	fmt.Printf("OTP sent successfully: %s", rawOTP)
	return SendSuccessResponse(c, 200, "OTP sent successfully.", nil)
}

func VerifyOTP(c *fiber.Ctx) error {
	var req model.VerifyOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userID := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
	if userID == "" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	digits := normalizePHLocalNumber(req.PhoneNumber)
	if !phoneRegex.MatchString(digits) {
		return SendErrorResponse(c, 400, "Invalid phone number format.", nil)
	}

	code := strings.TrimSpace(req.OTPCode)
	if !otpCodeRegex.MatchString(code) {
		return SendErrorResponse(c, 400, "OTP must be 6 digits.", nil)
	}

	verifyErr := repository.VerifyOTP(userID, toE164(digits), code)
	if verifyErr != nil {
		switch {
		case errors.Is(verifyErr, repository.ErrOTPNotFound):
			return SendErrorResponse(c, 404, "No active OTP found. Please request a new code.", nil)
		case errors.Is(verifyErr, repository.ErrOTPExpired):
			return SendErrorResponse(c, 410, "This code has expired. Please request a new one.", nil)
		case errors.Is(verifyErr, repository.ErrOTPMaxAttempts):
			return SendErrorResponse(c, 429, "Too many incorrect attempts. Please request a new code.", nil)
		case errors.Is(verifyErr, repository.ErrOTPInvalid):
			return SendErrorResponse(c, 422, "Incorrect code. Please try again.", nil)
		default:
			return SendErrorResponse(c, 500, "Verification failed. Please try again.", verifyErr)
		}
	}

	return SendSuccessResponse(c, 200, "Phone number verified successfully.", nil)
}
