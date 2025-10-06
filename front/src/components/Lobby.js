import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const Lobby = () => {
  const [rooms, setRooms] = useState({});
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des salles:', error);
    }
  };

  const createRoom = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rooms`);
      navigate(`/game/${response.data.room_id}`);
    } catch (error) {
      console.error('Erreur lors de la création de la salle:', error);
    }
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      navigate(`/game/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            🎮 Escape Game
          </h1>
          <p className="text-xl text-gray-300">
            Mode Multi-Joueurs - Détection de Drone
          </p>
          <div className="mt-3 inline-block bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-lg text-sm border border-yellow-400/40">
            Le créateur de la salle est toujours <strong>Joueur 1</strong>. Le participant est <strong>Joueur 2</strong>.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Créer une salle */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              🏠 Créer une salle
            </h2>
            <p className="text-gray-300 mb-6 text-center">
              Créez une nouvelle partie et invitez un ami à vous rejoindre
            </p>
            <button
              onClick={createRoom}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105"
            >
              Créer une nouvelle salle
            </button>
          </div>

          {/* Rejoindre une salle */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              🚪 Rejoindre une salle
            </h2>
            <p className="text-gray-300 mb-6 text-center">
              Entrez l'ID de la salle pour rejoindre une partie
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ID de la salle"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={joinRoom}
                disabled={!roomId.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105"
              >
                Rejoindre la salle
              </button>
            </div>
          </div>
        </div>

        {/* Salles disponibles */}
        {Object.keys(rooms).length > 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">
              Salles disponibles
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(rooms).map(([roomId, room]) => (
                <div
                  key={roomId}
                  className="bg-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/30 transition duration-300"
                  onClick={() => navigate(`/game/${roomId}`)}
                >
                  <div className="text-white font-bold text-lg">{roomId}</div>
                  <div className="text-gray-300">
                    {room.players} joueur{room.players > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-gray-400">
                    {room.game_started ? 'En cours' : 'En attente'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-2xl font-bold text-white mb-4 text-center">
            Comment jouer ?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl mb-2">1️⃣</div>
              <h4 className="text-lg font-bold text-white mb-2">Créer/Rejoindre</h4>
              <p className="text-gray-300">Un joueur crée une salle, l'autre la rejoint.</p>
              <p className="text-gray-400 text-sm mt-1">Créateur = Joueur 1 • Invité = Joueur 2</p>
            </div>
            <div>
              <div className="text-4xl mb-2">2️⃣</div>
              <h4 className="text-lg font-bold text-white mb-2">Détecter</h4>
              <p className="text-gray-300">
                Utilisez les différents modes de caméra pour trouver le drone
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">3️⃣</div>
              <h4 className="text-lg font-bold text-white mb-2">Gagner</h4>
              <p className="text-gray-300">
                Cliquez sur le drone en mode thermal pour marquer des points
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
