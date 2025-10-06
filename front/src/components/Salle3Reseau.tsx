import React from 'react';

interface Salle3Props {
  session: { mode: 'create' | 'join'; code: string; pseudo: string };
  onNext: () => void;
}

const Salle3Reseau: React.FC<Salle3Props> = ({ session, onNext }) => {
  return (
    <div className="salle3-container">
      <h2>Salle 3 : Le Réseau Fantôme</h2>
      <p>Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {session.code || '(auto)'} | Pseudo : {session.pseudo}</p>
      {/* TODO: Ajout des objets et mécaniques de la salle 3 ici */}
      <button onClick={onNext} style={{marginTop: 32}}>Fin de l'escape game</button>
    </div>
  );
};

export default Salle3Reseau;
