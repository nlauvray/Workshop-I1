import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import Game from './components/Game';
import DesktopGame from './components/DesktopGame';
import OfficeGame from './components/officeGame';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


