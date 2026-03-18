package repository

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"

	"gorm.io/gorm"
)

func GetConversationsByUser(userId string) ([]model.ConversationFromDb, error) {
	db := middleware.DBConn
	rows := make([]model.ConversationFromDb, 0)

	query := `
		SELECT
			c.id,
			l.id AS listing_id,
			l.title AS listing_title,
			l.price AS listing_price,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			l.listing_type::text AS listing_type,
			l.status::text AS listing_status,
			COALESCE(li.image_url, '') AS listing_image_url,
			u.id AS other_user_id,
			u.first_name AS other_first_name,
			u.last_name AS other_last_name,
			COALESCE(u.profile_image_url, '') AS other_profile_image_url,
			COALESCE(c.last_message, '') AS last_message,
			c.last_message_at,
			COALESCE(other_cm.last_read_message_id::text, '') AS other_last_read_message_id,
			COALESCE(unread.unread_count, 0) AS unread_count,
			(c.seller_id = $1) AS is_seller
		FROM public.conversation_members cm
		JOIN public.conversations c
			ON c.id = cm.conversation_id
		JOIN public.listings l
			ON l.id = c.listing_id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		JOIN public.users u
			ON u.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
		LEFT JOIN public.conversation_members other_cm
			ON other_cm.conversation_id = c.id
			AND other_cm.user_id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
			AND other_cm.deleted_at IS NULL
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS unread_count
			FROM public.messages m
			LEFT JOIN public.message_deletions md
				ON md.message_id = m.id
				AND md.user_id = $1
			WHERE m.conversation_id = c.id
				AND md.id IS NULL
				AND m.sender_id <> $1
				AND m.is_unsent = FALSE
				AND m.created_at > COALESCE(cm.last_read_at, to_timestamp(0))
		) unread ON TRUE
		WHERE cm.user_id = $1
			AND cm.deleted_at IS NULL
		ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
	`

	if err := db.Raw(query, userId).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to load conversations")
	}

	return rows, nil
}

func GetConversationById(userId, conversationId string) (model.ConversationFromDb, error) {
	db := middleware.DBConn
	var row model.ConversationFromDb

	query := `
		SELECT
			c.id,
			l.id AS listing_id,
			l.title AS listing_title,
			l.price AS listing_price,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			l.listing_type::text AS listing_type,
			l.status::text AS listing_status,
			COALESCE(li.image_url, '') AS listing_image_url,
			u.id AS other_user_id,
			u.first_name AS other_first_name,
			u.last_name AS other_last_name,
			COALESCE(u.profile_image_url, '') AS other_profile_image_url,
			COALESCE(c.last_message, '') AS last_message,
			c.last_message_at,
			COALESCE(other_cm.last_read_message_id::text, '') AS other_last_read_message_id,
			COALESCE(unread.unread_count, 0) AS unread_count,
			(c.seller_id = $1) AS is_seller
		FROM public.conversation_members cm
		JOIN public.conversations c
			ON c.id = cm.conversation_id
		JOIN public.listings l
			ON l.id = c.listing_id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		JOIN public.users u
			ON u.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
		LEFT JOIN public.conversation_members other_cm
			ON other_cm.conversation_id = c.id
			AND other_cm.user_id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
			AND other_cm.deleted_at IS NULL
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS unread_count
			FROM public.messages m
			LEFT JOIN public.message_deletions md
				ON md.message_id = m.id
				AND md.user_id = $1
			WHERE m.conversation_id = c.id
				AND md.id IS NULL
				AND m.sender_id <> $1
				AND m.is_unsent = FALSE
				AND m.created_at > COALESCE(cm.last_read_at, to_timestamp(0))
		) unread ON TRUE
		WHERE cm.user_id = $1
			AND cm.deleted_at IS NULL
			AND c.id = $2
		LIMIT 1
	`

	results := db.Raw(query, userId, conversationId).Scan(&row)
	if results.Error != nil {
		return row, fmt.Errorf("Failed to load conversation")
	}
	if results.RowsAffected == 0 {
		return row, fmt.Errorf("Conversation not found")
	}

	return row, nil
}

