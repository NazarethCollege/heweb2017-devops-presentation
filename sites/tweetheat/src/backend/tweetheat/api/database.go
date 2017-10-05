package api

import (
	"fmt"

	"./database"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/sqlite"
)

func (api *API) GetDatabase() (*gorm.DB, error) {
	if api.db == nil {
		db, err := gorm.Open("sqlite3", fmt.Sprintf("%s?parseTime=true", api.Config.DataBasePath))
		if err != nil {
			return nil, err
		}
		api.db = db
		api.db.AutoMigrate(&database.Tag{}, &database.Tweet{})

	}

	return api.db, nil
}

func (api *API) CloseDatabase() (err error) {
	if api.db != nil {
		err = api.db.Close()
	}

	return err
}
