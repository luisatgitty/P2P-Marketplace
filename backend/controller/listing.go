package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func CreateListing(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	var body model.CreateListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if strings.TrimSpace(body.Type) == "" {
		return SendErrorResponse(c, 400, "Listing type is required", nil)
	}
	if strings.TrimSpace(body.Title) == "" {
		return SendErrorResponse(c, 400, "Title is required", nil)
	}
	if strings.TrimSpace(body.Category) == "" {
		return SendErrorResponse(c, 400, "Category is required", nil)
	}
	if body.Price <= 0 {
		return SendErrorResponse(c, 400, "Price must be greater than 0", nil)
	}
	if strings.TrimSpace(body.Description) == "" {
		return SendErrorResponse(c, 400, "Description is required", nil)
	}
	if strings.TrimSpace(body.LocationCity) == "" || strings.TrimSpace(body.LocationProv) == "" {
		return SendErrorResponse(c, 400, "City and province are required", nil)
	}
	if len(body.Images) == 0 {
		return SendErrorResponse(c, 400, "At least one image is required", nil)
	}

	listingId, err := repository.CreateListing(userId, body)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Listing created successfully", map[string]any{"listingId": listingId})
}
