import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import AeroportGame from './components/AeroportGame';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Lobby est la page principale */}
        <Route path="/" element={<Lobby />} />
        {/* AeroportGame est le jeu principal coopératif */}
        <Route path="/aeroport/:roomId" element={<AeroportGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


