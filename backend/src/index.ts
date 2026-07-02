import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { UserManager } from './managers/UserManager.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const userManager = new UserManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Hello from Express Server!');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for frontend room enrollment
  socket.on('join', ({ name }: { name: string }) => {
    try {
      console.log(`User registered: ${name} (${socket.id})`);
      userManager.addUser(name, socket);
    } catch (error) {
      console.error('Error in join handler:', error);
      socket.emit('error', { message: 'Failed to join' });
    }
  });

  // Handle sudden closures or intentional disconnects
  socket.on('disconnect', () => {
    try {
      console.log('User disconnected:', socket.id);
      userManager.removeUser(socket.id);
    } catch (error) {
      console.error('Error in disconnect handler:', error);
    }
  });

  // Error handling for socket
  socket.on('error', (error) => {
    console.error('Socket error:', socket.id, error);
  });
});

// CRITICAL FIX: listen on server, not app, so socket.io interceptor works
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});