func GetMessagesByConversation(userId, conversationId string) ([]model.MessageFromDb, []model.MessageAttachmentFromDb, []model.MessageReactionFromDb, error) {
	db := middleware.DBConn
	messages := make([]model.MessageFromDb, 0)
	attachments := make([]model.MessageAttachmentFromDb, 0)
	reactions := make([]model.MessageReactionFromDb, 0)

	msgQuery := `
		SELECT
			m.id,
			m.conversation_id,
			m.sender_id,
			COALESCE(m.content, '') AS content,
			m.status::text AS status,
			m.is_edited,
			m.is_unsent,
			m.created_at,
			COALESCE(rm.id::text, '') AS reply_message_id,
			COALESCE(rm.sender_id::text, '') AS reply_sender_id,
			COALESCE(CONCAT(ru.first_name, ' ', ru.last_name), '') AS reply_sender_name,
			COALESCE(rm.content, '') AS reply_content
		FROM public.messages m
		JOIN public.conversation_members cm
			ON cm.conversation_id = m.conversation_id
			AND cm.user_id = $1
			AND cm.deleted_at IS NULL
		LEFT JOIN public.message_deletions md
			ON md.message_id = m.id
			AND md.user_id = $1
		LEFT JOIN public.messages rm
			ON rm.id = m.reply_to_message_id
		LEFT JOIN public.users ru
			ON ru.id = rm.sender_id
		WHERE m.conversation_id = $2
			AND md.id IS NULL
		ORDER BY m.created_at ASC
	`

	if err := db.Raw(msgQuery, userId, conversationId).Scan(&messages).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("Failed to load messages")
	}

	attQuery := `
		SELECT
			a.id,
			a.message_id,
			a.file_url,
			a.file_type::text AS file_type,
			COALESCE(a.file_name, '') AS file_name,
			COALESCE(a.file_size, 0) AS file_size
		FROM public.message_attachments a
		JOIN public.messages m
			ON m.id = a.message_id
		LEFT JOIN public.message_deletions md
			ON md.message_id = m.id
			AND md.user_id = $1
		WHERE m.conversation_id = $2
			AND md.id IS NULL
		ORDER BY a.sort_order ASC, a.created_at ASC
	`

	if err := db.Raw(attQuery, userId, conversationId).Scan(&attachments).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("Failed to load message attachments")
	}

	reactQuery := `
		SELECT
			r.message_id,
			r.user_id,
			r.reaction::text AS reaction
		FROM public.message_reactions r
		JOIN public.messages m
			ON m.id = r.message_id
		LEFT JOIN public.message_deletions md
			ON md.message_id = m.id
			AND md.user_id = $1
		WHERE m.conversation_id = $2
			AND md.id IS NULL
		ORDER BY r.created_at ASC
	`

	if err := db.Raw(reactQuery, userId, conversationId).Scan(&reactions).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("Failed to load message reactions")
	}

	return messages, attachments, reactions, nil
}

func MarkConversationRead(userId, conversationId string) (string, error) {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return "", fmt.Errorf("Failed to start DB transaction")
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	validateMembershipQuery := `
		SELECT COUNT(*)
		FROM public.conversation_members
		WHERE conversation_id = $1
			AND user_id = $2
			AND deleted_at IS NULL
	`

	var membershipCount int
	if err := tx.Raw(validateMembershipQuery, conversationId, userId).Scan(&membershipCount).Error; err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to validate conversation access")
	}
	if membershipCount == 0 {
		tx.Rollback()
		return "", fmt.Errorf("Conversation not found")
	}

	updateStatusQuery := `
		UPDATE public.messages
		SET status = 'READ',
			read_at = now(),
			updated_at = now()
		WHERE conversation_id = $1
			AND receiver_id = $2
			AND status <> 'READ'
	`
	if err := tx.Exec(updateStatusQuery, conversationId, userId).Error; err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to mark messages as read")
	}

	var lastReadMessageId string
	latestVisibleMessageQuery := `
		SELECT m.id
		FROM public.messages m
		LEFT JOIN public.message_deletions md
			ON md.message_id = m.id
			AND md.user_id = $1
		WHERE m.conversation_id = $2
			AND md.id IS NULL
		ORDER BY m.created_at DESC
		LIMIT 1
	`
	_ = tx.Raw(latestVisibleMessageQuery, userId, conversationId).Scan(&lastReadMessageId).Error

	updateMemberQuery := `
		UPDATE public.conversation_members
		SET
			last_read_message_id = NULLIF($3, '')::uuid,
			last_read_at = now(),
			updated_at = now()
		WHERE conversation_id = $1
			AND user_id = $2
	`
	if err := tx.Exec(updateMemberQuery, conversationId, userId, lastReadMessageId).Error; err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to update read pointer")
	}

	if err := tx.Commit().Error; err != nil {
		return "", fmt.Errorf("Failed to commit read update")
	}

	return strings.TrimSpace(lastReadMessageId), nil
}

