package jobs

import (
	"time"

	"../api"
	"../logging"
)

func UpdateTags(twitterFilter string, client *api.TwitterClient, api *api.API, interval time.Duration) {
	for {
		time.Sleep(interval)
		logging.Trace.Println("running UpdateTags job")
		response, err := client.Search(twitterFilter)
		if err != nil {
			logging.Error.Println(err.Error())
			continue
		}
		err = api.SaveTwitterMedia(response)
		if err != nil {
			logging.Error.Println(err.Error())
			continue
		}

		logging.Trace.Println("tags updated successfully")
	}
}
