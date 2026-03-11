package controller

import (
	"fmt"

	"p2p_marketplace/backend/model"

	"github.com/gofiber/fiber/v2"
)

var retCodeMessages = map[int]string{
	400: "Unauthorized Request",
	401: "Invalid Request",
	404: "Bad Request",
	409: "Conflict",
	419: "Authentication Timeout",
	500: "Internal Server Error",
}

func SendErrorResponse(c *fiber.Ctx, retCode int, message string, err error) error {
	return c.Status(retCode).JSON(model.ResponseModel{
		RetCode: fmt.Sprintf("%d", retCode),
		Message: retCodeMessages[retCode],
		Data: model.ErrorModel{
			Message:   message,
			IsSuccess: false,
			Error:     err,
		},
	})
}

func SendSuccessResponse(c *fiber.Ctx, retCode int, message string, data any) error {
	return c.Status(retCode).JSON(model.ResponseModel{
		RetCode: fmt.Sprintf("%d", retCode),
		Message: message,
		Data:    data,
	})
}

func BuildUserResponse(user model.UserFromDb) map[string]any {
	return map[string]interface{}{
		"firstName": user.FirstName,
		"lastName":  user.LastName,
		"email":     user.Email,
		"role":      user.Role,
		"status":    user.Status,
	}
}
