const express = require('express');
const { createServer } = require('http');
const path = require("path");
const router = require("./lib/router")
const PORT = process.env.PORT || 3100;
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit("user-count", {count: io.engine.clientsCount});
  socket.on('disconnect', () => {
    console.log('user disconnected');
    io.emit("user-count", {count: io.engine.clientsCount});
  });
});

app.use(router);
app.use(express.static(path.join(path.resolve(),'public')))


app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

server.listen(PORT, () => {
  console.log('server running at http://localhost:3000');
});