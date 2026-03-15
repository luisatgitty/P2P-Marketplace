package model

import "time"

type ConversationFromDb struct {
	Id                 string     `gorm:"column:id"`
	ListingId          string     `gorm:"column:listing_id"`
	ListingTitle       string     `gorm:"column:listing_title"`
	ListingPrice       int        `gorm:"column:listing_price"`
	ListingPriceUnit   string     `gorm:"column:listing_price_unit"`
	ListingType        string     `gorm:"column:listing_type"`
	ListingStatus      string     `gorm:"column:listing_status"`
	ListingImageUrl    string     `gorm:"column:listing_image_url"`
	OtherUserId        string     `gorm:"column:other_user_id"`
	OtherFirstName     string     `gorm:"column:other_first_name"`
	OtherLastName      string     `gorm:"column:other_last_name"`
	OtherProfileImgUrl string     `gorm:"column:other_profile_image_url"`
	LastMessage        string     `gorm:"column:last_message"`
	LastMessageAt      *time.Time `gorm:"column:last_message_at"`
	OtherLastReadMsgId string     `gorm:"column:other_last_read_message_id"`
	UnreadCount        int        `gorm:"column:unread_count"`
	IsSeller           bool       `gorm:"column:is_seller"`
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
	ListingId string `json:"listingId"`
}

type SendMessageBody struct {
	Content string `json:"content"`
	ReplyTo *struct {
		MessageId string `json:"messageId"`
	} `json:"replyTo"`
}

type EditMessageBody struct {
	Content string `json:"content"`
}

type ReactMessageBody struct {
	Reaction *string `json:"reaction"`
}
