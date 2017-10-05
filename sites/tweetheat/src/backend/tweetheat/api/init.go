package api

import "github.com/jinzhu/gorm"

type API struct {
	Config Config
	db     *gorm.DB
}

func New(config Config) API {
	return API{
		config,
		nil,
	}
}
