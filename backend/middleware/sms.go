package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type twilioErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"status"`
}

func SendSMS(recipient, message string) error {
	// Twilio Messages endpoint
	apiURL := fmt.Sprintf(
		"https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json",
		os.Getenv("TWILIO_ACCOUNT_SID"),
	)

	// Build URL-encoded form body (Twilio REST API uses application/x-www-form-urlencoded)
	formData := url.Values{}
	formData.Set("To", recipient)
	formData.Set("From", os.Getenv("TWILIO_PHONE_NUMBER")) // Your Twilio number in E.164 format
	formData.Set("Body", message)

	req, err := http.NewRequest(http.MethodPost, apiURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return fmt.Errorf("twilio: failed to build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	// Twilio uses HTTP Basic Auth: Account SID as username, Auth Token as password
	req.SetBasicAuth(os.Getenv("TWILIO_ACCOUNT_SID"), os.Getenv("TWILIO_AUTH_TOKEN"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("twilio: HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("twilio: failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusCreated {
		var twilioErr twilioErrorResponse
		if jsonErr := json.Unmarshal(body, &twilioErr); jsonErr == nil && twilioErr.Message != "" {
			return fmt.Errorf("twilio: %s (code %d)", twilioErr.Message, twilioErr.Code)
		}
		return fmt.Errorf("twilio: unexpected status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
