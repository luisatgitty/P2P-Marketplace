package controller

import (
	"fmt"

	"p2p_marketplace/backend/model/data"
	"p2p_marketplace/backend/model/errors"
	"p2p_marketplace/backend/model/response"

	"github.com/gofiber/fiber/v2"
)

func getRetCodeMessage(retCode int) string {
	switch retCode {
	case 400:
		return "Unauthorized Request"
	case 401:
		return "Invalid Request"
	case 404:
		return "Bad Request"
	case 409:
		return "Conflict"
	case 419:
		return "Authentication Timeout"
	case 500:
		return "Internal Server Error"
	default:
		return "Unknown Error"
	}
}

func SendErrorResponse(c *fiber.Ctx, retCode int, message string, err error) error {
	return c.Status(retCode).JSON(response.ResponseModel{
		RetCode: fmt.Sprintf("%d", retCode),
		Message: getRetCodeMessage(retCode),
		Data: errors.ErrorModel{
			Message:   message,
			IsSuccess: false,
			Error:     err,
		},
	})
}

func SendSuccessResponse(c *fiber.Ctx, retCode int, message string, data interface{}) error {
	return c.Status(retCode).JSON(response.ResponseModel{
		RetCode: fmt.Sprintf("%d", retCode),
		Message: message,
		Data:    data,
	})
}

func BuildUserResponse(user data.UserFromDb) map[string]interface{} {
	return map[string]interface{}{
		"firstName": user.FirstName,
		"lastName":  user.LastName,
		"email":     user.Email,
		"role":      user.Role,
		"status":    user.Status,
	}
}
