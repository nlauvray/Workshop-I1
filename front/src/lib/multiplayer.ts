// Abstraction simple pour la synchronisation multijoueur (mock, à remplacer par WebSocket réel)

export type MultiplayerEvent = { type: string; payload?: any };

export type MultiplayerSession = {
  code: string;
  pseudo: string;
  mode: 'create' | 'join';
  send: (event: MultiplayerEvent) => void;
  onEvent: (cb: (event: MultiplayerEvent) => void) => void;
  close: () => void;
};

// Pour l'instant, on simule la session avec un EventEmitter local
class LocalMultiplayerSession implements MultiplayerSession {
  code: string;
  pseudo: string;
  mode: 'create' | 'join';
  private listeners: ((event: MultiplayerEvent) => void)[] = [];

  constructor(code: string, pseudo: string, mode: 'create' | 'join') {
    this.code = code;
    this.pseudo = pseudo;
    this.mode = mode;
  }

  send(event: MultiplayerEvent) {
    setTimeout(() => {
      this.listeners.forEach((cb) => cb(event));
    }, 100); // Simule un délai réseau
  }

  onEvent(cb: (event: MultiplayerEvent) => void) {
    this.listeners.push(cb);
  }

  close() {
    this.listeners = [];
  }
}

export function createMultiplayerSession(code: string, pseudo: string, mode: 'create' | 'join'): MultiplayerSession {
  // À remplacer par une vraie connexion WebSocket plus tard
  return new LocalMultiplayerSession(code, pseudo, mode);
}
