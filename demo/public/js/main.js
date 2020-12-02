//connect to the backend socket.io server for signaling
const socket = io()
const videoContainer = document.querySelector("#video-container")
const initConnectionBtn = document.querySelector("#init-connection")
const addVideoToDOM = stream => {
	const video = document.createElement("video")
	video.setAttribute("autoplay", true)
	video.srcObject = stream
	videoContainer.appendChild(video)
}
//Function for sending socket messages
const sendSocketMessage = (message, messageContent) =>
	socket.emit(message, messageContent)

//Configure STUN/ICE server
const configuration = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302",
		},
		// {
		// 	urls: "turn:10.158.29.39:3478?transport=udp",
		// 	credential: "XXXXXXXXXXXXX",
		// 	username: "XXXXXXXXXXXXXXX",
		// },
		// {
		// 	urls: "turn:10.158.29.39:3478?transport=tcp",
		// 	credential: "XXXXXXXXXXXXX",
		// 	username: "XXXXXXXXXXXXXXX",
		// },
	],
}

//Success and error handlers for cleaner callbacks
const onSuccess = () => console.log("success!")
const onError = error => console.error(error)

const localDescriptionCreated = description => {
	peerConnection.setLocalDescription(description, onSuccess, onError)
	console.log(
		`local SDP set and sent to server: ${JSON.stringify(description)}`
	)
	sendSocketMessage("send SDP", description)
}
//Initiate an RTC connection between local computer and remote peer
let peerConnection
const initPeerConnection = isOfferer => {
	peerConnection = new RTCPeerConnection(configuration)

	//'onicecandidate' notifies whenever an ICE agent needs
	//to deliver a message to the other peer through the signaling server
	peerConnection.onicecandidate = event => {
		if (event.candidate) {
			console.log(`sending ICE candidate: ${event.candidate}`)
			//sends the ICE candidate to the signaling server
			sendSocketMessage("send ICE candidate", event.candidate)
		}
	}

	if (isOfferer) {
		//create the offer (negotiate SDP and send to signaling server)
		peerConnection.onnegotiationneeded = () => {
			console.log("creating offer!")

			peerConnection.createOffer().then(localDescriptionCreated).catch(onError)
		}
	}

	//add remote stream to dom
	peerConnection.ontrack = event => {
		console.log("stream received")
		addVideoToDOM(event.streams[0])
	}

	//add local stream to dom
	navigator.mediaDevices
		.getUserMedia({ video: true })
		.then(stream => {
			addVideoToDOM(stream)
			peerConnection.addStream(stream)
		})
		.catch(onError)
}

initConnectionBtn.onclick = initPeerConnection
socket.on("receive SDP", description => {
	console.log("remote description received")
	console.log(description)
	if (!peerConnection) {
		initPeerConnection(false)
	}

	peerConnection.setRemoteDescription(
		new RTCSessionDescription(description),
		() => {
			if (peerConnection.remoteDescription.type === "offer") {
				peerConnection
					.createAnswer()
					.then(localDescriptionCreated)
					.catch(onError)
			}
		},
		onError
	)
})

socket.on("receive ICE candidate", candidate => {
	console.log("ice candidate received")
	if (!peerConnection) {
		initPeerConnection(false)
	}
	peerConnection.addIceCandidate(
		new RTCIceCandidate(candidate),
		onSuccess,
		onError
	)
})
