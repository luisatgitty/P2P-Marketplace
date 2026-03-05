package routes

import (
	"p2p_marketplace/backend/controller"

	"github.com/gofiber/fiber/v2"
)

func AppRoutes(app *fiber.App) {
	// Create API endpoints
	app.Post("/auth/signup", controller.SignUpUser)
	app.Post("/auth/login", controller.LogInUser)

	// protected
	app.Get("/api/auth/me", controller.Authenticate, controller.Me)
	app.Post("/api/auth/logout", controller.Authenticate, controller.Logout)
}
