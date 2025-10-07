

import React, { useState, useEffect } from 'react';
import MenuMultijoueur from './components/MenuMultijoueur';
import Salle1Aeroport from './components/Salle1Aeroport';
import Salle2Createur from './components/Salle2Createur';
import Salle3Reseau from './components/Salle3Reseau';
import { createMultiplayerSession} from './lib/multiplayer';
import type { MultiplayerSession } from './lib/multiplayer';

type GameState = 'menu' | 'salle1' | 'salle2' | 'salle3' | 'fin';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [session, setSession] = useState<{mode: 'create' | 'join', code: string, pseudo: string} | null>(null);
  const [mpSession, setMpSession] = useState<MultiplayerSession | null>(null);

  const handleStart = (mode: 'create' | 'join', code: string, pseudo: string) => {
    setSession({ mode, code, pseudo });
    const mp = createMultiplayerSession(code || Math.random().toString(36).slice(2,8), pseudo, mode);
    setMpSession(mp);
    setGameState('salle1');
  };

  const handleNextSalle1 = () => setGameState('salle2');
  const handleNextSalle2 = () => setGameState('salle3');
  const handleNextSalle3 = () => setGameState('fin');

  // Nettoyage de la session multijoueur à la fin
  useEffect(() => {
    return () => {
      if (mpSession) mpSession.close();
    };
  }, [mpSession]);

  return (
    <div className="app-bg">
      {gameState === 'menu' && <MenuMultijoueur onStart={handleStart} />}
      {gameState === 'salle1' && session && (
        <Salle1Aeroport session={session} onNext={handleNextSalle1} />
      )}
      {gameState === 'salle2' && session && (
        <Salle2Createur session={session} onNext={handleNextSalle2} />
      )}
      {gameState === 'salle3' && session && (
        <Salle3Reseau session={session} onNext={handleNextSalle3} />
      )}
      {gameState === 'fin' && (
        <div className="fin-container">
          <h2>Bravo, vous avez terminé l'escape game !</h2>
          <button onClick={() => setGameState('menu')}>Retour au menu</button>
        </div>
      )}
    </div>
  );
}

export default App;
