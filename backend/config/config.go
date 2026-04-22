package config

import (
	"strings"
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

// ─── API Rate Limiter ─────────────────────────────────
const (
	RateLimitPublicMax           = 120
	RateLimitPublicWindow        = 1 * time.Minute
	RateLimitStrictPublicMax     = 20
	RateLimitStrictPublicWindow  = 1 * time.Minute
	RateLimitAuthenticatedMax    = 240
	RateLimitAuthenticatedWindow = 1 * time.Minute
	RateLimitExceededMessage     = "Too many requests. Please try again later."
)

// ─── Profile ─────────────────────────────────────────
const (
	ProfilePhoneExactLength  = 11
	ProfileBioMaxLength      = 200
	ProfileLocationMinLength = 2
	ProfileLocationMaxLength = 100
)

// ─── Listing ─────────────────────────────────────────
const (
	ListingTitleMinLength       = 5
	ListingTitleMaxLength       = 80
	ListingCategoryMinLength    = 2
	ListingCategoryMaxLength    = 80
	ListingDescriptionMinLength = 20
	ListingDescriptionMaxLength = 2000
	ListingLocationMinLength    = 2
	ListingLocationMaxLength    = 100
	ListingPriceMinValue        = 1
	ListingPriceMaxValue        = 100000000
	ListingMinPeriodMinValue    = 1
	ListingMinPeriodMaxValue    = 99
	ListingDepositMaxLength     = 60
	ListingTurnaroundMinLength  = 2
	ListingTurnaroundMaxLength  = 60
	ListingServiceAreaMinLength = 2
	ListingServiceAreaMaxLength = 60
	ListingArrangementMaxLength = 60
	ListingTagMinLength         = 2
	ListingTagMaxLength         = 60
	ListingMaxHighlights        = 10
	ListingMaxInclusions        = 10
	ListingMaxAmenities         = 10
	ListingMaxImages            = 8
	ListingMaxTimeWindows       = 8
)

var ListingCategories = []string{
	"Agriculture & Gardening",
	"Education",
	"Electronics & Gadgets",
	"Events",
	"Fashion & Beauty",
	"Food",
	"Health & Wellness",
	"Hobbies & Collectibles",
	"Home & Living",
	"IT & Digital",
	"Logistics",
	"Maintenance & Repair",
	"Office Supplies",
	"Pet",
	"Professional",
	"Space & Property",
	"Sports & Outdoors",
	"Tools & Equipment",
	"Vehicles",
}

var ListingSellPriceUnits = []string{
	"Fixed Price",
	"Starting Price",
	"Negotiable",
	"Contact for Price",
}

var ListingRentPriceUnits = []string{
	"/ minute",
	"/ hour",
	"/ day",
	"/ night",
	"/ week",
	"/ month",
	"/ year",
}

var ListingServicePriceUnits = []string{
	"/ hour",
	"/ session",
	"/ project",
	"/ package",
	"/ unit",
	"/ sq m",
	"/ km",
	"/ head",
	"Quote Required",
}

var ListingConditionOptions = []string{
	"New",
	"Like New",
	"Well Used",
	"Heavily Used",
	"Defective",
	"Not Working",
}

var ListingDeliveryOptions = []string{
	"Meet-up only",
	"Delivery available",
	"Meet-up or Delivery",
}

// ─── Messaging ──────────────────────────────────────
const (
	MessageContentMaxLength = 2000
	MessagePageDefaultLimit = 20
	MessagePageMaxLimit     = 100
)

// ─── Review ─────────────────────────────────────────
const (
	ReviewRatingMin        = 1
	ReviewRatingMax        = 5
	ReviewCommentMaxLength = 500
)

// ─── Report ─────────────────────────────────────────
const (
	ReportDescriptionMaxLength = 500
	ReportDescriptionMaxWords  = 80
)

var ReportReasons = []string{
	"Scam / Fraud",
	"Prohibited",
	"Spam / Duplicate",
	"Listing Issue",
	"Transaction Issue",
	"Offensive Language",
	"Other",
}

var reportReasonAliases = map[string]string{
	"prohibited":         "Prohibited",
	"prohibited item":    "Prohibited",
	"spam / duplicate":   "Spam / Duplicate",
	"listing issue":      "Listing Issue",
	"\"listing issue":    "Listing Issue",
	"transaction issue":  "Transaction Issue",
	"offensive language": "Offensive Language",
	"other":              "Other",
	"scam / fraud":       "Scam / Fraud",
}

func NormalizeReportReason(reason string) string {
	trimmedReason := strings.TrimSpace(reason)
	if trimmedReason == "" {
		return ""
	}

	lookupKey := strings.ToLower(trimmedReason)
	if canonical, exists := reportReasonAliases[lookupKey]; exists {
		return canonical
	}

	for _, allowedReason := range ReportReasons {
		if strings.EqualFold(trimmedReason, allowedReason) {
			return allowedReason
		}
	}

	return ""
}

// ─── Admin Moderation ──────────────────────────────
const (
	AdminReasonMaxLength = 500
)

// ─── Automated Moderation ─────────────────────────
const (
	SystemGeneratedActorID          = "00000000-0000-0000-0000-000000000000"
	SystemModerationReportReason    = "Offensive Language"
	SystemModerationShadowBanPeriod = 7 * 24 * time.Hour
)

var AdminReportActionTypes = []string{
	"DISMISS",
	"BAN_LISTING",
	"LOCK_3",
	"LOCK_7",
	"LOCK_30",
	"DELETE_LISTING",
	"PERMANENT_BAN",
}

// ─── Seller Verification ───────────────────────────
const (
	VerificationMinAgeYears        = 18
	VerificationIdTypeMinLength    = 3
	VerificationIdTypeMaxLength    = 20
	VerificationIdNumberMinLength  = 4
	VerificationIdNumberMaxLength  = 60
	VerificationMobileExactLength  = 11
	VerificationUserAgentMinLength = 1
	VerificationUserAgentMaxLength = 1024
	VerificationIpAddressMinLength = 7
	VerificationIpAddressMaxLength = 45
	VerificationHardwareMinLength  = 200
	VerificationHardwareMaxLength  = 350
)

var VerificationIdTypes = []string{
	"philsys",
	"postal",
	"drivers",
	"prc",
	"passport",
	"sss",
	"gsis",
	"hdmf",
	"voters",
	"acr",
}
