const socket = io()

const init = () => {
	const lc = new RTCPeerConnection() //Create a local Peer Connection with built in webRTC API
	const dc = lc.createDataChannel("channel") //Our data channel takes in a label 'channel'
	dc.onmessage = e => console.log(`Just got a message: ${e.data}`)
	dc.onopen = e => console.log("connection opened")

	//every time we get an ICE candidate, we want to reprint the SDP message
	lc.onicecandidate = e => {
		console.log(
			`new ICE candidate! reprinting SDP: ${JSON.stringify(
				lc.localDescription
			)}`
		)
		socket.emit("send ICE candidate", lc.localDescription)
	}

	const createOffer = () => {
		lc.createOffer()
			.then(offer => lc.setLocalDescription(offer))
			.then(a => console.log("set successfully"))
			.catch(err => console.log("error", err))
	}

	document.querySelector("#create-offer").onclick = createOffer

	socket.on("receive ICE candidate", offer => {
		const rc = new RTCPeerConnection()
		rc.onicecandidate = e => {
			console.log(
				`new ICE candidate! reprinting SDP: ${JSON.stringify(
					rc.localDescription
				)}`
			)
		}
		rc.ondatachannel = e => {
			//sets data channel of remote connection to the data channel rc receives
			rc.dc = e.channel
			rc.dc.onmessage = e => console.log("new message from client!", e.data)
			rc.dc.onopen = e => console.log("connection opened!")
		}

		rc.setRemoteDescription(offer).then(a => console.log("offer set!"))

		rc.createAnswer()
			.then(a => rc.setLocalDescription(a))
			.then(a => console.log("answer created"))
	})
}

init()
