package main

import (
	"os"

	"../api"
	"github.com/dghubble/oauth1"
)

func GetAPI() api.API {
	return api.New(
		api.Config{
			DataRoot: "/tmp",
		},
	)
}

func GetTwitterClientConfig() api.TwitterClientConfig {
	return api.TwitterClientConfig{
		OAuthToken:  oauth1.NewToken(os.Getenv("TWEETHEAT_ACCESS_TOKEN"), os.Getenv("TWEETHEAT_ACCESS_SECRET")),
		OAuthConfig: oauth1.NewConfig(os.Getenv("TWEETHEAT_CONSUMER_KEY"), os.Getenv("TWEETHEAT_CONSUMER_SECRET")),
	}
}
