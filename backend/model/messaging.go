package model

import "time"

type ConversationFromDb struct {
	Id                 string     `gorm:"column:id"`
	ListingId          string     `gorm:"column:listing_id"`
	ListingTitle       string     `gorm:"column:listing_title"`
	ListingPrice       int        `gorm:"column:listing_price"`
	OfferPrice         int        `gorm:"column:offer_price"`
	TransactionStatus  string     `gorm:"column:transaction_status"`
	ProviderAgreed     bool       `gorm:"column:provider_agreed"`
	ClientAgreed       bool       `gorm:"column:client_agreed"`
	UserAgreed         bool       `gorm:"column:user_agreed"`
	ScheduleStart      *time.Time `gorm:"column:schedule_start"`
	ScheduleEnd        *time.Time `gorm:"column:schedule_end"`
	AvailableFrom      *time.Time `gorm:"column:available_from"`
	DaysOff            string     `gorm:"column:days_off"`
	TimeWindows        string     `gorm:"column:time_windows"`
	ListingPriceUnit   string     `gorm:"column:listing_price_unit"`
	ListingType        string     `gorm:"column:listing_type"`
	ListingStatus      string     `gorm:"column:listing_status"`
	CanReview          bool       `gorm:"column:can_review"`
	ListingImageUrl    string     `gorm:"column:listing_image_url"`
	OtherUserId        string     `gorm:"column:other_user_id"`
	OtherFirstName     string     `gorm:"column:other_first_name"`
	OtherLastName      string     `gorm:"column:other_last_name"`
	OtherProfileImgUrl string     `gorm:"column:other_profile_image_url"`
	OtherIsActive      bool       `gorm:"column:other_is_active"`
	OtherLockedUntil   *time.Time `gorm:"column:other_account_locked_until"`
	SelfIsActive       bool       `gorm:"column:self_is_active"`
	SelfLockedUntil    *time.Time `gorm:"column:self_account_locked_until"`
	LastMessage        string     `gorm:"column:last_message"`
	LastMessageAt      *time.Time `gorm:"column:last_message_at"`
	OtherLastReadMsgId string     `gorm:"column:other_last_read_message_id"`
	UnreadCount        int        `gorm:"column:unread_count"`
	IsSeller           bool       `gorm:"column:is_seller"`
	HasPendingReport   bool       `gorm:"column:has_pending_report"`
}

type MessageFromDb struct {
	Id              string    `gorm:"column:id"`
	ConversationId  string    `gorm:"column:conversation_id"`
	SenderId        string    `gorm:"column:sender_id"`
	ReceiverId      string    `gorm:"column:receiver_id"`
	Content         string    `gorm:"column:content"`
	Status          string    `gorm:"column:status"`
	IsEdited        bool      `gorm:"column:is_edited"`
	IsUnsent        bool      `gorm:"column:is_unsent"`
	CreatedAt       time.Time `gorm:"column:created_at"`
	ReplyMessageId  string    `gorm:"column:reply_message_id"`
	ReplySenderId   string    `gorm:"column:reply_sender_id"`
	ReplySenderName string    `gorm:"column:reply_sender_name"`
	ReplyContent    string    `gorm:"column:reply_content"`
}

type MessageAttachmentFromDb struct {
	Id        string `gorm:"column:id"`
	MessageId string `gorm:"column:message_id"`
	FileUrl   string `gorm:"column:file_url"`
	FileType  string `gorm:"column:file_type"`
	FileName  string `gorm:"column:file_name"`
	FileSize  int    `gorm:"column:file_size"`
}

type MessageReactionFromDb struct {
	MessageId string `gorm:"column:message_id"`
	UserId    string `gorm:"column:user_id"`
	Reaction  string `gorm:"column:reaction"`
}

type CreateConversationBody struct {
	ListingId       string `json:"listingId"`
	OfferPrice      *int   `json:"offerPrice"`
	OfferMessage    string `json:"offerMessage"`
	StartDate       string `json:"startDate"`
	EndDate         string `json:"endDate"`
	StartTime       string `json:"startTime"`
	EndTime         string `json:"endTime"`
	ScheduleMessage string `json:"scheduleMessage"`
}

type UpdateConversationOfferBody struct {
	OfferPrice   *int   `json:"offerPrice"`
	OfferMessage string `json:"offerMessage"`
}

type SendMessageBody struct {
	Content     string                  `json:"content"`
	Attachments []MessageAttachmentBody `json:"attachments"`
	ReplyTo     *struct {
		MessageId string `json:"messageId"`
	} `json:"replyTo"`
}

type MessageAttachmentBody struct {
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type EditMessageBody struct {
	Content string `json:"content"`
}

type ReactMessageBody struct {
	Reaction *string `json:"reaction"`
}

type TransactionAgreementState struct {
	ConversationId    string `gorm:"column:conversation_id"`
	ListingId         string `gorm:"column:listing_id"`
	TransactionStatus string `gorm:"column:transaction_status"`
	ProviderAgreed    bool   `gorm:"column:provider_agreed"`
	ClientAgreed      bool   `gorm:"column:client_agreed"`
	UserAgreed        bool   `gorm:"column:user_agreed"`
}
