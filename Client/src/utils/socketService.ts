import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private userId: string | null = null;

  connect(userId: string): Socket {
    this.userId = userId;
    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: {
        userId: userId
      }
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Socket connected');
      
      // Notify server that user is online
      this.socket?.emit('user-online', userId);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('❌ Socket disconnected');
    });

    this.socket.on('user-status-change', (data: { userId: string; status: string; lastSeen: Date }) => {
      this.handleUserStatusChange(data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket && this.userId) {
      this.socket.emit('user-logout', this.userId);
      this.socket.disconnect();
      this.isConnected = false;
      this.userId = null;
    }
  }

  private handleUserStatusChange(data: { userId: string; status: string; lastSeen: Date }): void {
    // Update your global state or UI with user status
    console.log(`User ${data.userId} is now ${data.status}`);
    
    // You can dispatch to a global state manager here
    // For example, if using Redux or Zustand
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export default new SocketService();