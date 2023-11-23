import { getLocalVideoStream, $, wait } from "./util.js";

const local = $("#local");
const remote = $("#remote");
let userLeaved= true

window.log = (...a) => {
	$("#logs").innerHTML += a.map(i => typeof(i) == "object" ? JSON.stringify(i): i).join(" ")+"<br>";
}

const socket = io();
socket.on("reload", ({pid}) => {
	if(localStorage.getItem("pid") == pid) return;
	localStorage.setItem("pid", pid);
 window.location = window.location
 })

var myPeerConn = false;
var targetID = false;
var localStream = false;
var mediaConstraints = {
	audio: false,
	video: true
}

socket.on("user-count", ({ count = 0 }) => {
	const count_target = $("#user-count");
	if (!count_target) return;
	count_target.textContent = count;
});
socket.on("log", log);

async function invite() {
	log("starting invite")
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
	//myPeerConn.onremovetrack = log; //handleRemoveTrackEvent;
	//myPeerConn.oniceconnectionstatechange = log; //handleICEConnectionStateChangeEvent;
	//myPeerConn.onicegatheringstatechange = log; //handleICEGatheringStateChangeEvent;
	//myPeerConn.onsignalingstatechange = log; //handleSignalingStateChangeEvent;
}

async function handleNegotiationNeededEvent() {
	log("sending video offer")
	const offer = await myPeerConn.createOffer();
	myPeerConn.setLocalDescription(offer).then(() => {
		sendToServer("video-offer", { sdp: myPeerConn.localDescription });
	});
}

function handleVideoOfferMsg(msg) {
	log("Recieved an OFFER");
	createPeerConn();

	const desc = new RTCSessionDescription(msg.sdp);

	myPeerConn
		.setRemoteDescription(desc)
		// .then(function () {
		// 	return getLocalVideoStream();
		// })
		.then(function () {
			try{localStream.getTracks().forEach((track) => myPeerConn.addTrack(track, localStream));
		} catch (e){ log(e, localStream) }
})
		.then(function () {
			return myPeerConn.createAnswer();
		})
		.then(function (answer) {
			return myPeerConn.setLocalDescription(answer);
		})
		.then(function () {
			log("Sending an Answer");
			sendToServer("video-answer", {
				sdp: myPeerConn.localDescription,
			});
		});
}

function handleVideoAnswer(ans) {
	log("answer received !");
	const desc = new RTCSessionDescription(ans.sdp);
	myPeerConn.setRemoteDescription(desc);
}

function handleICECandidateEvent(event) {
	if (event.candidate) {
		sendToServer("new-ice-candidate", { candidate: event.candidate });
	}
}

function handleNewICECandidateMsg(msg) {
	const candidate = new RTCIceCandidate(msg.candidate);
	myPeerConn.addIceCandidate(candidate);
}

function sendToServer(type, payload) {
	//log("sendToSever", type, payload);
	socket.emit("rtc", { type, targetID, payload });
}

function handleTrackEvent(event) {
	log("TRACK RECEIVED")
	// remote.srcObject = event.streams;
	// remote.play();
	log(event);
	let stream = event.streams[0];
	if ("srcObject" in remote) {
		remote.srcObject = stream;
	} else {
		remote.src = window.URL.createObjectURL(stream);
	}
	remote.onloadedmetadata = function (e) {
		remote.play();
	};
}

function closeVideoCall() {
	// const remote = document.getElementById("received_video");
	// const local = document.getElementById("local_video");

	if (myPeerConn) {
		myPeerConn.ontrack = null;
		myPeerConn.onremovetrack = null;
		myPeerConn.onremovestream = null;
		myPeerConn.onicecandidate = null;
		myPeerConn.oniceconnectionstatechange = null;
		myPeerConn.onsignalingstatechange = null;
		myPeerConn.onicegatheringstatechange = null;
		myPeerConn.onnegotiationneeded = null;

		if (remote.srcObject) {
			remote.srcObject.getTracks().forEach((track) => track.stop());
		}

		myPeerConn.close();
		myPeerConn = null;
	}

	remote.removeAttribute("src");
	remote.removeAttribute("srcObject");
	targetID = null;
}

socket.on("video-offer", handleVideoOfferMsg);
socket.on("video-answer", handleVideoAnswer);
socket.on("new-ice-candidate", handleNewICECandidateMsg);
socket.on("target-leaved", () => {
	log("TARGET-LEAVED | closing call")
	
	closeVideoCall();
	userLeaved = true
	
	log("requesting target");
	socket.emit("reqest-target");
});

socket.on("target-found", (data) => {
	if(!userLeaved) return;
	targetID = data.targetID;
	log("found-target", data);
	if (data.task == "offer") invite();
	userLeaved = false;
});

window.addEventListener("load", async () => {
	while(!localStream){
	localStream = await getLocalVideoStream();
	}
	// var local = document.getElementById("local");
	if ("srcObject" in local) {
		local.srcObject = localStream;
	} else {
		local.src = window.URL.createObjectURL(localStream);
	}
	local.onloadedmetadata = function (e) {
		local.play();
	};
	
	if(userLeaved){
		log("requesting-target")
		socket.emit("request-target");
	}
});

for (let c of $("#cam-box").children) {
	c.addEventListener("click", async (e) => {
		log(`clicked '${e.target.className}'`);
		if (e.target.className == "small-video") {
			const sv = $(".small-video");
			const lv = $(".large-video");

			sv.className = "large-video";
			lv.className = "small-video";
		}
	});
}

window.newCall = function () {
	closeVideoCall();
	userLeaved = true
	
	log("requesting target");
	socket.emit("request-target");
}
