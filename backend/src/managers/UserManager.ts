import { Socket } from 'socket.io';


export interface User {
  name: string;
  socket: Socket;
}

export class UserManager {
  private users: User[];
  private queue: string[];
  constructor() {
    this.users = [];
    this.queue = [];
  }
  addUser(name: string, socket: Socket) {
    this.users.push({ name, socket });
    this.queue.push(socket.id);
    this.clearQueue();
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
    user1?.socket.emit('new-room', { 
      type: "send-offer",
      roomId: this.generate(),
    });
  }
  
}