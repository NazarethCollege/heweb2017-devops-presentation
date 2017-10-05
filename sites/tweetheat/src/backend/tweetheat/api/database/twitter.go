package database

import (
	"time"

	"github.com/jinzhu/gorm"
)

type TagUseCountResult struct {
	TagName          string
	Count            uint
	TimePartition    time.Time
	TimePartitionRaw string
}

type Tag struct {
	gorm.Model
	Name string `gorm:"type:varchar(255);"`
}

type Tweet struct {
	gorm.Model
	Tags       []Tag `gorm:"many2many:media_tags;"`
	Favourites int
}
