import React, { useState, useRef, useEffect } from 'react';
import PeerJSChat from './PeerJSChat';
import { useWalkieTalkie } from '../contexts/WalkieTalkieContext';

const WalkieTalkieGlobal = () => {
  const { isVisible, roomId, playerName } = useWalkieTalkie();
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const popupRef = useRef(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('walkieTalkiePosition');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.warn('Failed to parse saved walkie talkie position');
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = (newPosition) => {
    try {
      localStorage.setItem('walkieTalkiePosition', JSON.stringify(newPosition));
    } catch (e) {
      console.warn('Failed to save walkie talkie position');
    }
  };

  const handleMouseDown = (e) => {
    // Only allow dragging from the header (blue bar)
    if (!e.target.closest('[data-drag-handle]')) return;
    if (e.target.closest('button, input, audio')) return; // Don't drag if clicking on interactive elements
    
    setIsDragging(true);
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newPosition = {
      x: e.clientX - dragOffset.dx,
      y: e.clientY - dragOffset.dy
    };
    
    // Keep popup within viewport bounds
    const maxX = window.innerWidth - 320; // 320px is approximate popup width
    const maxY = window.innerHeight - 200; // 200px is approximate popup height
    
    newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
    newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));
    
    setPosition(newPosition);
    savePosition(newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isVisible || !roomId || !playerName) return null;

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        width: isMinimized ? 'auto' : '320px',
        minWidth: isMinimized ? '120px' : '320px',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Header with drag handle and controls */}
        <div
          data-drag-handle
          onMouseDown={handleMouseDown}
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📻</span>
            <span style={{ 
              color: 'white', 
              fontWeight: 'bold', 
              fontSize: '14px',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              Walkie-Talkie
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              title={isMinimized ? 'Agrandir' : 'Réduire'}
            >
              {isMinimized ? '⬆️' : '⬇️'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '0', 
          visibility: isMinimized ? 'hidden' : 'visible',
          height: isMinimized ? '0' : 'auto',
          overflow: 'hidden'
        }}>
          <PeerJSChat 
            roomId={roomId} 
            playerName={playerName} 
          />
        </div>

        {/* Minimized state indicator */}
        {isMinimized && (
          <div
            style={{
              padding: '8px 12px',
              color: 'white',
              fontSize: '12px',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.1)'
            }}
          >
            📻 Walkie-Talkie
          </div>
        )}
      </div>
    </div>
  );
};

export default WalkieTalkieGlobal;
