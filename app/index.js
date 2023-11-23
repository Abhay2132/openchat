const express = require('express');
const { createServer } = require('http');
const path = require("path");
const router = require("./lib/router")
const PORT = process.env.PORT || 3100;
const { Server } = require('socket.io');
const {EventEmitter} = require("events");
const fs = require("fs")
const https = require("https")

console.clear();
const options = { 
  key: fs.readFileSync(path.join(__dirname,"server.key")), 
  cert: fs.readFileSync(path.join(__dirname,"server.cert")), 
}; 

const isPro = (process.env.NODE_ENV||"").toLowerCase().trim() == "production";
const ws = new EventEmitter();
const app = express();
const server = isPro ? createServer(app) : https.createServer(options, app);
const io = new Server(server);

const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min)

const userSockets = new Map();

function getRandomTargetID(myID){
  let IDs = [...userSockets.keys()].filter(user => user != myID && !userSockets.get(user).isBusy);
  console.log("getRandom", {IDs,myID})
  if(IDs.length == 0) return false;

  let targetPos = randInt(0,IDs.length);

  const targetID = IDs[targetPos]
  
  userSockets.get(myID).isBusy = true;
  userSockets.get(targetID).isBusy = true;
  
  console.log(`myID : ${myID}, targetID:${targetID}`)

  return targetID;
}

const pid = randInt(0,1000);
const newEntry = socket => ({
	socket,
	isBusy :false,
	targetID:null,
	myID : socket.client.id,
	freeTarget(){
		if(!userSockets.has(this.targetID)) return console.error("no target of targetID `", this.targetID, "` found");
		this.isBusy = false;
		const target = userSockets.get(this.targetID)
		target.targetID = null;
		target.isBusy = false;
		target.socket.emit("target-leaved");
	}
})

io.on('connection', (socket) => {
	
const log = (...args) => socket.emit("log", "[server] "+(args.map(b => typeof(b) == 'object' ? JSON.stringify(b) : b).join(" ")) );
	socket.emit("reload", {pid});
  userSockets.set(socket.client.id, newEntry(socket));
  
  io.emit("user-count", {count: userSockets.size});

  socket.on('disconnect', () => {
	userSockets.get(socket.client.id).freeTarget();
    userSockets.delete(socket.client.id);
    io.emit("user-count", {count: userSockets.size});
  });

  socket.on("rtc", (data) => {
  	const {type, targetID, payload} = data;
   // console.log("RTC", type, targetID)
    if(socket.client.id == targetID) return;
    if(!userSockets.has(targetID)) return socket.emit("rtc-error", {type:"target404"});
    userSockets.get(targetID).socket.emit(type, payload);
  })

  //console.log("new User :", socket.client.id)
  socket.on("request-target", ()=>{
	log("request-target by id :", socket.client.id);
    const {id: myID} = socket.client;
    let me = userSockets.get(myID);
	me.freeTarget();
	
    let targetID = getRandomTargetID(myID);
    
    console.log( "request-target",{targetID, myID});
    if(!targetID) return;

    let target = userSockets.get(targetID)
    
	me.isBusy = true;
    target.isBusy = true;
	me.targetID = targetID;
	target.targetID = myID;

    targetSocket = userSockets.get(targetID).socket;
    socket.emit("target-found", {targetID, task:"offer"})
    targetSocket.emit("target-found", {targetID: myID, task:"answer"} )
	
  })
  
	log(`id : ${socket.client.id}`);

});

app.get("/getUsers", (req, res) => {
	res.json([...userSockets.keys()].map(user => [user, userSockets.get(user).isBusy,userSockets.get(user).targetID]))
});
app.use(express.json());
app.use(router);
app.use(express.static(path.join(path.resolve(),'public')))

server.listen(PORT, () => {
  console.log('server running at http://localhost:'+PORT);
});