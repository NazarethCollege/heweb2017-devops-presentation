package api

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
)

type Config struct {
	DataBasePath   string
	AccessToken    string
	AccessSecret   string
	ConsumerKey    string
	ConsumerSecret string
	SearchFilter   string
}

func NewConfig(path string) (config Config, err error) {
	file, err := ioutil.ReadFile(path)
	if err != nil {
		return config, fmt.Errorf("no config found at path %s", path)
	}

	err = json.Unmarshal(file, &config)
	if err != nil {
		return config, fmt.Errorf("error reading config: %s", err.Error())
	}

	return config, nil
}
