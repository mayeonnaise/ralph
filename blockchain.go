package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/gob"
	"math/rand"
	"time"
)

type blockchain struct {
	chain               []block
	currentTransactions []transaction
}

func (b *blockchain) newTransaction(t transaction) int {
	b.currentTransactions = append(b.currentTransactions, t)
	return b.lastBlock().index + 1
}

func (b *blockchain) newBlock() error {
	index := len(b.currentTransactions) + 1
	timestamp := time.Now()
	transactions := b.currentTransactions
	previousHash := b.lastBlock().previousHash
	nonce := rand.Int()
	block := block{index, timestamp, transactions, nonce, previousHash}

	var err error
	for isValid, err := block.verify(); !isValid && err != nil; {
		block.nonce++
	}

	b.chain = append(b.chain, block)

	return err
}

func (b *blockchain) lastBlock() *block {
	return &b.chain[len(b.chain)-1]
}

type block struct {
	index        int
	timestamp    time.Time
	transactions []transaction
	nonce        int
	previousHash string
}

func (b *block) verify() (bool, error) {
	sha := sha256.New()
	enc := gob.NewEncoder(sha)

	if err := enc.Encode(b); err != nil {
		return false, err
	}

	if bytes.HasPrefix(sha.Sum(nil), []byte{0, 0, 0, 0}) {
		return true, nil
	}

	return false, nil
}

type transaction struct {
	sender   string
	receiver string
	amount   float64
}
