package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter()
	hub := &signalhub{
		peers:      make(map[string]*subscription),
		broadcast:  make(chan broadcastMsg),
		register:   make(chan *subscription),
		unregister: make(chan *subscription),
	}

	router.HandleFunc("/ws/{id}", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
		log.Printf("Defaulting to port %s", port)
	}
	addr := fmt.Sprintf(":%s", port)
	fmt.Printf("listening on %s\n", addr)

	srv := &http.Server{
		Handler:      router,
		Addr:         addr,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
