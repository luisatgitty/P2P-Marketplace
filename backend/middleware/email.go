package middleware

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

func SendPasswordResetEmail(toEmail, firstName, resetLink string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	from := os.Getenv("RESEND_FROM")
	client := resend.NewClient(apiKey)

	// Construct the email content
	html := fmt.Sprintf(`
		<h2>Hi %s,</h2>
		<p>You requested a password reset. Click the link below:</p>
		<a href="%s" style="
			display: inline-block;
			padding: 12px 24px;
			background-color: #000;
			color: #fff;
			text-decoration: none;
			border-radius: 6px;
		">Reset Password</a>
		<p>This link expires in <strong>15 minutes</strong>.</p>
		<p>If you did not request this, you can safely ignore this email.</p>
	`, firstName, resetLink)

	params := &resend.SendEmailRequest{
		From:    from,
		To:      []string{toEmail},
		Subject: "Reset Your Password",
		Html:    html,
	}

	// NOTE: Currently, only the developer email can receive emails
	_, err := client.Emails.Send(params)
	return err
}
