import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import Game from './components/Game';
import DesktopGame from './components/DesktopGame';
import OfficeGame from './components/officeGame';
import AeroportGame from './components/AeroportGame';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        {/* Existing drone game */}
        <Route path="/game/:roomId" element={<Game />} />
        {/* New desktop game */}
        <Route path="/desktop/:roomId" element={<DesktopGame />} />
        {/* OfficeGame */}
        <Route path="/officeGame/:roomId" element={<OfficeGame />} />
        {/* Aeroport (Salle 1) */}
        <Route path="/aeroport/:roomId" element={<AeroportGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


