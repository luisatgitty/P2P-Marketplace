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
	"unicode/utf8"

	"p2p_marketplace/backend/config"
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
			COALESCE(tx.total_price, 0) AS offer_price,
			COALESCE(tx.status::text, '') AS transaction_status,
			COALESCE(tx.provider_agreed, FALSE) AS provider_agreed,
			COALESCE(tx.client_agreed, FALSE) AS client_agreed,
			CASE
				WHEN c.seller_id = $1 THEN COALESCE(tx.provider_agreed, FALSE)
				ELSE COALESCE(tx.client_agreed, FALSE)
			END AS user_agreed,
			tx.start_date AS schedule_start,
			tx.end_date AS schedule_end,
			COALESCE(lrd.available_from, lsrv.available_from) AS available_from,
			COALESCE(lrd.days_off, lsrv.days_off, '[]') AS days_off,
			COALESCE(tw.time_windows, '[]') AS time_windows,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			l.listing_type::text AS listing_type,
			l.status::text AS listing_status,
			CASE
				WHEN c.seller_id = $1::uuid THEN FALSE
				ELSE EXISTS(
					SELECT 1
					FROM public.listing_transactions lt_review
					WHERE lt_review.listing_id = c.listing_id
						AND lt_review.client_id = $1::uuid
						AND lt_review.status = 'COMPLETED'
				)
			END AS can_review,
			COALESCE(li.image_url, '') AS listing_image_url,
			u.id AS other_user_id,
			u.first_name AS other_first_name,
			u.last_name AS other_last_name,
			COALESCE(u.profile_image_url, '') AS other_profile_image_url,
			COALESCE(u.verification_status::text, '') AS other_verification_status,
			COALESCE(u.location_city, '') AS other_location_city,
			COALESCE(u.location_province, '') AS other_location_province,
			COALESCE(u.is_active, FALSE) AS other_is_active,
			u.account_locked_until AS other_account_locked_until,
			COALESCE(su.is_active, FALSE) AS self_is_active,
			su.account_locked_until AS self_account_locked_until,
			COALESCE(c.last_message, '') AS last_message,
			c.last_message_at,
			COALESCE(other_cm.last_read_message_id::text, '') AS other_last_read_message_id,
			COALESCE(unread.unread_count, 0) AS unread_count,
			(c.seller_id = $1) AS is_seller,
			EXISTS(
				SELECT 1
				FROM public.reports rp
				WHERE rp.reporter_id = $1::uuid
					AND rp.reported_listing_id = c.listing_id
					AND rp.reported_user_id = u.id
					AND rp.status = 'PENDING'
			) AS has_pending_report
		FROM public.conversation_members cm
		JOIN public.conversations c
			ON c.id = cm.conversation_id
		JOIN public.listings l
			ON l.id = c.listing_id
		LEFT JOIN public.listing_rent_details lrd
			ON lrd.listing_id = l.id
		LEFT JOIN public.listing_service_details lsrv
			ON lsrv.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		LEFT JOIN LATERAL (
			SELECT COALESCE(
				json_agg(
					json_build_object(
						'startTime', TO_CHAR(ltw.start_time, 'HH24:MI:SS'),
						'endTime', TO_CHAR(ltw.end_time, 'HH24:MI:SS')
					)
					ORDER BY ltw.start_time
				)::text,
				'[]'
			) AS time_windows
			FROM public.listing_time_windows ltw
			WHERE ltw.listing_id = l.id
		) tw ON TRUE
		LEFT JOIN LATERAL (
			SELECT total_price, start_date, end_date, status, provider_agreed, client_agreed
			FROM public.listing_transactions lt
			WHERE lt.listing_id = c.listing_id
				AND lt.client_id = c.buyer_id
			ORDER BY lt.created_at DESC
			LIMIT 1
		) tx ON TRUE
		JOIN public.users u
			ON u.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
		JOIN public.users su
			ON su.id = $1::uuid
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

