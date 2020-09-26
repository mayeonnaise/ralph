let { Block, Blockchain } = require("./blockchain");
let { WebRTCClient } = require("./webrtc_client");
const id = "master";
const isMaster = id === "master" ? true : false;
const blockchain = new Blockchain(isMaster);

function parseMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "block": {
      const block = Object.assign(new Block(), data.block);
      blockchain.appendBlock(block);
      break;
    }
    case "ledger": {
      ledger = Object.assign(new Blockchain(), data.blockchain);
      console.log(ledger);
      newChain = [];
      for (block of ledger.chain) {
        console.log(block);
        newBlock = Object.assign(new Block(), block);
        newChain.push(newBlock);
        console.log(newBlock);
      }
      if (blockchain.chain.length < ledger.chain.length) {
        blockchain.chain = newChain;
      }
      break;
    }
  }
}

function prepareLedgerMessage() {
  var msg = {
    type: "ledger",
    blockchain: blockchain,
  };
  return JSON.stringify(msg);
}

const webrtcClient = new WebRTCClient(id, parseMessage, prepareLedgerMessage);
