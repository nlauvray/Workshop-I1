import React, { useState } from 'react';

interface MenuProps {
  onStart: (mode: 'create' | 'join', code: string, pseudo: string) => void;
}

const MenuMultijoueur: React.FC<MenuProps> = ({ onStart }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [code, setCode] = useState('');
  const [pseudo, setPseudo] = useState('');

  return (
    <div className="menu-container">
      <h1>Escape Game IA - Menu</h1>
      <div className="menu-section">
        <label>Pseudo :</label>
        <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Votre pseudo" />
      </div>
      <div className="menu-section">
        <button className={mode==='create' ? 'active' : ''} onClick={() => setMode('create')}>Créer une partie</button>
        <button className={mode==='join' ? 'active' : ''} onClick={() => setMode('join')}>Rejoindre une partie</button>
      </div>
      {mode === 'join' && (
        <div className="menu-section">
          <label>Code de partie :</label>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code..." />
        </div>
      )}
      <div className="menu-section">
        <button disabled={!pseudo || (mode==='join' && !code)} onClick={() => onStart(mode, code, pseudo)}>
          Démarrer
        </button>
      </div>
    </div>
  );
};

export default MenuMultijoueur;