func GetConversationsByUserPage(userId string, limit, offset int) ([]model.ConversationFromDb, int, error) {
	db := middleware.DBConn
	rows := make([]model.ConversationFromDb, 0)
	total := 0

	countQuery := `
		SELECT COUNT(*)
		FROM public.conversation_members cm
		WHERE cm.user_id = $1
			AND cm.deleted_at IS NULL
	`

	if err := db.Raw(countQuery, userId).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to count conversations")
	}

	query := `
		SELECT
			c.id,
			l.id AS listing_id,
			l.title AS listing_title,
			l.price AS listing_price,
			COALESCE(tx.total_price, 0) AS offer_price,
			COALESCE(tx.status::text, '') AS transaction_status,
			COALESCE(tx.provider_agreed, FALSE) AS provider_agreed,
			COALESCE(tx.client_agreed, FALSE) AS client_agreed,
			CASE
				WHEN c.seller_id = $1 THEN COALESCE(tx.provider_agreed, FALSE)
				ELSE COALESCE(tx.client_agreed, FALSE)
			END AS user_agreed,
			tx.start_date AS schedule_start,
			tx.end_date AS schedule_end,
			COALESCE(lrd.available_from, lsrv.available_from) AS available_from,
			COALESCE(lrd.days_off, lsrv.days_off, '[]') AS days_off,
			COALESCE(tw.time_windows, '[]') AS time_windows,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			l.listing_type::text AS listing_type,
			l.status::text AS listing_status,
			CASE
				WHEN c.seller_id = $1::uuid THEN FALSE
				ELSE EXISTS(
					SELECT 1
					FROM public.listing_transactions lt_review
					WHERE lt_review.listing_id = c.listing_id
						AND lt_review.client_id = $1::uuid
						AND lt_review.status = 'COMPLETED'
				)
			END AS can_review,
			COALESCE(li.image_url, '') AS listing_image_url,
			u.id AS other_user_id,
			u.first_name AS other_first_name,
			u.last_name AS other_last_name,
			COALESCE(u.profile_image_url, '') AS other_profile_image_url,
			COALESCE(u.verification_status::text, '') AS other_verification_status,
			COALESCE(u.location_city, '') AS other_location_city,
			COALESCE(u.location_province, '') AS other_location_province,
			COALESCE(u.is_active, FALSE) AS other_is_active,
			u.account_locked_until AS other_account_locked_until,
			COALESCE(su.is_active, FALSE) AS self_is_active,
			su.account_locked_until AS self_account_locked_until,
			COALESCE(c.last_message, '') AS last_message,
			c.last_message_at,
			COALESCE(other_cm.last_read_message_id::text, '') AS other_last_read_message_id,
			COALESCE(unread.unread_count, 0) AS unread_count,
			(c.seller_id = $1) AS is_seller,
			EXISTS(
				SELECT 1
				FROM public.reports rp
				WHERE rp.reporter_id = $1::uuid
					AND rp.reported_listing_id = c.listing_id
					AND rp.reported_user_id = u.id
					AND rp.status = 'PENDING'
			) AS has_pending_report
		FROM public.conversation_members cm
		JOIN public.conversations c
			ON c.id = cm.conversation_id
		JOIN public.listings l
			ON l.id = c.listing_id
		LEFT JOIN public.listing_rent_details lrd
			ON lrd.listing_id = l.id
		LEFT JOIN public.listing_service_details lsrv
			ON lsrv.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		LEFT JOIN LATERAL (
			SELECT COALESCE(
				json_agg(
					json_build_object(
						'startTime', TO_CHAR(ltw.start_time, 'HH24:MI:SS'),
						'endTime', TO_CHAR(ltw.end_time, 'HH24:MI:SS')
					)
					ORDER BY ltw.start_time
				)::text,
				'[]'
			) AS time_windows
			FROM public.listing_time_windows ltw
			WHERE ltw.listing_id = l.id
		) tw ON TRUE
		LEFT JOIN LATERAL (
			SELECT total_price, start_date, end_date, status, provider_agreed, client_agreed
			FROM public.listing_transactions lt
			WHERE lt.listing_id = c.listing_id
				AND lt.client_id = c.buyer_id
			ORDER BY lt.created_at DESC
			LIMIT 1
		) tx ON TRUE
		JOIN public.users u
			ON u.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
		JOIN public.users su
			ON su.id = $1::uuid
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
		LIMIT $2 OFFSET $3
	`

	if err := db.Raw(query, userId, limit, offset).Scan(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("Failed to load conversations")
	}

	return rows, total, nil
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
			COALESCE(tx.total_price, 0) AS offer_price,
			COALESCE(tx.status::text, '') AS transaction_status,
			COALESCE(tx.provider_agreed, FALSE) AS provider_agreed,
			COALESCE(tx.client_agreed, FALSE) AS client_agreed,
			CASE
				WHEN c.seller_id = $1 THEN COALESCE(tx.provider_agreed, FALSE)
				ELSE COALESCE(tx.client_agreed, FALSE)
			END AS user_agreed,
			tx.start_date AS schedule_start,
			tx.end_date AS schedule_end,
			COALESCE(lrd.available_from, lsrv.available_from) AS available_from,
			COALESCE(lrd.days_off, lsrv.days_off, '[]') AS days_off,
			COALESCE(tw.time_windows, '[]') AS time_windows,
			COALESCE(l.price_unit, '') AS listing_price_unit,
			l.listing_type::text AS listing_type,
			l.status::text AS listing_status,
			CASE
				WHEN c.seller_id = $1::uuid THEN FALSE
				ELSE EXISTS(
					SELECT 1
					FROM public.listing_transactions lt_review
					WHERE lt_review.listing_id = c.listing_id
						AND lt_review.client_id = $1::uuid
						AND lt_review.status = 'COMPLETED'
				)
			END AS can_review,
			COALESCE(li.image_url, '') AS listing_image_url,
			u.id AS other_user_id,
			u.first_name AS other_first_name,
			u.last_name AS other_last_name,
			COALESCE(u.profile_image_url, '') AS other_profile_image_url,
			COALESCE(u.verification_status::text, '') AS other_verification_status,
			COALESCE(u.location_city, '') AS other_location_city,
			COALESCE(u.location_province, '') AS other_location_province,
			COALESCE(u.is_active, FALSE) AS other_is_active,
			u.account_locked_until AS other_account_locked_until,
			COALESCE(su.is_active, FALSE) AS self_is_active,
			su.account_locked_until AS self_account_locked_until,
			COALESCE(c.last_message, '') AS last_message,
			c.last_message_at,
			COALESCE(other_cm.last_read_message_id::text, '') AS other_last_read_message_id,
			COALESCE(unread.unread_count, 0) AS unread_count,
			(c.seller_id = $1) AS is_seller,
			EXISTS(
				SELECT 1
				FROM public.reports rp
				WHERE rp.reporter_id = $1::uuid
					AND rp.reported_listing_id = c.listing_id
					AND rp.reported_user_id = u.id
					AND rp.status = 'PENDING'
			) AS has_pending_report
		FROM public.conversation_members cm
		JOIN public.conversations c
			ON c.id = cm.conversation_id
		JOIN public.listings l
			ON l.id = c.listing_id
		LEFT JOIN public.listing_rent_details lrd
			ON lrd.listing_id = l.id
		LEFT JOIN public.listing_service_details lsrv
			ON lsrv.listing_id = l.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM public.listing_images
			WHERE listing_id = l.id
			ORDER BY is_primary DESC, id ASC
			LIMIT 1
		) li ON TRUE
		LEFT JOIN LATERAL (
			SELECT COALESCE(
				json_agg(
					json_build_object(
						'startTime', TO_CHAR(ltw.start_time, 'HH24:MI:SS'),
						'endTime', TO_CHAR(ltw.end_time, 'HH24:MI:SS')
					)
					ORDER BY ltw.start_time
				)::text,
				'[]'
			) AS time_windows
			FROM public.listing_time_windows ltw
			WHERE ltw.listing_id = l.id
		) tw ON TRUE
		LEFT JOIN LATERAL (
			SELECT total_price, start_date, end_date, status, provider_agreed, client_agreed
			FROM public.listing_transactions lt
			WHERE lt.listing_id = c.listing_id
				AND lt.client_id = c.buyer_id
			ORDER BY lt.created_at DESC
			LIMIT 1
		) tx ON TRUE
		JOIN public.users u
			ON u.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
		JOIN public.users su
			ON su.id = $1::uuid
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