func MarkMessageDelivered(conversationId, messageId, receiverId string) error {
	db := middleware.DBConn

	query := `
		UPDATE public.messages
		SET status = 'DELIVERED',
			delivered_at = COALESCE(delivered_at, now()),
			updated_at = now()
		WHERE id = $1
			AND conversation_id = $2
			AND receiver_id = $3
			AND status = 'SENT'
	`

	if err := db.Exec(query, messageId, conversationId, receiverId).Error; err != nil {
		return fmt.Errorf("Failed to mark message as delivered")
	}

	return nil
}

func GetConversationPeerUserId(userId, conversationId string) (string, error) {
	db := middleware.DBConn
	var peerId string

	query := `
		SELECT CASE
			WHEN c.buyer_id = $1::uuid THEN c.seller_id::text
			ELSE c.buyer_id::text
		END AS peer_user_id
		FROM public.conversations c
		JOIN public.conversation_members cm
			ON cm.conversation_id = c.id
			AND cm.user_id = $1::uuid
			AND cm.deleted_at IS NULL
		WHERE c.id = $2::uuid
		LIMIT 1
	`

	results := db.Raw(query, userId, conversationId).Scan(&peerId)
	if results.Error != nil {
		return "", fmt.Errorf("Failed to load conversation peer")
	}
	if results.RowsAffected == 0 {
		return "", fmt.Errorf("Conversation not found")
	}

	return strings.TrimSpace(peerId), nil
}

func CreateMessage(userId, conversationId, content, replyToMessageId string, attachments []model.MessageAttachmentBody) (model.MessageFromDb, error) {
	db := middleware.DBConn
	var created model.MessageFromDb

	trimmed := strings.TrimSpace(content)
	if trimmed == "" && len(attachments) == 0 {
		return created, fmt.Errorf("Message content is required")
	}

	tx := db.Begin()
	if tx.Error != nil {
		return created, fmt.Errorf("Failed to start DB transaction")
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	participantQuery := `
		SELECT buyer_id::text, seller_id::text
		FROM public.conversations c
		JOIN public.conversation_members cm
			ON cm.conversation_id = c.id
			AND cm.user_id = $2
		WHERE c.id = $1
		LIMIT 1
	`
	var buyerId string
	var sellerId string
	result := tx.Raw(participantQuery, conversationId, userId).Row()
	if err := result.Scan(&buyerId, &sellerId); err != nil {
		tx.Rollback()
		return created, fmt.Errorf("Conversation not found")
	}

	receiverId := buyerId
	if buyerId == userId {
		receiverId = sellerId
	}

	insertQuery := `
		INSERT INTO public.messages (
			conversation_id,
			sender_id,
			receiver_id,
			reply_to_message_id,
			content,
			status,
			created_at,
			updated_at
		) VALUES (
			$1,
			$2,
			$3,
			NULLIF($4, '')::uuid,
			$5,
			'SENT',
			now(),
			now()
		)
		RETURNING id, conversation_id, sender_id, receiver_id, COALESCE(content, '') AS content, status::text AS status, is_edited, is_unsent, created_at
	`

	if err := tx.Raw(insertQuery, conversationId, userId, receiverId, replyToMessageId, trimmed).Scan(&created).Error; err != nil {
		tx.Rollback()
		return created, fmt.Errorf("Failed to send message")
	}

	if len(attachments) > 0 {
		if err := saveMessageAttachmentsTx(tx, created.Id, attachments); err != nil {
			tx.Rollback()
			return created, err
		}
	}

	lastMessageText := trimmed
	if lastMessageText == "" && len(attachments) > 0 {
		imagesCount := 0
		videosCount := 0
		for _, att := range attachments {
			kind := strings.ToUpper(strings.TrimSpace(messageAttachmentKind(att.MimeType)))
			if kind == "VIDEO" {
				videosCount++
			} else {
				imagesCount++
			}
		}
		parts := make([]string, 0, 2)
		if imagesCount > 0 {
			if imagesCount == 1 {
				parts = append(parts, "📷 Photo")
			} else {
				parts = append(parts, fmt.Sprintf("📷 %d photos", imagesCount))
			}
		}
		if videosCount > 0 {
			if videosCount == 1 {
				parts = append(parts, "🎥 Video")
			} else {
				parts = append(parts, fmt.Sprintf("🎥 %d videos", videosCount))
			}
		}
		lastMessageText = strings.Join(parts, ", ")
	}

	updateConversationQuery := `
		UPDATE public.conversations
		SET
			last_message_id = $2,
			last_message = $3,
			last_message_sender_id = $4,
			last_message_at = $5,
			updated_at = now()
		WHERE id = $1
	`
	if err := tx.Exec(updateConversationQuery, conversationId, created.Id, lastMessageText, userId, created.CreatedAt).Error; err != nil {
		tx.Rollback()
		return created, fmt.Errorf("Failed to update conversation metadata")
	}

	unhideMemberQuery := `
		UPDATE public.conversation_members
		SET deleted_at = NULL, updated_at = now()
		WHERE conversation_id = $1
			AND user_id IN ($2, $3)
	`
	if err := tx.Exec(unhideMemberQuery, conversationId, userId, receiverId).Error; err != nil {
		tx.Rollback()
		return created, fmt.Errorf("Failed to sync conversation visibility")
	}

	if err := tx.Commit().Error; err != nil {
		return created, fmt.Errorf("Failed to complete send message")
	}

	return created, nil
}

func GetMessageAttachmentsByMessageId(messageId string) ([]model.MessageAttachmentFromDb, error) {
	db := middleware.DBConn
	rows := make([]model.MessageAttachmentFromDb, 0)

	query := `
		SELECT id, message_id, file_url, file_type::text AS file_type, file_name, file_size
		FROM public.message_attachments
		WHERE message_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`

	if err := db.Raw(query, messageId).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to load message attachments")
	}

	return rows, nil
}

