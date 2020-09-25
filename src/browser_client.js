let {Block, Blockchain} = require("./blockchain")
let {Haiku} = require("./haiku")
let {BlockchainMiner} = require("./blockchain_miner")
let {WebRTCClient} = require("./webrtc_client")
const id = (new Date()).getTime()
const isMaster = id === "master" ? true : false
const blockchain = new Blockchain(isMaster)
const miner = new BlockchainMiner(blockchain)
var haikus = {}
var haikuStatus = {}
var currHaiku = null

function showContentsPage() {
    document.getElementById("contents").setAttribute("style", "display:flex;")
    document.getElementById("blockchain").setAttribute("style", "display:none;")
}

document.getElementById("title").onclick = showContentsPage

function refreshHaikus() {
    haikus = {}
    console.log(blockchain.chain)
    for (var block of blockchain.chain) {
        console.log(block)
        const haiku = block.payload
        haikus[haiku.id] = {}
        haikus[haiku.id][haiku.lineno] = haiku.line
        haikuStatus[haiku.id] = haikuStatus[haiku.id] === undefined
                            ? haiku.lineno 
                            : (haikuStatus[haiku.id] < haiku.lineno ? haiku.lineno : haikuStatus[haiku.id])
    }
    console.log(haikuStatus)
}

function createHaikuElement(haikuName, haiku) {
    const haikuElement = document.createElement("div")
    haikuElement.setAttribute("class", "haiku")

    const haikuImgElement = document.createElement("img")
    haikuImgElement.setAttribute("src", "ancient-scroll.svg")
    haikuImgElement.setAttribute("class", "haikuimg")
    haikuElement.onclick = function() {
        console.log(haiku)
        var haikuLinePairs = []
        for (var haikuLineNo in haiku) {
            haikuLinePairs.push([haikuLineNo, haiku[haikuLineNo]])
        }

        haikuLinePairs.sort(function compare(kv1, kv2) {
            return kv1[0] - kv2[0]
        })
        console.log("this")
        console.log(haikuLinePairs)
        for (var i = 0; i < 3 || i < haikuLinePairs.length; i++) {
            if (haikuLinePairs[0] >= 0) {
                var element = document.createElement("p")
                element.appendChild(document.createTextNode(haikuLinePairs[i][1]))
                document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
            }
        }

        document.getElementById("contents").setAttribute("style", "display:none;")
        document.getElementById("blockchain").setAttribute("style", "display:flex;")
        currHaiku = haikuName
    }
    console.log(haikuElement)

    const haikuTitle = document.createElement("span")
    haikuTitle.appendChild(document.createTextNode(haikuName))
    haikuElement.appendChild(haikuTitle)
    haikuElement.append(haikuImgElement)
    return haikuElement
}

function createContentPage(haikus) {
    haiku_ids = []
    haiku_elements = []
    document.getElementById("contentspage").children = []
    console.log(haikus)
    for (var haikuName in haikus) {
        if (!haiku_ids.includes(haikuName) && haikuName !== "genesis") {
            haiku_elements.push(createHaikuElement(haikuName, haikus[haikuName]))
            haiku_ids.push(haikuName)
        }
    }

    haiku_elements.forEach(element => {
      document.getElementById("contentspage").appendChild(element)  
    })
}

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
                element.appendChild(document.createTextNode(block.payload.line))
                document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
            }
            refreshHaikus()
            createContentPage(haikus)
            break
        }
        case "ledger": {
            ledger = Object.assign(new Blockchain, data.blockchain)
            console.log(ledger)
            newChain = []
            newOutput = ""
            for (var block of ledger.chain) {
                newBlock = Object.assign(new Block, block)
                newChain.push(newBlock)
            }
            if (blockchain.chain.length < ledger.chain.length) {
                blockchain.chain = newChain
                refreshHaikus()
                createContentPage(haikus)
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
    console.log("here hiding")
    document.getElementById("loading").setAttribute("style", "display:none;")
    document.getElementById("main").setAttribute("style", "display:flex;")
}


const webrtcClient = new WebRTCClient(id, parseMessage, prepareLedgerMessage, hideLoadingPage)

if (blockchain.currentBlock !== null) {
    document.getElementById("submit").disabled = false
}

function mineSuccessCallback(block) {
    if (block.payload.line !== "") {
        var element = document.createElement("p")
        element.appendChild(document.createTextNode(block.payload.line))
        document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
    }
    alertPeers(block)
    blockchain.appendBlock(block)
    document.getElementById("submit").disabled = false
}

function mineTerminateCallback() {
    document.getElementById("submit").disabled = false
}

function mineNameSuccessCallback(block) {
    if (block.payload.line !== "") {
        var element = document.createElement("p")
        element.appendChild(document.createTextNode(block.payload.line))
        document.getElementById("blockchain").insertBefore(element, document.getElementById("submitdiv"))
    }
    alertPeers(block)
    blockchain.appendBlock(block)
    refreshHaikus()
    createContentPage(haikus)
    document.getElementById("submithaiku").disabled = false
}

function mineNameTerminateCallback() {
    document.getElementById("submithaiku").disabled = false
}

async function mineHaikuLine() {
    const value = document.getElementById("text").value
    const haikuLine = new Haiku(currHaiku, haikuStatus[currHaiku] + 1, value)
    console.log("mining...")
    document.getElementById("text").value = ""
    document.getElementById("submit").disabled = true
    await miner.mine(haikuLine, mineSuccessCallback, mineTerminateCallback)
}

async function mineHaikuName() {
    const value = document.getElementById("haikuname").value
    const haikuLine = new Haiku(value, -1, "")
    console.log("mining...")
    document.getElementById("haikuname").value = ""
    document.getElementById("submit").disabled = true
    await miner.mine(haikuLine, mineNameSuccessCallback, mineNameTerminateCallback)
}

function alertPeers(block) {
    console.log(webrtcClient.channels)
    for (var peerKey in webrtcClient.channels) {
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

document.getElementById("submit").onclick = mineHaikuLine
document.getElementById("submithaiku").onclick = mineHaikuName
