package main

import (
	"fmt"
	"os"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func init() {
	fmt.Println("STARTING SERVER...")
	fmt.Println("INITIALIZE DB CONNECTION...")

	// Initialize database connection
	if middleware.ConnectDB() {
		fmt.Println("DB CONNECTION FAILED!")
		os.Exit(1)
	} else {
		fmt.Println("DB CONNECTION SUCCESSFUL!")
	}
}

func main() {
	// Initialize Fiber app with custom configuration
	app := fiber.New(fiber.Config{
		AppName:   os.Getenv("PROJ_NAME"),
		BodyLimit: 20 * 1024 * 1024,
	})

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowHeaders:     "Origin, Content-Type, Accept",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	// Serve uploaded files
	uploadDir := "./backend/uploads"
	if _, err := os.Stat(uploadDir); err != nil {
		uploadDir = "./uploads"
	}
	app.Static("/uploads", uploadDir)

	// Register routes
	routes.AppRoutes(app)
	app.Listen(fmt.Sprintf(":%s", os.Getenv("PROJ_PORT")))
}
