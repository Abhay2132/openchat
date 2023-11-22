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
  let IDs = [...userSockets.keys()].filter(user => userSockets.get(user).socket.client.id != myID || !user.isBusy);

  if(IDs.length < 2) return false;

  let targetPos = randInt(0,IDs.length);

  const targetID = IDs.at(targetPos)
  
  userSockets.get(myID).isBusy = true;
  userSockets.get(targetID).isBusy = true;

  return targetID;
}

const waitingUser = {id: false}

io.on('connection', (socket) => {
  userSockets.set(socket.client.id, {isBusy : false, socket});
  
  io.emit("user-count", {count: io.engine.clientsCount});

  socket.on('disconnect', () => {
    console.log('user disconnected');
    io.emit("user-count", {count: io.engine.clientsCount});
    userSockets.delete(socket.client.id);
  });

  socket.on("rtc", ({type, targetID, payload}) => {
    if(!userSockets.has(targetID)) return socket.emit("rtc-error", {type:"target404"});
    userSockets.get(targetID).emit(type, payload);
  })

  console.log("new User :", socket.client.id)
  socket.on("request-target", ()=>{
    const {id: myID} = socket.client;
    userSockets.get(myID).isBusy = false;

    let targetID = getRandomTargetID(myID);
    if(!targetID) return;

    userSockets.get(myID).isBusy = true;
    userSockets.get(targetID).isBusy = true;

    socket.emit("target-found", {targetID, task:"offer"})
    userSockets.get(targetID).socket.emit("target-found", {targetID: myID, task:"answer"} )
  })
  
  socket.emit("log", {message : "HELLO"});

});

app.use(express.json());
app.use(router);
app.use(express.static(path.join(path.resolve(),'public')))

server.listen(PORT, () => {
  console.log('server running at http://localhost:3000');
});