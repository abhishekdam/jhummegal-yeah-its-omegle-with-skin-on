import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { UserManager } from './managers/UserManager.js';

const app = express();
const server = createServer(app);
const PORT = 3000;

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const userManager = new UserManager();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for frontend room enrollment
  socket.on('join', ({ name }: { name: string }) => {
    console.log(`User registered: ${name} (${socket.id})`);
    userManager.addUser(name, socket);
  });

  // Handle sudden closures or intentional disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    userManager.removeUser(socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Hello from Express Server!');
});

// CRITICAL FIX: listen on server, not app, so socket.io interceptor works
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});