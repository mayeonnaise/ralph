package main

import "fmt"

type signalhub struct {
	peers      map[string]*subscription
	broadcast  chan broadcastMsg
	register   chan *subscription
	unregister chan *subscription
}

type broadcastMsg struct {
	sub  *subscription
	data []byte
}

func (s *signalhub) run() {
	for {
		select {
		case peer := <-s.register:
			fmt.Printf("Peer %s joined", peer.ID)
			s.peers[peer.ID] = peer
		case peer := <-s.unregister:
			if _, ok := s.peers[peer.ID]; ok {
				delete(s.peers, peer.ID)
				close(peer.send)
			}
		case msg := <-s.broadcast:
			for _, peer := range s.peers {
				if msg.sub != nil && msg.sub.ID == peer.ID {
					continue
				}
				select {
				case peer.send <- msg.data:
				default:
					close(peer.send)
					delete(s.peers, peer.ID)
				}
			}
		}
	}
}
