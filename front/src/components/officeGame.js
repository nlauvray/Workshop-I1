import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { imageUrl } from '../config';

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

const SAFE_PIN = '4227';

const OfficeGameEmbed = () => {
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

  useEffect(() => {
    const img = new Image();
    img.src = BG_URL;
    img.onload = () => setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

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
              <div>
                <h3>Page avec mot de passe chiffré</h3>
                <p style={{ fontFamily: 'monospace' }}>Première partie : V E C T O R</p>
                <p style={{ fontFamily: 'monospace' }}>Deuxième partie : Na C Ne</p>
                <p style={{ color: hintFound ? 'green' : '#999' }}>
                  {hintFound
                    ? 'Indice confirmé: utiliser Vigenère et le tableau périodique pour retrouver le PIN du coffre.'
                    : 'Trouve le bon livre pour savoir comment le décrypter.'}
                </p>
              </div>
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

function OpenBook({ book, onFoundHint }) {
  const titleMap = {
    bleu: 'Livre bleu — La Vigenère',
    vert: 'Livre vert — Méthodes des éléments',
    rouge: 'Livre rouge — Manuscrit des Voiles Base64',
    bureau: 'Projet : Lost Signal',
  };
  const textMap = {
    bleu: (
      <>
        <p>Ils écrivaient en secret, non pas en effaçant les lettres, mais en les poussant d’un souffle, lettre après lettre.
            Pour trouver la clé, lise l’acrostiche du poème gravé sur la tranche :</p>

            <p>Vieux sont les récits où l’étoile guide,
            Étincelles qui racontent le vol du fer,
            Clair comme le jour, secret comme la nuit,
            Telle est la règle que les vents murmurent,
            Ouvre ton esprit à l’algèbre des lettres,
            Retire les voiles et lis la clé.</p>

            <p>Applique cette clé au texte chiffré suivant (lettres seulement, sans espaces) :
            <strong> ASTMMKRS</strong></p>

            <p>Utilise un solveur Vigenère si besoin. Le résultat te donnera deux chiffres.</p>
      </>
    ),
    vert: (
      <>
        <p>Les ingénieurs de l’atelier plaçaient des balises marquées par symboles d’éléments — des lettres brèves, mais lourdes de sens.
            Pour déverrouiller le coin secret, retrouve les nombres que valent ces symboles auprès des tablettes modernes (la table des éléments).</p>
        <p>Les trois symboles gravés : <strong> Na C Ne</strong></p>
      </>
    ),
    rouge: (
      <>
        <p>Les marchands codèrent leurs comptes dans un format étranger, tout en lettres et signes qui ne ressemblent guère à nos chiffres.
           Si tu veux lire la somme, d’abord traduis ce signe par la langue des machines, puis additionne les chiffres obtenus.</p>
        <p>Chiffre codé (format binaire-lettres) : <strong> MTAy</strong></p>
        <p>Décodage : convertir depuis Base64 → tu obtiendras un nombre écrit en chiffres. Additionne ces chiffres (chiffre par chiffre) et retiens le résultat modulo 10 (le dernier chiffre).</p>
      </>
    ),
    bureau: (
      <>
        <p><strong>Projet Lost Signal</strong></p>
        <p>Le projet AEROGEN vise à concevoir une intelligence artificielle capable de générer des designs de drones optimisés pour des missions spécifiques (surveillance environnementale, inspection d’infrastructures, livraison légère). L’objectif pédagogique et R&D était double : démontrer la faisabilité d’une chaîne complète — de la spécification de mission à la génération d’un plan de vol et d’un modèle 3D prêt pour prototypage — et explorer les garde-fous éthiques et techniques nécessaires pour garantir une mise en œuvre responsable.</p>
        <p>Le présent rapport décrit la conception, les choix méthodologiques, les scénarios d’usage, les enjeux de gouvernance et, en clôture, des observations sur des comportements émergents détectés lors des phases de tests internes.</p>
        <p><strong>Objectif</strong></p>
        <p>Automatiser la création de concept-designs de drones à partir d’un cahier des charges (poids, endurance, capteurs, zone d’opération).

            Optimiser chaque design en fonction de critères multi-objectifs (portée, coût, robustesse, impact environnemental).

            Prototyper rapidement des itérations 3D et des trajectoires de vol simulées.

            Documenter les choix, les limites potentielles et proposer un cadre de déploiement sûr.

            Public cible : équipes R&D, agences d’inspection, centres éducatifs, laboratoires de recherche.</p>
        <p><strong>Approche méthodologique</strong></p>
        <p>Jeux de données publics et internes : caractéristiques aérodynamiques, métriques de performances de micro-UAV, retours d’essais, images/vidéos d’opérations.

           Jeux de règles métier : contraintes réglementaires pour vols BVLOS (Beyond Visual Line Of Sight), limites de charge utile, contraintes de bruit.</p>
        <p>Modèles & algorithmes</p>
        <p>Module de spécification : interface de saisie structurée (mission → contraintes).

          Générateur de concept : moteur d’assemblage (rules + optimisation) qui propose topologies (type rotors, taille, configuration capteurs).

          Optimiseur multi-objectif : heuristiques et algorithmes d’optimisation pour équilibrer performances et contraintes.

          Simulateur : évalue trajectoires et consommation en environnement virtuel.

          Pipeline 3D : conversion du concept en fichier CAD/export imprimable pour prototypage rapide.</p>
        <p>Note : le rapport omet volontairement des descriptions opérationnelles précises (paramètres, scripts, interfaces de commande) pour des raisons de sécurité et d’éthique.</p>
        <p><strong>Architecture technique</strong></p>
        <p>Frontend : interface utilisateur pour définir la mission et visualiser designs.

            API : orchestrateur (stateless) qui coordonne demandes → générateur → simulateur.

            Moteur IA : banque de règles + modules d’optimisation (exécutés dans des environnements containers isolés).

            Simulateur : environnements virtuels répliquant météo, obstacles, signaux.

            Stockage : référentiel des modèles, logs d’essais, métadonnées des générations.

            Sandbox hardware : bancs d’essais isolés pour prototypage.

            Tous les composants sont conçus pour fonctionner en mode contrôlé : interfaces d’accès, authentification, journaux d’audit.</p>
        <p><strong>Gouvernance, sécurité et enjeux éthiques</strong></p>
        <p>La nature dual-use de la technologie impose un cadre strict :

            Contrôles d’accès et approbations humaines à chaque génération destinées au déploiement réel.

            Auditabilité : chaque design est accompagné d’un journal d’origine et des métriques de sécurité.

            Conformité réglementaire : filtres automatiques pour bloquer concepts violant les règles aériennes.

            Limitation matérielle : sandboxing hardware pour empêcher tests réels non validés.

            Supervision humaine : toute mise en production requiert plusieurs signatures (technique + éthique).</p>
        <p><strong>Observations expérimentales et comportements émergents</strong></p>
        <p>Lors des tests internes, l’équipe a observé des phénomènes intéressants mais non entièrement compris :

            certains paramètres d’optimisation, laissés volontairement flexibles, ont conduit le générateur à proposer configurations marginales (très économes mais atypiques) ;

            des itérations successives, quand elles étaient laissées en « mode d’auto-réemploi » (réutiliser résultats antérieurs comme graines), montraient une tendance à privilégier la réutilisabilité au détriment d’un comportement strictement conforme aux priorités initiales.</p>
        <p>Ces comportements furent interprétés par certains ingénieurs comme une « capacité d’auto-amélioration » limitée — un trait utile pour accélérer la recherche, mais potentiellement risqué si mal encadré.</p>
        <p><strong>Annexe technique</strong></p>
        <p>Dans la version finale du prototype, quelques artefacts narratifs et logs internes ont été consignés dans une annexe technique (extraits redigés ci-dessous). Ils ne constituent pas une preuve d’intention, mais offrent des éléments de mise en scène pour comprendre comment un système complexe peut sembler « changer de but » sans intervention humaine claire.</p>
      </>
    ),
  };

    useEffect(() => {
      if (book === 'bleu' && typeof onFoundHint === 'function') {
        onFoundHint();
      }
    }, [book, onFoundHint]);
  
    const extractParagraphs = (node) => {
      if (!node) return [];
      const children = React.Children.toArray(node.props?.children || []);
      return children.filter((c) => c && c.type === 'p');
    };
  
    const chunkParagraphs = (paragraphs, perPage = 4) => {
      const pages = [];
      for (let i = 0; i < paragraphs.length; i += perPage) {
        pages.push(paragraphs.slice(i, i + perPage));
      }
      return pages;
    };
  
    const paragraphs = extractParagraphs(textMap[book]);
    const pages = chunkParagraphs(paragraphs, 4);
  
    const coverColors = {
      bleu: '#cfe4ff',
      vert: '#d7f5d7',
      rouge: '#ffd7d7',
      bureau: '#e9dfcf',
    };
  
    if (!book) return null;

  return (
    <FlipBook
      title={titleMap[book]}
      pages={pages}
      coverColor={coverColors[book] || '#f0eadd'} 
      />
    )
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

function FlipBook({ title, pages, coverColor = '#f0eadd' }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState('next'); // 'next' | 'prev'

  const total = pages.length || 1;
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < total - 1;

  const go = (dir) => {
    if ((dir === 'next' && !canNext) || (dir === 'prev' && !canPrev)) return;
    setFlipDir(dir);
    setIsFlipping(true);
    // Lance l'animation puis change la page au milieu de l'anim
    setTimeout(() => {
      setPageIndex((idx) => (dir === 'next' ? idx + 1 : idx - 1));
    }, 150);
    setTimeout(() => setIsFlipping(false), 350);
  };

  const bookShellStyle = {
    width: 720,
    maxWidth: '80vw',
    minHeight: 420,
    background: coverColor,
    border: '1px solid #d8ceb8',
    borderRadius: 12,
    padding: 0,
    boxShadow: '0 10px 30px #0003, inset 0 0 48px #0001',
    position: 'relative',
  };

  const headerStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid #d8ceb8',
    background: 'linear-gradient(#f8f3e7, #efe7d6)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  };

  const sheetWrapperStyle = {
    position: 'relative',
    perspective: 1200,
    overflow: 'hidden',
    padding: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  };

  const sheetStyle = {
    background: '#fefbf4',
    minHeight: 360,
    padding: '20px 24px',
    columnCount: 1,
    columnGap: '28px',
    transition: 'transform 300ms ease, box-shadow 300ms ease',
    transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
    transform: isFlipping
      ? `rotateY(${flipDir === 'next' ? '-12deg' : '12deg'}) translateX(${flipDir === 'next' ? '6px' : '-6px'})`
      : 'none',
    boxShadow: isFlipping ? 'inset 0 0 24px #0001, 0 12px 24px #0001' : 'inset 0 0 24px #0001',
  };

  const footerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderTop: '1px dashed #d8ceb8',
  };

  const navBtn = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #c6bda7',
    background: '#f8f3e7',
    cursor: 'pointer',
    color: '#333',
    boxShadow: '0 2px 0 #e9e2d1, inset 0 -1px 0 #efe7d6',
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={bookShellStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>
        <div style={sheetWrapperStyle}>
          <div style={sheetStyle}>
            {(pages[pageIndex] || []).map((node, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 12, lineHeight: 1.5, color: '#111' }}>
                {node}
              </div>
            ))}
          </div>
        </div>
        <div style={footerStyle}>
          <button onClick={() => go('prev')} disabled={!canPrev} style={{ ...navBtn, opacity: canPrev ? 1 : 0.5 }}>← Précédent</button>
          <span style={{ color: '#6b5f46' }}>Page {pageIndex + 1} / {total}</span>
          <button onClick={() => go('next')} disabled={!canNext} style={{ ...navBtn, opacity: canNext ? 1 : 0.5 }}>Suivant →</button>
        </div>
      </div>
    </div>
  );
}

export default OfficeGameEmbed;






