import React, { useEffect, useMemo, useRef, useState } from 'react';
import bureauSalle2 from '../assets/bureauSalle2.png';
// Hotspot images
import icnMap from '../assets/Salle2Map.png';
import icnLivreBleu from '../assets/Salle2LivreBleu.png';
import icnLivreVert from '../assets/Salle2LivreVert.png';
import icnLivreRouge from '../assets/Salle2LivreRouge.png';
import icnLivreBureau from '../assets/Salle2LivreBureau.png';
import icnPage from '../assets/Salle2PageMdp.png';
import icnCoffre from '../assets/Salle2Coffre.png';
import europeMap from '../assets/MapEpingle.png';

interface Salle2Props {
  session: { mode: 'create' | 'join'; code: string; pseudo: string };
  onNext: () => void;
}

type BookType = 'bleu' | 'vert' | 'rouge' | 'bureau';
type Popup = null | 'j1' | 'j2' | 'book' | 'page' | 'coffre' | 'carte';

const Salle2Createur: React.FC<Salle2Props> = ({ session, onNext }) => {
  const [popup, setPopup] = useState<Popup>(null);
  const [hintFound, setHintFound] = useState(false);
  const [encryptedSeen, setEncryptedSeen] = useState(false);
  const [safeCode, setSafeCode] = useState('');
  const [usbFound, setUsbFound] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);

  const SAFE_PIN = '5279'; // code à 4 chiffres pour le coffre

  // Référence du conteneur pour calculer la zone affichée de l'image (contain)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageNatural, setImageNatural] = useState<{ w: number; h: number } | null>(null);
  const [bgRect, setBgRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Charger l'image pour connaître son ratio naturel
  useEffect(() => {
    const img = new Image();
    img.src = bureauSalle2;
    img.onload = () => setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Recalcul de la zone image à chaque resize
  useEffect(() => {
    function computeRect() {
      if (!containerRef.current || !imageNatural) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const rCont = cw / ch;
      const rImg = imageNatural.w / imageNatural.h;
      if (rCont > rImg) {
        // bande à gauche/droite
        const height = ch;
        const width = height * rImg;
        const left = (cw - width) / 2;
        setBgRect({ left, top: 0, width, height });
      } else {
        // bande en haut/bas
        const width = cw;
        const height = width / rImg;
        const top = (ch - height) / 2;
        setBgRect({ left: 0, top, width, height });
      }
    }
    computeRect();
    window.addEventListener('resize', computeRect);
    return () => window.removeEventListener('resize', computeRect);
  }, [imageNatural]);

  const bgStyle = useMemo<React.CSSProperties>(() => ({
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    backgroundColor: '#000',
    backgroundImage: `url(${bureauSalle2})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundAttachment: 'fixed',
    position: 'relative',
  }), []);

  return (
    <div ref={containerRef} className="salle2-container" style={bgStyle}>
      {/* Bandeau info discret */}
      <div style={{ position: 'absolute', top: 8, left: 12, color: '#fff', textShadow: '0 1px 2px #000' }}>
        <h2 style={{ margin: 0 }}>Salle 2 : Le Créateur</h2>
        <small>Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {session.code || '(auto)'} | Pseudo : {session.pseudo}</small>
      </div>

      {/* Hotspots cliquables positionnés sur le décor */}
      <div style={hotspotsLayer(bgRect)}>
        {/* Carte de l'Europe */}
        <button style={{ ...hotspotImgBtn, ...posMap }} onClick={() => setPopup('carte')} title="Carte de l'Europe">
          <img src={icnMap} alt="Carte" style={hotspotImg} />
        </button>
        {/* Livres étagère: bleu, vert, rouge */}
        <button style={{ ...hotspotImgBtn, ...posLivreBleu }} onClick={() => { setSelectedBook('bleu'); setPopup('book'); }} title="Livre bleu">
          <img src={icnLivreBleu} alt="Livre bleu" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreVert }} onClick={() => { setSelectedBook('vert'); setPopup('book'); }} title="Livre vert">
          <img src={icnLivreVert} alt="Livre vert" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreRouge }} onClick={() => { setSelectedBook('rouge'); setPopup('book'); }} title="Livre rouge">
          <img src={icnLivreRouge} alt="Livre rouge" style={hotspotImg} />
        </button>
        {/* Livre sur le bureau */}
        <button style={{ ...hotspotImgBtn, ...posLivreBureau }} onClick={() => { setSelectedBook('bureau'); setPopup('book'); }} title="Livre sur le bureau">
          <img src={icnLivreBureau} alt="Livre sur le bureau" style={hotspotImg} />
        </button>
        {/* Page mot de passe */}
        <button style={{ ...hotspotImgBtn, ...posPage }} onClick={() => { setEncryptedSeen(true); setPopup('page'); }} title="Page chiffrée">
          <img src={icnPage} alt="Page" style={hotspotImg} />
        </button>
        {/* Coffre-fort */}
        <button style={{ ...hotspotImgBtn, ...posCoffre }} onClick={() => setPopup('coffre')} title="Coffre-fort">
          <img src={icnCoffre} alt="Coffre" style={hotspotImg} />
        </button>
      </div>

      {/* Bandeau validation clé USB */}
      {usbFound && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#000a', color: '#fff', padding: 12, borderRadius: 8 }}>
          Clé USB récupérée ! Vous pouvez continuer.
          <div>
            <button onClick={onNext} style={{ marginTop: 8 }}>Passer à la salle suivante</button>
          </div>
        </div>
      )}

      {/* Popups */}
      {popup && (
        <div style={overlayStyle} onClick={() => setPopup(null)}>
          <div
            style={popup === 'carte'
              ? { ...popupStyle, background: 'transparent', padding: 0, borderRadius: 0, boxShadow: 'none', minWidth: 0 }
              : popupStyle}
            onClick={(e) => e.stopPropagation()}>
            {popup === 'book' && (
              <OpenBook
                book={selectedBook}
                onFoundHint={() => setHintFound(true)}
              />
            )}
            {popup === 'page' && (
              <>
                <h3>Page avec mot de passe chiffré</h3>
                <p style={{ fontFamily: 'monospace' }}>Texte: GFZ JY XZC FQ — indice requis.</p>
                <p style={{ color: hintFound ? 'green' : '#999' }}>
                  {hintFound
                    ? 'Indice confirmé: utiliser Vigenère pour retrouver le PIN du coffre.'
                    : 'Trouve le bon livre pour savoir comment le décrypter.'}
                </p>
              </>
            )}
            {popup === 'carte' && (
              <img
                src={europeMap}
                alt="Carte de l'Europe"
                style={{
                  display: 'block',
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px #0006',
                }}
              />
            )}
            {popup === 'coffre' && (
              <SafePad
                value={safeCode}
                onChange={setSafeCode}
                onValidate={() => {
                  if (safeCode === SAFE_PIN && hintFound && encryptedSeen) setUsbFound(true);
                }}
                disabled={usbFound}
                success={usbFound}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#0008',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const popupStyle: React.CSSProperties = {
  background: '#fff',
  padding: 24,
  borderRadius: 12,
  minWidth: 340,
  boxShadow: '0 8px 32px #0006',
  color: '#111',
};

// (supprimé) ancien style de boutons de choix

// Hotspots layer and buttons positioned in pourcentages (par-dessus l'image de fond)
const hotspotsLayer = (bgRect: { left: number; top: number; width: number; height: number } | null): React.CSSProperties => ({
  position: 'absolute',
  left: bgRect ? bgRect.left : 0,
  top: bgRect ? bgRect.top : 0,
  width: bgRect ? bgRect.width : '100%',
  height: bgRect ? bgRect.height : '100%',
  pointerEvents: 'none',
});

const hotspotImgBtn: React.CSSProperties = {
  position: 'absolute',
  // taille par défaut, override par hotspot via style...width
  width: '6%',
  height: 'auto',
  minWidth: 0,
  minHeight: 0,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  pointerEvents: 'auto',
  transform: 'translate(-50%, -50%)',
};

const hotspotImg: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
};

// Positions approximatives à ajuster selon le visuel
// Positions et largeurs par élément (centrées via transform)
const posMap: React.CSSProperties = { left: '22.5%', top: '25%', width: '27%' };
const posLivreBleu: React.CSSProperties = { left: '82%', top: '43.2%', width: '4.1%' };
const posLivreVert: React.CSSProperties = { left: '78.6%', top: '43.5%', width: '1.55%' };
const posLivreRouge: React.CSSProperties = { left: '77%', top: '43%', width: '1.53%' };
const posLivreBureau: React.CSSProperties = { left: '54.9%', top: '55.2%', width: '20%' };
const posPage: React.CSSProperties = { left: '29.6%', top: '60.8%', width: '13.5%' };
const posCoffre: React.CSSProperties = { left: '73.8%', top: '81.2%', width: '14%' };

export default Salle2Createur;

// --- Sous-composants ---

function OpenBook({ book, onFoundHint }: { book: BookType | null; onFoundHint: () => void }) {
  if (!book) return null;
  const titleMap: Record<BookType, string> = {
    bleu: 'Livre bleu — Chiffres et fréquences',
    vert: 'Livre vert — Méthodes modernes',
    rouge: 'Livre rouge — Codes classiques',
    bureau: 'Livre sur le bureau — IA et sécurité',
  };
  const textMap: Record<BookType, React.ReactNode> = {
    bleu: (
      <>
        <p>Analyse des fréquences et substitution: utile pour casser des codes simples, mais pas suffisant ici.</p>
      </>
    ),
    vert: (
      <>
        <p>Le chiffre de Vigenère utilise un mot-clé pour décaler les lettres.</p>
        <p>Indice: applique Vigenère sur la page chiffrée pour trouver le PIN du coffre.</p>
        <button onClick={onFoundHint}>Marquer l'indice comme trouvé</button>
      </>
    ),
    rouge: (
      <>
        <p>Code César, ROT13, et variantes — Trop simple pour ce cas.</p>
      </>
    ),
    bureau: (
      <>
        <p>Notes sur une IA concevant des drones autonomes. Mentions «clé», «port», «stockage».</p>
      </>
    ),
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h3>{titleMap[book]}</h3>
      <div style={{
        background: '#fefbf4',
        border: '1px solid #e0d7c2',
        borderRadius: 8,
        padding: 16,
        boxShadow: 'inset 0 0 24px #0001',
        color: '#111',
      }}>
        {textMap[book]}
      </div>
    </div>
  );
}

function SafePad({ value, onChange, onValidate, disabled, success }: {
  value: string;
  onChange: (v: string) => void;
  onValidate: () => void;
  disabled?: boolean;
  success?: boolean;
}) {
  const press = (d: string) => {
    if (disabled) return;
    if (value.length >= 4) return;
    onChange(value + d);
  };
  const clear = () => !disabled && onChange('');
  const back = () => !disabled && onChange(value.slice(0, -1));

  return (
    <div style={{ minWidth: 280 }}>
      <h3>Coffre-fort</h3>
      <p>Entrez un code à 4 chiffres.</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gap: 8,
        justifyContent: 'center',
      }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} disabled={disabled} style={padBtn}>{n}</button>
        ))}
        <button onClick={clear} disabled={disabled} style={padBtn}>C</button>
        <button onClick={() => press('0')} disabled={disabled} style={padBtn}>0</button>
        <button onClick={back} disabled={disabled} style={padBtn}>⌫</button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <code style={{ fontSize: 20, letterSpacing: 4 }}>{value.padEnd(4, '•')}</code>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, gap: 8 }}>
        <button onClick={onValidate} disabled={disabled || value.length !== 4}>Déverrouiller</button>
        <span style={{ color: success ? 'green' : '#999' }}>{success ? 'Ouvert ! Clé USB trouvée.' : ''}</span>
      </div>
    </div>
  );
}

const padBtn: React.CSSProperties = {
  width: 72,
  height: 56,
  fontSize: 20,
  borderRadius: 8,
  cursor: 'pointer',
};
