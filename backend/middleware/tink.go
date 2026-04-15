package middleware

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/tink-crypto/tink-go/v2/aead"
	"github.com/tink-crypto/tink-go/v2/insecurecleartextkeyset"
	"github.com/tink-crypto/tink-go/v2/keyset"
	"github.com/tink-crypto/tink-go/v2/tink"
)

const verificationPIIKeyEnv = "TINK_AEAD_KEYSET_JSON_B64"

func getVerificationPIIAEAD() (tink.AEAD, error) {
	keysetB64 := strings.TrimSpace(GetEnv(verificationPIIKeyEnv))
	if keysetB64 == "" {
		return nil, fmt.Errorf("Missing encryption key configuration")
	}

	keysetJSON, err := base64.StdEncoding.DecodeString(keysetB64)
	if err != nil {
		return nil, fmt.Errorf("Invalid encryption key configuration")
	}

	reader := keyset.NewJSONReader(strings.NewReader(string(keysetJSON)))
	handle, err := insecurecleartextkeyset.Read(reader)
	if err != nil {
		return nil, fmt.Errorf("Invalid encryption keyset")
	}

	primitive, err := aead.New(handle)
	if err != nil {
		return nil, fmt.Errorf("Failed to initialize data encryption")
	}

	return primitive, nil
}

func EncryptVerificationPII(plainText string) (string, error) {
	trimmed := strings.TrimSpace(plainText)
	if trimmed == "" {
		return "", nil
	}

	primitive, err := getVerificationPIIAEAD()
	if err != nil {
		return "", err
	}

	cipherBytes, err := primitive.Encrypt([]byte(trimmed), []byte("user_verifications"))
	if err != nil {
		return "", fmt.Errorf("Failed to encrypt sensitive value")
	}

	return base64.StdEncoding.EncodeToString(cipherBytes), nil
}

func DecryptVerificationPII(cipherText string) (string, error) {
	trimmed := strings.TrimSpace(cipherText)
	if trimmed == "" {
		return "", nil
	}

	primitive, err := getVerificationPIIAEAD()
	if err != nil {
		return "", err
	}

	cipherBytes, err := base64.StdEncoding.DecodeString(trimmed)
	if err != nil {
		return "", fmt.Errorf("Failed to decode encrypted value")
	}

	plainBytes, err := primitive.Decrypt(cipherBytes, []byte("user_verifications"))
	if err != nil {
		return "", fmt.Errorf("Failed to decrypt sensitive value")
	}

	return string(plainBytes), nil
}
