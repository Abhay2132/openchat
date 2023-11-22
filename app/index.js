const express = require('express');
const { createServer } = require('http');
const path = require("path");
const router = require("./lib/router")
const PORT = process.env.PORT || 3100;
const { Server } = require('socket.io');
const {EventEmitter} = require("events");

const ws = new EventEmitter();
const app = express();
const server = createServer(app);
const io = new Server(server);

const randInt = (min, max) => Math.random() * (max - min) + min;

const userSockets = new Map();

function getRandomTargetID(myID){
  let IDs = [...userSockets.keys()].filter(user => user != myID || !userSockets.get(user).isBusy);
  console.log({IDs,myID})
  if(IDs.length == 0) return false;

  let targetPos = randInt(0,IDs.length);

  const targetID = IDs[targetPos]
  
  userSockets.get(myID).isBusy = true;
  userSockets.get(targetID).isBusy = true;

  return targetID;
}

io.on('connection', (socket) => {
  userSockets.set(socket.client.id, {isBusy : false, socket});
  
  io.emit("user-count", {count: userSockets.size});

  socket.on('disconnect', () => {
    console.log('user disconnected');
    userSockets.delete(socket.client.id);
    io.emit("user-count", {count: userSockets.size});
  });

  socket.on("rtc", ({type, targetID, payload}) => {
    console.log("RTC", arguments[0])
    if(!userSockets.has(targetID)) return socket.emit("rtc-error", {type:"target404"});
    userSockets.get(targetID).socket.emit(type, payload);
  })

  console.log("new User :", socket.client.id)
  socket.on("request-target", ()=>{
    const {id: myID} = socket.client;
    userSockets.get(myID).isBusy = false;

    let targetID = getRandomTargetID(myID);
    
    console.log({targetID, myID}, "on request-target");
    if(!targetID) return;

    userSockets.get(myID).isBusy = true;
    userSockets.get(targetID).isBusy = true;

    targetSocket = userSockets.get(targetID).socket;
    socket.emit("target-found", {targetID, task:"offer"})
    targetSocket.emit("target-found", {targetID: myID, task:"answer"} )

    targetSocket.on("disconnect", function emitTargetLeaved(){
      socket.emit("target-leaved");
      // targetSocket.removeListener("disconnect", emitTargetLeaved);
    })
  })
  
  socket.emit("log", {myID:socket.client.id});

});

app.use(express.json());
app.use(router);
app.use(express.static(path.join(path.resolve(),'public')))

server.listen(PORT, () => {
  console.log('server running at http://localhost:3000');
});
