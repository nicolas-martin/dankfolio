package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Environment   string `mapstructure:"APP_ENV"`
	Port          int    `mapstructure:"PORT"`
	DatabaseURL   string `mapstructure:"DATABASE_URL"`
	RedisAddr     string `mapstructure:"REDIS_ADDR"`
	RedisPassword string `mapstructure:"REDIS_PASSWORD"`
	JWTSecret     string `mapstructure:"JWT_SECRET"`
	CorsOrigins   string `mapstructure:"CORS_ORIGINS"`

	// Solana configuration
	SolanaRPCEndpoint string `mapstructure:"SOLANA_RPC_ENDPOINT"`
	SolanaWSEndpoint  string `mapstructure:"SOLANA_WS_ENDPOINT"`
	SolanaProgramID   string `mapstructure:"SOLANA_PROGRAM_ID"`
	SolanaPoolWallet  string `mapstructure:"SOLANA_POOL_WALLET"`
}

func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Set defaults
	if config.Port == 0 {
		config.Port = 8080
	}
	if config.Environment == "" {
		config.Environment = "development"
	}
	if config.SolanaRPCEndpoint == "" {
		config.SolanaRPCEndpoint = "https://api.mainnet-beta.solana.com"
	}
	if config.SolanaWSEndpoint == "" {
		config.SolanaWSEndpoint = "wss://api.mainnet-beta.solana.com"
	}

	return &config, nil
}
