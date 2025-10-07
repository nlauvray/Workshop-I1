import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { imageUrl } from '../config';

// Real assets from backend static directory: /images/assets
const BG_URL = imageUrl('/images/assets/bureauSalle2.png');
const ICONS = {
  map: imageUrl('/images/assets/Salle2Map.png'),
  livreBleu: imageUrl('/images/assets/Salle2LivreBleu.png'),
  livreVert: imageUrl('/images/assets/Salle2LivreVert.png'),
  livreRouge: imageUrl('/images/assets/Salle2LivreRouge.png'),
  livreBureau: imageUrl('/images/assets/Salle2LivreBureau.png'),
  page: imageUrl('/images/assets/Salle2PageMdp.png'),
  coffre: imageUrl('/images/assets/Salle2Coffre.png'),
  europeMap: imageUrl('/images/assets/MapEpingle.png'),
};

const SAFE_PIN = '5279';

const OfficeGame = () => {
  const navigate = useNavigate();
  const playerName = typeof window !== 'undefined'
    ? (localStorage.getItem('playerName') || 'Joueur')
    : 'Joueur';

  return (
    <Salle2Createur
      session={{ mode: 'create', code: '', pseudo: playerName }}
      onNext={() => navigate('/')}
    />
  );
};

// --- Main component (converted from TypeScript to JS) ---
const Salle2Createur = ({ session, onNext }) => {
  const [popup, setPopup] = useState(null); // null | 'j1' | 'j2' | 'book' | 'page' | 'coffre' | 'carte'
  const [hintFound, setHintFound] = useState(false);
  const [encryptedSeen, setEncryptedSeen] = useState(false);
  const [safeCode, setSafeCode] = useState('');
  const [usbFound, setUsbFound] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null); // 'bleu' | 'vert' | 'rouge' | 'bureau'

  const containerRef = useRef(null);
  const [imageNatural, setImageNatural] = useState(null); // { w, h }
  const [bgRect, setBgRect] = useState(null); // { left, top, width, height }

  // Load background image to get natural ratio
  useEffect(() => {
    const img = new Image();
    img.src = BG_URL;
    img.onload = () => setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Recompute displayed image rect on resize to match background-size: contain
  useEffect(() => {
    function computeRect() {
      if (!containerRef.current || !imageNatural) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const rCont = cw / ch;
      const rImg = imageNatural.w / imageNatural.h;
      if (rCont > rImg) {
        const height = ch;
        const width = height * rImg;
        const left = (cw - width) / 2;
        setBgRect({ left, top: 0, width, height });
      } else {
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

  const bgStyle = useMemo(() => ({
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    backgroundColor: '#000',
    backgroundImage: `url(${BG_URL})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundAttachment: 'fixed',
    position: 'relative',
  }), []);

  return (
    <div ref={containerRef} className="salle2-container" style={bgStyle}>
      <div style={{ position: 'absolute', top: 8, left: 12, color: '#fff', textShadow: '0 1px 2px #000' }}>
        <h2 style={{ margin: 0 }}>Salle 2 : Le Créateur</h2>
        <small>Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {session.code || '(local)'} | Pseudo : {session.pseudo}</small>
      </div>

      {/* Hotspots */}
      <div style={hotspotsLayer(bgRect)}>
        <button style={{ ...hotspotImgBtn, ...posMap }} onClick={() => setPopup('carte')} title="Carte de l'Europe">
          <img src={ICONS.map} alt="Carte" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreBleu }} onClick={() => { setSelectedBook('bleu'); setPopup('book'); }} title="Livre bleu">
          <img src={ICONS.livreBleu} alt="Livre bleu" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreVert }} onClick={() => { setSelectedBook('vert'); setPopup('book'); }} title="Livre vert">
          <img src={ICONS.livreVert} alt="Livre vert" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreRouge }} onClick={() => { setSelectedBook('rouge'); setPopup('book'); }} title="Livre rouge">
          <img src={ICONS.livreRouge} alt="Livre rouge" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreBureau }} onClick={() => { setSelectedBook('bureau'); setPopup('book'); }} title="Livre sur le bureau">
          <img src={ICONS.livreBureau} alt="Livre sur le bureau" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posPage }} onClick={() => { setEncryptedSeen(true); setPopup('page'); }} title="Page chiffrée">
          <img src={ICONS.page} alt="Page" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posCoffre }} onClick={() => setPopup('coffre')} title="Coffre-fort">
          <img src={ICONS.coffre} alt="Coffre" style={hotspotImg} />
        </button>
      </div>

      {usbFound && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#000a', color: '#fff', padding: 12, borderRadius: 8 }}>
          Clé USB récupérée ! Vous pouvez continuer.
          <div>
            <button onClick={onNext} style={{ marginTop: 8 }}>Passer à la salle suivante</button>
          </div>
        </div>
      )}

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
                src={ICONS.europeMap}
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

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: '#0008',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const popupStyle = {
  background: '#fff',
  padding: 24,
  borderRadius: 12,
  minWidth: 340,
  boxShadow: '0 8px 32px #0006',
  color: '#111',
};

// Hotspots layer and buttons positioned in percentages over the background image
const hotspotsLayer = (bgRect) => ({
  position: 'absolute',
  left: bgRect ? bgRect.left : 0,
  top: bgRect ? bgRect.top : 0,
  width: bgRect ? bgRect.width : '100%',
  height: bgRect ? bgRect.height : '100%',
  pointerEvents: 'none',
});

const hotspotImgBtn = {
  position: 'absolute',
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

const hotspotImg = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
};

// Approximate positions (may need visual adjustment based on background)
const posMap = { left: '22.5%', top: '25%', width: '27%' };
const posLivreBleu = { left: '82%', top: '43.2%', width: '4.1%' };
const posLivreVert = { left: '78.6%', top: '43.5%', width: '1.55%' };
const posLivreRouge = { left: '77%', top: '43%', width: '1.53%' };
const posLivreBureau = { left: '54.9%', top: '55.2%', width: '20%' };
const posPage = { left: '29.6%', top: '60.8%', width: '13.5%' };
const posCoffre = { left: '73.8%', top: '81.2%', width: '14%' };

export default OfficeGame;

// --- Subcomponents ---
function OpenBook({ book, onFoundHint }) {
  if (!book) return null;
  const titleMap = {
    bleu: 'Livre bleu — Chiffres et fréquences',
    vert: 'Livre vert — Méthodes modernes',
    rouge: 'Livre rouge — Codes classiques',
    bureau: 'Livre sur le bureau — IA et sécurité',
  };
  const textMap = {
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

function SafePad({ value, onChange, onValidate, disabled, success }) {
  const press = (d) => {
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

const padBtn = {
  width: 72,
  height: 56,
  fontSize: 20,
  borderRadius: 8,
  cursor: 'pointer',
};

