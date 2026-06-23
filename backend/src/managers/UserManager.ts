import { Socket } from 'socket.io';
import { RoomManager } from './RoomManager.js';

export interface User {
  name: string;
  socket: Socket;
}

export class UserManager {
  private users: User[];
  private queue: string[];
  private roomManager: RoomManager;

  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  addUser(name: string, socket: Socket) {
    this.users.push({ name, socket });
    this.queue.push(socket.id);
    this.clearQueue();
    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    // CRITICAL BUG FIX: use !== to remove the target user, instead of keeping only them
    this.users = this.users.filter(user => user.socket.id !== socketId);
    this.queue = this.queue.filter(id => id !== socketId);
  }

  clearQueue() {
    if (this.queue.length < 2) {
      return;
    }

    const id1 = this.queue.pop();
    const id2 = this.queue.pop();

    const user1 = this.users.find(user => user.socket.id === id1);
    const user2 = this.users.find(user => user.socket.id === id2);

    if (!user1 || !user2) {
      // Safe guard: put valid connections back in queue if data mismatch happens
      if (id1) this.queue.push(id1);
      if (id2) this.queue.push(id2);
      return;
    }

    this.roomManager.createRoom(user1, user2);
  }
  
  initHandlers(socket: Socket) {
    socket.on('offer', ({ roomId, sdp }: { roomId: string; sdp: string }) => {
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on('answer', ({ roomId, sdp }: { roomId: string; sdp: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    // Capture local ICE candidates from the client and pipe them to the match
    socket.on('ice-candidate', ({ roomId, candidate }: { roomId: string; candidate: any }) => {
      this.roomManager.onIceCandidate(roomId, candidate, socket.id);
    });
  }
}