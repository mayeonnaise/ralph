const id = (new Date()).getTime()
var ws = new WebSocket("ws://localhost:80/ws/" + id)
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
var connections = {}
var connectionsStatus = {}

function setupPeerConnection(sendeeID, peerConnection) {
    console.log(sendeeID)
    console.log(peerConnection)

    // peerConnection.ondatachannel = function(event) {
    //     let receiveChannel = event.channel;
    //     receiveChannel.onopen = () => {
    //       console.log("Data channel is open and ready to be used.");
    //     };
    //     receiveChannel.onmessage = function (data) {
    //         console.log(data)
    //     }
    // }

    peerConnection.createDataChannel('foo');

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

function handleSetup(peerID) {
    connections[peerID] = new RTCPeerConnection(configuration)
    connectionsStatus[peerID] = false
    peerConnection = connections[peerID]
    console.log("Creating new WebRTC Peer connection")

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
            handleSetup(msg.id)
            sendOffer(msg.id)
            break
        case "offer":
            handleSetup(msg.sender)
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
