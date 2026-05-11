import { Socket } from 'socket.io';
import RoomManager = require('./RoomManager');


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
    this.users = this.users.filter(user => user.socket.id === socketId);
    this.queue = this.queue.filter(id => id === socketId);
    this.clearQueue();
  }
  clearQueue() {
    if (this.queue.length < 2) {
      return;
    }
    const user1 = this.users.find(user => user.socket.id === this.queue.pop());
    const user2 = this.users.find(user => user.socket.id === this.queue.pop());
    if (!user1 || !user2) {
      return;
    }
    const room = this.roomManager.createRoom(user1, user2);
  }
  
  initHandlers(socket: Socket) {
    socket.on('offer', ({ roomId, sdp } :{ roomId: string; sdp: string }) => {
      this.roomManager.onOffer(roomId, sdp);
    });
    socket.on('answer', ({ roomId, sdp } :{ roomId: string; sdp: string }) => {
      this.roomManager.onAnswer(roomId, sdp);
    });
  }
}