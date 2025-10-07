import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const Lobby = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState(
    localStorage.getItem('playerName') || ''
  );
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState({});
  const [mode, setMode] = useState('solo'); // 'solo' | 'multi'
  const [gameType, setGameType] = useState('drone'); // 'drone' | 'desktop' | 'officeGame'
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('playerName', playerName);
  }, [playerName]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/rooms`);
        setRooms(res.data || {});
      } catch (e) {
        // ignore lobby polling errors
      }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 2000);
    return () => clearInterval(interval);
  }, []);

  const confirmJoin = async () => {
    const code = roomId.trim();
    if (!code || !playerName.trim()) return;
    setError('');
    setIsChecking(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/rooms/${code}`);
      if ((res.data && res.data.players) >= 2) {
        setError('Salle complète');
        return;
      }
      const names = (res.data && res.data.names) || [];
      if (names.map(n => String(n).toLowerCase()).includes(playerName.trim().toLowerCase())) {
        setError('Ce pseudonyme est déjà utilisé dans cette salle.');
      } else {
        const type = (res.data && res.data.game_type) || 'drone';
        if (type === 'desktop') navigate(`/desktop/${code}`);
        else if (type === 'officeGame' || type === 'screen2') navigate(`/officeGame/${code}`);
        else navigate(`/game/${code}`);
      }
    } catch (e) {
      setError("Cette salle n'existe plus. Choisissez-en une autre.");
    } finally {
      setIsChecking(false);
    }
  };

  const createRoom = async () => {
    try {
      const url = mode === 'solo' ? `${API_BASE_URL}/rooms/private` : `${API_BASE_URL}/rooms`;
      const response = await axios.post(url, { game_type: gameType });
      const id = response.data.room_id;
      if (gameType === 'desktop') navigate(`/desktop/${id}`);
      else if (gameType === 'officeGame') navigate(`/officeGame/${id}`);
      else navigate(`/game/${id}`);
    } catch (error) {
      console.error('Erreur lors de la création de la salle:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      confirmJoin();
    }
  };

  return (
    <div className="join-page">
      <div className="hero fade-in">
        <h1 className="hero-title">🎮 ESCAPE TECH - Mission IA Dysfonctionnelle</h1>
        <p className="hero-subtitle">Coopération obligatoire - 2 joueurs</p>
      </div>

      <div className="panel fade-in">
        <h2 className="panel-title">Choisir le mode</h2>
        <div className="action-row" style={{marginBottom: 12}}>
          <button className={`btn ${mode === 'solo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('solo')}>1 joueur</button>
          <button className={`btn ${mode === 'multi' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('multi')}>2 joueurs</button>
        </div>
        <h2 className="panel-title">Sélection du jeu</h2>
        <div className="action-row" style={{marginBottom: 12}}>
          <button className={`btn ${gameType === 'drone' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGameType('drone')}>Drone</button>
          <button className={`btn ${gameType === 'desktop' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGameType('desktop')}>Desktop</button>
          <button className={`btn ${gameType === 'officeGame' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGameType('officeGame')}>OfficeGame</button>
        </div>
        <h2 className="panel-title">Créer une partie {mode === 'solo' ? 'solo' : '2 joueurs'} · {gameType === 'desktop' ? 'Desktop' : gameType === 'officeGame' ? 'OfficeGame' : 'Drone'}</h2>
        <div className="form-group">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Votre pseudonyme"
            className="input"
          />
          <button onClick={createRoom} disabled={!playerName.trim()} className="btn btn-secondary">Créer une nouvelle partie</button>
          {!playerName.trim() && <div className="hint-text">Entrez un pseudonyme pour créer une partie</div>}
        </div>
      </div>

      {mode === 'multi' && Object.keys(rooms).length > 0 && (
        <div className="panel fade-in" style={{ marginTop: 16 }}>
          <h2 className="panel-title">Rejoindre une salle</h2>
          <div className="rooms">
            {Object.entries(rooms).map(([id, info]) => (
              <button
                key={id}
                className={`room-card ${roomId === id ? 'selected' : ''}`}
                onClick={() => {
                  if ((info.players || 0) >= 2) {
                    setError('Salle complète');
                    setRoomId('');
                    return;
                  }
                  setError('');
                  setRoomId(id);
                }}
              >
                <div className="room-id">{id}</div>
                <div className="room-sub">
                  {info.players} joueur{info.players > 1 ? 's' : ''} · {info.game_started ? 'En cours' : 'En attente'}
                </div>
              </button>
            ))}
          </div>
          {roomId && (
            <div className="form-group" style={{marginTop: 12}}>
              <div className="hint-text">Salle sélectionnée: {roomId}</div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre pseudonyme"
                className="input"
              />
              <button
                onClick={confirmJoin}
                disabled={!playerName.trim() || isChecking}
                className="btn btn-primary"
              >
                {isChecking ? 'Vérification...' : 'Rejoindre cette salle'}
              </button>
              {error && <div className="error-text">{error}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Lobby;
