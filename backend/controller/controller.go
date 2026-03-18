package controller

import (
	"fmt"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"
)

func storeAndSendOTP(firstName, email string) (retCode int, err error) {
	// Generate OTP and expiration time
	otp, expiration, err := middleware.GenerateOTP(config.EmailOTPLength)
	if err != nil {
		return 500, fmt.Errorf("Failed to generate OTP")
	}
	// Store hashed OTP in database with expiration
	hashedOTP := middleware.HashToken(otp)
	if err := repository.InsertEmailVerif(email, hashedOTP, expiration); err != nil {
		return 500, fmt.Errorf("Failed to store OTP: %v", err)
	}
	// Send OTP email
	if err := middleware.SendOTPEmail(email, firstName, otp); err != nil {
		return 500, fmt.Errorf("Failed to send OTP email: %v", err)
	}
	return 201, nil
}

func validateInputAndUser(body *model.UserFromBody) (retCode int, err error) {
	// Validate the received user data
	if err := middleware.ValidateSignUpInput(body); err != nil {
		return 400, fmt.Errorf("%s", err.Error())
	}
	// Check if email already exists
	if err := repository.IsUserExist(body.Email); err != nil {
		return 409, fmt.Errorf("Email already exists")
	}
	return 201, nil
}

func validatePwdResetToken(token string) (int, string, error) {
	// Check token format
	if err := middleware.ValidateTokenFormat(token); err != nil {
		return 400, "", fmt.Errorf("%s", err.Error())
	}

	// Check if token is valid and not expired
	retCode, userId, err := repository.GetUserToReset(token)
	if err != nil {
		return retCode, "", err
	}
	return 200, userId, nil
}
