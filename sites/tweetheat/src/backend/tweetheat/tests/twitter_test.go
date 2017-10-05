package main

import (
	"os"
	"testing"

	"../api"
)

func TestMain(m *testing.M) {
	code := m.Run()
	_ = api.CloseDatabase(GetAPI().Config)
	os.Exit(code)
}

func TestEmptyToken(t *testing.T) {
	tweetheatAPI := GetAPI()
	_, err := tweetheatAPI.NewTwitterClient(api.TwitterClientConfig{})
	if err == nil {
		t.Error("Empty tokens should cause a failed twitter client")
	}
}

// This is an unreliable test because it uses an external connection.  This is how you test pulling media from
// Twitter works rather than pulling saved media and bypassing using your token and connecting to their endpoint.
func _TestRealPullMedia(t *testing.T) {
	tweetheatAPI := GetAPI()
	client, _ := tweetheatAPI.NewTwitterClient(GetTwitterClientConfig())

	response, err := client.Search("place:61c225139f635563 -filter:retweets")
	if err != nil {
		t.Errorf("Exception: %v", err)
	}

	if len(response) == 0 {
		t.Errorf("Expected response to have a length greater than 0", len(response))
	}
}

func TestPullTweets(t *testing.T) {
	tweetheatAPI := GetAPI()
	client, _ := tweetheatAPI.NewTwitterClient(GetTwitterClientConfig())
	client.SetSearchRequestProcessor(&TestTwitterRequestProcessor{})
	response, _ := client.Search("query")

	if len(response) != 3 {
		t.Errorf("Expected response to have a length of 3, got %d instead", len(response))
	}
}

func TestSaveTweets(t *testing.T) {
	tweetheatAPI := GetAPI()
	client, _ := tweetheatAPI.NewTwitterClient(GetTwitterClientConfig())
	client.SetSearchRequestProcessor(&TestTwitterRequestProcessor{})
	response, _ := client.Search("query")
	err := tweetheatAPI.SaveTwitterMedia(response)

	if err != nil {
		t.Errorf("Exception: %v", err)
	}

	media, err := tweetheatAPI.GetTwitterMedia()
	if err != nil {
		t.Errorf("Exception: %v", err)
	}

	if len(media) != len(response) {
		t.Errorf("Retrieved %d records from the database but expected %d", len(media), len(response))
	}
}
