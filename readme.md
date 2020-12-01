# Web RTC

_This repo serves as an in-depth explanation of Web RTC._

## Overview

Web RTC stands for Web Real-Time Communication. It standardizes and simplifies a method for two or more peers to communicate with directly with each other in an efficient and low latency manner.

**How does it work?**

1. PeerA wants to Connect to PeerB
2. PeerA finds out all possible ways the public can connect to it
3. PeerB finds out all possible ways the public can connect to it
4. PeerA and PeerB signal this session information (SDP/Session Description Protocol) via other means (through something like WebSockets, HTTP Fetch, etc.)
5. PeerA connects to PeerB via the most optimal path
6. PeerA & PeerB also exchange supported media and security

## Inner Mechanisms of Web RTC Demystified

###NAT (Network Address Translation)
Almost all devices that are connected to the internet live behind NAT, which allows for private IPs to be translated into a public IP (which is provided by a router).

1. Let's say my private IP address is 10.0.0.2 and the IP address I want to reach is 4.4.4.4:80 (which could be an AWS server, for example). First, I'd construct a packet with the following information:
   - **8992 | 10.0.0.2 | GET/ | 4.4.4.4 | 80**
2. First my router will check if the destination address is directly available through subnet masking. Because these two addresses are clearly not on the subnet range, it knows it cannot be communicated with directly.
3. The router, who's public IP address is 5.5.5.5, will replace the source IP on the packet with its IP address and distinct, random port. The packet now looks like this:

   - **3333 | 5.5.5.5 | GET/ | 4.4.4.4 | 80**

   This is also understood as a _NAT Table_:
   Internal IP | Internal Port | Ext. IP | Ext. Port | Dest. IP | Destination Port |
   ----- | ----- | ----- | ----- | -----| ----- |
   10.0.0.2 | 8992 | 5.5.5.5 | 3333 | 4.4.4.4 | 80

   The destination responds with the following packet:

   - **80 | 4.4.4.4 | 200 OK | 10.0.0.2 | 8992**

   The router refers to the NAT table on where to send the packet in the local network.

### NAT Translation Methods

Each router has a different implementation of NAT:

1. **One to One NAT (Full-cone NAT)**
2. **Address restricted NAT**
3. **Port restricted NAT**
4. **Symmetric NAT** (Not compatible with web RTC)

#### One to One NAT (Full Cone NAT)

Packets to external IP:port on the router always maps to internal IP:port without exceptions.
Internal IP | Internal Port | Ext. IP | Ext. Port | Dest. IP | Destination Port |
----- | ----- | ----- | ----- | -----| ----- |
10.0.0.2 |8992|5.5.5.5|3333|4.4.4.4|80|
10.0.0.2|9999|5.5.5.5|4444|3.3.3.3|80

## Attribution

This guide draws heavily from Hussein Nasser's [WebRTC crash course](https://www.youtube.com/watch?v=FExZvpVvYxA) and the WebRTC [codelab tutorial](https://codelabs.developers.google.com/codelabs/webrtc-web/#0).
