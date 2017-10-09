package api

import (
	"fmt"
	"time"

	"./contracts"
	"./database"
	"github.com/dghubble/go-twitter/twitter"
	"github.com/dghubble/oauth1"
	"github.com/jinzhu/gorm"
)

type TwitterSearchRequestProcessor interface {
	ProcessRequest(config TwitterClientConfig, query string) ([]TwitterSearchResponse, error)
}

type InternetSearchRequestProcessor struct{}

func (processor *InternetSearchRequestProcessor) ProcessRequest(config TwitterClientConfig, query string) ([]TwitterSearchResponse, error) {
	httpClient := config.OAuthConfig.Client(oauth1.NoContext, config.OAuthToken)
	twitterClient := twitter.NewClient(httpClient)
	var response []TwitterSearchResponse

	search, _, err := twitterClient.Search.Tweets(&twitter.SearchTweetParams{
		Query: query,
		Count: 100,
	})

	if err != nil {
		return response, err
	}

	response = make([]TwitterSearchResponse, len(search.Statuses))
	for i, tweet := range search.Statuses {
		var tags []string
		if tweet.Entities != nil {
			tags = make([]string, len(tweet.Entities.Hashtags))
			for i, tag := range tweet.Entities.Hashtags {
				tags[i] = tag.Text
			}
		}

		var createdAt, _ = time.Parse(time.RubyDate, tweet.CreatedAt)

		response[i] = TwitterSearchResponse{
			ID:         tweet.ID,
			Favourites: tweet.FavoriteCount,
			Tags:       tags,
			CreatedAt:  createdAt,
		}
	}

	return response, nil
}

// TwitterClient holds all the information necessary ot interact with the Twitter web service
type TwitterClient struct {
	config           TwitterClientConfig
	requestProcessor TwitterSearchRequestProcessor
}

// TwitterSearchResponse is an adaptation of what is returned by the instagram API.
type TwitterSearchResponse struct {
	ID         int64
	Tags       []string
	Favourites int
	CreatedAt  time.Time
}

type TwitterClientConfig struct {
	OAuthConfig *oauth1.Config
	OAuthToken  *oauth1.Token
}

// NewTwitterClient creates a client to interact with the Twitter web service
func (api *API) NewTwitterClient(config TwitterClientConfig) (client *TwitterClient, err error) {
	if config.OAuthConfig == nil || config.OAuthToken == nil {
		return nil, fmt.Errorf("api: Missing authentication information")
	}

	if len(config.OAuthConfig.ConsumerKey) == 0 {
		return nil, fmt.Errorf("api: ConsumerKey not set")
	}

	if len(config.OAuthConfig.ConsumerSecret) == 0 {
		return nil, fmt.Errorf("api: ConsumerSecret not set")
	}

	if len(config.OAuthToken.Token) == 0 {
		return nil, fmt.Errorf("api: Token not set")
	}

	if len(config.OAuthToken.TokenSecret) == 0 {
		return nil, fmt.Errorf("api: TokenSecret not set")
	}

	client = &TwitterClient{
		config:           config,
		requestProcessor: &InternetSearchRequestProcessor{},
	}

	return client, nil
}

// SetSearchRequestProcessor sets the media request processor for the client, to allow customization from a caller
func (client *TwitterClient) SetSearchRequestProcessor(processor TwitterSearchRequestProcessor) {
	client.requestProcessor = processor
}

// Search finds media around a location
func (client *TwitterClient) Search(query string) (response []TwitterSearchResponse, err error) {
	return client.requestProcessor.ProcessRequest(client.config, query)
}

// SaveTwitterMedia persists media to the database
func (api *API) SaveTwitterMedia(media []TwitterSearchResponse) (err error) {
	db, err := api.GetDatabase()
	if err != nil {
		return err
	}

	for _, item := range media {
		var tagModels []database.Tag = make([]database.Tag, len(item.Tags))
		for i, tag := range item.Tags {
			var tagModel = database.Tag{}
			db.FirstOrCreate(&tagModel, database.Tag{Name: tag})
			tagModels[i] = tagModel
		}

		var tweetModel = database.Tweet{}
		db.FirstOrCreate(&tweetModel, database.Tweet{Model: gorm.Model{ID: uint(item.ID)}})

		tweetModel.ID = uint(item.ID)
		tweetModel.CreatedAt = item.CreatedAt
		tweetModel.Favourites = item.Favourites
		tweetModel.Tags = tagModels

		db.Save(&tweetModel)
	}

	return err
}

// GetTwitterMedia gets media by a filter
func (api *API) GetTwitterMedia() (media []TwitterSearchResponse, err error) {
	db, err := api.GetDatabase()
	if err != nil {
		return nil, err
	}

	var tweetModels = []database.Tweet{}
	db.Find(&tweetModels).Order("created_at desc")
	media = make([]TwitterSearchResponse, len(tweetModels))
	for i, model := range tweetModels {
		tags := make([]string, len(model.Tags))
		media[i] = TwitterSearchResponse{
			ID:         int64(model.ID),
			Tags:       tags,
			Favourites: model.Favourites,
		}
	}

	return media, nil
}

func (api *API) GetTwitterTagHistory() (history map[int64]*contracts.TagHistory, err error) {
	db, err := api.GetDatabase()

	if err != nil {
		return nil, err
	}

	rows, err := db.Model(&database.Tag{}).
		Select("lower(name) as TagName, count(lower(name)) as TagCount, strftime('%Y-%m-%dT%H:00:00Z', tweets.created_at) as TimePartition").
		Joins("JOIN media_tags on media_tags.tag_id = tags.id").
		Joins("JOIN tweets on tweets.id = media_tags.tweet_id").
		Having("count(lower(name)) > 1").
		Group("lower(name), strftime('%Y-%m-%dT%H:00:00.000', tweets.created_at)").
		Order("strftime('%Y-%m-%dT%H:00:00.000', tweets.created_at) asc").
		Rows()

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	historyMap := make(map[int64]*contracts.TagHistory)
	for rows.Next() {
		var tagUseRow database.TagUseCountResult

		err = rows.Scan(&tagUseRow.TagName, &tagUseRow.Count, &tagUseRow.TimePartitionRaw)
		if err != nil {
			return nil, err
		}

		tagUseRow.TimePartition, err = time.Parse(time.RFC3339, tagUseRow.TimePartitionRaw)
		if err != nil {
			return nil, err
		}

		tagMetric := historyMap[tagUseRow.TimePartition.UnixNano()/int64(time.Millisecond)]
		if tagMetric == nil {
			tagMetric = &contracts.TagHistory{
				Tags: make(map[string]uint),
			}
		}

		tag := tagMetric.Tags[tagUseRow.TagName]
		if tag == 0 {
			tagMetric.Tags[tagUseRow.TagName] = tagUseRow.Count
		} else {
			tagMetric.Tags[tagUseRow.TagName] += tagUseRow.Count
		}

		historyMap[tagUseRow.TimePartition.UnixNano()/int64(time.Millisecond)] = tagMetric
	}

	return historyMap, nil
}
