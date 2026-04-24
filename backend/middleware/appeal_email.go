package middleware

import (
	"fmt"
	"strings"
)

func SendAppealDecisionEmail(toEmail, fullName, ticketNumber, resolution, adminNote string) error {
	displayName := strings.TrimSpace(fullName)
	if displayName == "" {
		displayName = "there"
	}

	trimmedNote := strings.TrimSpace(adminNote)
	if trimmedNote == "" {
		trimmedNote = "No additional note was provided."
	}

	normalizedResolution := strings.ToUpper(strings.TrimSpace(resolution))
	title := "Your appeal has been reviewed"
	summary := "We reviewed your appeal and posted an update."
	accentColor := "#f59e0b"
	accentPanel := "#fffbeb"
	subject := "Appeal update - P2P Marketplace"

	if normalizedResolution == "REACTIVATE" {
		title = "Your appeal has been approved"
		summary = "Your account can now be reactivated. You may sign in again and continue using P2P Marketplace."
		accentColor = "#059669"
		accentPanel = "#ecfdf5"
		subject = "Appeal approved - P2P Marketplace"
	} else if normalizedResolution == "DECLINE" {
		title = "Your appeal was declined"
		summary = "We reviewed your request and are unable to restore the account at this time."
		accentColor = "#dc2626"
		accentPanel = "#fef2f2"
		subject = "Appeal decision - P2P Marketplace"
	}

	body := fmt.Sprintf(`
		<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">
			%s
		</h1>
		<p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">
			Hi <strong style="color:#374151;">%s</strong>, %s
		</p>

		<div style="background-color:%s;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
			<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:%s;">
				Ticket Number
			</p>
			<p style="margin:0;font-size:18px;font-weight:700;color:#111827;">
				%s
			</p>
		</div>

		<p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
			Admin Note
		</p>
		<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
			<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
				%s
			</p>
		</div>

		<p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">
			If you still need assistance, you may submit another support request with additional information.
		</p>
	`, title, displayName, summary, accentPanel, accentColor, ticketNumber, trimmedNote)

	html := baseTemplate(
		title,
		body,
		"This email was sent because your appeal was reviewed on P2P Marketplace.",
	)

	return sendEmail(toEmail, subject, html)
}
