import React, { useEffect, useMemo, useRef, useState } from 'react';
import { imageUrl } from '../config';

// Composant OfficeGameEmbed qui intègre le vrai officeGame
function OfficeGameEmbed({ roomId, playerName, onBack, onDesktop }) {
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
    img.src = imageUrl('/images/assets/bureauSalle2.png');
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
    backgroundImage: `url(${imageUrl('/images/assets/bureauSalle2.png')})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundAttachment: 'fixed',
    position: 'relative',
  }), []);

  return (
    <div ref={containerRef} className="salle2-container" style={bgStyle}>
      <div style={{ position: 'absolute', top: 8, left: 12, color: '#fff', textShadow: '0 1px 2px #000' }}>
        <h2 style={{ margin: 0 }}>🏢 ESCAPE TECH - Bureau</h2>
        <small>Salle 2 : Bureau | Code : {roomId} | Pseudo : {playerName}</small>
      </div>

      {/* Bouton retour */}
      <div style={{ position: 'absolute', top: 8, right: 12, display: 'flex', gap: 8 }}>
        <button 
          onClick={onBack}
          style={{
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ← Aéroport
        </button>
        <button 
          onClick={onDesktop}
          style={{
            padding: '8px 16px',
            background: 'rgba(16, 185, 129, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🖥️ Desktop
        </button>
      </div>

      {/* Hotspots */}
      <div style={hotspotsLayer(bgRect)}>
        <button style={{ ...hotspotImgBtn, ...posMap }} onClick={() => setPopup('carte')} title="Carte de l'Europe">
          <img src={imageUrl('/images/assets/Salle2Map.png')} alt="Carte" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreBleu }} onClick={() => { setSelectedBook('bleu'); setPopup('book'); }} title="Livre bleu">
          <img src={imageUrl('/images/assets/Salle2LivreBleu.png')} alt="Livre bleu" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreVert }} onClick={() => { setSelectedBook('vert'); setPopup('book'); }} title="Livre vert">
          <img src={imageUrl('/images/assets/Salle2LivreVert.png')} alt="Livre vert" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreRouge }} onClick={() => { setSelectedBook('rouge'); setPopup('book'); }} title="Livre rouge">
          <img src={imageUrl('/images/assets/Salle2LivreRouge.png')} alt="Livre rouge" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreBureau }} onClick={() => { setSelectedBook('bureau'); setPopup('book'); }} title="Livre sur le bureau">
          <img src={imageUrl('/images/assets/Salle2LivreBureau.png')} alt="Livre sur le bureau" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posPage }} onClick={() => { setEncryptedSeen(true); setPopup('page'); }} title="Page chiffrée">
          <img src={imageUrl('/images/assets/Salle2PageMdp.png')} alt="Page" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posCoffre }} onClick={() => setPopup('coffre')} title="Coffre-fort">
          <img src={imageUrl('/images/assets/Salle2Coffre.png')} alt="Coffre" style={hotspotImg} />
        </button>
      </div>

      {usbFound && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#000a', color: '#fff', padding: 12, borderRadius: 8 }}>
          Clé USB récupérée ! Vous pouvez continuer.
          <div>
            <button onClick={onDesktop} style={{ marginTop: 8 }}>Accéder au Desktop</button>
          </div>
        </div>
      )}

      {popup && (
        <div style={officeOverlayStyle} onClick={() => setPopup(null)}>
          <div style={officePopupStyle} onClick={(e) => e.stopPropagation()}>
            {popup === 'carte' && (
              <div>
                <h3>Carte de l'Europe</h3>
                <p>Une carte de l'Europe avec des épingles marquant différentes villes.</p>
                <img src={imageUrl('/images/assets/MapEpingle.png')} alt="Carte Europe" style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
            )}
            {popup === 'book' && (
              <OpenBook book={selectedBook} onFoundHint={() => setHintFound(true)} />
            )}
            {popup === 'page' && (
              <div>
                <h3>Page chiffrée</h3>
                <p>Une page avec du texte chiffré. Il faut trouver la clé pour la déchiffrer.</p>
                <img src={imageUrl('/images/assets/Salle2PageMdp.png')} alt="Page chiffrée" style={{ maxWidth: '100%', height: 'auto' }} />
                {hintFound && (
                  <div style={{ marginTop: 16, padding: 12, background: '#f0f8ff', borderRadius: 8 }}>
                    <strong>Indice trouvé :</strong> Utilisez Vigenère avec le mot-clé trouvé dans les livres.
                  </div>
                )}
              </div>
            )}
            {popup === 'coffre' && (
              <SafePad 
                value={safeCode} 
                onChange={setSafeCode} 
                onValidate={() => {
                  if (safeCode === '5279') {
                    setUsbFound(true);
                    setPopup(null);
                  }
                }}
                disabled={false}
                success={usbFound}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles et positions pour officeGame
const officeOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const officePopupStyle = {
  background: '#fff',
  padding: 24,
  borderRadius: 12,
  minWidth: 340,
  boxShadow: '0 8px 32px #0006',
  color: '#111',
};

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

// Positions des hotspots
const posMap = { left: '22.5%', top: '25%', width: '27%' };
const posLivreBleu = { left: '82%', top: '43.2%', width: '4.1%' };
const posLivreVert = { left: '78.6%', top: '43.5%', width: '1.55%' };
const posLivreRouge = { left: '77%', top: '43%', width: '1.53%' };
const posLivreBureau = { left: '54.9%', top: '55.2%', width: '20%' };
const posPage = { left: '29.6%', top: '60.8%', width: '13.5%' };
const posCoffre = { left: '73.8%', top: '81.2%', width: '14%' };

// Composants pour les livres et le coffre
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

export default OfficeGameEmbed;
