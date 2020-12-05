//connect to the backend socket.io server for signaling
const socket = io()
const videoWrapper = document.querySelector("#video-wrapper")
const initConnectionBtn = document.querySelector("#init-connection")
const initLocalVideoBtn = document.querySelector("#init-video")
const initCallBtn = document.querySelector("#init-call")
const hangupBtn = document.querySelector("#hangup")

// let localStream
const videoConstraints = {
	video: {
		width: 200,
		height: 200,
		frameRate: 15,
	},
}
//Function for sending socket messages
const sendSocketMessage = (message, messageContent) =>
	socket.emit(message, messageContent)

const localStream = new Promise((resolve, reject) =>
	navigator.mediaDevices
		.getUserMedia(videoConstraints)
		.then(resolve)
		.catch(reject)
)

const initLocalVideoBtnHandler = async () => {
	initLocalVideoBtn.classList.add("inactive")
	initCallBtn.classList.remove("inactive")
	addVideoToDOM(await localStream)
	initLocalVideoBtn.removeEventListener("click", initLocalVideoBtnHandler)
	initCallBtn.addEventListener("click", startCall)
}
initLocalVideoBtn.addEventListener("click", initLocalVideoBtnHandler)

const addVideoToDOM = stream => {
	const video = document.createElement("video")
	const container = document.createElement("div")
	container.classList.add("video-container")
	container.appendChild(video)
	// video.setAttribute("autoplay", true)
	video.onloadedmetadata = e => {
		console.log("video metadataloaded!")
		video.play()
	}
	video.setAttribute("playsinline", true)
	video.setAttribute("muted", true)
	video.srcObject = stream
	console.log(stream)
	videoWrapper.appendChild(container)
}

// //Success and error handlers for cleaner callbacks
const onSuccess = () => console.log("success!")
const onError = error => console.error(error)

// //Configure STUN/ICE server
const serverConfig = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302",
		},
	],
}

const handleRemoteStreamAdded = e => {
	console.log("remote stream received")
	const remoteStream = new MediaStream()
	remoteStream.addTrack(e.track)
	addVideoToDOM(remoteStream)
}

const localDescriptionCreated = description => {
	peerConnection.setLocalDescription(description, onSuccess, onError)
	console.log(
		`local SDP set and sent to server: ${JSON.stringify(description)}`
	)
	sendSocketMessage("send offer", description)
}
const handleICECandidate = e => {
	console.log("icecandidate event", e)
	if (e.candidate) {
		console.log("sent ICE candidate to signaling server / peers")
		sendSocketMessage("send ICE candidate", e.candidate)
	} else {
		console.log(`end of ICE candidates`)
	}
}

//init peer connection and add event listeners and handlers
const peerConnection = new RTCPeerConnection(serverConfig)
peerConnection.addEventListener("icecandidate", handleICECandidate)
peerConnection.addEventListener("track", handleRemoteStreamAdded)

const startCall = async () => {
	try {
		//any case of a new ICE candidate gets sent to signaling server / other peers
		//negotiate SDP, create an offer and send to signalling server
		peerConnection.onnegotiationneeded = () =>
			peerConnection.createOffer().then(localDescriptionCreated).catch(onError)
		// peerConnection.onremovetrack(handleRemoveTrack)
		console.log(localStream)
		localStream.then(stream =>
			stream.getTracks().forEach(track => peerConnection.addTrack(track))
		).value

		console.log("created RTC PeerConnection")
	} catch (e) {
		console.log(`Failed to create Peer Connection. Error: ${e}`)
		return
	}
}

const endPeerConnection = () => {
	peerConnection.close()
	document
		.querySelectorAll(".video-container")
		.forEach(container => container.remove())
}

socket.on("receive ICE candidate", async candidate => {
	await peerConnection.addIceCandidate(candidate)
	console.log(`received ICE candidate: ${candidate}`)
})
socket.on("receive offer", async offer => {
	console.log("received SDP offer")
	await peerConnection.setRemoteDescription(offer)
	localStream.then(stream =>
		stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
	)
	await peerConnection.setLocalDescription(await peerConnection.createAnswer())
	sendSocketMessage("send answer", peerConnection.localDescription)
	initCallBtn.classList.add("inactive")
	hangupBtn.addEventListener("click", endPeerConnection)
	hangupBtn.classList.remove("inactive")
})

socket.on("receive answer", async answer => {
	await peerConnection.setRemoteDescription(answer)
	initCallBtn.classList.add("inactive")
	hangupBtn.addEventListener("click", endPeerConnection)
	hangupBtn.classList.remove("inactive")
})
