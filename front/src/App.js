import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