func saveMessageAttachmentsTx(tx *gorm.DB, messageId string, attachments []model.MessageAttachmentBody) error {
	baseDir := filepath.Join("uploads", "messages")
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return fmt.Errorf("Failed to create attachment upload directory")
	}

	insertAttachmentQuery := `
		INSERT INTO public.message_attachments (message_id, file_url, file_type, file_name, file_size, sort_order)
		VALUES ($1, $2, $3::attachment_type, $4, $5, $6)
	`

	for i, item := range attachments {
		encodedData := strings.TrimSpace(item.Data)
		if encodedData == "" {
			return fmt.Errorf("Attachment payload is empty")
		}

		ext, err := extFromAttachmentMime(item.MimeType)
		if err != nil {
			return err
		}

		decoded, err := base64.StdEncoding.DecodeString(encodedData)
		if err != nil {
			return fmt.Errorf("Failed to decode attachment payload")
		}

		randomName, err := randomHexForMessageAttachment(10)
		if err != nil {
			return fmt.Errorf("Failed to generate attachment filename")
		}

		fileName := strings.TrimSpace(item.Name)
		if fileName == "" {
			fileName = fmt.Sprintf("attachment-%d%s", i+1, ext)
		}

		storedFileName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randomName, ext)
		filePath := filepath.Join(baseDir, storedFileName)
		if err := os.WriteFile(filePath, decoded, 0644); err != nil {
			return fmt.Errorf("Failed to save attachment file")
		}

		fileURL := fmt.Sprintf("/uploads/messages/%s", storedFileName)
		fileType := messageAttachmentKind(item.MimeType)
		if fileType == "" {
			return fmt.Errorf("Unsupported attachment type")
		}

		if err := tx.Exec(insertAttachmentQuery, messageId, fileURL, fileType, fileName, len(decoded), i).Error; err != nil {
			return fmt.Errorf("Failed to save attachment metadata")
		}
	}

	return nil
}

func extFromAttachmentMime(mimeType string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/jpeg", "image/jpg":
		return ".jpg", nil
	case "image/png":
		return ".png", nil
	case "image/webp":
		return ".webp", nil
	case "video/mp4":
		return ".mp4", nil
	case "video/webm":
		return ".webm", nil
	case "video/quicktime":
		return ".mov", nil
	default:
		return "", fmt.Errorf("Unsupported attachment type")
	}
}

func messageAttachmentKind(mimeType string) string {
	trimmed := strings.ToLower(strings.TrimSpace(mimeType))
	if strings.HasPrefix(trimmed, "image/") {
		return "IMAGE"
	}
	if strings.HasPrefix(trimmed, "video/") {
		return "VIDEO"
	}
	return ""
}

