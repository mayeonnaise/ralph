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
            miner.terminate()
            const block = Object.assign(new Block, data.block)
            blockchain.appendBlock(block)
            if (block.payload !== "") {
                var element = document.createElement("p")
                element.appendChild(document.createTextNode(block.payload))
                document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
            }
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
                if (newBlock.payload !== "") {
                    var element = document.createElement("p")
                    element.appendChild(document.createTextNode(newBlock.payload))
                    document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
                }
            }
            if (blockchain.chain.length < ledger.chain.length) {
                blockchain.chain = newChain
            }
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

function hideLoadingPage() {
    document.getElementById("loading").setAttribute("style", "display:none;")
    document.getElementById("main").setAttribute("style", "display:flex;")
}


const webrtcClient = new WebRTCClient(id, parseMessage, prepareLedgerMessage, hideLoadingPage)

if (blockchain.currentBlock !== null) {
    document.getElementById("submit").disabled = false
}

function mineSuccessCallback(block) {
    if (block.payload !== "") {
        var element = document.createElement("p")
        element.appendChild(document.createTextNode(block.payload))
        document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
    }
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
