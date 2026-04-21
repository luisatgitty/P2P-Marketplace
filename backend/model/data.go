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
	ProfileImage       *ListingImageBody `json:"profileImage,omitempty"`
	CoverImage         *ListingImageBody `json:"coverImage,omitempty"`
	RemoveProfileImage bool              `json:"removeProfileImage,omitempty"`
	RemoveCoverImage   bool              `json:"removeCoverImage,omitempty"`
}

type SubmitVerificationBody struct {
	IdType       string            `json:"idType"`
	IdNumber     string            `json:"idNumber"`
	IdFirstName  string            `json:"idFirstName"`
	IdLastName   string            `json:"idLastName"`
	IdBirthdate  string            `json:"idBirthdate"`
	MobileNumber string            `json:"mobileNumber"`
	UserAgent    string            `json:"userAgent"`
	IpAddress    string            `json:"ipAddress"`
	HardwareInfo string            `json:"hardwareInfo"`
	IdImageFront *ListingImageBody `json:"idImageFront"`
	IdImageBack  *ListingImageBody `json:"idImageBack"`
	SelfieImage  *ListingImageBody `json:"selfieImage"`
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
	TimeWindows  []ListingTimeWindow `json:"timeWindows"`
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
	DaysOff        string `json:"daysOff"`
}

type ServiceListingBody struct {
	Availability string `json:"availability"`
	Turnaround   string `json:"turnaround"`
	ServiceArea  string `json:"serviceArea"`
	Arrangement  string `json:"arrangement"`
	DaysOff      string `json:"daysOff"`
}

type ListingTimeWindow struct {
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}

