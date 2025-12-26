package main

import (
	"fmt"
	"log"

	"scratch-lottery/internal/cache"
	"scratch-lottery/internal/config"
	"scratch-lottery/internal/handler"
	"scratch-lottery/internal/middleware"
	"scratch-lottery/internal/repository"
	"scratch-lottery/internal/service"
	"scratch-lottery/pkg/auth"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := repository.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer repository.CloseDB()

	// Run migrations
	if err := repository.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Database migrations completed")

	// Seed development data if in dev mode
	if cfg.IsDevMode() {
		if err := repository.SeedDevData(db); err != nil {
			log.Printf("Warning: Failed to seed dev data: %v", err)
		} else {
			log.Println("Development data seeded")
		}
	}

	// Initialize cache
	memCache := cache.NewMemoryCache()
	tokenBlacklist := cache.NewTokenBlacklist(memCache)

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(
		cfg.JWTSecret,
		cfg.JWTAccessExpiry,
		cfg.JWTRefreshExpiry,
	)

	// Initialize services
	authService := service.NewAuthService(db, jwtManager, tokenBlacklist, cfg.IsDevMode())
	oauthService := service.NewOAuthService(db, cfg, jwtManager, tokenBlacklist, memCache)
	walletService := service.NewWalletService(db)
	lotteryService := service.NewLotteryService(db, cfg.EncryptionKey)
	purchaseService := service.NewPurchaseService(db, lotteryService, walletService)
	scratchService := service.NewScratchService(db, lotteryService, walletService)
	exchangeService := service.NewExchangeService(db, walletService)
	userService := service.NewUserService(db, walletService)

	// Initialize admin service
	adminService := service.NewAdminService(db, walletService)

	// Initialize payment service
	paymentService := service.NewPaymentService(db, adminService, walletService)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	oauthHandler := handler.NewOAuthHandler(oauthService)
	walletHandler := handler.NewWalletHandler(walletService)
	lotteryHandler := handler.NewLotteryHandler(lotteryService, purchaseService, scratchService)
	exchangeHandler := handler.NewExchangeHandler(exchangeService)
	userHandler := handler.NewUserHandler(userService)
	adminHandler := handler.NewAdminHandler(adminService)
	paymentHandler := handler.NewPaymentHandler(paymentService)

	// Set Gin mode based on environment
	if cfg.IsProdMode() {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"mode":   cfg.OAuthMode,
		})
	})

	// API routes
	api := r.Group("/api")
	{
		// System routes (public)
		systemGroup := api.Group("/system")
		{
			systemGroup.GET("/payment-status", adminHandler.GetPaymentStatus)
		}

		// Auth routes (public)
		authGroup := api.Group("/auth")
		{
			authGroup.GET("/mode", authHandler.GetAuthMode)
			authGroup.GET("/dev/users", authHandler.GetDevUsers)
			authGroup.POST("/login/dev", authHandler.DevLogin)
			authGroup.POST("/refresh", authHandler.RefreshToken)
			authGroup.POST("/logout", authHandler.Logout)
			
			// OAuth routes
			authGroup.GET("/oauth/linuxdo", oauthHandler.LinuxdoLogin)
			authGroup.GET("/oauth/callback", oauthHandler.LinuxdoCallback)
			
			// Protected auth routes
			authGroup.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetCurrentUser)
		}

		// Protected routes example
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "pong"})
		})

		// Wallet routes (protected)
		walletGroup := api.Group("/wallet")
		walletGroup.Use(middleware.AuthMiddleware(authService))
		{
			walletGroup.GET("", walletHandler.GetWallet)
			walletGroup.GET("/balance", walletHandler.GetBalance)
			walletGroup.GET("/transactions", walletHandler.GetTransactions)
			walletGroup.POST("/check-balance", walletHandler.CheckBalance)
		}

		// Payment routes
		paymentGroup := api.Group("/payment")
		{
			// Public callback endpoint (EPay will call this)
			paymentGroup.POST("/callback", paymentHandler.PaymentCallback)
			paymentGroup.GET("/callback", paymentHandler.PaymentCallback) // Some EPay implementations use GET

			// Protected routes
			paymentGroup.POST("/recharge", middleware.AuthMiddleware(authService), paymentHandler.CreateRechargeOrder)
			paymentGroup.GET("/orders", middleware.AuthMiddleware(authService), paymentHandler.GetUserOrders)
			paymentGroup.GET("/orders/:order_no", middleware.AuthMiddleware(authService), paymentHandler.GetOrderStatus)
		}

		// Lottery routes (public for listing, some protected)
		lotteryGroup := api.Group("/lottery")
		{
			// Public routes
			lotteryGroup.GET("/types", lotteryHandler.GetLotteryTypes)
			lotteryGroup.GET("/types/:id", lotteryHandler.GetLotteryTypeByID)
			lotteryGroup.GET("/types/:id/prize-levels", lotteryHandler.GetPrizeLevels)
			lotteryGroup.GET("/types/:id/prize-pools", lotteryHandler.GetPrizePools)
			lotteryGroup.GET("/types/:id/active-pool", lotteryHandler.GetActivePrizePool)
			lotteryGroup.GET("/verify/:code", lotteryHandler.VerifySecurityCode)

			// Protected routes
			lotteryGroup.POST("/purchase", middleware.AuthMiddleware(authService), lotteryHandler.PurchaseTickets)
			lotteryGroup.POST("/purchase/preview", middleware.AuthMiddleware(authService), lotteryHandler.GetPurchasePreview)
			lotteryGroup.GET("/tickets", middleware.AuthMiddleware(authService), lotteryHandler.GetUserTickets)
			lotteryGroup.GET("/tickets/:id", middleware.AuthMiddleware(authService), lotteryHandler.GetTicketByID)
			lotteryGroup.GET("/tickets/:id/detail", middleware.AuthMiddleware(authService), lotteryHandler.GetTicketDetail)
			lotteryGroup.POST("/scratch/:id", middleware.AuthMiddleware(authService), lotteryHandler.ScratchTicket)
		}

		// Exchange routes (public for listing, protected for redeem)
		exchangeGroup := api.Group("/exchange")
		{
			// Public routes
			exchangeGroup.GET("/products", exchangeHandler.GetProducts)
			exchangeGroup.GET("/products/:id", exchangeHandler.GetProductByID)

			// Protected routes
			exchangeGroup.POST("/redeem", middleware.AuthMiddleware(authService), exchangeHandler.Redeem)
			exchangeGroup.GET("/records", middleware.AuthMiddleware(authService), exchangeHandler.GetExchangeRecords)
			exchangeGroup.GET("/records/:id", middleware.AuthMiddleware(authService), exchangeHandler.GetExchangeRecordByID)
		}

		// User routes (protected)
		userGroup := api.Group("/user")
		userGroup.Use(middleware.AuthMiddleware(authService))
		{
			userGroup.GET("/profile", userHandler.GetProfile)
			userGroup.GET("/tickets", userHandler.GetTickets)
			userGroup.GET("/wins", userHandler.GetWins)
			userGroup.GET("/statistics", userHandler.GetStatistics)
		}

		// Admin routes (protected, admin only)
		adminGroup := api.Group("/admin")
		adminGroup.Use(middleware.AuthMiddleware(authService))
		adminGroup.Use(middleware.AdminMiddleware())
		{
			// Dashboard
			adminGroup.GET("/dashboard", adminHandler.GetDashboard)

			// Lottery type management
			adminGroup.POST("/lottery/types", lotteryHandler.CreateLotteryType)
			adminGroup.PUT("/lottery/types/:id", lotteryHandler.UpdateLotteryType)
			adminGroup.DELETE("/lottery/types/:id", lotteryHandler.DeleteLotteryType)
			adminGroup.PUT("/lottery/types/:id/prize-levels", lotteryHandler.UpdatePrizeLevels)
			adminGroup.POST("/lottery/types/:id/prize-pools", lotteryHandler.CreatePrizePool)

			// Exchange product management
			adminGroup.GET("/exchange/products", exchangeHandler.GetAllProducts)
			adminGroup.POST("/exchange/products", exchangeHandler.CreateProduct)
			adminGroup.PUT("/exchange/products/:id", exchangeHandler.UpdateProduct)
			adminGroup.DELETE("/exchange/products/:id", exchangeHandler.DeleteProduct)
			adminGroup.POST("/exchange/products/:id/import-keys", exchangeHandler.ImportCardKeys)
			adminGroup.GET("/exchange/products/:id/card-keys", exchangeHandler.GetCardKeys)

			// User management
			adminGroup.GET("/users", adminHandler.GetUsers)
			adminGroup.GET("/users/:id", adminHandler.GetUserByID)
			adminGroup.PUT("/users/:id/points", adminHandler.AdjustUserPoints)
			adminGroup.PUT("/users/:id/role", adminHandler.UpdateUserRole)

			// System settings
			adminGroup.GET("/settings", adminHandler.GetSystemSettings)
			adminGroup.PUT("/settings", adminHandler.UpdateSystemSettings)

			// Statistics
			adminGroup.GET("/statistics", adminHandler.GetStatistics)
			adminGroup.GET("/statistics/export", adminHandler.ExportStatistics)

			// Admin logs
			adminGroup.GET("/logs", adminHandler.GetAdminLogs)
		}
	}

	// Start server
	addr := fmt.Sprintf("%s:%s", cfg.ServerHost, cfg.ServerPort)
	log.Printf("Starting server on %s (mode: %s)", addr, cfg.OAuthMode)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
