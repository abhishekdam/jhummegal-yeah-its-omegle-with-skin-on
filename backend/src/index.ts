const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { join } = require('node:path');

const app = express();
const server = createServer(app);
const PORT = 3000;


const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on('connection', (socket) => {
  console.log('a user connected',socket.id);
});

app.get('/', (req, res) => {
  res.send('Hello from Express (EMS)!');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
