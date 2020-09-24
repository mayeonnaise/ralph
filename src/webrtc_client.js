class WebRTCClient {
    constructor(id, parseMessageCallback, prepareLedgerMsg, hideLoadingPage) {
        this.id = id
        this.ws = new WebSocket("ws://localhost:80/ws/" + id)
        this.configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
        this.connections = {}
        this.channels = {}
        this.connectionsStatus = {}
        this.parseMessageCallback = parseMessageCallback
        this.prepareLedgerMsg = prepareLedgerMsg
        this.hideLoadingPage = hideLoadingPage
        this.setupWebsocket()
    }

    setupReceiveChannel(peerID, peerConnection) {
        peerConnection.ondatachannel = function (event) {
            this.channels[peerID] = event.channel
            const receiveChannel = this.channels[peerID]
            receiveChannel.onmessage = this.parseMessageCallback
            // receiveChannel.onopen = handleReceiveChannelStatusChange
            // receiveChannel.onclose = handleReceiveChannelStatusChange
        }.bind(this)
    }
    
    setupSendChannel(peerID, peerConnection) {
        const sendChannel = peerConnection.createDataChannel("sendChannel")
        this.channels[peerID] = sendChannel
        
        sendChannel.onopen = function () {
            sendChannel.send(this.prepareLedgerMsg())
        }.bind(this)

        sendChannel.onclose = function () {
            var msg = {
                type: 'close',
                msg: "Successfully closed data channel"
            }
            sendChannel.send(JSON.stringify(msg))
        }
        sendChannel.onmessage = this.parseMessageCallback
    }
    
    handleSendSetup(peerID) {
        this.connections[peerID] = new RTCPeerConnection(this.configuration)
        this.connectionsStatus[peerID] = false
        const peerConnection = this.connections[peerID]
        console.log("Creating new WebRTC Peer connection")
    
        this.setupSendChannel(peerID, peerConnection)
        this.setupPeerConnection(peerID, peerConnection) 
    }
    
    handleReceiveSetup(peerID) {
        this.connections[peerID] = new RTCPeerConnection(this.configuration)
        this.connectionsStatus[peerID] = false
        const peerConnection = this.connections[peerID]
        console.log("Creating new WebRTC Peer connection")
    
        this.setupReceiveChannel(peerID, peerConnection)
        this.setupPeerConnection(peerID, peerConnection) 
    }
    
    async sendOffer(sendeeID) {
        const peerConnection = this.connections[sendeeID]
        console.log(peerConnection)
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        console.log(offer)
        var msg = {
            type: "offer",
            sender: this.id,
            sendee: sendeeID,
            offer: offer
        }
        this.ws.send(JSON.stringify(msg))
    }
    
    async handleOffer(senderID, sendeeID, offer) {
        if (sendeeID !== this.id) {
            return
        }
        const peerConnection = this.connections[senderID]
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        
        var msg = {
            type: "answer",
            sender: this.id,
            sendee: senderID,
            answer: answer
        }
        this.ws.send(JSON.stringify(msg))
    }
    
    async handleAnswer(senderID, sendeeID, answer) {
        if (sendeeID !== this.id) {
            return
        }
        const peerConnection = this.connections[senderID]
        const remoteDesc = new RTCSessionDescription(answer)
        await peerConnection.setRemoteDescription(remoteDesc);
        console.log("Set answer")
        console.log(peerConnection)
    }
    
    async handleIceCandidate(senderID, sendeeID, candidate) {
        if (sendeeID !== this.id) {
            return
        }
        const peerConnection = this.connections[senderID]
        console.log(senderID)
        console.log(this.connections)
        if (candidate) {
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    }

    setupWebsocket() {
        this.ws.onopen = function () {
            var msg = {
                type: "introduction",
                id: this.id
            }
            console.log(this)
        
            this.ws.send(JSON.stringify(msg))
        }.bind(this)
        
        this.ws.onmessage = function (event) {
            var msg = JSON.parse(event.data)
            console.log(msg)
        
            switch (msg.type) {
                case "introduction":
                    this.handleSendSetup(msg.id)
                    this.sendOffer(msg.id)
                    break
                case "offer":
                    this.handleReceiveSetup(msg.sender)
                    this.handleOffer(msg.sender, msg.sendee, msg.offer)
                    break
                case "answer":
                    this.handleAnswer(msg.sender, msg.sendee, msg.answer)
                    break
                case "ice-candidate":
                    console.log(msg)
                    this.handleIceCandidate(msg.sender, msg.sendee, msg.candidate)
                    break
            }
        }.bind(this)
    }
    
    setupPeerConnection(sendeeID, peerConnection) {
        console.log(sendeeID)
        console.log(peerConnection)
    
        peerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                var msg = {
                    type: 'ice-candidate',
                    sender: this.id,
                    sendee: sendeeID,
                    candidate: event.candidate
                }
                this.ws.send(JSON.stringify(msg))
            }
        }.bind(this)
    
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
            console.log(event)
            if (peerConnection.connectionState === 'connected') {
                this.connectionsStatus[sendeeID] = true
                console.log("Connected to " + sendeeID)
            } else {
                console.log("failed")
            }
        }.bind(this)

        peerConnection.onconnectionstatechange = function(event) {
            switch(peerConnection.connectionState) {
              case "connected":
                if (document.getElementById("loading").style.display !== "none") {
                    this.hideLoadingPage()
                }
                break;
              case "disconnected":
              case "failed":
                // One or more transports has terminated unexpectedly or in an error
                break;
              case "closed":
                // The connection has been closed
                break;
            }
        }.bind(this)
    }
}

export {WebRTCClient}