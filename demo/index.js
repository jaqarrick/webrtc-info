const express = require("express")
const app = express()

const http = require("http").Server(app)

const io = require("socket.io")(http)

const normalizePort = port => parseInt(port, 10)
const PORT = normalizePort(process.env.PORT || 5000)
const dev = app.get("env") !== "production"

app.use(express.static("public"))

io.on("connection", socket => {
	console.log("a client has connected")

	socket.on("send ICE candidate", candidate => {
		console.log("ICE candidate received")
		socket.broadcast.emit("receive ICE candidate", candidate)
	})

	socket.on("send SDP", description => {
		console.log("SDP received")
		socket.broadcast.emit("receive SDP", description)
	})
})
http.listen(PORT, () => {
	if (dev)
		console.log(`The server is up and running at http://localhost:${PORT}`)
})
