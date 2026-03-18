package routes

import (
	"p2p_marketplace/backend/controller"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func AppRoutes(app *fiber.App) {
	// Public
	app.Post("/auth/signup", controller.SendEmailOTP)
	app.Post("/auth/login", controller.LogInUser)
	app.Post("/auth/verify-email", controller.SignUpUser)
	app.Post("/auth/resend-otp", controller.SendEmailOTP)
	app.Post("/auth/forgot-password", controller.ForgotPassword)
	app.Get("/listings", controller.GetListings)
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
	app.Patch("/listing/:id/mark-sold", controller.AuthenticateUser, controller.MarkListingAsSold)
	app.Post("/listing/:id/report", controller.AuthenticateUser, controller.ReportListing)
	app.Get("/listing/:id/review", controller.AuthenticateUser, controller.GetMyListingReview)
	app.Post("/listing/:id/review", controller.AuthenticateUser, controller.CreateListingReview)
	app.Put("/listing/:id/review", controller.AuthenticateUser, controller.UpdateListingReview)
	app.Delete("/listing/:id/review", controller.AuthenticateUser, controller.DeleteListingReview)
	app.Post("/listing/:id/bookmark", controller.AuthenticateUser, controller.AddListingBookmark)
	app.Delete("/listing/:id/bookmark", controller.AuthenticateUser, controller.RemoveListingBookmark)
	app.Get("/listing/:id/edit", controller.AuthenticateUser, controller.GetListingEditById)
	app.Put("/listing/:id", controller.AuthenticateUser, controller.UpdateListing)
	app.Delete("/listing/:id", controller.AuthenticateUser, controller.DeleteListing)
	app.Get("/profile/me", controller.AuthenticateUser, controller.MeProfile)
	app.Get("/profile/:id", controller.ProfileById)
	app.Put("/profile/me", controller.AuthenticateUser, controller.UpdateMeProfile)
	app.Patch("/profile/me/images", controller.AuthenticateUser, controller.UpdateMeProfileImages)
	app.Delete("/profile/me", controller.AuthenticateUser, controller.DeactivateMeProfile)
	app.Get("/messages/conversations", controller.AuthenticateUser, controller.GetConversations)
	app.Post("/messages/conversations/from-listing", controller.AuthenticateUser, controller.CreateConversationFromListing)
	app.Get("/messages/conversations/:id", controller.AuthenticateUser, controller.GetConversation)
	app.Get("/messages/conversations/:id/messages", controller.AuthenticateUser, controller.GetMessages)
	app.Post("/messages/conversations/:id/messages", controller.AuthenticateUser, controller.SendMessage)
	app.Patch("/messages/conversations/:id/read", controller.AuthenticateUser, controller.MarkMessagesRead)
	app.Patch("/messages/conversations/:id/messages/:messageId/reaction", controller.AuthenticateUser, controller.ReactToMessage)
	app.Patch("/messages/conversations/:id/messages/:messageId", controller.AuthenticateUser, controller.EditMessage)
	app.Delete("/messages/conversations/:id/messages/:messageId", controller.AuthenticateUser, controller.DeleteMessage)
	app.Delete("/messages/conversations/:id", controller.AuthenticateUser, controller.DeleteConversation)
	app.Get("/ws", controller.AuthenticateUser, controller.UpgradeRealtimeSocket, websocket.New(controller.RealtimeSocket))
}