func GetMessagesByConversation(userId, conversationId string, limit, offset int) ([]model.MessageFromDb, []model.MessageAttachmentFromDb, []model.MessageReactionFromDb, int, error) {
	db := middleware.DBConn
	messages := make([]model.MessageFromDb, 0)
	attachments := make([]model.MessageAttachmentFromDb, 0)
	reactions := make([]model.MessageReactionFromDb, 0)
	total := 0

	countQuery := `
		SELECT COUNT(*)
		FROM public.messages m
		JOIN public.conversation_members cm
			ON cm.conversation_id = m.conversation_id
			AND cm.user_id = $1
			AND cm.deleted_at IS NULL
		LEFT JOIN public.message_deletions md
			ON md.message_id = m.id
			AND md.user_id = $1
		WHERE m.conversation_id = $2
			AND md.id IS NULL
	`

	if err := db.Raw(countQuery, userId, conversationId).Scan(&total).Error; err != nil {
		return nil, nil, nil, 0, fmt.Errorf("Failed to count messages")
	}

	msgQuery := `
		WITH paged_messages AS (
			SELECT
				m.id,
				m.conversation_id,
				m.sender_id,
				COALESCE(m.receiver_id::text, '') AS receiver_id,
				COALESCE(m.content, '') AS content,
				m.status::text AS status,
				m.is_edited,
				m.is_unsent,
				m.created_at,
				m.reply_to_message_id
			FROM public.messages m
			JOIN public.conversation_members cm
				ON cm.conversation_id = m.conversation_id
				AND cm.user_id = $1
				AND cm.deleted_at IS NULL
			LEFT JOIN public.message_deletions md
				ON md.message_id = m.id
				AND md.user_id = $1
			WHERE m.conversation_id = $2
				AND md.id IS NULL
			ORDER BY m.created_at DESC, m.id DESC
			LIMIT $3 OFFSET $4
		)
		SELECT
			pm.id,
			pm.conversation_id,
			pm.sender_id,
			pm.receiver_id,
			pm.content,
			pm.status,
			pm.is_edited,
			pm.is_unsent,
			pm.created_at,
			COALESCE(rm.id::text, '') AS reply_message_id,
			COALESCE(rm.sender_id::text, '') AS reply_sender_id,
			COALESCE(CONCAT(ru.first_name, ' ', ru.last_name), '') AS reply_sender_name,
			COALESCE(rm.content, '') AS reply_content
		FROM paged_messages pm
		LEFT JOIN public.messages rm
			ON rm.id = pm.reply_to_message_id
		LEFT JOIN public.users ru
			ON ru.id = rm.sender_id
		ORDER BY pm.created_at ASC, pm.id ASC
	`

	if err := db.Raw(msgQuery, userId, conversationId, limit, offset).Scan(&messages).Error; err != nil {
		return nil, nil, nil, 0, fmt.Errorf("Failed to load messages")
	}

	attQuery := `
		WITH paged_message_ids AS (
			SELECT m.id
			FROM public.messages m
			JOIN public.conversation_members cm
				ON cm.conversation_id = m.conversation_id
				AND cm.user_id = $1
				AND cm.deleted_at IS NULL
			LEFT JOIN public.message_deletions md
				ON md.message_id = m.id
				AND md.user_id = $1
			WHERE m.conversation_id = $2
				AND md.id IS NULL
			ORDER BY m.created_at DESC, m.id DESC
			LIMIT $3 OFFSET $4
		)
		SELECT
			a.id,
			a.message_id,
			a.file_url,
			a.file_type::text AS file_type,
			COALESCE(a.file_name, '') AS file_name,
			COALESCE(a.file_size, 0) AS file_size
		FROM public.message_attachments a
		JOIN paged_message_ids pm
			ON pm.id = a.message_id
		ORDER BY a.sort_order ASC, a.created_at ASC
	`

	if err := db.Raw(attQuery, userId, conversationId, limit, offset).Scan(&attachments).Error; err != nil {
		return nil, nil, nil, 0, fmt.Errorf("Failed to load message attachments")
	}

	reactQuery := `
		WITH paged_message_ids AS (
			SELECT m.id
			FROM public.messages m
			JOIN public.conversation_members cm
				ON cm.conversation_id = m.conversation_id
				AND cm.user_id = $1
				AND cm.deleted_at IS NULL
			LEFT JOIN public.message_deletions md
				ON md.message_id = m.id
				AND md.user_id = $1
			WHERE m.conversation_id = $2
				AND md.id IS NULL
			ORDER BY m.created_at DESC, m.id DESC
			LIMIT $3 OFFSET $4
		)
		SELECT
			r.message_id,
			r.user_id,
			r.reaction::text AS reaction
		FROM public.message_reactions r
		JOIN paged_message_ids pm
			ON pm.id = r.message_id
		ORDER BY r.created_at ASC
	`

	if err := db.Raw(reactQuery, userId, conversationId, limit, offset).Scan(&reactions).Error; err != nil {
		return nil, nil, nil, 0, fmt.Errorf("Failed to load message reactions")
	}

	return messages, attachments, reactions, total, nil
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

func GetParticipantUserIdsByListing(listingId string) ([]string, error) {
	db := middleware.DBConn
	rows := make([]struct {
		BuyerId  string `gorm:"column:buyer_id"`
		SellerId string `gorm:"column:seller_id"`
	}, 0)

	query := `
		SELECT
			buyer_id::text AS buyer_id,
			seller_id::text AS seller_id
		FROM public.conversations
		WHERE listing_id = $1
	`

	if err := db.Raw(query, listingId).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve conversation participants")
	}

	unique := make(map[string]struct{})
	for _, row := range rows {
		buyerId := strings.TrimSpace(row.BuyerId)
		sellerId := strings.TrimSpace(row.SellerId)
		if buyerId != "" {
			unique[buyerId] = struct{}{}
		}
		if sellerId != "" {
			unique[sellerId] = struct{}{}
		}
	}

	ids := make([]string, 0, len(unique))
	for userId := range unique {
		ids = append(ids, userId)
	}

	return ids, nil
}

