package middleware

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

func SendPasswordResetEmail(toEmail, firstName, resetLink string) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

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
		From:    os.Getenv("RESEND_FROM"),
		To:      []string{toEmail},
		Subject: "Reset Your Password",
		Html:    html,
	}

	// NOTE: Currently, only the developer email can receive emails
	_, err := client.Emails.Send(params)
	return err
}

func SendOTPEmail(toEmail, firstName, otp string) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	html := fmt.Sprintf(`
		<h2>Hi %s,</h2>
		<p>Thank you for signing up. Use the OTP below to verify your email address:</p>
		<div style="
			display: inline-block;
			padding: 16px 32px;
			background-color: #f4f4f4;
			border-radius: 8px;
			font-size: 32px;
			font-weight: bold;
			letter-spacing: 8px;
			margin: 16px 0;
		">%s</div>
		<p>This code expires in <strong>10 minutes</strong>.</p>
		<p>If you did not sign up, you can safely ignore this email.</p>
	`, firstName, otp)

	params := &resend.SendEmailRequest{
		From:    os.Getenv("RESEND_FROM"),
		To:      []string{toEmail},
		Subject: "Verify Your Email Address",
		Html:    html,
	}

	_, err := client.Emails.Send(params)
	return err
}
