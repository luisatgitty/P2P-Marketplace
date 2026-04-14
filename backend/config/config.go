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

// ─── Listing ─────────────────────────────────────────
const (
	ListingTitleMinLength       = 5
	ListingTitleMaxLength       = 120
	ListingCategoryMinLength    = 2
	ListingCategoryMaxLength    = 80
	ListingDescriptionMinLength = 20
	ListingDescriptionMaxLength = 2000
	ListingLocationMinLength    = 2
	ListingLocationMaxLength    = 100
	ListingPriceMinValue        = 1
	ListingPriceMaxValue        = 100000000
	ListingMinPeriodMinLength   = 1
	ListingMinPeriodMaxLength   = 100
	ListingDepositMaxLength     = 120
	ListingTurnaroundMinLength  = 2
	ListingTurnaroundMaxLength  = 120
	ListingServiceAreaMinLength = 2
	ListingServiceAreaMaxLength = 120
	ListingArrangementMaxLength = 80
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
	"Negotiable",
	"Contact for Price",
	"Starting Price",
}

var ListingRentPriceUnits = []string{
	"/ hour",
	"/ day",
	"/ night",
	"/ week",
	"/ month",
	"/ year",
	"/ sq m",
	"/ km",
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
