package middleware

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

func GetEnv(key string) string {
	// Load .env file and get the value of the specified key
	if err := godotenv.Load(".env"); err != nil {
		fmt.Println("Error loading .env file")
		return err.Error()
	}
	return os.Getenv(key)
}
