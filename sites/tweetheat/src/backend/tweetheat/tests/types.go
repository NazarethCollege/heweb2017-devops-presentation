package main

import (
	"time"

	"../api"
)

type TestTwitterRequestProcessor struct{}

func (p *TestTwitterRequestProcessor) ProcessRequest(config api.TwitterClientConfig, query string) (response []api.TwitterSearchResponse, err error) {
	var media = []api.TwitterSearchResponse{
		api.TwitterSearchResponse{
			ID:         1,
			Tags:       []string{"tag1", "tag2"},
			Favourites: 1,
			CreatedAt:  time.Now(),
		},
		api.TwitterSearchResponse{
			ID:         2,
			Tags:       []string{"tag2", "tag3"},
			Favourites: 2,
			CreatedAt:  time.Now().AddDate(0, 0, 1),
		},
		api.TwitterSearchResponse{
			ID:         3,
			Tags:       []string{"tag3", "tag4"},
			Favourites: 1,
			CreatedAt:  time.Now().AddDate(0, 0, 1),
		},
	}

	return media, nil

}
