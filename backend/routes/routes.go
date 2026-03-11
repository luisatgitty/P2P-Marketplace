package routes

import (
	"p2p_marketplace/backend/controller"

	"github.com/gofiber/fiber/v2"
)

func AppRoutes(app *fiber.App) {
	// Public
	app.Post("/auth/signup", controller.SendEmailOTP)
	app.Post("/auth/login", controller.LogInUser)
	app.Post("/auth/verify-email", controller.SignUpUser)
	app.Post("/auth/resend-otp", controller.SendEmailOTP)
	app.Post("/auth/forgot-password", controller.ForgotPassword)

	// Protected
	app.Get("/auth/me", controller.AuthenticateUser, controller.Me)
	app.Delete("/auth/logout", controller.Logout)
	app.Get("/auth/validate-reset-token", controller.ValidateResetToken)
	app.Post("/auth/reset-password", controller.ResetPassword)
}