type ListingImageBody struct {
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type ReportListingBody struct {
	ReportedUserId string `json:"reportedUserId"`
	Reason         string `json:"reason"`
	Description    string `json:"description"`
}

type ReviewListingBody struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type ListingReviewFromDb struct {
	Id             string `gorm:"column:id"`
	Rating         int    `gorm:"column:rating"`
	Comment        string `gorm:"column:comment"`
	ReviewerId     string `gorm:"column:reviewer_id"`
	ReviewedUserId string `gorm:"column:reviewed_user_id"`
	ListingId      string `gorm:"column:listing_id"`
}

type ProfileUserFromDb struct {
	FirstName          string     `gorm:"column:first_name"         json:"firstName"`
	LastName           string     `gorm:"column:last_name"          json:"lastName"`
	Email              string     `gorm:"column:email"              json:"email"`
	IsActive           bool       `gorm:"column:is_active"          json:"isActive"`
	AccountLockedUntil *time.Time `gorm:"column:account_locked_until" json:"accountLockedUntil"`
	PhoneNumber        string     `gorm:"column:phone_number"       json:"phoneNumber"`
	Bio                string     `gorm:"column:bio"                json:"bio"`
	LocationBrgy       string     `gorm:"column:location_barangay"  json:"locationBrgy"`
	LocationCity       string     `gorm:"column:location_city"      json:"locationCity"`
	LocationProv       string     `gorm:"column:location_province"  json:"locationProv"`
	ProfileImage       string     `gorm:"column:profile_image_url"  json:"profileImageUrl"`
	CoverImage         string     `gorm:"column:cover_image_url"    json:"coverImageUrl"`
	Role               string     `gorm:"column:role"               json:"role"`
	Status             string     `gorm:"column:verification_status" json:"status"`
	CreatedAt          time.Time  `gorm:"column:created_at"      json:"createdAt"`
	LastLoginAt        *time.Time `gorm:"column:last_login_at"  json:"lastLoginAt"`
	OverallRating      float64    `gorm:"column:overall_rating"   json:"overallRating"`
	ReviewCount        int        `gorm:"column:review_count"          json:"reviewCount"`
}

type ProfileListingFromDb struct {
	Id               string  `gorm:"column:id"            json:"id"`
	Title            string  `gorm:"column:title"         json:"title"`
	Price            int     `gorm:"column:price"         json:"price"`
	PriceUnit        string  `gorm:"column:price_unit"    json:"priceUnit"`
	Type             string  `gorm:"column:type"          json:"type"`
	Category         string  `gorm:"column:category"      json:"category"`
	Location         string  `gorm:"column:location"      json:"location"`
	PostedAt         string  `gorm:"column:posted_at"     json:"postedAt"`
	ImageUrl         string  `gorm:"column:image_url"     json:"imageUrl"`
	SellerName       string  `gorm:"column:seller_name"   json:"sellerName"`
	SellerRating     float64 `gorm:"column:seller_rating" json:"sellerRating"`
	Status           string  `gorm:"column:status"        json:"status"`
	HasActiveBooking bool    `gorm:"column:has_active_booking" json:"hasActiveBooking"`
}

type ProfileReviewFromDb struct {
	Id               string `gorm:"column:id"`
	ReviewerId       string `gorm:"column:reviewer_id"`
	ReviewerName     string `gorm:"column:reviewer_name"`
	ReviewerImageUrl string `gorm:"column:reviewer_image_url"`
	ReviewerStatus   string `gorm:"column:reviewer_status"`
	Rating           int    `gorm:"column:rating"`
	Comment          string `gorm:"column:comment"`
	ReviewDate       string `gorm:"column:review_date"`
	ListingId        string `gorm:"column:listing_id"`
	ListingTitle     string `gorm:"column:listing_title"`
	ListingPrice     int    `gorm:"column:listing_price"`
	ListingPriceUnit string `gorm:"column:listing_price_unit"`
	ListingImageUrl  string `gorm:"column:listing_image_url"`
	ListingType      string `gorm:"column:listing_type"`
	ListingLocation  string `gorm:"column:listing_location"`
}

type HomeListingFromDb struct {
	Id           string    `gorm:"column:id"`
	Title        string    `gorm:"column:title"`
	Price        int       `gorm:"column:price"`
	PriceUnit    string    `gorm:"column:price_unit"`
	Type         string    `gorm:"column:type"`
	Status       string    `gorm:"column:status"`
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

type ListingsFilter struct {
	Type         string
	Keyword      string
	Category     string
	Condition    string
	Province     string
	UserProvince string
	City         string
	PriceMin     *int
	PriceMax     *int
	Sort         string
	Limit        int
	Offset       int
}

type AdminDashboardStatsFromDb struct {
	TotalUsers                    int `gorm:"column:total_users" json:"totalUsers"`
	ActiveUsers                   int `gorm:"column:active_users" json:"activeUsers"`
	InactiveUsers                 int `gorm:"column:inactive_users" json:"inactiveUsers"`
	VerifiedUsers                 int `gorm:"column:verified_users" json:"verifiedUsers"`
	LockedUsers                   int `gorm:"column:locked_users" json:"lockedUsers"`
	NewUsersThisWeek              int `gorm:"column:new_users_this_week" json:"newUsersThisWeek"`
	NewUsersLastWeek              int `gorm:"column:new_users_last_week" json:"newUsersLastWeek"`
	ActiveListings                int `gorm:"column:active_listings" json:"activeListings"`
	NewListingsThisWeek           int `gorm:"column:new_listings_this_week" json:"newListingsThisWeek"`
	NewListingsLastWeek           int `gorm:"column:new_listings_last_week" json:"newListingsLastWeek"`
	PendingReports                int `gorm:"column:pending_reports" json:"pendingReports"`
	PendingReportsToday           int `gorm:"column:pending_reports_today" json:"pendingReportsToday"`
	PendingReportsYesterday       int `gorm:"column:pending_reports_yesterday" json:"pendingReportsYesterday"`
	PendingVerifications          int `gorm:"column:pending_verifications" json:"pendingVerifications"`
	PendingVerificationsToday     int `gorm:"column:pending_verifications_today" json:"pendingVerificationsToday"`
	PendingVerificationsYesterday int `gorm:"column:pending_verifications_yesterday" json:"pendingVerificationsYesterday"`
}

type AdminWeeklyNewUsersFromDb struct {
	Day      string `gorm:"column:day" json:"day"`
	Count    int    `gorm:"column:count" json:"count"`
	DayOrder int    `gorm:"column:day_order" json:"-"`
}

type AdminListingTypeCountFromDb struct {
	ListingType string `gorm:"column:listing_type" json:"listingType"`
	Count       int    `gorm:"column:count" json:"count"`
}

type NotificationFromDb struct {
	Id        string    `gorm:"column:id" json:"id"`
	UserId    string    `gorm:"column:user_id" json:"userId"`
	Type      string    `gorm:"column:type" json:"type"`
	Message   string    `gorm:"column:message" json:"message"`
	Link      string    `gorm:"column:link" json:"link"`
	IsRead    bool      `gorm:"column:is_read" json:"isRead"`
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
}

type AdminListingTypeBreakdownItem struct {
	Type  string  `json:"type"`
	Count int     `json:"count"`
	Pct   float64 `json:"pct"`
}

type AdminUserListItemFromDb struct {
	Id                 string     `gorm:"column:id" json:"id"`
	FirstName          string     `gorm:"column:first_name" json:"first_name"`
	LastName           string     `gorm:"column:last_name" json:"last_name"`
	ProfileImageURL    string     `gorm:"column:profile_image_url" json:"profile_image_url"`
	Email              string     `gorm:"column:email" json:"email"`
	Phone              string     `gorm:"column:phone" json:"phone"`
	Role               string     `gorm:"column:role" json:"role"`
	Verification       string     `gorm:"column:verification" json:"verification"`
	IsActive           bool       `gorm:"column:is_active" json:"is_active"`
	IsEmailVerified    bool       `gorm:"column:is_email_verified" json:"is_email_verified"`
	FailedLogin        int        `gorm:"column:failed_login" json:"failed_login"`
	Listings           int        `gorm:"column:listings" json:"listings"`
	ClientTransactions int        `gorm:"column:client_transactions" json:"client_transactions"`
	OwnerTransactions  int        `gorm:"column:owner_transactions" json:"owner_transactions"`
	AccountLockedUntil *time.Time `gorm:"column:account_locked_until" json:"account_locked_until"`
	LastLogin          *time.Time `gorm:"column:last_login" json:"last_login"`
	Joined             time.Time  `gorm:"column:joined" json:"joined"`
	UpdatedAt          time.Time  `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt          *time.Time `gorm:"column:deleted_at" json:"deleted_at"`
	ActionByName       string     `gorm:"column:action_by_name" json:"action_by_name"`
	ActionByEmail      string     `gorm:"column:action_by_email" json:"action_by_email"`
	Location           string     `gorm:"column:location" json:"location"`
}

type AdminUsersQuery struct {
	Search   string
	Status   string
	Verified string
	Limit    int
	Offset   int
}

type AdminSetUserActiveBody struct {
	IsActive *bool `json:"isActive"`
}

type AdminAccountListItemFromDb struct {
	Id              string     `gorm:"column:id" json:"id"`
	FirstName       string     `gorm:"column:first_name" json:"first_name"`
	LastName        string     `gorm:"column:last_name" json:"last_name"`
	ProfileImageURL string     `gorm:"column:profile_image_url" json:"profile_image_url"`
	Email           string     `gorm:"column:email" json:"email"`
	Phone           string     `gorm:"column:phone" json:"phone"`
	Role            string     `gorm:"column:role" json:"role"`
	IsActive        bool       `gorm:"column:is_active" json:"is_active"`
	CreatedAt       time.Time  `gorm:"column:created_at" json:"created_at"`
	LastLogin       *time.Time `gorm:"column:last_login" json:"last_login"`
	UpdatedAt       time.Time  `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt       *time.Time `gorm:"column:deleted_at" json:"deleted_at"`
	DeletedByName   string     `gorm:"column:deleted_by_name" json:"deleted_by_name"`
	DeletedByEmail  string     `gorm:"column:deleted_by_email" json:"deleted_by_email"`
}

type AdminAccountsQuery struct {
	Search string
	Role   string
	Status string
	Limit  int
	Offset int
}

type AdminCreateAdminBody struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Role      string `json:"role"`
	Password  string `json:"password"`
}

type AdminListingListItemFromDb struct {
	Id               string     `gorm:"column:id" json:"id"`
	Title            string     `gorm:"column:title" json:"title"`
	Type             string     `gorm:"column:type" json:"type"`
	Category         string     `gorm:"column:category" json:"category"`
	Price            int        `gorm:"column:price" json:"price"`
	Unit             string     `gorm:"column:unit" json:"unit"`
	Location         string     `gorm:"column:location" json:"location"`
	Status           string     `gorm:"column:status" json:"status"`
	ListingImageURL  string     `gorm:"column:listing_image_url" json:"listing_image_url"`
	SellerId         string     `gorm:"column:seller_id" json:"seller_id"`
	Seller           string     `gorm:"column:seller" json:"seller"`
	SellerLocation   string     `gorm:"column:seller_location" json:"seller_location"`
	SellerProfileURL string     `gorm:"column:seller_profile_image_url" json:"seller_profile_image_url"`
	TransactionCount int        `gorm:"column:transaction_count" json:"transaction_count"`
	ReviewCount      int        `gorm:"column:review_count" json:"review_count"`
	Created          time.Time  `gorm:"column:created" json:"created"`
	UpdatedAt        time.Time  `gorm:"column:updated_at" json:"updated_at"`
	BannedUntil      *time.Time `gorm:"column:banned_until" json:"banned_until"`
	DeletedAt        *time.Time `gorm:"column:deleted_at" json:"deleted_at"`
	ActionByName     string     `gorm:"column:action_by_name" json:"action_by_name"`
}

type AdminListingsQuery struct {
	Search   string
	Type     string
	Status   string
	Category string
	Limit    int
	Offset   int
}

type AdminTransactionsQuery struct {
	Search string
	Type   string
	Status string
	Limit  int
	Offset int
}

type AdminReportsQuery struct {
	Search string
	Status string
	Reason string
	Limit  int
	Offset int
}

type AdminTransactionListItemFromDb struct {
	Id                    string     `gorm:"column:id" json:"id"`
	ListingId             string     `gorm:"column:listing_id" json:"listing_id"`
	ListingType           string     `gorm:"column:listing_type" json:"listing_type"`
	ListingTitle          string     `gorm:"column:listing_title" json:"listing_title"`
	ListingPriceUnit      string     `gorm:"column:listing_price_unit" json:"listing_price_unit"`
	ListingImageURL       string     `gorm:"column:listing_image_url" json:"listing_image_url"`
	ClientUserId          string     `gorm:"column:client_user_id" json:"client_user_id"`
	ClientFullName        string     `gorm:"column:client_full_name" json:"client_full_name"`
	ClientLocation        string     `gorm:"column:client_location" json:"client_location"`
	ClientProfileImageURL string     `gorm:"column:client_profile_image_url" json:"client_profile_image_url"`
	OwnerUserId           string     `gorm:"column:owner_user_id" json:"owner_user_id"`
	OwnerFullName         string     `gorm:"column:owner_full_name" json:"owner_full_name"`
	OwnerLocation         string     `gorm:"column:owner_location" json:"owner_location"`
	OwnerProfileImageURL  string     `gorm:"column:owner_profile_image_url" json:"owner_profile_image_url"`
	StartDate             *time.Time `gorm:"column:start_date" json:"start_date"`
	EndDate               *time.Time `gorm:"column:end_date" json:"end_date"`
	SelectedTimeWindow    string     `gorm:"column:selected_time_window" json:"selected_time_window"`
	TotalPrice            int        `gorm:"column:total_price" json:"total_price"`
	ScheduleUnits         int        `gorm:"column:schedule_units" json:"schedule_units"`
	ProviderAgreed        bool       `gorm:"column:provider_agreed" json:"provider_agreed"`
	ClientAgreed          bool       `gorm:"column:client_agreed" json:"client_agreed"`
	Status                string     `gorm:"column:status" json:"status"`
	CompletedAt           *time.Time `gorm:"column:completed_at" json:"completed_at"`
	CreatedAt             time.Time  `gorm:"column:created_at" json:"created_at"`
}

type AdminReportListItemFromDb struct {
	Id                   string     `gorm:"column:id" json:"id"`
	ReporterId           string     `gorm:"column:reporter_id" json:"reporter_id"`
	Reporter             string     `gorm:"column:reporter" json:"reporter"`
	ReporterEmail        string     `gorm:"column:reporter_email" json:"reporter_email"`
	ReporterImage        string     `gorm:"column:reporter_profile_image_url" json:"reporter_profile_image_url"`
	ReporterLocation     string     `gorm:"column:reporter_location" json:"reporter_location"`
	ReportedUserId       string     `gorm:"column:reported_user_id" json:"reported_user_id"`
	ReportedName         string     `gorm:"column:reported_name" json:"reported_name"`
	ReportedEmail        string     `gorm:"column:reported_email" json:"reported_email"`
	ReportedLocation     string     `gorm:"column:reported_location" json:"reported_location"`
	TargetType           string     `gorm:"column:target_type" json:"target_type"`
	TargetName           string     `gorm:"column:target_name" json:"target_name"`
	TargetId             string     `gorm:"column:target_id" json:"target_id"`
	ListingTitle         string     `gorm:"column:listing_title" json:"listing_title"`
	ListingStatus        string     `gorm:"column:listing_status" json:"listing_status"`
	ListingImageURL      string     `gorm:"column:listing_image_url" json:"listing_image_url"`
	ListingPrice         int        `gorm:"column:listing_price" json:"listing_price"`
	ListingPriceUnit     string     `gorm:"column:listing_price_unit" json:"listing_price_unit"`
	ListingOwnerId       string     `gorm:"column:listing_owner_id" json:"listing_owner_id"`
	ListingOwner         string     `gorm:"column:listing_owner" json:"listing_owner"`
	OwnerImage           string     `gorm:"column:listing_owner_profile_image_url" json:"listing_owner_profile_image_url"`
	ListingOwnerLocation string     `gorm:"column:listing_owner_location" json:"listing_owner_location"`
	Reason               string     `gorm:"column:reason" json:"reason"`
	Description          *string    `gorm:"column:description" json:"description"`
	Status               string     `gorm:"column:status" json:"status"`
	ReviewedBy           *string    `gorm:"column:reviewed_by" json:"reviewed_by"`
	ReviewedAt           *time.Time `gorm:"column:reviewed_at" json:"reviewed_at"`
	CreatedAt            time.Time  `gorm:"column:created_at" json:"created_at"`
	SubmittedAt          time.Time  `gorm:"column:submitted_at" json:"submitted_at"`
	ResolvedBy           *string    `gorm:"column:resolved_by" json:"resolved_by"`
	ResolvedAt           *time.Time `gorm:"column:resolved_at" json:"resolved_at"`
	ActionTaken          *string    `gorm:"column:action_taken" json:"action_taken"`
	ActionReason         *string    `gorm:"column:action_reason" json:"action_reason"`
}

type AdminSetReportStatusBody struct {
	Status string `json:"status"`
	Action string `json:"action"`
	Reason string `json:"reason"`
}

type AdminVerificationsQuery struct {
	Search string
	Status string
	IdType string
	Limit  int
	Offset int
}

type AdminVerificationListItemFromDb struct {
	Id              string     `gorm:"column:id" json:"id"`
	UserId          string     `gorm:"column:user_id" json:"user_id"`
	UserName        string     `gorm:"column:user_name" json:"user_name"`
	UserEmail       string     `gorm:"column:user_email" json:"user_email"`
	ProfileImageURL string     `gorm:"column:profile_image_url" json:"profile_image_url"`
	IdFirstName     string     `gorm:"column:id_first_name" json:"id_first_name"`
	IdLastName      string     `gorm:"column:id_last_name" json:"id_last_name"`
	IdBirthdate     string     `gorm:"column:id_birthdate" json:"id_birthdate"`
	MobileNumber    string     `gorm:"column:mobile_number" json:"mobile_number"`
	IdType          string     `gorm:"column:id_type" json:"id_type"`
	IdNumber        string     `gorm:"column:id_number" json:"id_number"`
	IdImageFrontURL string     `gorm:"column:id_image_front_url" json:"id_image_front_url"`
	IdImageBackURL  string     `gorm:"column:id_image_back_url" json:"id_image_back_url"`
	SelfieURL       string     `gorm:"column:selfie_url" json:"selfie_url"`
	IPAddress       string     `gorm:"column:ip_address" json:"ip_address"`
	UserAgent       string     `gorm:"column:user_agent" json:"user_agent"`
	HardwareInfo    string     `gorm:"column:hardware_info" json:"hardware_info"`
	Status          string     `gorm:"column:status" json:"status"`
	RejectionReason *string    `gorm:"column:rejection_reason" json:"rejection_reason"`
	ReviewedBy      *string    `gorm:"column:reviewed_by" json:"reviewed_by"`
	ReviewedAt      *time.Time `gorm:"column:reviewed_at" json:"reviewed_at"`
	SubmittedAt     time.Time  `gorm:"column:submitted_at" json:"submitted_at"`
}

type AdminSetVerificationStatusBody struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type ListingDetailFromDb struct {
	Id                 string     `gorm:"column:id"`
	SellerId           string     `gorm:"column:seller_id"`
	SellerIsActive     bool       `gorm:"column:seller_is_active"`
	TransactionCount   int        `gorm:"column:transaction_count"`
	ReviewCount        int        `gorm:"column:review_count"`
	Title              string     `gorm:"column:title"`
	Price              int        `gorm:"column:price"`
	PriceUnit          string     `gorm:"column:price_unit"`
	Type               string     `gorm:"column:type"`
	Category           string     `gorm:"column:category"`
	CategoryID         string     `gorm:"column:category_id"`
	Description        string     `gorm:"column:description"`
	LocationCity       string     `gorm:"column:location_city"`
	LocationProv       string     `gorm:"column:location_province"`
	CreatedAt          time.Time  `gorm:"column:created_at"`
	Status             string     `gorm:"column:status"`
	SellStatus         string     `gorm:"column:sell_status"`
	Highlights         string     `gorm:"column:highlights"`
	Included           string     `gorm:"column:included"`
	Condition          string     `gorm:"column:condition"`
	DeliveryMethod     string     `gorm:"column:delivery_method"`
	MinRentalPeriod    int        `gorm:"column:min_rental_period"`
	AvailableFrom      *time.Time `gorm:"column:available_from"`
	DaysOff            string     `gorm:"column:days_off"`
	Deposit            string     `gorm:"column:deposit"`
	Turnaround         string     `gorm:"column:turnaround_time"`
	ServiceArea        string     `gorm:"column:service_area"`
	Arrangement        string     `gorm:"column:arrangements"`
	SellerName         string     `gorm:"column:seller_name"`
	SellerProfileImage string     `gorm:"column:seller_profile_image_url"`
	SellerRating       float64    `gorm:"column:seller_rating"`
	SellerVerified     bool       `gorm:"column:seller_verified"`
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
	DaysOff         string     `gorm:"column:days_off"`
	Deposit         string     `gorm:"column:deposit"`
	Turnaround      string     `gorm:"column:turnaround_time"`
	ServiceArea     string     `gorm:"column:service_area"`
	Arrangement     string     `gorm:"column:arrangements"`
	Status          string     `gorm:"column:status"`
}

type SendOTPRequest struct {
	PhoneNumber string `json:"phoneNumber"`
	IPAddress   string `json:"ipAddress"`
	UserAgent   string `json:"userAgent"`
}

type VerifyOTPRequest struct {
	PhoneNumber string `json:"phoneNumber"`
	OTPCode     string `json:"otpCode"`
}
