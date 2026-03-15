package model

import "time"

type UserFromBody struct {
	UserId    string `json:"userId"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Password  string `json:"password"`
	Email     string `json:"email"`
	IpAddress string `json:"ipAddress"`
	UserAgent string `json:"userAgent"`
	OTP       string `json:"otpString"`
}

type UserFromDb struct {
	UserId      string    `gorm:"column:id"                      json:"userId"`
	FirstName   string    `gorm:"column:first_name"              json:"firstName"`
	LastName    string    `gorm:"column:last_name"               json:"lastName"`
	Password    string    `gorm:"column:password_hash"           json:"password"`
	Email       string    `gorm:"column:email"                   json:"email"`
	PhoneNumber string    `gorm:"column:phone_number"            json:"phoneNumber"`
	Bio         string    `gorm:"column:bio"                     json:"bio"`
	LocationBrg string    `gorm:"column:location_barangay"       json:"locationBrgy"`
	LocationCty string    `gorm:"column:location_city"           json:"locationCity"`
	LocationPrv string    `gorm:"column:location_province"       json:"locationProv"`
	ProfileImg  string    `gorm:"column:profile_image_url"       json:"profileImageUrl"`
	CoverImg    string    `gorm:"column:cover_image_url"         json:"coverImageUrl"`
	Role        string    `gorm:"column:role"                    json:"role"`
	Status      string    `gorm:"column:verification_status"     json:"status"`
	IsActive    bool      `gorm:"column:is_active"               json:"isActive"`
	FailedLogin int       `gorm:"column:failed_login_attempts"   json:"failedLoginAttempts"`
	LockedUntil time.Time `gorm:"column:account_locked_until"    json:"lockedUntil"`
}

type UpdateProfileBody struct {
	FirstName       string            `json:"firstName"`
	LastName        string            `json:"lastName"`
	PhoneNumber     string            `json:"phoneNumber"`
	Bio             string            `json:"bio"`
	LocationProv    string            `json:"locationProv"`
	LocationCity    string            `json:"locationCity"`
	LocationBrgy    string            `json:"locationBrgy"`
	CurrentPassword string            `json:"currentPassword"`
	NewPassword     string            `json:"newPassword"`
	ProfileImage    *ListingImageBody `json:"profileImage,omitempty"`
	CoverImage      *ListingImageBody `json:"coverImage,omitempty"`
}

type UpdateProfileImagesBody struct {
	ProfileImage *ListingImageBody `json:"profileImage,omitempty"`
	CoverImage   *ListingImageBody `json:"coverImage,omitempty"`
}

type LocationOption struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type SessionFromDb struct {
	UserId    string    `gorm:"column:user_id"       json:"userId"`
	IsRevoked bool      `gorm:"column:is_revoked"    json:"isRevoked"`
	ExpiresAt time.Time `gorm:"column:expires_at"    json:"expiresAt"`
}

type PwdResetFromDb struct {
	UserId    string    `gorm:"column:user_id"`
	ExpiresAt time.Time `gorm:"column:expires_at"`
}

type PwdResetFromBody struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type EmailVerifFromDb struct {
	Email     string    `gorm:"column:email"`
	ExpiresAt time.Time `gorm:"column:expires_at"`
}

type CreateListingBody struct {
	Type         string              `json:"type"`
	Title        string              `json:"title"`
	Category     string              `json:"category"`
	Price        int                 `json:"price"`
	PriceUnit    string              `json:"priceUnit"`
	Description  string              `json:"description"`
	Highlights   []string            `json:"highlights"`
	Inclusions   []string            `json:"inclusions"`
	Amenities    []string            `json:"amenities"`
	Images       []ListingImageBody  `json:"images"`
	LocationCity string              `json:"locationCity"`
	LocationProv string              `json:"locationProv"`
	LocationBrgy string              `json:"locationBrgy"`
	SellData     *SellListingBody    `json:"sellData,omitempty"`
	RentData     *RentListingBody    `json:"rentData,omitempty"`
	ServiceData  *ServiceListingBody `json:"serviceData,omitempty"`
}

type SellListingBody struct {
	Condition      string `json:"condition"`
	DeliveryMethod string `json:"deliveryMethod"`
}

type RentListingBody struct {
	MinPeriod      string `json:"minPeriod"`
	Availability   string `json:"availability"`
	Deposit        string `json:"deposit"`
	DeliveryMethod string `json:"deliveryMethod"`
}

type ServiceListingBody struct {
	Turnaround  string `json:"turnaround"`
	ServiceArea string `json:"serviceArea"`
}

type ListingImageBody struct {
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type ProfileUserFromDb struct {
	FirstName    string `gorm:"column:first_name"         json:"firstName"`
	LastName     string `gorm:"column:last_name"          json:"lastName"`
	Email        string `gorm:"column:email"              json:"email"`
	PhoneNumber  string `gorm:"column:phone_number"       json:"phoneNumber"`
	Bio          string `gorm:"column:bio"                json:"bio"`
	LocationBrgy string `gorm:"column:location_barangay"  json:"locationBrgy"`
	LocationCity string `gorm:"column:location_city"      json:"locationCity"`
	LocationProv string `gorm:"column:location_province"  json:"locationProv"`
	ProfileImage string `gorm:"column:profile_image_url"  json:"profileImageUrl"`
	CoverImage   string `gorm:"column:cover_image_url"    json:"coverImageUrl"`
	Role         string `gorm:"column:role"               json:"role"`
	Status       string `gorm:"column:verification_status" json:"status"`
}

type ProfileListingFromDb struct {
	Id           string  `gorm:"column:id"            json:"id"`
	Title        string  `gorm:"column:title"         json:"title"`
	Price        int     `gorm:"column:price"         json:"price"`
	PriceUnit    string  `gorm:"column:price_unit"    json:"priceUnit"`
	Type         string  `gorm:"column:type"          json:"type"`
	Category     string  `gorm:"column:category"      json:"category"`
	Location     string  `gorm:"column:location"      json:"location"`
	PostedAt     string  `gorm:"column:posted_at"     json:"postedAt"`
	ImageUrl     string  `gorm:"column:image_url"     json:"imageUrl"`
	SellerName   string  `gorm:"column:seller_name"   json:"sellerName"`
	SellerRating float64 `gorm:"column:seller_rating" json:"sellerRating"`
	Status       string  `gorm:"column:status"        json:"status"`
}

type HomeListingFromDb struct {
	Id           string    `gorm:"column:id"`
	Title        string    `gorm:"column:title"`
	Price        int       `gorm:"column:price"`
	PriceUnit    string    `gorm:"column:price_unit"`
	Type         string    `gorm:"column:type"`
	Category     string    `gorm:"column:category"`
	Condition    string    `gorm:"column:condition"`
	LocationCity string    `gorm:"column:location_city"`
	LocationProv string    `gorm:"column:location_province"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	ImageUrl     string    `gorm:"column:image_url"`
	SellerName   string    `gorm:"column:seller_name"`
	SellerRating float64   `gorm:"column:seller_rating"`
	SellerIsPro  bool      `gorm:"column:seller_is_pro"`
}

