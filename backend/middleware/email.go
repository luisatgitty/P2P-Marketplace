package middleware

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
)

type smtpConfig struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func getSmtpConfig() smtpConfig {
	return smtpConfig{
		host:     os.Getenv("SMTP_HOST"),
		port:     os.Getenv("SMTP_PORT"),
		username: os.Getenv("SMTP_USERNAME"),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     os.Getenv("SMTP_FROM"),
	}
}

func sendEmail(toEmail, subject, html string) error {
	cfg := getSmtpConfig()
	auth := smtp.PlainAuth("", cfg.username, cfg.password, cfg.host)

	// Full email headers required for proper delivery
	headers := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n",
		cfg.from, toEmail, subject,
	)

	message := []byte(headers + html)
	addr := fmt.Sprintf("%s:%s", cfg.host, cfg.port)

	// Port 465 uses implicit TLS (SSL), port 587 uses STARTTLS
	if cfg.port == "465" {
		return sendWithTLS(addr, auth, cfg.from, toEmail, message, cfg.host)
	}

	// Port 587 — STARTTLS (most common)
	return smtp.SendMail(addr, auth, cfg.from, []string{toEmail}, message)
}

func sendWithTLS(addr string, auth smtp.Auth, from, to string, message []byte, host string) error {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         host,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("TLS dial failed: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("SMTP client failed: %w", err)
	}
	defer client.Close()

	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth failed: %w", err)
	}
	if err = client.Mail(from); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}
	defer writer.Close()

	_, err = writer.Write(message)
	return err
}

func baseTemplate(previewText, bodyContent, footerNote string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark" />
  <title>P2P Marketplace</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">%s</div>

  <!-- Wrapper -->
  <table width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td>
              <table width="100%%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#1f2937;border-radius:12px 12px 0 0;padding:28px 40px;">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:10px;vertical-align:middle;">
                          <!-- Logo mark -->
                          <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:8px;display:inline-block;"></div>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                            P2P Marketplace
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Card -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              %s
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;text-align:center;">
                %s
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                &copy; 2026 P2P Marketplace. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`, previewText, bodyContent, footerNote)
}

func SendOTPEmail(toEmail, firstName, otp string) error {
	// Split OTP digits for individual boxes
	digits := ""
	for _, ch := range otp {
		digits += fmt.Sprintf(`
      <td style="padding:0 4px;">
        <div style="
          width:44px;height:56px;
          background-color:#f3f4f6;
          border:2px solid #e5e7eb;
          border-radius:10px;
          font-size:28px;
          font-weight:700;
          color:#111827;
          text-align:center;
          line-height:56px;
          letter-spacing:0;
          display:inline-block;
        ">%c</div>
      </td>`, ch)
	}

	body := fmt.Sprintf(`
    <!-- Title -->
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">
      Verify your email address
    </h1>
    <p style="margin:0 0 32px 0;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi <strong style="color:#374151;">%s</strong>, thanks for signing up!
      Enter the code below to confirm your email and activate your account.
    </p>

    <!-- Divider -->
    <div style="height:1px;background-color:#f3f4f6;margin-bottom:32px;"></div>

    <!-- OTP Label -->
    <p style="margin:0 0 16px 0;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
      Your verification code
    </p>

    <!-- OTP Boxes -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>%s</tr>
    </table>

    <!-- Expiry note -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding-right:6px;vertical-align:middle;">
          <div style="width:6px;height:6px;background-color:#f59e0b;border-radius:50%%;"></div>
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:13px;color:#6b7280;">This code expires in <strong style="color:#374151;">10 minutes</strong></span>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <div style="height:1px;background-color:#f3f4f6;margin-bottom:24px;"></div>

    <!-- Warning -->
    <table cellpadding="0" cellspacing="0" border="0"
      style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;width:100%%;">
      <tr>
        <td>
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
            <strong>Didn't request this?</strong> You can safely ignore this email.
            Someone may have entered your email by mistake.
          </p>
        </td>
      </tr>
    </table>
  `, firstName, digits)

	html := baseTemplate(
		"Your P2P Marketplace verification code is: "+otp,
		body,
		"This email was sent because you created an account on P2P Marketplace.",
	)

	return sendEmail(toEmail, "Verify your email – P2P Marketplace", html)
}

func SendPasswordResetEmail(toEmail, firstName, resetLink string) error {
	body := fmt.Sprintf(`
    <!-- Title -->
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">
      Reset your password
    </h1>
    <p style="margin:0 0 32px 0;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi <strong style="color:#374151;">%s</strong>, we received a request to reset
      the password for your P2P Marketplace account. Click the button below to choose a new one.
    </p>

    <!-- Divider -->
    <div style="height:1px;background-color:#f3f4f6;margin-bottom:32px;"></div>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="border-radius:8px;background:linear-gradient(135deg,#3b82f6,#6366f1);">
          <a href="%s"
            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;
            color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
            Reset Password →
          </a>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <p style="margin:0 0 32px 0;font-size:13px;color:#9ca3af;line-height:1.5;">
      Or copy and paste this link into your browser:<br/>
      <a href="%s" style="color:#3b82f6;word-break:break-all;">%s</a>
    </p>

    <!-- Divider -->
    <div style="height:1px;background-color:#f3f4f6;margin-bottom:24px;"></div>

    <!-- Expiry & Warning -->
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%%;">
      <tr>
        <td style="padding-bottom:12px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:6px;vertical-align:middle;">
                <div style="width:6px;height:6px;background-color:#f59e0b;border-radius:50%%;"></div>
              </td>
              <td>
                <span style="font-size:13px;color:#6b7280;">
                  This link expires in <strong style="color:#374151;">15 minutes</strong>
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0" border="0"
            style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;width:100%%;">
            <tr>
              <td>
                <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;">
                  <strong>Didn't request this?</strong> Your account may be at risk.
                  If you didn't request a password reset, please secure your account immediately.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `, firstName, resetLink, resetLink, resetLink)

	html := baseTemplate(
		"Reset your P2P Marketplace password",
		body,
		"This email was sent because a password reset was requested for your account.",
	)

	return sendEmail(toEmail, "Reset your password – P2P Marketplace", html)
}
