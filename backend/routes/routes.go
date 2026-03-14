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
	app.Get("/listing/:id", controller.GetListingById)
	app.Get("/locations/provinces", controller.GetProvinces)
	app.Get("/locations/cities", controller.GetCitiesMunicipalities)
	app.Get("/locations/barangays", controller.GetBarangays)

	// Protected
	app.Get("/auth/me", controller.AuthenticateUser, controller.Me)
	app.Delete("/auth/logout", controller.Logout)
	app.Get("/auth/validate-reset-token", controller.ValidateResetToken)
	app.Post("/auth/reset-password", controller.ResetPassword)
	app.Post("/listing", controller.AuthenticateUser, controller.CreateListing)
	app.Get("/listing/:id/edit", controller.AuthenticateUser, controller.GetListingEditById)
	app.Put("/listing/:id", controller.AuthenticateUser, controller.UpdateListing)
	app.Delete("/listing/:id", controller.AuthenticateUser, controller.DeleteListing)
	app.Get("/profile/me", controller.AuthenticateUser, controller.MeProfile)
	app.Put("/profile/me", controller.AuthenticateUser, controller.UpdateMeProfile)
	app.Patch("/profile/me/images", controller.AuthenticateUser, controller.UpdateMeProfileImages)
	app.Delete("/profile/me", controller.AuthenticateUser, controller.DeactivateMeProfile)
}
