import React, { useEffect, useState } from 'react';
import { imageUrl } from '../config';
import WalkieTalkieGlobal from './WalkieTalkieGlobal';
import { WalkieTalkieProvider } from '../contexts/WalkieTalkieContext';

function DesktopGameEmbedContent({ roomId, playerName, onBack }) {
  const [isConnected, setIsConnected] = useState(true);
  const [folderOpen, setFolderOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [usbOpen, setUsbOpen] = useState(false);
  const notesKey = `notes_${roomId}`;
  const [notesContent, setNotesContent] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return sessionStorage.getItem(notesKey) || ''; } catch { return ''; }
  });
  const [folderPos, setFolderPos] = useState({ x: 140, y: 110 });
  const [notesPos, setNotesPos] = useState({ x: 220, y: 80 });
  const [usbPos, setUsbPos] = useState({ x: 260, y: 140 });
  const [dragTarget, setDragTarget] = useState(null); 
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [wallpaper, setWallpaper] = useState(imageUrl('/images/os-x-mountain-lion-3840x2160-24066.jpg'));

  // USB – contenu et sécurité
  const USB_FOLDER_PIN = 'STOP';
  const [securedUnlocked, setSecuredUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedUsbItem, setSelectedUsbItem] = useState(null); 
  const [alertActive, setAlertActive] = useState(false);
  const [alertTime, setAlertTime] = useState(30);
  const [alarmAudio, setAlarmAudio] = useState(null);

  const usbItems = [
    { id: 'email1', type: 'file', name: 'Email 1' },
    { id: 'email2', type: 'file', name: 'Email 2' },
    { id: 'email3_fake', type: 'file', name: 'Email 3' },
    { id: 'email4_fake', type: 'file', name: 'Email 4' },
    { id: 'log1', type: 'file', name: 'Log 1' },
    { id: 'log2', type: 'file', name: 'Log 2' },
    { id: 'secured', type: 'folder_secured', name: 'Données sécurisées' },
  ];

  const audioMap = {
    secured: [
      { src: imageUrl('/images/assets/OrganisationMessage1.mp3'), title: 'Organisation 1', speaker: 'Organisation' },
      { src: imageUrl('/images/assets/OrganisationMessage2.mp3'), title: 'Organisation 2', speaker: 'Organisation' },
      { src: imageUrl('/images/assets/OrganisationMessage3.mp3'), title: 'Organisation 3', speaker: 'Organisation' },
      { src: imageUrl('/images/assets/OrganisationMessage4.mp3'), title: 'Organisation 4', speaker: 'Organisation' },
      { src: imageUrl('/images/assets/FinMission.mp3'), title: 'Fin de mission', speaker: 'Système' },
    ],
  };

  const renderVoices = (key) => {
    const voices = audioMap[key] || [];
    if (!voices.length) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Messages vocaux</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {voices.map((v, idx) => (
            <div key={idx} style={{ border: '1px solid #ececec', borderRadius: 8, padding: 8, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>
                {v.title} — <span style={{ color: '#6b7280' }}>{v.speaker}</span>
              </div>
              <audio controls preload="none" style={{ width: '100%' }}>
                <source src={v.src} type="audio/mpeg" />
              </audio>
            </div>
          ))}
        </div>

        {/* Bouton alerte */}
        <button
          onClick={() => setAlertActive(true)}
          style={{
            marginTop: 12,
            width: 40,
            height: 40,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#ff4d4d',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: 18,
          }}
          title="Lancer alerte"
        >
          ✖
        </button>

        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Placez vos fichiers audio dans /public/audio/ (mp3).</div>
      </div>
    );
  };

  useEffect(() => {
    if (!alertActive) return;
    if (alertTime <= 0) return;

    const timer = setTimeout(() => setAlertTime(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [alertActive, alertTime]);

  useEffect(() => {
    if (alertActive) {
      const alarm = new Audio(imageUrl('/images/assets/DebutMission.mp3'));
      alarm.loop = true;
      alarm.volume = 0.6;
      alarm.play().catch(() => {});
      setAlarmAudio(alarm);
    } else {
      if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
      }
    }
  }, [alertActive]);

  useEffect(() => {
    if (!alertActive || alertTime <= 0) return;

    const timer = setTimeout(() => setAlertTime(prev => prev - 1), 1000);

    if (alertTime === 0 && alarmAudio) {
      alarmAudio.pause();
    }

    return () => clearTimeout(timer);
  }, [alertActive, alertTime]);

  const renderUsbFileContent = (itemId) => {
    const boxStyle = { background: '#fafafa', border: '1px solid #ececec', borderRadius: 8, padding: 12, color: '#111', minHeight: 180 };
    const preStyle = { whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, lineHeight: 1.5, margin: 0 };
    if (itemId === 'email1') {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Email 1 - Alerte Système</div>
          <div style={boxStyle}>
            <pre style={preStyle}>{`DE: security@neuralsky-systems.com
              À: dev-team@neuralsky-systems.com
              DATE: 07/10/2025 - 14:23
              OBJET: [URGENT] Anomalie détectée - Drone NS-7744

              Bonjour l'équipe,

              Notre système de surveillance a détecté une activité inhabituelle 
              sur le drone NS-7744. Il semble avoir quitté sa zone de patrouille 
              assignée sans autorisation.

              Dernier contact: Aéroport CDG - Terminal 2
              L'IA de contrôle PHANTOM ne répond plus aux commandes manuelles.

              ⚠️ Statut: STOP requis immédiatement
              Drones infectés détectés: 3

              Priorité: CRITIQUE

              — Département Sécurité`}</pre>
          </div>
        </div>
      );
    }
    if (itemId === 'email2') {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Email 2 - Message du développeur</div>
          <div style={boxStyle}>
            <pre style={preStyle}>{`DE: marc.dubois@neuralsky-systems.com
              À: security@neuralsky-systems.com
              DATE: 07/10/2025 - 15:01
              OBJET: RE: Code d'arrêt d'urgence

              URGENT - J'ai trouvé le code d'arrêt de PHANTOM !

              Le code fait 4 LETTRES et forme un mot en rapport avec la mission.
              Cherchez des MOTS en MAJUSCULES dans les emails et logs.

              ⚠️ IMPORTANT: Les deux agents doivent entrer le code 
              SIMULTANÉMENT pour validation. C'est une sécurité double.

              Serveur central compromis: 192.168.4.107

              Bonne chance,
              Marc`}</pre>
          </div>
        </div>
      );
    }
    if (itemId === 'email3_fake') {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Email 3 - FAUX (pour induire en erreur)</div>
          <div style={boxStyle}>
            <pre style={preStyle}>{`DE: rh@neuralsky-systems.com
              À: all@neuralsky-systems.com
              DATE: 07/10/2025 - 10:30
              OBJET: Rappel - Formation sécurité obligatoire

              Bonjour à tous,

              Je vous rappelle que la formation CYBER sécurité est obligatoire 
              pour tous les employés ce vendredi.

              Pensez à réserver votre créneau sur l'intranet avant jeudi.
              Le CODE d'accès à la salle de formation est: KILL

              Merci,
              Service RH`}</pre>
          </div>
        </div>
      );
    }
    if (itemId === 'email4_fake') {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Email 4 - FAUX (pour induire en erreur)</div>
          <div style={boxStyle}>
            <pre style={preStyle}>{`DE: admin@neuralsky-systems.com
              À: tech-team@neuralsky-systems.com
              DATE: 07/10/2025 - 09:15
              OBJET: Maintenance serveurs planifiée

              Bonjour,

              Une maintenance HALT des serveurs est prévue ce soir à 22h.
              Pensez à sauvegarder vos données.

              Durée estimée: 2 heures
              Mot de passe temporaire maintenance: FAIL

              Cordialement,
              IT Admin`}</pre>
          </div>
        </div>
      );
    }
    if (itemId === 'log1') {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Log 1 - Activité du drone</div>
          <div style={boxStyle}>
            <pre style={preStyle}>{`[2025-10-07 12:45:33] INFO - Système PHANTOM opérationnel
              [2025-10-07 13:12:08] INFO - Drones en vol: 247 unités
              [2025-10-07 14:23:47] ERROR - Drone NS-7744: Connection non autorisée
                                            Action requise: STOP propagation
              [2025-10-07 14:24:12] CRITICAL - Tentative de propagation détectée
              [2025-10-07 14:25:01] INFO - Alerte envoyée au département sécurité`}</pre>
          </div>
        </div>
      );
    }
    if (itemId === 'log2') {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Log 2 - Analyse réseau</div>
          <div style={boxStyle}>
            <pre style={preStyle}>{`[2025-10-07 15:01:45] CRITICAL - PHANTOM accède au serveur central
                                 IP: 192.168.4.107
            [2025-10-07 15:02:19] ERROR - Propagation en cours sur 3 drones
            [2025-10-07 15:03:42] CRITICAL - 89 drones ciblés pour infection
            [2025-10-07 15:04:28] ERROR - Code d'arrêt d'urgence requis: STOP
            [2025-10-07 15:05:01] CRITICAL - Analyse PHANTOM: 73% complétée`}</pre>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{selectedUsbItem?.name || 'Fichier'}</div>
        <div style={boxStyle}>Contenu du fichier. Vous pourrez remplacer ce texte par vos données.</div>
      </div>
    );
  };

  // Dock icons (no labels). Folder icon appears only when the folder window is open
  const DOCK_BASE_ICONS = [
    { id: 'notes', label: 'Notes', file: 'Notes-1.png', clickable: true },
    { id: 'mail', label: 'Mail', file: 'gmail_256x256x32.png', clickable: false },
    { id: 'calc', label: 'Calculatrice', file: 'calc 2_256x256x32.png', clickable: false },
    { id: 'clock', label: 'Horloge', file: 'clock 3_256x256x32.png', clickable: false },
    { id: 'trash', label: 'Corbeille', file: 'user-trash_256x256x32.png', clickable: false },
  ];
  const FOLDER_ICON = { id: 'folder', label: 'Dossier', file: 'folder_256x256x32.png', clickable: true };

  useEffect(() => {
    try { sessionStorage.setItem(notesKey, notesContent); } catch {}
  }, [notesContent, notesKey]);

  const startDrag = (target, e) => {
    e.preventDefault();
    const pos = target === 'folder' ? folderPos : (target === 'notes' ? notesPos : usbPos);
    setDragTarget(target);
    setDragOffset({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
  };

  useEffect(() => {
    if (!dragTarget) return;
    const onMove = (e) => {
      const newPos = { x: e.clientX - dragOffset.dx, y: e.clientY - dragOffset.dy };
      if (dragTarget === 'folder') setFolderPos(newPos);
      else if (dragTarget === 'notes') setNotesPos(newPos);
      else if (dragTarget === 'usb') setUsbPos(newPos);
    };
    const onUp = () => setDragTarget(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragTarget, dragOffset, folderPos, notesPos]);

  const handleIconClick = (icon) => {
    if (!icon.clickable) return;
    if (icon.id === 'folder') {
      setFolderOpen(true);
    } else if (icon.id === 'usb') {
      setUsbOpen(true);
      setSelectedUsbItem(null);
    } else if (icon.id === 'notes') {
      setNotesOpen(true);
    }
  };

  return (
    <div className="join-page">
      <div className="hero fade-in" style={{marginBottom: 12}}>
        <h1 className="hero-title">🖥️ Desktop</h1>
        <p className="hero-subtitle">Salle {roomId} · {isConnected ? 'Connecté' : 'Déconnecté'}</p>
      </div>

      <div className="panel fade-in" style={{width: '100%', maxWidth: 920}}>
        <div style={{display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center'}}>
          <div className="hint-text">{playerName}</div>
          <button onClick={onBack} className="btn btn-secondary">← Retour au bureau</button>
        </div>

        <div className="mac-desktop" style={{
          width: '100%',
          height: 520,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {/* Alert overlay */}
          {alertActive && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 28,
                textShadow: '2px 2px 8px #000',
                animation: 'flashRed 1s infinite',
                background: 'rgba(255,0,0,0.3)',
              }}
            >
              🚨 ALERTE EN COURS 🚨
              <div style={{ marginTop: 8, fontSize: 22 }}>
                Temps restant : {alertTime}s
              </div>
            </div>
          )}
          {/* Top bar */}
          <div className="mac-menubar" style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 28,
            background: 'rgba(20,20,22,0.55)', color: 'white', display: 'flex', alignItems: 'center', padding: '0 12px',
            backdropFilter: 'saturate(160%) blur(10px)'
          }}>
            <div style={{fontWeight: 700, fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', fontSize: 20, lineHeight: '28px'}}>
              &#63743;
            </div>
            <div style={{marginLeft: 12, fontSize: 12, opacity: 0.85}}>Finder</div>
          </div>

          {/* USB icon on desktop (no label, no rectangle) */}
          <div style={{ position: 'absolute', top: 46, right: 18 }}>
            <button
              onClick={() => handleIconClick({ id: 'usb', clickable: true })}
              title="USB"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={imageUrl('/images/icons/usb.png')}
                alt="USB"
                style={{ width: 48, height: 48, imageRendering: 'crisp-edges' }}
              />
            </button>
          </div>

          {/* Notes icon is only in the Dock (not on desktop) */}

          {/* Dock (navbar) at bottom with icons only */}
          <div className="mac-dock" style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 14,
            display: 'flex', alignItems: 'flex-end', gap: 12, padding: '8px 12px',
            background: 'rgba(20,20,22,0.45)', borderRadius: 16,
            backdropFilter: 'saturate(160%) blur(8px)', border: '1px solid rgba(255,255,255,0.25)'
          }}>
            {(folderOpen ? [...DOCK_BASE_ICONS, FOLDER_ICON] : DOCK_BASE_ICONS).map(icon => (
              <button
                key={icon.id}
                className="dock-item"
                onClick={() => handleIconClick(icon)}
                style={{ background: 'transparent', border: 'none', cursor: icon.clickable ? 'pointer' : 'default', padding: 0 }}
                disabled={!icon.clickable}
                title={icon.clickable ? icon.label : undefined}
              >
                <img
                  src={imageUrl(`/images/${icon.file.startsWith('icons/') ? icon.file : 'icons/' + icon.file}`)}
                  alt={icon.label}
                  style={{ width: 44, height: 44, imageRendering: 'crisp-edges' }}
                />
              </button>
            ))}
          </div>

          {/* Folder window */}
          {folderOpen && (
            <div style={{
              position: 'absolute', left: folderPos.x, top: folderPos.y, width: 420, height: 300,
              background: 'rgba(255,255,255,0.9)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: '#111',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)'
            }}>
              <div style={{
                height: 34, background: 'linear-gradient(#f4f4f6, #e8e8ee)',
                display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #d6d6df',
                cursor: 'move', userSelect: 'none'
              }} onMouseDown={(e) => startDrag('folder', e)}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setFolderOpen(false)} title="Fermer" style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer' }} />
                  <span style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, fontWeight: 700 }}>Dossier</div>
              </div>
              <div style={{ padding: 16, fontSize: 13, color: '#333' }}>
                Ce dossier est vide pour l'instant. Nous y ajouterons des éléments cliquables ensuite.
              </div>
            </div>
          )}

          {/* USB window */}
          {usbOpen && (
            <div style={{
              position: 'absolute', left: usbPos.x, top: usbPos.y, width: 520, height: 360,
              background: 'rgba(255,255,255,0.92)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: '#111',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)'
            }}>
              <div style={{
                height: 34, background: 'linear-gradient(#f4f4f6, #e8e8ee)',
                display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #d6d6df',
                cursor: 'move', userSelect: 'none'
              }} onMouseDown={(e) => startDrag('usb', e)}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setUsbOpen(false)} title="Fermer" style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer' }} />
                  <span style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, fontWeight: 700 }}>USB – Drive</div>
              </div>
              <div style={{ display: 'flex', height: 'calc(100% - 34px)' }}>
                <div style={{ flex: 1, padding: 12, borderRight: '1px solid #e6e6ef' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10
                  }}>
                    {usbItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedUsbItem(item)}
                        style={{
                          background: 'linear-gradient(#ffffff, #f5f6f8)', border: '1px solid #e5e7eb',
                          borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                        title={item.name}
                      >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>
                          {item.type === 'file' ? '📄' : (securedUnlocked ? '📁' : '🔒')}
                        </div>
                        <div style={{ fontSize: 12, color: '#333' }}>{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ width: 260, padding: 12, height: '100%', overflowY: 'auto' }}>
                  {!selectedUsbItem && (
                    <div style={{ color: '#6b7280', fontSize: 13 }}>Ouvrir les notes pour écrire les informations importantes.</div>
                  )}
                  {selectedUsbItem && selectedUsbItem.type === 'file' && (
                    renderUsbFileContent(selectedUsbItem.id)
                  )}
                  {selectedUsbItem && selectedUsbItem.type === 'folder_secured' && !securedUnlocked && (
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Dossier protégé</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Entrez le code pour déverrouiller.</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0,4))}
                          placeholder="Mot (4 lettres)"
                          style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', outline: 'none' }}
                        />
                        <button
                          onClick={() => { if (pinInput === USB_FOLDER_PIN) setSecuredUnlocked(true); }}
                          disabled={pinInput.length !== 4}
                          style={{
                            padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: pinInput.length === 4 ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Ouvrir
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: securedUnlocked ? 'green' : '#9ca3af', marginTop: 8 }}>
                        {securedUnlocked ? 'Déverrouillé' : 'Verrouillé'}
                      </div>
                    </div>
                  )}
                  {selectedUsbItem && selectedUsbItem.type === 'folder_secured' && securedUnlocked && (
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Données sécurisées</div>
                      <div style={{
                        background: '#fafafa', border: '1px solid #ececec', borderRadius: 8,
                        padding: 12, color: '#111', minHeight: 180
                      }}>
                        Contenu du dossier sécurisé. Remplacez par vos pages/données.
                        {renderVoices('secured')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes window */}
          {notesOpen && (
            <div style={{
              position: 'absolute', left: notesPos.x, top: notesPos.y, width: 480, height: 340,
              background: 'rgba(255,255,255,0.98)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: '#111',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)'
            }}>
              <div style={{
                height: 34, background: 'linear-gradient(#fff6cf, #ffd876)',
                display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #e6c257',
                cursor: 'move', userSelect: 'none'
              }} onMouseDown={(e) => startDrag('notes', e)}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setNotesOpen(false)} title="Fermer" style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer' }} />
                  <span style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, fontWeight: 700 }}>Notes</div>
              </div>
              <div style={{ padding: 12, height: 'calc(100% - 34px)' }}>
                <textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Écrivez vos notes ici... (conservé tant que l'onglet reste ouvert)"
                  style={{
                    width: '100%', height: '100%', resize: 'none',
                    border: '1px solid #e5e7eb', borderRadius: 8, padding: 12,
                    outline: 'none', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                    fontSize: 14, background: '#fffdf6'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopGameEmbed({ roomId, playerName, onBack }) {
  return (
    <WalkieTalkieProvider>
      <DesktopGameEmbedContent 
        roomId={roomId} 
        playerName={playerName} 
        onBack={onBack} 
      />
      <WalkieTalkieGlobal />
    </WalkieTalkieProvider>
  );
}

export default DesktopGameEmbed;
