import React from 'react';

interface Salle2Props {
  session: { mode: 'create' | 'join'; code: string; pseudo: string };
  onNext: () => void;
}

const Salle2Createur: React.FC<Salle2Props> = ({ session, onNext }) => {
  return (
    <div className="salle2-container">
      <h2>Salle 2 : Le Créateur</h2>
      <p>Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {session.code || '(auto)'} | Pseudo : {session.pseudo}</p>
      {/* TODO: Ajout des objets et mécaniques de la salle 2 ici */}
      <button onClick={onNext} style={{marginTop: 32}}>Passer à la salle suivante</button>
    </div>
  );
};

export default Salle2Createur;
