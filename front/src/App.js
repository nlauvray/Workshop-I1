import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import DesktopGame from './components/DesktopGame';
import OfficeGame from './components/officeGame';
import AeroportGame from './components/AeroportGame';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Lobby est la page principale */}
        <Route path="/" element={<Lobby />} />
        {/* AeroportGame est le jeu principal coopératif */}
        <Route path="/aeroport/:roomId" element={<AeroportGame />} />
        {/* Autres salles (optionnelles) */}
        <Route path="/desktop/:roomId" element={<DesktopGame />} />
        <Route path="/officeGame/:roomId" element={<OfficeGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