func randomHexForMessageAttachment(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func UpsertMessageReaction(userId, conversationId, messageId string, reaction *string) error {
	db := middleware.DBConn

	checkQuery := `
		SELECT COUNT(*)
		FROM public.messages m
		JOIN public.conversation_members cm
			ON cm.conversation_id = m.conversation_id
			AND cm.user_id = $1
			AND cm.deleted_at IS NULL
		WHERE m.id = $2
			AND m.conversation_id = $3
	`
	var count int
	if err := db.Raw(checkQuery, userId, messageId, conversationId).Scan(&count).Error; err != nil {
		return fmt.Errorf("Failed to validate message")
	}
	if count == 0 {
		return fmt.Errorf("Message not found")
	}

	if reaction == nil || strings.TrimSpace(*reaction) == "" {
		deleteQuery := `DELETE FROM public.message_reactions WHERE message_id = $1 AND user_id = $2`
		if err := db.Exec(deleteQuery, messageId, userId).Error; err != nil {
			return fmt.Errorf("Failed to remove reaction")
		}
		return nil
	}

	upsertQuery := `
		INSERT INTO public.message_reactions (message_id, user_id, reaction, created_at, updated_at)
		VALUES ($1, $2, $3::reaction_type, now(), now())
		ON CONFLICT (message_id, user_id)
		DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = now()
	`
	if err := db.Exec(upsertQuery, messageId, userId, strings.ToUpper(strings.TrimSpace(*reaction))).Error; err != nil {
		return fmt.Errorf("Failed to save reaction")
	}

	return nil
}

func EditMessageContent(userId, conversationId, messageId, content string) error {
	db := middleware.DBConn
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return fmt.Errorf("Message content is required")
	}

	updateQuery := `
		UPDATE public.messages m
		SET content = $4,
			is_edited = TRUE,
			edited_at = now(),
			updated_at = now()
		FROM public.conversation_members cm
		WHERE m.id = $2
			AND m.conversation_id = $3
			AND m.sender_id = $1
			AND m.is_unsent = FALSE
			AND cm.conversation_id = m.conversation_id
			AND cm.user_id = $1
			AND cm.deleted_at IS NULL
	`

	result := db.Exec(updateQuery, userId, messageId, conversationId, trimmed)
	if result.Error != nil {
		return fmt.Errorf("Failed to edit message")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Message not found or cannot be edited")
	}

	refreshConversationQuery := `
		UPDATE public.conversations c
		SET last_message = m.content,
			last_message_at = m.created_at,
			last_message_sender_id = m.sender_id,
			updated_at = now()
		FROM public.messages m
		WHERE c.id = $1
			AND c.last_message_id = m.id
			AND m.id = $2
	`
	_ = db.Exec(refreshConversationQuery, conversationId, messageId).Error

	return nil
}

func UnsendMessage(userId, conversationId, messageId string) error {
	db := middleware.DBConn
	tx := db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("Failed to start DB transaction")
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	updateQuery := `
		UPDATE public.messages m
		SET content = NULL,
			is_unsent = TRUE,
			unsent_at = now(),
			is_edited = FALSE,
			edited_at = NULL,
			updated_at = now()
		FROM public.conversation_members cm
		WHERE m.id = $2
			AND m.conversation_id = $3
			AND m.sender_id = $1
			AND cm.conversation_id = m.conversation_id
			AND cm.user_id = $1
			AND cm.deleted_at IS NULL
	`

	result := tx.Exec(updateQuery, userId, messageId, conversationId)
	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to unsend message")
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("Message not found or cannot be unsent")
	}

	clearReactions := `DELETE FROM public.message_reactions WHERE message_id = $1`
	if err := tx.Exec(clearReactions, messageId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to clear message reactions")
	}

	clearAttachments := `DELETE FROM public.message_attachments WHERE message_id = $1`
	if err := tx.Exec(clearAttachments, messageId).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Failed to clear message attachments")
	}

	refreshConversationQuery := `
		UPDATE public.conversations c
		SET
			last_message = COALESCE(last_msg.content, '[message unsent]'),
			last_message_id = last_msg.id,
			last_message_sender_id = last_msg.sender_id,
			last_message_at = last_msg.created_at,
			updated_at = now()
		FROM (
			SELECT m.id, m.sender_id, m.created_at,
				CASE WHEN m.is_unsent THEN '[message unsent]' ELSE COALESCE(m.content, '') END AS content
			FROM public.messages m
			WHERE m.conversation_id = $1
			ORDER BY m.created_at DESC
			LIMIT 1
		) last_msg
		WHERE c.id = $1
	`
	_ = tx.Exec(refreshConversationQuery, conversationId).Error

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("Failed to complete unsend")
	}

	return nil
}

