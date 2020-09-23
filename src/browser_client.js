let {Block, Blockchain} = require("./blockchain")
let {BlockchainMiner} = require("./blockchain_miner")
const id = (new Date()).getTime()
const ws = new WebSocket("ws://localhost:80/ws/" + id)
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
const connections = {}
const channels = {}
const connectionsStatus = {}
const blockchain = new Blockchain(true)
const miner = new BlockchainMiner(blockchain)

if (blockchain.currentBlock !== null) {
    document.getElementById("submit").disabled = false
}

function mineSuccessCallback(block) {
    document.getElementById("blockchain").innerHTML += block.payload
    alertPeers(block)
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
    console.log(channels)
    for (peerKey in channels) {
        channel = channels[peerKey]
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

function parseMessage(event) {
    const data = JSON.parse(event.data)
    switch (data.type) {
        case "block": {
            document.getElementById("blockchain").innerHTML += data.block.payload
            miner.terminate()
            const block = Object.assign(new Block, data.block)
            blockchain.appendBlock(block)
            break
        }
    }
} 

document.getElementById("submit").onclick = mine

function setupReceiveChannel(peerID, peerConnection) {
    peerConnection.ondatachannel = function (event) {
        channels[peerID] = event.channel
        receiveChannel = channels[peerID]
        receiveChannel.onmessage = parseMessage
        // receiveChannel.onopen = handleReceiveChannelStatusChange
        // receiveChannel.onclose = handleReceiveChannelStatusChange
    }
}

function setupSendChannel(peerID, peerConnection) {
    sendChannel = peerConnection.createDataChannel("sendChannel")
    channels[peerID] = sendChannel
    sendChannel.onopen = function () {
        var msg = {
            type: 'open',
            msg: "Successfully opened data channel"
        }
        sendChannel.send(JSON.stringify(msg))
    }
    sendChannel.onclose = function () {
        var msg = {
            type: 'close',
            msg: "Successfully closed data channel"
        }
        sendChannel.send(JSON.stringify(msg))
    }
    sendChannel.onmessage = parseMessage
}

function setupPeerConnection(sendeeID, peerConnection) {
    console.log(sendeeID)
    console.log(peerConnection)

    peerConnection.onicecandidate = function (event) {
        if (event.candidate) {
            var msg = {
                type: 'ice-candidate',
                sender: id,
                sendee: sendeeID,
                candidate: event.candidate
            }
            ws.send(JSON.stringify(msg))
        }
    }

    peerConnection.onicecandidateerror = function(event) {
        if (event.errorCode >= 300 && event.errorCode <= 699) {
          // STUN errors are in the range 300-699. See RFC 5389, section 15.6
          // for a list of codes. TURN adds a few more error codes; see
          // RFC 5766, section 15 for details.
          console.log(event)
        } else if (event.errorCode >= 700 && event.errorCode <= 799) {
          // Server could not be reached; a specific error number is
          // provided but these are not yet specified.
          console.log("Server could not be reached")
          console.log(event)
        }
      }

    peerConnection.oniceconnectionstatechange = function (event) {
        if (peerConnection.connectionState === 'connected') {
            connectionsStatus[sendeeID] = true
            console.log("Connected to " + sendeeID)
        } else {
            console.log("failed")
        }
    }
}

function handleSendSetup(peerID) {
    connections[peerID] = new RTCPeerConnection(configuration)
    connectionsStatus[peerID] = false
    peerConnection = connections[peerID]
    console.log("Creating new WebRTC Peer connection")

    setupSendChannel(peerID, peerConnection)
    setupPeerConnection(peerID, peerConnection) 
}

function handleReceiveSetup(peerID) {
    connections[peerID] = new RTCPeerConnection(configuration)
    connectionsStatus[peerID] = false
    peerConnection = connections[peerID]
    console.log("Creating new WebRTC Peer connection")

    setupReceiveChannel(peerID, peerConnection)
    setupPeerConnection(peerID, peerConnection) 
}

async function sendOffer(sendeeID) {
    peerConnection = connections[sendeeID]
    console.log(peerConnection)
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    console.log(offer)
    var msg = {
        type: "offer",
        sender: id,
        sendee: sendeeID,
        offer: offer
    }
    ws.send(JSON.stringify(msg))
}

async function handleOffer(senderID, sendeeID, offer) {
    if (sendeeID !== id) {
        return
    }
    peerConnection = connections[senderID]
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    
    var msg = {
        type: "answer",
        sender: id,
        sendee: senderID,
        answer: answer
    }
    ws.send(JSON.stringify(msg))
}

async function handleAnswer(senderID, sendeeID, answer) {
    if (sendeeID !== id) {
        return
    }
    peerConnection = connections[senderID]
    const remoteDesc = new RTCSessionDescription(answer)
    await peerConnection.setRemoteDescription(remoteDesc);
    console.log("Set answer")
    console.log(peerConnection)
}

async function handleIceCandidate(senderID, sendeeID, candidate) {
    if (sendeeID !== id) {
        return
    }
    peerConnection = connections[senderID]
    if (candidate) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
}

ws.onopen = function () {
    var msg = {
        type: "introduction",
        id: id
    }

    ws.send(JSON.stringify(msg))
}

ws.onmessage = function (event) {
    var msg = JSON.parse(event.data)
    console.log(msg)

    switch (msg.type) {
        case "introduction":
            handleSendSetup(msg.id)
            sendOffer(msg.id)
            break
        case "offer":
            handleReceiveSetup(msg.sender)
            handleOffer(msg.sender, msg.sendee, msg.offer)
            break
        case "answer":
            handleAnswer(msg.sender, msg.sendee, msg.answer)
            break
        case "ice-candidate":
            handleIceCandidate(msg.sender, msg.sendee, msg.candidate)
            break
    }
}

