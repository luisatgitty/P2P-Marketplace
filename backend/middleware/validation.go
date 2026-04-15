package middleware

import (
	"encoding/base64"
	"fmt"
	"net/mail"
	"strings"
	"time"
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

	// Validate password length
	if err := ValidatePasswordLength(rcvUser.Password); err != nil {
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

	// Check if the name contains only letters, spaces, hyphens, or apostrophes
	for _, ch := range name {
		if !(unicode.IsLetter(ch) || unicode.IsSpace(ch) || ch == '-' || ch == '\'') {
			return fmt.Errorf("%s can only contain letters, spaces, hyphens, or apostrophes", field)
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
		return fmt.Errorf("Missing token")
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

func ValidateOTP(otp string) error {
	otp = strings.TrimSpace(otp)
	if len(otp) != config.EmailOTPLength {
		return fmt.Errorf("OTP must be %d digits", config.EmailOTPLength)
	}
	for _, ch := range otp {
		if !unicode.IsDigit(ch) {
			return fmt.Errorf("OTP must contain numbers only")
		}
	}
	return nil
}

func ValidateSubmitVerificationInput(body *model.SubmitVerificationBody) error {
	body.IdType = strings.TrimSpace(body.IdType)
	body.IdNumber = strings.TrimSpace(body.IdNumber)
	body.IdFirstName = strings.TrimSpace(body.IdFirstName)
	body.IdLastName = strings.TrimSpace(body.IdLastName)
	body.IdBirthdate = strings.TrimSpace(body.IdBirthdate)
	body.MobileNumber = strings.TrimSpace(body.MobileNumber)
	body.UserAgent = strings.TrimSpace(body.UserAgent)
	body.IpAddress = strings.TrimSpace(body.IpAddress)
	body.HardwareInfo = strings.TrimSpace(body.HardwareInfo)

	if body.IdType == "" {
		return fmt.Errorf("ID type is required")
	}
	if len(body.IdType) < config.VerificationIdTypeMinLength || len(body.IdType) > config.VerificationIdTypeMaxLength {
		return fmt.Errorf("ID type must be between %d and %d characters", config.VerificationIdTypeMinLength, config.VerificationIdTypeMaxLength)
	}
	if !containsExactOption(body.IdType, config.VerificationIdTypes) {
		return fmt.Errorf("Invalid ID type selected")
	}

	if body.IdNumber == "" {
		return fmt.Errorf("ID number is required")
	}
	if len(body.IdNumber) < config.VerificationIdNumberMinLength || len(body.IdNumber) > config.VerificationIdNumberMaxLength {
		return fmt.Errorf("ID number must be between %d and %d characters", config.VerificationIdNumberMinLength, config.VerificationIdNumberMaxLength)
	}

	if err := validateUserName(body.IdFirstName, "First name"); err != nil {
		return err
	}
	if err := validateUserName(body.IdLastName, "Last name"); err != nil {
		return err
	}

	if body.IdBirthdate == "" {
		return fmt.Errorf("ID birthdate is required")
	}
	birthdate, err := time.Parse("2006-01-02", body.IdBirthdate)
	if err != nil {
		return fmt.Errorf("Invalid birthdate format")
	}
	if birthdate.After(time.Now()) {
		return fmt.Errorf("Birthdate cannot be in the future")
	}

	if body.MobileNumber == "" {
		return fmt.Errorf("Mobile number is required")
	}
	if len(body.MobileNumber) != config.VerificationMobileExactLength {
		return fmt.Errorf("Mobile number must be exactly %d digits", config.VerificationMobileExactLength)
	}
	if !strings.HasPrefix(body.MobileNumber, "09") {
		return fmt.Errorf("Mobile number must start with 09")
	}
	for _, ch := range body.MobileNumber {
		if !unicode.IsDigit(ch) {
			return fmt.Errorf("Mobile number must contain numbers only")
		}
	}

	if len(body.UserAgent) < config.VerificationUserAgentMinLength || len(body.UserAgent) > config.VerificationUserAgentMaxLength {
		return fmt.Errorf("User agent must be between %d and %d characters", config.VerificationUserAgentMinLength, config.VerificationUserAgentMaxLength)
	}
	if len(body.IpAddress) < config.VerificationIpAddressMinLength || len(body.IpAddress) > config.VerificationIpAddressMaxLength {
		return fmt.Errorf("IP address must be between %d and %d characters", config.VerificationIpAddressMinLength, config.VerificationIpAddressMaxLength)
	}
	if len(body.HardwareInfo) < config.VerificationHardwareMinLength || len(body.HardwareInfo) > config.VerificationHardwareMaxLength {
		return fmt.Errorf("Hardware info must be between %d and %d characters", config.VerificationHardwareMinLength, config.VerificationHardwareMaxLength)
	}

	if body.IdImageFront == nil || strings.TrimSpace(body.IdImageFront.Data) == "" {
		return fmt.Errorf("ID front image is required")
	}
	if body.IdImageBack == nil || strings.TrimSpace(body.IdImageBack.Data) == "" {
		return fmt.Errorf("ID back image is required")
	}
	if body.SelfieImage == nil || strings.TrimSpace(body.SelfieImage.Data) == "" {
		return fmt.Errorf("Selfie image is required")
	}

	return nil
}

func ValidateCreateListingInput(body *model.CreateListingBody, isEdit bool) error {
	body.Type = strings.TrimSpace(body.Type)
	body.Type = strings.ToLower(body.Type)
	body.Title = strings.TrimSpace(body.Title)
	body.Category = strings.TrimSpace(body.Category)
	body.PriceUnit = strings.TrimSpace(body.PriceUnit)
	body.Description = strings.TrimSpace(body.Description)
	body.LocationCity = strings.TrimSpace(body.LocationCity)
	body.LocationProv = strings.TrimSpace(body.LocationProv)
	body.LocationBrgy = strings.TrimSpace(body.LocationBrgy)

	if body.Type == "" {
		return fmt.Errorf("Listing type is required")
	}
	if body.Type != "sell" && body.Type != "rent" && body.Type != "service" {
		return fmt.Errorf("Invalid listing type")
	}

	if body.Title == "" {
		return fmt.Errorf("Title is required")
	}
	if len(body.Title) < config.ListingTitleMinLength || len(body.Title) > config.ListingTitleMaxLength {
		return fmt.Errorf("Title must be between %d and %d characters", config.ListingTitleMinLength, config.ListingTitleMaxLength)
	}

	if body.Category == "" {
		return fmt.Errorf("Category is required")
	}
	if !containsExactCategory(body.Category, config.ListingCategories) {
		return fmt.Errorf("Invalid category selected")
	}

	if body.Price < config.ListingPriceMinValue || body.Price > config.ListingPriceMaxValue {
		return fmt.Errorf("Price must be between %d and %d", config.ListingPriceMinValue, config.ListingPriceMaxValue)
	}

	if body.PriceUnit == "" {
		return fmt.Errorf("Price unit is required")
	}
	switch body.Type {
	case "sell":
		if !containsExactOption(body.PriceUnit, config.ListingSellPriceUnits) {
			return fmt.Errorf("Invalid price unit selected")
		}
	case "rent":
		if !containsExactOption(body.PriceUnit, config.ListingRentPriceUnits) {
			return fmt.Errorf("Invalid price unit selected")
		}
	case "service":
		if !containsExactOption(body.PriceUnit, config.ListingServicePriceUnits) {
			return fmt.Errorf("Invalid price unit selected")
		}
	}

	if body.Description == "" {
		return fmt.Errorf("Description is required")
	}
	if len(body.Description) < config.ListingDescriptionMinLength || len(body.Description) > config.ListingDescriptionMaxLength {
		return fmt.Errorf("Description must be between %d and %d characters", config.ListingDescriptionMinLength, config.ListingDescriptionMaxLength)
	}

	if body.LocationCity == "" || body.LocationProv == "" {
		return fmt.Errorf("City and province are required")
	}
	if len(body.LocationCity) < config.ListingLocationMinLength || len(body.LocationCity) > config.ListingLocationMaxLength {
		return fmt.Errorf("City must be between %d and %d characters", config.ListingLocationMinLength, config.ListingLocationMaxLength)
	}
	if len(body.LocationProv) < config.ListingLocationMinLength || len(body.LocationProv) > config.ListingLocationMaxLength {
		return fmt.Errorf("Province must be between %d and %d characters", config.ListingLocationMinLength, config.ListingLocationMaxLength)
	}
	if body.LocationBrgy != "" && len(body.LocationBrgy) > config.ListingLocationMaxLength {
		return fmt.Errorf("Barangay must not exceed %d characters", config.ListingLocationMaxLength)
	}

	if len(body.Highlights) > config.ListingMaxHighlights {
		return fmt.Errorf("You can only add up to %d highlights", config.ListingMaxHighlights)
	}
	if err := validateListingTags(body.Highlights, "Highlight"); err != nil {
		return err
	}

	if !isEdit && len(body.Images) == 0 {
		return fmt.Errorf("At least one image is required")
	}
	if len(body.Images) > config.ListingMaxImages {
		return fmt.Errorf("You can upload up to %d images", config.ListingMaxImages)
	}

	if len(body.TimeWindows) > config.ListingMaxTimeWindows {
		return fmt.Errorf("You can add up to %d time windows", config.ListingMaxTimeWindows)
	}
	for _, tw := range body.TimeWindows {
		start := strings.TrimSpace(tw.StartTime)
		end := strings.TrimSpace(tw.EndTime)
		if start == "" || end == "" {
			return fmt.Errorf("Time window start and end are required")
		}
		normalizedStart, err := parseTimeWindowInput(start)
		if err != nil {
			return fmt.Errorf("Invalid time window value")
		}
		normalizedEnd, err := parseTimeWindowInput(end)
		if err != nil {
			return fmt.Errorf("Invalid time window value")
		}
		if normalizedStart >= normalizedEnd {
			return fmt.Errorf("End time must be later than start time")
		}
	}

	switch body.Type {
	case "sell":
		if body.SellData == nil {
			return fmt.Errorf("Missing sell data")
		}
		body.SellData.Condition = strings.TrimSpace(body.SellData.Condition)
		body.SellData.DeliveryMethod = strings.TrimSpace(body.SellData.DeliveryMethod)
		if body.SellData.Condition == "" {
			return fmt.Errorf("Please select a condition")
		}
		if !containsExactOption(body.SellData.Condition, config.ListingConditionOptions) {
			return fmt.Errorf("Invalid condition")
		}
		if body.SellData.DeliveryMethod == "" {
			return fmt.Errorf("Please choose a delivery option")
		}
		if !containsExactOption(body.SellData.DeliveryMethod, config.ListingDeliveryOptions) {
			return fmt.Errorf("Invalid delivery method")
		}
		if len(body.Inclusions) == 0 {
			return fmt.Errorf("Please add at least one inclusion item")
		}
		if len(body.Inclusions) > config.ListingMaxInclusions {
			return fmt.Errorf("You can only add up to %d inclusion items", config.ListingMaxInclusions)
		}
		if err := validateListingTags(body.Inclusions, "Inclusion"); err != nil {
			return err
		}

	case "rent":
		if body.RentData == nil {
			return fmt.Errorf("Missing rent data")
		}
		body.RentData.MinPeriod = strings.TrimSpace(body.RentData.MinPeriod)
		body.RentData.Availability = strings.TrimSpace(body.RentData.Availability)
		body.RentData.Deposit = strings.TrimSpace(body.RentData.Deposit)
		body.RentData.DeliveryMethod = strings.TrimSpace(body.RentData.DeliveryMethod)

		if body.RentData.MinPeriod == "" {
			return fmt.Errorf("Minimum rental period is required")
		}
		if len(body.RentData.MinPeriod) < config.ListingMinPeriodMinLength || len(body.RentData.MinPeriod) > config.ListingMinPeriodMaxLength {
			return fmt.Errorf("Minimum rental period must be between %d and %d characters", config.ListingMinPeriodMinLength, config.ListingMinPeriodMaxLength)
		}
		if body.RentData.DeliveryMethod == "" {
			return fmt.Errorf("Please choose a delivery option")
		}
		if !containsExactOption(body.RentData.DeliveryMethod, config.ListingDeliveryOptions) {
			return fmt.Errorf("Invalid delivery method")
		}
		if body.RentData.Availability == "" {
			return fmt.Errorf("Availability date is required")
		}
		if _, err := time.Parse("2006-01-02", body.RentData.Availability); err != nil {
			return fmt.Errorf("Invalid availability date")
		}
		if len(body.RentData.Deposit) > config.ListingDepositMaxLength {
			return fmt.Errorf("Deposit must not exceed %d characters", config.ListingDepositMaxLength)
		}
		if len(body.Amenities) == 0 {
			return fmt.Errorf("Please add at least one amenity")
		}
		if len(body.Amenities) > config.ListingMaxAmenities {
			return fmt.Errorf("You can only add up to %d amenities", config.ListingMaxAmenities)
		}
		if err := validateListingTags(body.Amenities, "Amenity"); err != nil {
			return err
		}

	case "service":
		if body.ServiceData == nil {
			return fmt.Errorf("Missing service data")
		}
		body.ServiceData.Availability = strings.TrimSpace(body.ServiceData.Availability)
		body.ServiceData.Turnaround = strings.TrimSpace(body.ServiceData.Turnaround)
		body.ServiceData.ServiceArea = strings.TrimSpace(body.ServiceData.ServiceArea)
		body.ServiceData.Arrangement = strings.TrimSpace(body.ServiceData.Arrangement)

		if body.ServiceData.Availability == "" {
			return fmt.Errorf("Availability date is required")
		}
		if _, err := time.Parse("2006-01-02", body.ServiceData.Availability); err != nil {
			return fmt.Errorf("Invalid availability date")
		}
		if body.ServiceData.Turnaround == "" {
			return fmt.Errorf("Turnaround is required")
		}
		if len(body.ServiceData.Turnaround) < config.ListingTurnaroundMinLength || len(body.ServiceData.Turnaround) > config.ListingTurnaroundMaxLength {
			return fmt.Errorf("Turnaround must be between %d and %d characters", config.ListingTurnaroundMinLength, config.ListingTurnaroundMaxLength)
		}
		if body.ServiceData.ServiceArea == "" {
			return fmt.Errorf("Service area is required")
		}
		if len(body.ServiceData.ServiceArea) < config.ListingServiceAreaMinLength || len(body.ServiceData.ServiceArea) > config.ListingServiceAreaMaxLength {
			return fmt.Errorf("Service area must be between %d and %d characters", config.ListingServiceAreaMinLength, config.ListingServiceAreaMaxLength)
		}
		if len(body.ServiceData.Arrangement) > config.ListingArrangementMaxLength {
			return fmt.Errorf("Arrangement must not exceed %d characters", config.ListingArrangementMaxLength)
		}
		if len(body.Inclusions) == 0 {
			return fmt.Errorf("Please add at least one inclusion item")
		}
		if len(body.Inclusions) > config.ListingMaxInclusions {
			return fmt.Errorf("You can only add up to %d inclusion items", config.ListingMaxInclusions)
		}
		if err := validateListingTags(body.Inclusions, "Inclusion"); err != nil {
			return err
		}
	}

	return nil
}

func validateListingTags(tags []string, label string) error {
	for _, tag := range tags {
		value := strings.TrimSpace(tag)
		if value == "" {
			return fmt.Errorf("%s entries must not be empty", label)
		}
		if len(value) < config.ListingTagMinLength || len(value) > config.ListingTagMaxLength {
			return fmt.Errorf("%s entries must be between %d and %d characters", label, config.ListingTagMinLength, config.ListingTagMaxLength)
		}
	}
	return nil
}

func containsExactOption(value string, allowed []string) bool {
	trimmed := strings.TrimSpace(value)
	for _, option := range allowed {
		if trimmed == option {
			return true
		}
	}
	return false
}

func parseTimeWindowInput(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if parsed, err := time.Parse("15:04", trimmed); err == nil {
		return parsed.Format("15:04:05"), nil
	}
	if parsed, err := time.Parse("15:04:05", trimmed); err == nil {
		return parsed.Format("15:04:05"), nil
	}
	return "", fmt.Errorf("invalid time")
}

func containsExactCategory(value string, categories []string) bool {
	trimmed := strings.TrimSpace(value)
	for _, category := range categories {
		if trimmed == category {
			return true
		}
	}
	return false
}
