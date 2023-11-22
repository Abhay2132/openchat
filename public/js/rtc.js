
async function invite () {
	if (myPeerConn) return alert("Already in a call !");
	createPeerConn();
	if (!src) await setCamera();
	src.getTracks().forEach((track) => myPeerConn.addTrack(track, src));
}

function createPeerConn() {
	myPeerConn = new RTCPeerConnection({
		iceServers: [
			// Information about ICE servers - Use your own!
			{
				urls: "stun:stun.stunprotocol.org",
			},
		],
	});

	myPeerConn.onicecandidate = handleICECandidateEvent;
	myPeerConn.ontrack = handleTrackEvent;
	myPeerConn.onnegotiationneeded = handleNegotiationNeededEvent;
	//myPeerConn.onremovetrack = console.log; //handleRemoveTrackEvent;
	//myPeerConn.oniceconnectionstatechange = console.log; //handleICEConnectionStateChangeEvent;
	//myPeerConn.onicegatheringstatechange = console.log; //handleICEGatheringStateChangeEvent;
	//myPeerConn.onsignalingstatechange = console.log; //handleSignalingStateChangeEvent;
}

async function handleNegotiationNeededEvent() {
	const offer = await myPeerConn.createOffer();
	myPeerConn.setLocalDescription(offer).then(() => {
		sendToServer({
			name: myUsername,
			target: targetUsername,
			type: "video-offer",
			sdp: myPeerConn.localDescription,
		});
	});
}

function handleVideoOfferMsg(msg) {
	targetUsername = msg.name;
	createPeerConn();

	const desc = new RTCSessionDescription(msg.sdp);

	myPeerConn
		.setRemoteDescription(desc)
		.then(function () {
			return navigator.mediaDevices.getUserMedia(mediaConstraints);
		})
		.then(function (stream) {
			src = stream;
			local.srcObject = src;
			setCameraMirror();
			src.getTracks().forEach((track) => myPeerConn.addTrack(track, src));
		})
		.then(function () {
			return myPeerConn.createAnswer();
		})
		.then(function (answer) {
			return myPeerConn.setLocalDescription(answer);
		})
		.then(function () {
			const msg = {
				name: myUsername,
				target: targetUsername,
				type: "video-answer",
				sdp: myPeerConn.localDescription,
			};

			sendToServer(msg);
		});
}

function handleVideoAnswer(ans) {
	const desc = new RTCSessionDescription(ans.sdp);
	myPeerConn.setRemoteDescription(desc);
}

function handleICECandidateEvent(event) {
	if (event.candidate) {
		sendToServer({
			type: "new-ice-candidate",
			target: targetUsername,
			candidate: event.candidate,
		});
	}
}

function handleNewICECandidateMsg(msg) {
	const candidate = new RTCIceCandidate(msg.candidate);
	myPeerConn.addIceCandidate(candidate);
}

function sendToServer(msg) {
	socket.emit(msg.type, msg);
}

function handleTrackEvent(event) {
	qs(".fs-dialog-box").style.display = "none";
	remote.srcObject = event.streams[0];
	if ( typeof remote.callback === "function" ) setTimeout (remote.callback, 0);
	qs(".users").textContent = targetUsername
}

socket.on("video-offer", handleVideoOfferMsg);
socket.on("video-answer", handleVideoAnswer);
socket.on("new-ice-candidate", handleNewICECandidateMsg);