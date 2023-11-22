export const Event = {
    events: new Map(),
    on(name, handler){
        if(typeof handler != "function") throw new Error("Given 'handler' is not function type"+handler.toString());

        if(this.events.has(name) && Array.isArray(this.events.get(name))){
            this.events.get(name).push(handler);
        } else {
            this.events.set(name, [handler])
        }
    },
    emit(name){
        if(!this.events.has(name)) return;
        this.events.forEach(val => val());
    },
    removeByName(name){
        if(!this.events.has(name)) return;
        this.events.delete(name);
    },
    removeByHandler(name, handler){
        if(!this.events.has(name)) return;
        const handlerList = this.events.get(name); 
        handlerList.forEach((h,i) => h == handler && handlerList.splice(i,1));
    },
    clearEvents(){
        this.events.clear();
    }
}

export async function getLocalVideoStream (){
    let All_mediaDevices=navigator.mediaDevices
    if (!All_mediaDevices || !All_mediaDevices.getUserMedia) {
       console.log("getUserMedia() not supported.");
       return;
    }
    const vidStream = await All_mediaDevices.getUserMedia({
       audio: false,
       video: true
    })

    return vidStream;
}

function setCameraMirror() {
	if (facingMode == "user") {
		local.style.transform = "scaleX(-1)";
	} else {
		local.style.transform = "scaleX(1)";
	}
}

async function setCamera(f = false) {
	if (f) {
		if (facingMode == "user") facingMode = "environment";
		else facingMode = "user";
	}
	mediaConstraints.video = { facingMode };
	if (src) src.getVideoTracks().forEach((t) => t.stop());
	src = await window.navigator.mediaDevices.getUserMedia(mediaConstraints);
	local.srcObject = src;
	setCameraMirror();

	if (myPeerConn && f) {
		let videoTrack = src.getTracks().find((track) => track.kind == "video");
		myPeerConn.getSenders().forEach((sender) => {
			if (sender.track.kind == "video") {
				sender.replaceTrack(videoTrack);
				//console.log("Replaced Track !");
			}
		});
	}
}

export const $ = q => document.querySelector(q)

export const wait = (n=0) => new Promise(r => setTimeout(r,n));