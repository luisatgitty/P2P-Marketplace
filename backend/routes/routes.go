package routes

import (
	"github.com/gofiber/fiber/v2"

	"p2p_marketplace/backend/controller"
)

func AppRoutes(app *fiber.App) {
	// Public
	app.Post("/auth/signup", controller.SignUpUser)
	app.Post("/auth/login", controller.LogInUser)

	// Protected
	app.Get("/auth/me", controller.Authenticate, controller.Me)
	app.Delete("/auth/logout", controller.Authenticate, controller.Logout)
}
