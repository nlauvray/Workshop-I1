import React, { createContext, useContext, useState } from 'react';

const WalkieTalkieContext = createContext();

export const useWalkieTalkie = () => {
  const context = useContext(WalkieTalkieContext);
  if (!context) {
    throw new Error('useWalkieTalkie must be used within a WalkieTalkieProvider');
  }
  return context;
};

export const WalkieTalkieProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const openWalkieTalkie = (newRoomId, newPlayerName) => {
    setRoomId(newRoomId);
    setPlayerName(newPlayerName);
    setIsVisible(true);
  };

  const closeWalkieTalkie = () => {
    setIsVisible(false);
  };

  const value = {
    isVisible,
    roomId,
    playerName,
    openWalkieTalkie,
    closeWalkieTalkie
  };

  return (
    <WalkieTalkieContext.Provider value={value}>
      {children}
    </WalkieTalkieContext.Provider>
  );
};