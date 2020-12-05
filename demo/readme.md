# WebRTC Demo

### Get started

To open and start the webRTC demo first clone the enclosing git repo:

`git clone https://github.com/jaqarrick/webrtc-info.git `

Navigate into the demo directory and install the node modules:

`cd webrtc-info/demo && npm i`

To boot up the server run `npm start`

To simulate a webRTC peer connection load two windows in a web browser at `http://localhost:5000`. Click the "start video" button on both pages. From one page, click "start call". This should initiate a video chat between the two clients. To find out how this app works, keep reading!

_Note: This demo is made to connect two peers on a local network. It may not work on two separate devices (for security reasons). If you're connecting to the internet using a VPN, you may have issues reaching the STUN servers_.

---

### Peer Connection

Before a P2P connection is established, each client must negotiate their ICE candidates and SDP offers. ICE and SDP data is exchanged through a signaling server in `index.js`.

Signaling is explained [below](https://github.com/jaqarrick/webrtc-info/tree/main/demo#signaling).

In `main.js` Each client initializes a web RTC peer connection and add event listeners / handlers

```
//Configure STUN/ICE server
const serverConfig = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302",
		},
	],
}

const peerConnection = new RTCPeerConnection(serverConfig)
peerConnection.addEventListener("icecandidate", handleICECandidate)
peerConnection.addEventListener("track", handleRemoteStreamAdded)

```

`handleICECandidate` listens for any new ICE candidates on the peer connection and then sends the candidates to the signaling server, which sends to the remote peer.

```
const handleICECandidate = e => {
	console.log("icecandidate event", e)
	if (e.candidate) {
		console.log("sent ICE candidate to signaling server / peers")
		sendSocketMessage("send ICE candidate", e.candidate)
	} else {
		console.log(`end of ICE candidates`)
	}
}
```

`handleRemoteStreamAdded` adds a track to a new Media Stream, which is set as a source for a new video element in the DOM.

```
const handleRemoteStreamAdded = e => {
	console.log("remote stream received")
	const remoteStream = new MediaStream()
	remoteStream.addTrack(e.track)
	addVideoToDOM(remoteStream)
}
```

The peer that begins the call initializes `start call`:

```
const startCall = () => {
	try {
		//any case of a new ICE candidate gets sent to signaling server / other peers
		//negotiate SDP, create an offer and send to signalling server
		peerConnection.onnegotiationneeded = () =>
			peerConnection.createOffer().then(localDescriptionCreated).catch(onError)
		// peerConnection.onremovetrack(handleRemoveTrack)
		localStream.then(stream =>
			stream.getTracks().forEach(track => peerConnection.addTrack(track))
		).value

		console.log("created RTC PeerConnection")
	} catch (e) {
		console.log(`Failed to create Peer Connection. Error: ${e}`)
		return
	}
}
```

`createOffer` negotiates an SDP offer, which is sent to the signaling server and then remote peer. The `localStream`, which is the client's video stream, is added to the peer connection with `peerConnection.addTrack()`.

The remote stream (who receives the call), listens for both an SDP offer and ICE candidates:

```
socket.on("receive ICE candidate", async candidate => {
	await peerConnection.addIceCandidate(candidate)
	console.log(`received ICE candidate: ${candidate}`)
})
socket.on("receive offer", async offer => {
	console.log("received SDP offer")
	await peerConnection.setRemoteDescription(offer)
	localStream.then(stream =>
        // adds local video to peer connection track
		stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
	)
	await peerConnection.setLocalDescription(await peerConnection.createAnswer())
	sendSocketMessage("send answer", peerConnection.localDescription)
	initCallBtn.classList.add("inactive")
	hangupBtn.addEventListener("click", endPeerConnection)
	hangupBtn.classList.remove("inactive")
})

```

The remote peer responds to the caller with an answer, which is it's own SDP negotiation with `peerConnection.createAnswer()`.

The caller listens for the answer and sets it as its remote description (SDP):

```
socket.on("receive answer", async answer => {
	await peerConnection.setRemoteDescription(answer)
	initCallBtn.classList.add("inactive")
	hangupBtn.addEventListener("click", endPeerConnection)
	hangupBtn.classList.remove("inactive")
})
```

At this point both peers have local and remote session descriptions, ICE candidates, and local and remote streams/tracks.

### Signaling

In this demo, SDP offers/answers and ICE candidates are sent through a signaling server, which is a simple express app running socket.io.

`index.js` has very straightforward functionality.

First, we set up the express app and socket.io connection:

```
const io = require("socket.io")(http)
const normalizePort = port => parseInt(port, 10)
const PORT = normalizePort(process.env.PORT || 5000)
const dev = app.get("env") !== "production"

app.use(express.static("public"))

io.on("connection", socket => {
    console.log('a client has connected')
})

http.listen(PORT, () => {
	if (dev)
		console.log(`The server is up and running at http://localhost:${PORT}`)
})
```

Then we integrate the socket listeners:

```
io.on("connection", socket => {
	console.log("a client has connected")

	socket.on("send ICE candidate", candidate => {
		console.log("ICE candidate received")
		socket.broadcast.emit("receive ICE candidate", candidate)
	})

	socket.on("send offer", description => {
		console.log("SDP received")
		socket.broadcast.emit("receive offer", description)
	})

	socket.on("send answer", answer => {
		console.log("SDP answer received")
		socket.broadcast.emit("receive answer", answer)
	})
})
```

Each web socket listens for the webRTC peer events and broadcasts them all other sockets connected with `socket.broadcast.emit()`.