type ListingDetailFromDb struct {
	Id              string     `gorm:"column:id"`
	Title           string     `gorm:"column:title"`
	Price           int        `gorm:"column:price"`
	PriceUnit       string     `gorm:"column:price_unit"`
	Type            string     `gorm:"column:type"`
	Category        string     `gorm:"column:category"`
	CategoryID      string     `gorm:"column:category_id"`
	Description     string     `gorm:"column:description"`
	LocationCity    string     `gorm:"column:location_city"`
	LocationProv    string     `gorm:"column:location_province"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
	ViewCount       int        `gorm:"column:view_count"`
	Status          string     `gorm:"column:status"`
	Highlights      string     `gorm:"column:highlights"`
	Included        string     `gorm:"column:included"`
	Condition       string     `gorm:"column:condition"`
	DeliveryMethod  string     `gorm:"column:delivery_method"`
	MinRentalPeriod int        `gorm:"column:min_rental_period"`
	AvailableFrom   *time.Time `gorm:"column:available_from"`
	Deposit         string     `gorm:"column:deposit"`
	Turnaround      string     `gorm:"column:turnaround_time"`
	ServiceArea     string     `gorm:"column:service_area"`
	SellerName      string     `gorm:"column:seller_name"`
	SellerRating    float64    `gorm:"column:seller_rating"`
	SellerVerified  bool       `gorm:"column:seller_verified"`
}

type ListingEditFromDb struct {
	Id              string     `gorm:"column:id"`
	Type            string     `gorm:"column:type"`
	Title           string     `gorm:"column:title"`
	Category        string     `gorm:"column:category"`
	Price           int        `gorm:"column:price"`
	PriceUnit       string     `gorm:"column:price_unit"`
	Description     string     `gorm:"column:description"`
	Highlights      string     `gorm:"column:highlights"`
	Included        string     `gorm:"column:included"`
	LocationBrgy    string     `gorm:"column:location_barangay"`
	LocationCity    string     `gorm:"column:location_city"`
	LocationProv    string     `gorm:"column:location_province"`
	Condition       string     `gorm:"column:condition"`
	DeliveryMethod  string     `gorm:"column:delivery_method"`
	MinRentalPeriod int        `gorm:"column:min_rental_period"`
	AvailableFrom   *time.Time `gorm:"column:available_from"`
	Deposit         string     `gorm:"column:deposit"`
	Turnaround      string     `gorm:"column:turnaround_time"`
	ServiceArea     string     `gorm:"column:service_area"`
	Status          string     `gorm:"column:status"`
}
