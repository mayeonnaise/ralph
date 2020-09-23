let {Block, Blockchain} = require("./blockchain")
let {BlockchainMiner} = require("./blockchain_miner")
let {WebRTCClient} = require("./webrtc_client")
const id = (new Date()).getTime()
const isMaster = id === "master" ? true : false
const blockchain = new Blockchain(isMaster)
const miner = new BlockchainMiner(blockchain)

function parseMessage(event) {
    const data = JSON.parse(event.data)
    console.log(data)
    switch (data.type) {
        case "block": {
            document.getElementById("blockchain").innerHTML += data.block.payload
            miner.terminate()
            const block = Object.assign(new Block, data.block)
            blockchain.appendBlock(block)
            break
        }
        case "ledger": {
            ledger = Object.assign(new Blockchain, data.blockchain)
            console.log(ledger)
            newChain = []
            newOutput = ""
            for (block of ledger.chain) {
                console.log(block)
                newBlock = Object.assign(new Block, block)
                newChain.push(newBlock)
                console.log(newBlock)
                newOutput += newBlock.payload
            }
            if (blockchain.chain.length < ledger.chain.length) {
                blockchain.chain = newChain
            }
            document.getElementById("blockchain").innerHTML = newOutput
            break
        }
    }
} 

function prepareLedgerMessage() {
    var msg = {
        type: "ledger",
        blockchain: blockchain
    }
    return JSON.stringify(msg)
}


const webrtcClient = new WebRTCClient(id, parseMessage, prepareLedgerMessage)

if (blockchain.currentBlock !== null) {
    document.getElementById("submit").disabled = false
}

function mineSuccessCallback(block) {
    document.getElementById("blockchain").innerHTML += block.payload
    alertPeers(block)
    blockchain.appendBlock(block)
    document.getElementById("submit").disabled = false
}

function mineTerminateCallback() {
    document.getElementById("submit").disabled = false
}

async function mine() {
    console.log("mining...")
    document.getElementById("submit").disabled = true
    await miner.mine(mineSuccessCallback, mineTerminateCallback)
}

function alertPeers(block) {
    console.log(webrtcClient.channels)
    for (peerKey in webrtcClient.channels) {
        channel = webrtcClient.channels[peerKey]
        if (channel.readyState === 'open') {
            var msg = {
                type: 'block',
                block: block
            }
            channel.send(JSON.stringify(msg))
            console.log("sent")
        }
    }

}

document.getElementById("submit").onclick = mine
