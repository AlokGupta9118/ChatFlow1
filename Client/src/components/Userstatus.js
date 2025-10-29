import React, { useState, useEffect } from 'react';
import socketService from '../utils/socketService';

const UserStatus = ({ userId, showText = true }) => {
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (socket) {
      const handleStatusChange = (data) => {
        if (data.userId === userId) {
          setStatus(data.status);
        }
      };

      socket.on('user-status-change', handleStatusChange);

      return () => {
        socket.off('user-status-change', handleStatusChange);
      };
    }
  }, [userId]);

  const getStatusColor = () => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'away': return '#FF9800';
      case 'offline': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="user-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div 
        className="status-dot" 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          transition: 'background-color 0.3s ease'
        }}
      />
      {showText && (
        <span className="status-text" style={{ 
          fontSize: '14px', 
          color: '#666',
          textTransform: 'capitalize'
        }}>
          {status}
        </span>
      )}
    </div>
  );
};

export default UserStatus;