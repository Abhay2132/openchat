import { getLocalVideoStream, $, wait } from "./util.js";

const local = $("#local");
const remote = $("#remote");

const socket = io();

var myPeerConn = false;
var targetID = false;
var localStream = false;

socket.on("user-count", ({ count = 0 }) => {
	const count_target = $("#user-count");
	if (!count_target) return;
	count_target.textContent = count;
});
socket.on("log", console.log);

async function invite() {
	// let localStream = await getLocalVideoStream();
	if (myPeerConn) return alert("Already in a call !");
	createPeerConn();
	localStream
		.getTracks()
		.forEach((track) => myPeerConn.addTrack(track, localStream));
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
		sendToServer("video-offer", { sdp: myPeerConn.localDescription });
	});
}

function handleVideoOfferMsg(msg) {
	targetID = msg.name;
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
			src.getTracks().forEach((track) => myPeerConn.addTrack(track, src));
		})
		.then(function () {
			return myPeerConn.createAnswer();
		})
		.then(function (answer) {
			return myPeerConn.setLocalDescription(answer);
		})
		.then(function () {
			sendToServer("video-answer", targetID, {
				sdp: myPeerConn.localDescription,
			});
		});
}

function handleVideoAnswer(ans) {
	const desc = new RTCSessionDescription(ans.sdp);
	myPeerConn.setRemoteDescription(desc);
}

function handleICECandidateEvent(event) {
	if (event.candidate) {
		sendToServer("new-ice-candidate", {candidate: event.candidate});
	}
}

function handleNewICECandidateMsg(msg) {
	const candidate = new RTCIceCandidate(msg.candidate);
	myPeerConn.addIceCandidate(candidate);
}

function sendToServer(type, payload) {
	socket.emit("rtc", { type, targetID, payload });
}

function handleTrackEvent(event) {
	remote.srcObject = event.streams[0];
}

function closeVideoCall() {
	// const remote = document.getElementById("received_video");
	// const local = document.getElementById("local_video");

	if (myPeerConnection) {
		myPeerConnection.ontrack = null;
		myPeerConnection.onremovetrack = null;
		myPeerConnection.onremovestream = null;
		myPeerConnection.onicecandidate = null;
		myPeerConnection.oniceconnectionstatechange = null;
		myPeerConnection.onsignalingstatechange = null;
		myPeerConnection.onicegatheringstatechange = null;
		myPeerConnection.onnegotiationneeded = null;

		if (remote.srcObject) {
			remote.srcObject.getTracks().forEach((track) => track.stop());
		}

		myPeerConnection.close();
		myPeerConnection = null;
	}

	remote.removeAttribute("src");
	remote.removeAttribute("srcObject");
	targetID = null;
}

socket.on("video-offer", handleVideoOfferMsg);
socket.on("video-answer", handleVideoAnswer);
socket.on("new-ice-candidate", handleNewICECandidateMsg);
socket.on("target-leaved", () => {
	closeVideoCall();
	socket.emit("reqest-target");
});
socket.on("target-found", (data) => {
	targetID = data.targetID;
	invite();
});

window.addEventListener("load", async () => {
	localStream = await getLocalVideoStream();
	var video = document.getElementById("local");
	if ("srcObject" in video) {
		video.srcObject = localStream;
	} else {
		video.src = window.URL.createObjectURL(localStream);
	}
	video.onloadedmetadata = function (e) {
		video.play();
	};

	socket.emit("request-target");
});

for (let c of $("#cam-box").children) {
	c.addEventListener("click", async (e) => {
		console.log(`clicked '${e.target.className}'`);
		if (e.target.className == "small-video") {
			const sv = $(".small-video");
			const lv = $(".large-video");

			sv.className = "large-video";
			lv.className = "small-video";
		}
	});
}
