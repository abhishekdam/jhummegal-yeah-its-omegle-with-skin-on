import type { User } from "./UserManager.js";

let GLOBAL_ROOM_ID = 1;
const ROOM_ID_LOCK = Symbol('roomIdLock');

interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room>;
  private userToRoom: Map<string, string>; // socketId -> roomId

  constructor() {
    this.rooms = new Map<string, Room>();
    this.userToRoom = new Map<string, string>();
  }

  // Atomic room ID generation
  private generateRoomId(): string {
    return (GLOBAL_ROOM_ID++).toString();
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generateRoomId();
    this.rooms.set(roomId, { user1, user2 });
    this.userToRoom.set(user1.socket.id, roomId);
    this.userToRoom.set(user2.socket.id, roomId);

    // Command user1 to kickstart the signaling negotiation sequence
    user1.socket.emit('send-offer', { roomId });

    // Notify both users they're matched
    user1.socket.emit('matched', { roomId, partnerName: user2.name });
    user2.socket.emit('matched', { roomId, partnerName: user1.name });
  }

  // Get room by user's socket ID
  getRoomByUser(socketId: string): { roomId: string; room: Room } | null {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return { roomId, room };
  }

  // Remove room and notify the other user
  removeRoom(socketId: string): string | null {
    const result = this.getRoomByUser(socketId);
    if (!result) return null;

    const { roomId, room } = result;
    const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;

    // Notify the other user their partner left
    otherUser.socket.emit('partner-left', { roomId });

    // Cleanup
    this.rooms.delete(roomId);
    this.userToRoom.delete(room.user1.socket.id);
    this.userToRoom.delete(room.user2.socket.id);

    return roomId;
  }

  onOffer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    targetUser.socket.emit('offer', { sdp, roomId });
  }

  onAnswer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    targetUser.socket.emit('answer', { sdp, roomId });
  }

  onIceCandidate(roomId: string, candidate: any, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    targetUser.socket.emit('ice-candidate', { candidate });
  }
}