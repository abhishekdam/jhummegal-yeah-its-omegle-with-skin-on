import type { User } from "./UserManager.js";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() { 
    this.rooms = new Map<string, Room>();
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generate().toString();
    this.rooms.set(roomId, { user1, user2 });
    
    // Command user1 to kickstart the signaling negotiation sequence
    user1.socket.emit('send-offer', { roomId });
  }

  onOffer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Relays local descriptions to the alternative paired partner socket
    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    targetUser.socket.emit('offer', { sdp, roomId });
  }

  onAnswer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // FIX: Send dedicated 'answer' signature event instead of overwriting 'offer' channel structures
    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    targetUser.socket.emit('answer', { sdp, roomId });
  }

  onIceCandidate(roomId: string, candidate: any, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Forward network candidate info over to the remote party
    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    targetUser.socket.emit('ice-candidate', { candidate });
  }

  generate() {
    return GLOBAL_ROOM_ID++;
  }
}