func getMessagingUserStatusTx(tx *gorm.DB, userId string) (bool, *time.Time, error) {
	var row struct {
		IsActive           bool       `gorm:"column:is_active"`
		AccountLockedUntil *time.Time `gorm:"column:account_locked_until"`
	}

	result := tx.Raw(`
		SELECT
			COALESCE(is_active, FALSE) AS is_active,
			account_locked_until
		FROM public.users
		WHERE id = $1
		LIMIT 1
	`, userId).Scan(&row)
	if result.Error != nil {
		return false, nil, fmt.Errorf("Failed to validate account status")
	}
	if result.RowsAffected == 0 {
		return false, nil, fmt.Errorf("User not found")
	}

	return row.IsActive, row.AccountLockedUntil, nil
}

func CreateMessage(userId, conversationId, content, replyToMessageId string, attachments []model.MessageAttachmentBody) (model.MessageFromDb, error) {
	db := middleware.DBConn
	var created model.MessageFromDb

	trimmed := strings.TrimSpace(content)
	if trimmed == "" && len(attachments) == 0 {
		return created, fmt.Errorf("Message content is required")
	}
	if utf8.RuneCountInString(trimmed) > config.MessageContentMaxLength {
		return created, fmt.Errorf("Message content must not exceed %d characters", config.MessageContentMaxLength)
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

	now := time.Now().UTC()
	senderIsActive, senderLockedUntil, senderErr := getMessagingUserStatusTx(tx, userId)
	if senderErr != nil {
		tx.Rollback()
		return created, senderErr
	}
	if !senderIsActive {
		tx.Rollback()
		return created, fmt.Errorf("Your account is inactive. Messaging is unavailable")
	}
	if senderLockedUntil != nil && senderLockedUntil.After(now) {
		tx.Rollback()
		return created, fmt.Errorf("Your account is temporarily locked. Messaging is unavailable")
	}

	receiverIsActive, receiverLockedUntil, receiverErr := getMessagingUserStatusTx(tx, receiverId)
	if receiverErr != nil {
		tx.Rollback()
		return created, receiverErr
	}
	if !receiverIsActive || (receiverLockedUntil != nil && receiverLockedUntil.After(now)) {
		tx.Rollback()
		return created, fmt.Errorf("Recipient is unavailable")
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
	if utf8.RuneCountInString(trimmed) > config.MessageContentMaxLength {
		return fmt.Errorf("Message content must not exceed %d characters", config.MessageContentMaxLength)
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

func GetOrCreateConversationByListing(
	userId,
	listingId string,
	offerPrice int,
	offerMessage,
	startDate,
	endDate,
	startTime,
	endTime,
	scheduleMessage string,
) (string, error) {
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
	var listingType string
	var listingStatus string
	var listingPrice int
	listingQuery := `
		SELECT
			user_id::text,
			LOWER(listing_type::text) AS listing_type,
			LOWER(COALESCE(status::text, 'available')) AS listing_status,
			COALESCE(price, 0) AS listing_price
		FROM public.listings
		WHERE id = $1
		LIMIT 1
	`
	listingResult := tx.Raw(listingQuery, listingId).Row()
	if err := listingResult.Scan(&sellerId, &listingType, &listingStatus, &listingPrice); err != nil {
		tx.Rollback()
		return "", fmt.Errorf("Listing not found")
	}
	if strings.TrimSpace(sellerId) == "" {
		tx.Rollback()
		return "", fmt.Errorf("Listing not found")
	}
	if sellerId == userId {
		tx.Rollback()
		return "", fmt.Errorf("You cannot message your own listing")
	}

	now := time.Now().UTC()
	requesterIsActive, requesterLockedUntil, requesterErr := getMessagingUserStatusTx(tx, userId)
	if requesterErr != nil {
		tx.Rollback()
		return "", requesterErr
	}
	if !requesterIsActive {
		tx.Rollback()
		return "", fmt.Errorf("Your account is inactive. Messaging is unavailable")
	}
	if requesterLockedUntil != nil && requesterLockedUntil.After(now) {
		tx.Rollback()
		return "", fmt.Errorf("Your account is temporarily locked. Messaging is unavailable")
	}

	sellerIsActive, sellerLockedUntil, sellerErr := getMessagingUserStatusTx(tx, sellerId)
	if sellerErr != nil {
		tx.Rollback()
		return "", sellerErr
	}
	if !sellerIsActive || (sellerLockedUntil != nil && sellerLockedUntil.After(now)) {
		tx.Rollback()
		return "", fmt.Errorf("Recipient is unavailable")
	}

	if listingType == "sell" && listingStatus == "sold" {
		tx.Rollback()
		return "", fmt.Errorf("This listing is already sold")
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

	if offerPrice > 0 {
		if listingType != "sell" {
			tx.Rollback()
			return "", fmt.Errorf("Offers are only supported for For Sale listings")
		}

		actorFirstName, err := getUserFirstNameTx(tx, userId)
		if err != nil {
			tx.Rollback()
			return "", err
		}

		countActiveTransactionsQuery := `
			SELECT COUNT(*)
			FROM public.listing_transactions
			WHERE listing_id = $1
				AND client_id = $2
				AND status NOT IN ('COMPLETED', 'CANCELLED')
		`
		var activeCount int
		if err := tx.Raw(countActiveTransactionsQuery, listingId, userId).Scan(&activeCount).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to inspect existing transactions")
		}

		if activeCount == 0 {
			insertTransactionQuery := `
				INSERT INTO public.listing_transactions (
					listing_id,
					client_id,
					total_price,
					provider_agreed,
					client_agreed,
					status,
					created_at
				) VALUES (
					$1,
					$2,
					$3,
					FALSE,
					FALSE,
					'PENDING',
					now()
				)
			`
			if err := tx.Exec(insertTransactionQuery, listingId, userId, offerPrice).Error; err != nil {
				tx.Rollback()
				return "", fmt.Errorf("Failed to save offer transaction")
			}
		} else {
			updateExistingTransactionQuery := `
				UPDATE public.listing_transactions
				SET
					total_price = $2,
					provider_agreed = FALSE,
					client_agreed = FALSE,
					status = 'PENDING',
					cancelled_at = NULL,
					cancelled_by_id = NULL,
					completed_at = NULL,
					created_at = now()
				WHERE id = (
					SELECT lt.id
					FROM public.listing_transactions lt
					WHERE lt.listing_id = $1
						AND lt.client_id = $3
						AND lt.status NOT IN ('COMPLETED', 'CANCELLED')
					ORDER BY lt.created_at DESC
					LIMIT 1
				)
			`
			updateResult := tx.Exec(updateExistingTransactionQuery, listingId, offerPrice, userId)
			if updateResult.Error != nil {
				tx.Rollback()
				return "", fmt.Errorf("Failed to update offer transaction")
			}
			if updateResult.RowsAffected == 0 {
				tx.Rollback()
				return "", fmt.Errorf("No eligible transaction found for update")
			}
		}

		offerActionContent := fmt.Sprintf("__OFFER_ACTION__:%s offered ₱%s", actorFirstName, formatAmountWithCommas(offerPrice))
		actionMessage, err := insertConversationMessageTx(tx, conversationId, userId, sellerId, offerActionContent)
		if err != nil {
			tx.Rollback()
			return "", err
		}

		lastMessageID := actionMessage.Id
		lastMessageText := strings.TrimSpace(actionMessage.Content)
		lastMessageAt := actionMessage.CreatedAt

		trimmedOfferMessage := strings.TrimSpace(offerMessage)
		if trimmedOfferMessage != "" {
			noteMessage, err := insertConversationMessageTx(tx, conversationId, userId, sellerId, trimmedOfferMessage)
			if err != nil {
				tx.Rollback()
				return "", err
			}
			lastMessageID = noteMessage.Id
			lastMessageText = strings.TrimSpace(noteMessage.Content)
			lastMessageAt = noteMessage.CreatedAt
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
		if err := tx.Exec(updateConversationQuery, conversationId, lastMessageID, lastMessageText, userId, lastMessageAt).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to update conversation metadata")
		}
	}

	trimmedStartDate := strings.TrimSpace(startDate)
	trimmedEndDate := strings.TrimSpace(endDate)
	hasScheduleRequest := trimmedStartDate != "" || trimmedEndDate != ""
	if hasScheduleRequest {
		if trimmedStartDate == "" || trimmedEndDate == "" {
			tx.Rollback()
			return "", fmt.Errorf("Start date and end date are required for schedule request")
		}
		if listingType != "rent" && listingType != "service" {
			tx.Rollback()
			return "", fmt.Errorf("Schedule requests are only supported for Rent and Service listings")
		}

		scheduleStartAt, scheduleEndAt, err := parseScheduleRange(trimmedStartDate, trimmedEndDate, startTime, endTime)
		if err != nil {
			tx.Rollback()
			return "", err
		}

		actorFirstName, err := getUserFirstNameTx(tx, userId)
		if err != nil {
			tx.Rollback()
			return "", err
		}

		countActiveTransactionsQuery := `
			SELECT COUNT(*)
			FROM public.listing_transactions
			WHERE listing_id = $1
				AND client_id = $2
				AND status NOT IN ('COMPLETED', 'CANCELLED')
		`
		var activeCount int
		if err := tx.Raw(countActiveTransactionsQuery, listingId, userId).Scan(&activeCount).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to inspect existing transactions")
		}

		if activeCount == 0 {
			insertTransactionQuery := `
				INSERT INTO public.listing_transactions (
					listing_id,
					client_id,
					start_date,
					end_date,
					total_price,
					provider_agreed,
					client_agreed,
					status,
					created_at
				) VALUES (
					$1,
					$2,
					$3,
					$4,
					$5,
					FALSE,
					FALSE,
					'PENDING',
					now()
				)
			`
			if err := tx.Exec(insertTransactionQuery, listingId, userId, scheduleStartAt, scheduleEndAt, listingPrice).Error; err != nil {
				tx.Rollback()
				return "", fmt.Errorf("Failed to save schedule transaction")
			}
		} else {
			updateExistingTransactionQuery := `
				UPDATE public.listing_transactions
				SET
					start_date = $2,
					end_date = $3,
					total_price = $4,
					provider_agreed = FALSE,
					client_agreed = FALSE,
					status = 'PENDING',
					cancelled_at = NULL,
					cancelled_by_id = NULL,
					completed_at = NULL,
					created_at = now()
				WHERE id = (
					SELECT lt.id
					FROM public.listing_transactions lt
					WHERE lt.listing_id = $1
						AND lt.client_id = $5
						AND lt.status NOT IN ('COMPLETED', 'CANCELLED')
					ORDER BY lt.created_at DESC
					LIMIT 1
				)
			`
			updateResult := tx.Exec(updateExistingTransactionQuery, listingId, scheduleStartAt, scheduleEndAt, listingPrice, userId)
			if updateResult.Error != nil {
				tx.Rollback()
				return "", fmt.Errorf("Failed to update schedule transaction")
			}
			if updateResult.RowsAffected == 0 {
				tx.Rollback()
				return "", fmt.Errorf("No eligible transaction found for schedule update")
			}
		}

		scheduleActionContent := fmt.Sprintf(
			"__SCHEDULE_ACTION__:%s requested schedule on %s - %s",
			actorFirstName,
			scheduleStartAt.Format("Jan 02"),
			scheduleEndAt.Format("Jan 02"),
		)
		actionMessage, err := insertConversationMessageTx(tx, conversationId, userId, sellerId, scheduleActionContent)
		if err != nil {
			tx.Rollback()
			return "", err
		}

		lastMessageID := actionMessage.Id
		lastMessageText := strings.TrimSpace(actionMessage.Content)
		lastMessageAt := actionMessage.CreatedAt

		trimmedScheduleMessage := strings.TrimSpace(scheduleMessage)
		if trimmedScheduleMessage != "" {
			noteMessage, err := insertConversationMessageTx(tx, conversationId, userId, sellerId, trimmedScheduleMessage)
			if err != nil {
				tx.Rollback()
				return "", err
			}
			lastMessageID = noteMessage.Id
			lastMessageText = strings.TrimSpace(noteMessage.Content)
			lastMessageAt = noteMessage.CreatedAt
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
		if err := tx.Exec(updateConversationQuery, conversationId, lastMessageID, lastMessageText, userId, lastMessageAt).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("Failed to update conversation metadata")
		}
	}

	if err := tx.Commit().Error; err != nil {
		return "", fmt.Errorf("Failed to finalize conversation")
	}

	return conversationId, nil
}

func UpdateConversationOfferByOwner(userId, conversationId string, offerPrice int, offerMessage string) (model.TransactionAgreementState, error) {
	db := middleware.DBConn
	state := model.TransactionAgreementState{}

	if offerPrice <= 0 {
		return state, fmt.Errorf("Offer price must be greater than 0")
	}

	tx := db.Begin()
	if tx.Error != nil {
		return state, fmt.Errorf("Failed to start DB transaction")
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var listingId string
	var buyerId string
	var sellerId string
	var listingType string
	var listingStatus string
	conversationQuery := `
		SELECT
			c.listing_id::text,
			c.buyer_id::text,
			c.seller_id::text,
			LOWER(l.listing_type::text) AS listing_type,
			LOWER(COALESCE(l.status::text, 'available')) AS listing_status
		FROM public.conversations c
		JOIN public.listings l
			ON l.id = c.listing_id
		JOIN public.conversation_members cm
			ON cm.conversation_id = c.id
			AND cm.user_id = $2
			AND cm.deleted_at IS NULL
		WHERE c.id = $1
		LIMIT 1
	`
	if err := tx.Raw(conversationQuery, conversationId, userId).Row().Scan(&listingId, &buyerId, &sellerId, &listingType, &listingStatus); err != nil {
		tx.Rollback()
		return state, fmt.Errorf("Conversation not found")
	}

	if strings.TrimSpace(userId) != strings.TrimSpace(sellerId) {
		tx.Rollback()
		return state, fmt.Errorf("Only the listing owner can update this offer")
	}

	if listingType != "sell" {
		tx.Rollback()
		return state, fmt.Errorf("Offers are only supported for For Sale listings")
	}

	if listingStatus == "sold" {
		tx.Rollback()
		return state, fmt.Errorf("This listing is already sold")
	}

	actorFirstName, err := getUserFirstNameTx(tx, userId)
	if err != nil {
		tx.Rollback()
		return state, err
	}

	countActiveTransactionsQuery := `
		SELECT COUNT(*)
		FROM public.listing_transactions
		WHERE listing_id = $1
			AND client_id = $2
			AND status NOT IN ('COMPLETED', 'CANCELLED')
	`
	var nonCompletedCount int
	if err := tx.Raw(countActiveTransactionsQuery, listingId, buyerId).Scan(&nonCompletedCount).Error; err != nil {
		tx.Rollback()
		return state, fmt.Errorf("Failed to inspect existing transactions")
	}

	if nonCompletedCount == 0 {
		insertTransactionQuery := `
			INSERT INTO public.listing_transactions (
				listing_id,
				client_id,
				total_price,
				provider_agreed,
				client_agreed,
				status,
				created_at
			) VALUES (
				$1,
				$2,
				$3,
				FALSE,
				FALSE,
				'PENDING',
				now()
			)
		`
		if err := tx.Exec(insertTransactionQuery, listingId, buyerId, offerPrice).Error; err != nil {
			tx.Rollback()
			return state, fmt.Errorf("Failed to save offer transaction")
		}
	} else {
		updateExistingTransactionQuery := `
			UPDATE public.listing_transactions
			SET
				total_price = $2,
				provider_agreed = FALSE,
				client_agreed = FALSE,
				status = 'PENDING',
				cancelled_at = NULL,
				cancelled_by_id = NULL,
				completed_at = NULL,
				created_at = now()
			WHERE id = (
				SELECT lt.id
				FROM public.listing_transactions lt
				WHERE lt.listing_id = $1
					AND lt.client_id = $3
					AND lt.status NOT IN ('COMPLETED', 'CANCELLED')
				ORDER BY lt.created_at DESC
				LIMIT 1
			)
		`
		updateResult := tx.Exec(updateExistingTransactionQuery, listingId, offerPrice, buyerId)
		if updateResult.Error != nil {
			tx.Rollback()
			return state, fmt.Errorf("Failed to update offer transaction")
		}
		if updateResult.RowsAffected == 0 {
			tx.Rollback()
			return state, fmt.Errorf("No eligible transaction found for update")
		}
	}

	offerActionContent := fmt.Sprintf("__OFFER_ACTION__:%s offered ₱%s", actorFirstName, formatAmountWithCommas(offerPrice))
	actionMessage, err := insertConversationMessageTx(tx, conversationId, userId, buyerId, offerActionContent)
	if err != nil {
		tx.Rollback()
		return state, err
	}

	lastMessageID := actionMessage.Id
	lastMessageText := strings.TrimSpace(actionMessage.Content)
	lastMessageAt := actionMessage.CreatedAt

	trimmedOfferMessage := strings.TrimSpace(offerMessage)
	if trimmedOfferMessage != "" {
		noteMessage, err := insertConversationMessageTx(tx, conversationId, userId, buyerId, trimmedOfferMessage)
		if err != nil {
			tx.Rollback()
			return state, err
		}
		lastMessageID = noteMessage.Id
		lastMessageText = strings.TrimSpace(noteMessage.Content)
		lastMessageAt = noteMessage.CreatedAt
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
	if err := tx.Exec(updateConversationQuery, conversationId, lastMessageID, lastMessageText, userId, lastMessageAt).Error; err != nil {
		tx.Rollback()
		return state, fmt.Errorf("Failed to update conversation metadata")
	}

	if err := tx.Commit().Error; err != nil {
		return state, fmt.Errorf("Failed to finalize offer update")
	}

	state.ConversationId = strings.TrimSpace(conversationId)
	state.ListingId = strings.TrimSpace(listingId)
	state.TransactionStatus = "PENDING"
	state.ProviderAgreed = false
	state.ClientAgreed = false
	state.UserAgreed = false

	return state, nil
}

func ToggleConversationTransactionAgreement(userId, conversationId string) (model.TransactionAgreementState, error) {
	db := middleware.DBConn
	state := model.TransactionAgreementState{}

	tx := db.Begin()
	if tx.Error != nil {
		return state, fmt.Errorf("Failed to start DB transaction")
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var listingId string
	var buyerId string
	var sellerId string
	var listingType string
	memberQuery := `
		SELECT
			c.listing_id::text,
			c.buyer_id::text,
			c.seller_id::text,
			LOWER(l.listing_type::text) AS listing_type
		FROM public.conversations c
		JOIN public.listings l
			ON l.id = c.listing_id
		JOIN public.conversation_members cm
			ON cm.conversation_id = c.id
			AND cm.user_id = $2
			AND cm.deleted_at IS NULL
		WHERE c.id = $1
		LIMIT 1
	`
	if err := tx.Raw(memberQuery, conversationId, userId).Row().Scan(&listingId, &buyerId, &sellerId, &listingType); err != nil {
		tx.Rollback()
		return state, fmt.Errorf("Conversation not found")
	}

	if strings.TrimSpace(userId) != strings.TrimSpace(buyerId) && strings.TrimSpace(userId) != strings.TrimSpace(sellerId) {
		tx.Rollback()
		return state, fmt.Errorf("You are not part of this transaction")
	}

	actorFirstName, err := getUserFirstNameTx(tx, userId)
	if err != nil {
		tx.Rollback()
		return state, err
	}

	var txId string
	var currentStatus string
	var providerAgreed bool
	var clientAgreed bool
	latestTxQuery := `
		SELECT id::text, COALESCE(status::text, 'PENDING') AS status, provider_agreed, client_agreed
		FROM public.listing_transactions
		WHERE listing_id = $1
			AND client_id = $2
		ORDER BY created_at DESC
		LIMIT 1
	`
	if err := tx.Raw(latestTxQuery, listingId, buyerId).Row().Scan(&txId, &currentStatus, &providerAgreed, &clientAgreed); err != nil {
		tx.Rollback()
		return state, fmt.Errorf("No listing transaction found for this conversation")
	}

	normalizedStatus := strings.ToUpper(strings.TrimSpace(currentStatus))
	if normalizedStatus == "CANCELLED" || normalizedStatus == "COMPLETED" {
		tx.Rollback()
		return state, fmt.Errorf("This transaction can no longer be updated")
	}

	if strings.TrimSpace(userId) == strings.TrimSpace(sellerId) {
		providerAgreed = !providerAgreed
	} else {
		clientAgreed = !clientAgreed
	}

	nextStatus := "PENDING"
	if providerAgreed && clientAgreed {
		nextStatus = "CONFIRMED"
	}

	updateQuery := `
		UPDATE public.listing_transactions
		SET
			provider_agreed = $2,
			client_agreed = $3,
			status = $4::transaction_status
		WHERE id = $1
	`
	if err := tx.Exec(updateQuery, txId, providerAgreed, clientAgreed, nextStatus).Error; err != nil {
		tx.Rollback()
		return state, fmt.Errorf("Failed to update transaction agreement")
	}

	receiverId := buyerId
	userAgreedNow := false
	if strings.TrimSpace(userId) == strings.TrimSpace(sellerId) {
		receiverId = buyerId
		userAgreedNow = providerAgreed
	} else {
		receiverId = sellerId
		userAgreedNow = clientAgreed
	}

	actionSuffix := fmt.Sprintf("%s agreed to the offer", actorFirstName)
	if listingType != "sell" {
		actionSuffix = fmt.Sprintf("%s agreed to schedule", actorFirstName)
	}
	if !userAgreedNow {
		actionSuffix = fmt.Sprintf("%s withdrew agreement", actorFirstName)
	}

	actionMessage, err := insertConversationMessageTx(tx, conversationId, userId, receiverId, "__DEAL_ACTION__:"+actionSuffix)
	if err != nil {
		tx.Rollback()
		return state, err
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
	if err := tx.Exec(updateConversationQuery, conversationId, actionMessage.Id, strings.TrimSpace(actionMessage.Content), userId, actionMessage.CreatedAt).Error; err != nil {
		tx.Rollback()
		return state, fmt.Errorf("Failed to update conversation metadata")
	}

	if err := tx.Commit().Error; err != nil {
		return state, fmt.Errorf("Failed to finalize transaction agreement")
	}

	state.ConversationId = strings.TrimSpace(conversationId)
	state.ListingId = strings.TrimSpace(listingId)
	state.TransactionStatus = nextStatus
	state.ProviderAgreed = providerAgreed
	state.ClientAgreed = clientAgreed
	state.UserAgreed = userAgreedNow

	return state, nil
}

func getUserFirstNameTx(tx *gorm.DB, userId string) (string, error) {
	var firstName string
	query := `
		SELECT COALESCE(NULLIF(TRIM(first_name), ''), 'User')
		FROM public.users
		WHERE id = $1
		LIMIT 1
	`
	result := tx.Raw(query, userId).Scan(&firstName)
	if result.Error != nil {
		return "", fmt.Errorf("Failed to load user details")
	}
	if result.RowsAffected == 0 {
		return "", fmt.Errorf("User not found")
	}
	return strings.TrimSpace(firstName), nil
}

func formatAmountWithCommas(amount int) string {
	negative := amount < 0
	if negative {
		amount = -amount
	}

	num := fmt.Sprintf("%d", amount)
	if len(num) <= 3 {
		if negative {
			return "-" + num
		}
		return num
	}

	parts := make([]string, 0)
	for len(num) > 3 {
		parts = append([]string{num[len(num)-3:]}, parts...)
		num = num[:len(num)-3]
	}
	parts = append([]string{num}, parts...)
	out := strings.Join(parts, ",")
	if negative {
		return "-" + out
	}
	return out
}

func insertConversationMessageTx(tx *gorm.DB, conversationId, senderId, receiverId, content string) (model.MessageFromDb, error) {
	var created model.MessageFromDb
	trimmedContent := strings.TrimSpace(content)
	if utf8.RuneCountInString(trimmedContent) > config.MessageContentMaxLength {
		return created, fmt.Errorf("Message content must not exceed %d characters", config.MessageContentMaxLength)
	}

	insertQuery := `
		INSERT INTO public.messages (
			conversation_id,
			sender_id,
			receiver_id,
			content,
			status,
			created_at,
			updated_at
		) VALUES (
			$1,
			$2,
			$3,
			$4,
			'SENT',
			now(),
			now()
		)
		RETURNING id, conversation_id, sender_id, receiver_id, COALESCE(content, '') AS content, status::text AS status, is_edited, is_unsent, created_at
	`

	if err := tx.Raw(insertQuery, conversationId, senderId, receiverId, trimmedContent).Scan(&created).Error; err != nil {
		return created, fmt.Errorf("Failed to send offer message")
	}

	return created, nil
}

func parseScheduleRange(startDate, endDate, startTime, endTime string) (time.Time, time.Time, error) {
	startDateVal, err := time.Parse("2006-01-02", strings.TrimSpace(startDate))
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("Invalid start date")
	}
	endDateVal, err := time.Parse("2006-01-02", strings.TrimSpace(endDate))
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("Invalid end date")
	}

	if endDateVal.Before(startDateVal) {
		return time.Time{}, time.Time{}, fmt.Errorf("End date cannot be earlier than start date")
	}

	startClock := strings.TrimSpace(startTime)
	if startClock == "" {
		startClock = "00:00"
	}
	endClock := strings.TrimSpace(endTime)
	if endClock == "" {
		endClock = "23:59"
	}

	startClockVal, err := time.Parse("15:04", startClock)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("Invalid start time")
	}
	endClockVal, err := time.Parse("15:04", endClock)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("Invalid end time")
	}

	scheduleStart := time.Date(
		startDateVal.Year(),
		startDateVal.Month(),
		startDateVal.Day(),
		startClockVal.Hour(),
		startClockVal.Minute(),
		0,
		0,
		time.UTC,
	)
	scheduleEnd := time.Date(
		endDateVal.Year(),
		endDateVal.Month(),
		endDateVal.Day(),
		endClockVal.Hour(),
		endClockVal.Minute(),
		0,
		0,
		time.UTC,
	)

	if !scheduleEnd.After(scheduleStart) {
		return time.Time{}, time.Time{}, fmt.Errorf("End schedule must be later than start schedule")
	}

	return scheduleStart, scheduleEnd, nil
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
