package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"github.com/dghubble/oauth1"

	"../api"
	"../api/contracts"
	"../jobs"
	"../logging"
)

var tweetheatAPI api.API

func main() {
	configPathPtr := flag.String("config", "/etc/tweetheat/server.json", "absolute location of config file")
	flag.Parse()

	logging.Init(os.Stdout, os.Stdout, os.Stdout, os.Stderr)
	logging.Trace.Println("initializing API")
	config, err := api.NewConfig(*configPathPtr)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}

	tweetheatAPI = api.New(config)
	// Getting the database the first time runs migrations
	_, _ = tweetheatAPI.GetDatabase()
	defer tweetheatAPI.CloseDatabase()

	logging.Trace.Println("scheduling update tags job")

	twitterClient, err := tweetheatAPI.NewTwitterClient(api.TwitterClientConfig{
		OAuthToken:  oauth1.NewToken(config.AccessToken, config.AccessSecret),
		OAuthConfig: oauth1.NewConfig(config.ConsumerKey, config.ConsumerSecret),
	})
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}
	go jobs.UpdateTags(config.SearchFilter, twitterClient, &tweetheatAPI, time.Second*60)

	logging.Trace.Println("starting webserver")

	http.HandleFunc("/", rootHandler)
	http.HandleFunc("/api/", apiHandler)

	http.ListenAndServe(":8080", applyMiddleWare(http.DefaultServeMux))
}

type routeHandler func(http.ResponseWriter, *http.Request)
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func applyMiddleWare(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		lwr := &loggingResponseWriter{w, http.StatusOK}
		defer func() {
			elapsed := time.Since(start)
			logging.Info.Printf("%s - %s - %s - %d - %s", r.RemoteAddr, r.Method, r.URL, lwr.statusCode, elapsed)
		}()

		defer func() {
			var err error
			r := recover()
			if r != nil {
				switch t := r.(type) {
				case string:
					err = errors.New(t)
				case error:
					err = t
				default:
					err = errors.New("Unknown error")
				}

				http.Error(lwr, fmt.Sprintf("%s - %s", err.Error(), debug.Stack()), http.StatusInternalServerError)
			}
		}()

		handler.ServeHTTP(lwr, r)
	})
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, fmt.Sprintf("/workspace/build/%s", r.URL.Path[1:]))
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
	var route = r.URL.Path[5:]

	var subhandler routeHandler
	if strings.HasPrefix(route, "tag-history") {
		subhandler = apiTagHistoryHandler
	}

	if subhandler != nil {
		subhandler(w, r)
	} else {
		http.Error(w, "route not found", http.StatusNotFound)
	}
}

func apiTagHistoryHandler(w http.ResponseWriter, r *http.Request) {
	history, err := tweetheatAPI.GetTwitterTagHistory()
	if err != nil {
		logging.Error.Println(err.Error())
		writeErr(w, fmt.Errorf("error getting tag history"))
	} else {
		response := contracts.Result{
			StatusCode: 200,
			Data:       history,
		}

		writeJSON(w, response)
	}
}

func writeErr(w http.ResponseWriter, err error) {
	js, _ := json.Marshal(contracts.Result{
		StatusCode: 500,
		Message:    err.Error(),
	})
	http.Error(w, string(js), http.StatusInternalServerError)
}

func writeJSON(w http.ResponseWriter, data contracts.Result) {
	js, err := json.Marshal(data)
	if err != nil {
		js, _ := json.Marshal(contracts.Result{
			StatusCode: 500,
			Message:    fmt.Sprintf("Error rendering JSON: %s", err.Error()),
		})
		http.Error(w, string(js), http.StatusInternalServerError)
	} else {
		w.Write(js)
	}
}