func DeleteMessageForUser(userId, conversationId, messageId string) error {
	db := middleware.DBConn

	checkQuery := `
		SELECT COUNT(*)
		FROM public.messages m
		JOIN public.conversation_members cm
			ON cm.conversation_id = m.conversation_id
			AND cm.user_id = $1
			AND cm.deleted_at IS NULL
		WHERE m.id = $2
			AND m.conversation_id = $3
	`
	var count int
	if err := db.Raw(checkQuery, userId, messageId, conversationId).Scan(&count).Error; err != nil {
		return fmt.Errorf("Failed to validate message")
	}
	if count == 0 {
		return fmt.Errorf("Message not found")
	}

	insertQuery := `
		INSERT INTO public.message_deletions (message_id, user_id, deleted_at)
		VALUES ($1, $2, now())
		ON CONFLICT (message_id, user_id)
		DO UPDATE SET deleted_at = now()
	`
	if err := db.Exec(insertQuery, messageId, userId).Error; err != nil {
		return fmt.Errorf("Failed to delete message")
	}

	return nil
}

func DeleteConversationForUser(userId, conversationId string) error {
	db := middleware.DBConn
	updateQuery := `
		UPDATE public.conversation_members
		SET deleted_at = now(),
			updated_at = now()
		WHERE conversation_id = $1
			AND user_id = $2
			AND deleted_at IS NULL
	`
	result := db.Exec(updateQuery, conversationId, userId)
	if result.Error != nil {
		return fmt.Errorf("Failed to delete conversation")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Conversation not found")
	}
	return nil
}

func GetOrCreateConversationByListing(userId, listingId string) (string, error) {
	db := middleware.DBConn
	var conversationId string

	tx := db.Begin()
	if tx.Error != nil {
		return "", fmt.Errorf("Failed to start DB transaction")
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var sellerId string
	listingQuery := `
		SELECT user_id::text
		FROM public.listings
		WHERE id = $1
		LIMIT 1
	`
	listingResult := tx.Raw(listingQuery, listingId).Scan(&sellerId)
	if listingResult.Error != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to validate listing")
	}
	if listingResult.RowsAffected == 0 || strings.TrimSpace(sellerId) == "" {
		tx.Rollback()
		return "", fmt.Errorf("Listing not found")
	}
	if sellerId == userId {
		tx.Rollback()
		return "", fmt.Errorf("You cannot message your own listing")
	}

	findQuery := `
		SELECT id
		FROM public.conversations
		WHERE listing_id = $1
			AND buyer_id = $2
		LIMIT 1
	`
	findResult := tx.Raw(findQuery, listingId, userId).Scan(&conversationId)
	if findResult.Error != nil {
		tx.Rollback()
		return "", fmt.Errorf("Failed to check existing conversation")
	}

	if strings.TrimSpace(conversationId) == "" {
		insertQuery := `
			INSERT INTO public.conversations (
				listing_id,
				buyer_id,
				seller_id,
				created_at,
				updated_at
			) VALUES ($1, $2, $3, now(), now())
			RETURNING id
		`
		if err := tx.Raw(insertQuery, listingId, userId, sellerId).Scan(&conversationId).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to create conversation")
		}

		insertMembersQuery := `
			INSERT INTO public.conversation_members (conversation_id, user_id, role, created_at, updated_at)
			VALUES
				($1, $2, 'BUYER', now(), now()),
				($1, $3, 'SELLER', now(), now())
		`
		if err := tx.Exec(insertMembersQuery, conversationId, userId, sellerId).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to initialize conversation members")
		}
	} else {
		restoreQuery := `
			UPDATE public.conversation_members
			SET deleted_at = NULL,
				updated_at = now()
			WHERE conversation_id = $1
				AND user_id = $2
		`
		if err := tx.Exec(restoreQuery, conversationId, userId).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to restore conversation")
		}
	}

	if err := tx.Commit().Error; err != nil {
		return "", fmt.Errorf("Failed to finalize conversation")
	}

	return conversationId, nil
}

func NormalizeMessageStatus(status string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(status))
	switch trimmed {
	case "SENT", "DELIVERED", "READ":
		return trimmed
	default:
		return "SENT"
	}
}

func ToISOTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
