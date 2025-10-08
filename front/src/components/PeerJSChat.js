import React, { useEffect, useRef, useState, useCallback, memo } from 'react';

const PeerJSChat = memo(({ roomId, playerName }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Debug mode
  const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';
  
  const debugChat = useCallback((message, data = null) => {
    if (DEBUG_MODE) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [PEERJS-CHAT] ${message}`;
      
      if (data && typeof data === 'object') {
        console.log(logMessage + ' | Data:', JSON.stringify(data, null, 2));
      } else if (data) {
        console.log(logMessage + ' | Data:', data);
      } else {
        console.log(logMessage);
      }
    }
  }, [DEBUG_MODE]);

  // Initialize PeerJS connection
  useEffect(() => {
    if (!window.Peer) {
      setError('PeerJS n\'est pas encore chargé');
      debugChat('PeerJS library not loaded', { 
        windowPeer: !!window.Peer,
        debugMode: DEBUG_MODE 
      });
      return;
    }

    // Éviter la réinitialisation si le peer existe déjà et fonctionne
    if (peerRef.current && peerRef.current.open) {
      debugChat('PeerJS already initialized and connected, skipping re-initialization');
      return;
    }

    debugChat('Initializing PeerJS connection', { 
      roomId, 
      playerName,
      peerLibraryVersion: window.Peer.version || 'unknown',
      debugMode: DEBUG_MODE
    });

    try {
      // Create a valid PeerJS ID by sanitizing the input
      const sanitizeId = (str) => {
        return str
          .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric characters
          .toLowerCase()
          .substring(0, 10); // Limit length to avoid issues
      };
      
      const sanitizedRoomId = sanitizeId(roomId);
      const sanitizedPlayerName = sanitizeId(playerName);
      
      // Generate a unique ID by adding timestamp and random suffix
      const timestamp = Date.now().toString(36); // Base36 timestamp
      const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 random chars
      
      // Use random ID if sanitization results in empty strings
      let peerId;
      if (sanitizedRoomId && sanitizedPlayerName) {
        peerId = `${sanitizedRoomId}${sanitizedPlayerName}${timestamp}${randomSuffix}`;
      } else {
        // Generate a random alphanumeric ID
        peerId = 'peer' + timestamp + randomSuffix;
      }
      
      debugChat('Peer ID sanitization completed', { 
        originalRoomId: roomId, 
        originalPlayerName: playerName,
        sanitizedRoomId, 
        sanitizedPlayerName,
        timestamp: timestamp,
        randomSuffix: randomSuffix,
        finalPeerId: peerId,
        idLength: peerId.length,
        isValidFormat: /^[a-zA-Z0-9]+$/.test(peerId),
        uniqueIdGeneration: true
      });

      debugChat('Creating PeerJS instance with local server', {
        peerId: peerId,
        serverConfig: {
          host: 'localhost',
          port: 9000,
          path: '/',
          key: 'peerjs'
        },
        iceServers: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ]
      });

      // Create peer with sanitized ID using local PeerJS server
      const peer = new window.Peer(peerId, {
        host: 'localhost',
        port: 9000,
        path: '/',
        key: 'peerjs',
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peerRef.current = peer;
      debugChat('PeerJS instance created successfully', {
        peerId: peerId,
        instanceId: peer.id,
        isDestroyed: peer.destroyed
      });

      peer.on('open', (id) => {
        debugChat('Peer connection opened successfully', { 
          assignedId: id,
          requestedId: peerId,
          retryCount: retryCount,
          wasReconnecting: isReconnecting,
          connectionState: 'open'
        });
        
        // Mise à jour optimisée des states pour éviter les re-renders
        setPeerId(prevId => prevId !== id ? id : prevId);
        setConnectionStatus('connected');
        setIsConnected(prevConnected => !prevConnected ? true : prevConnected);
        setError(prevError => prevError ? '' : prevError);
        setRetryCount(0);
        setIsReconnecting(prevReconnecting => prevReconnecting ? false : prevReconnecting);
        
        // Clear any pending reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
          debugChat('Cleared pending reconnection timeout');
        }
      });

      peer.on('disconnected', () => {
        debugChat('Peer disconnected from server', { 
          retryCount: retryCount,
          isReconnecting: isReconnecting,
          peerDestroyed: peerRef.current?.destroyed,
          connectionState: 'disconnected'
        });
        setConnectionStatus('disconnected');
        setIsConnected(prevConnected => prevConnected ? false : prevConnected);
        
        // Only show error message if not already reconnecting
        if (!isReconnecting) {
          setError('Connexion perdue - tentative de reconnexion...');
          debugChat('Showing reconnection message to user');
        }
        
        // Attempt to reconnect with exponential backoff
        if (retryCount < 3 && peerRef.current && !peerRef.current.destroyed) {
          setIsReconnecting(true);
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 seconds
          
          debugChat('Scheduling automatic reconnection', { 
            retryCount: retryCount, 
            delay: delay,
            maxRetries: 3,
            exponentialBackoff: true
          });
          
          reconnectTimeoutRef.current = setTimeout(() => {
            try {
              debugChat('Executing reconnection attempt', {
                retryCount: retryCount + 1,
                peerDestroyed: peerRef.current?.destroyed
              });
              peerRef.current.reconnect();
              setRetryCount(prev => prev + 1);
            } catch (err) {
              debugChat('Reconnection attempt failed', {
                error: err.message,
                errorType: err.type,
                retryCount: retryCount
              });
              setError('Échec de la reconnexion');
              setIsReconnecting(false);
            }
          }, delay);
        } else if (retryCount >= 3) {
          debugChat('Maximum reconnection attempts reached', {
            retryCount: retryCount,
            maxRetries: 3,
            finalState: 'failed'
          });
          setError('Connexion impossible - trop de tentatives échouées');
          setIsReconnecting(false);
        } else {
          debugChat('Cannot reconnect - peer destroyed or invalid', {
            peerExists: !!peerRef.current,
            peerDestroyed: peerRef.current?.destroyed,
            retryCount: retryCount
          });
        }
      });

      peer.on('close', () => {
        debugChat('Peer connection closed permanently', {
          connectionState: 'closed',
          retryCount: retryCount,
          isReconnecting: isReconnecting
        });
        setConnectionStatus('disconnected');
        setIsConnected(false);
      });

      peer.on('connection', (conn) => {
        debugChat('Incoming peer connection established', { 
          from: conn.peer,
          connectionId: conn.id,
          connectionType: conn.type,
          metadata: conn.metadata,
          open: conn.open
        });
        setRemotePeerId(conn.peer);
        setConnectionStatus('connected');
        
        conn.on('data', (data) => {
          debugChat('Received data from peer', {
            from: conn.peer,
            dataType: typeof data,
            dataSize: JSON.stringify(data).length,
            data: data
          });
        });

        conn.on('close', () => {
          debugChat('Peer connection closed', {
            from: conn.peer,
            connectionId: conn.id,
            reason: 'peer_disconnected'
          });
          setConnectionStatus('disconnected');
          setRemotePeerId('');
        });

        conn.on('error', (err) => {
          debugChat('Peer connection error', {
            from: conn.peer,
            connectionId: conn.id,
            error: err.message,
            errorType: err.type
          });
        });
      });

      peer.on('call', (call) => {
        debugChat('Incoming voice call received', { 
          from: call.peer,
          callId: call.id,
          callType: call.type,
          metadata: call.metadata
        });
        callRef.current = call;
        
        // Get user media
        debugChat('Requesting microphone access for incoming call', {
          from: call.peer,
          constraints: { video: false, audio: true }
        });
        
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          .then((stream) => {
            debugChat('Microphone access granted for incoming call', {
              from: call.peer,
              streamId: stream.id,
              audioTracks: stream.getAudioTracks().length,
              videoTracks: stream.getVideoTracks().length
            });
            
            localStreamRef.current = stream;
            call.answer(stream);
            
            call.on('stream', (remoteStream) => {
              debugChat('Remote audio stream received', {
                from: call.peer,
                streamId: remoteStream.id,
                audioTracks: remoteStream.getAudioTracks().length,
                videoTracks: remoteStream.getVideoTracks().length
              });
              remoteStreamRef.current = remoteStream;
              setIsCalling(true);
            });

            call.on('close', () => {
              debugChat('Voice call ended', {
                from: call.peer,
                callId: call.id,
                reason: 'call_ended'
              });
              setIsCalling(false);
              if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                  debugChat('Stopping local audio track', {
                    trackId: track.id,
                    trackKind: track.kind,
                    trackLabel: track.label
                  });
                  track.stop();
                });
                localStreamRef.current = null;
              }
            });

            call.on('error', (err) => {
              debugChat('Call error occurred', {
                from: call.peer,
                callId: call.id,
                error: err.message,
                errorType: err.type
              });
            });
          })
          .catch((err) => {
            debugChat('Microphone access denied for incoming call', {
              from: call.peer,
              error: err.message,
              errorName: err.name,
              constraints: { video: false, audio: true }
            });
            setError('Erreur d\'accès au microphone');
          });
      });

      peer.on('error', (err) => {
        debugChat('PeerJS error', err);
        
        let errorMessage = 'Erreur de connexion';
        switch (err.type) {
          case 'invalid-id':
            errorMessage = 'ID invalide - caractères non autorisés';
            break;
          case 'network':
            errorMessage = 'Problème de réseau - vérifiez votre connexion';
            break;
          case 'server-error':
            errorMessage = 'Erreur serveur PeerJS - réessayez plus tard';
            break;
          case 'peer-unavailable':
            errorMessage = 'Partenaire non disponible';
            break;
          default:
            errorMessage = `Erreur PeerJS: ${err.message}`;
        }
        
        setError(errorMessage);
      });

    } catch (err) {
      debugChat('Error initializing peer', err);
      setError('Erreur d\'initialisation PeerJS');
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, playerName, DEBUG_MODE, debugChat, retryCount, isReconnecting]);

  // Connect to another peer
  const connectToPeer = () => {
    debugChat('Attempting peer-to-peer connection', {
      targetId: remotePeerId,
      peerExists: !!peerRef.current,
      peerDestroyed: peerRef.current?.destroyed,
      isConnected: isConnected
    });

    if (!peerRef.current || !remotePeerId.trim()) {
      setError('Veuillez entrer un ID de pair valide');
      debugChat('Connection attempt failed - invalid peer or empty target ID', {
        peerExists: !!peerRef.current,
        targetId: remotePeerId,
        targetIdTrimmed: remotePeerId.trim()
      });
      return;
    }

    debugChat('Creating peer-to-peer connection', { 
      targetId: remotePeerId,
      sourceId: peerRef.current.id,
      connectionType: 'data'
    });
    
    const conn = peerRef.current.connect(remotePeerId);
    
    conn.on('open', () => {
      debugChat('Peer-to-peer connection established', { 
        targetId: remotePeerId,
        connectionId: conn.id,
        connectionType: conn.type,
        metadata: conn.metadata
      });
      setConnectionStatus('connected');
    });

    conn.on('error', (err) => {
      debugChat('Peer-to-peer connection error', {
        targetId: remotePeerId,
        connectionId: conn.id,
        error: err.message,
        errorType: err.type
      });
      setError(`Erreur de connexion: ${err.message}`);
    });

    conn.on('data', (data) => {
      debugChat('Received data in peer-to-peer connection', {
        targetId: remotePeerId,
        connectionId: conn.id,
        dataType: typeof data,
        data: data
      });
    });

    conn.on('close', () => {
      debugChat('Peer-to-peer connection closed', {
        targetId: remotePeerId,
        connectionId: conn.id,
        reason: 'connection_closed'
      });
      setConnectionStatus('disconnected');
    });
  };

  // Start voice call
  const startCall = () => {
    debugChat('Initiating outgoing voice call', {
      targetId: remotePeerId,
      peerExists: !!peerRef.current,
      peerDestroyed: peerRef.current?.destroyed,
      isConnected: isConnected
    });

    if (!peerRef.current || !remotePeerId.trim()) {
      setError('Veuillez entrer un ID de pair valide');
      debugChat('Voice call attempt failed - invalid peer or empty target ID', {
        peerExists: !!peerRef.current,
        targetId: remotePeerId,
        targetIdTrimmed: remotePeerId.trim()
      });
      return;
    }

    debugChat('Requesting microphone access for outgoing call', {
      targetId: remotePeerId,
      constraints: { video: false, audio: true }
    });

    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then((stream) => {
        debugChat('Microphone access granted for outgoing call', {
          targetId: remotePeerId,
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length
        });

        localStreamRef.current = stream;
        const call = peerRef.current.call(remotePeerId, stream);
        callRef.current = call;

        debugChat('Voice call initiated', {
          targetId: remotePeerId,
          callId: call.id,
          callType: call.type,
          metadata: call.metadata
        });

        call.on('stream', (remoteStream) => {
          debugChat('Remote audio stream received in outgoing call', {
            targetId: remotePeerId,
            callId: call.id,
            streamId: remoteStream.id,
            audioTracks: remoteStream.getAudioTracks().length,
            videoTracks: remoteStream.getVideoTracks().length
          });
          remoteStreamRef.current = remoteStream;
          setIsCalling(true);
        });

        call.on('close', () => {
          debugChat('Outgoing voice call ended', {
            targetId: remotePeerId,
            callId: call.id,
            reason: 'call_ended'
          });
          setIsCalling(false);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              debugChat('Stopping local audio track for outgoing call', {
                trackId: track.id,
                trackKind: track.kind,
                trackLabel: track.label
              });
              track.stop();
            });
            localStreamRef.current = null;
          }
        });

        call.on('error', (err) => {
          debugChat('Outgoing call error occurred', {
            targetId: remotePeerId,
            callId: call.id,
            error: err.message,
            errorType: err.type
          });
          setError(`Erreur d'appel: ${err.message}`);
        });
      })
      .catch((err) => {
        debugChat('Microphone access denied for outgoing call', {
          targetId: remotePeerId,
          error: err.message,
          errorName: err.name,
          constraints: { video: false, audio: true }
        });
        setError('Erreur d\'accès au microphone');
      });
  };

  // End call
  const endCall = () => {
    debugChat('Ending voice call manually', {
      callExists: !!callRef.current,
      callId: callRef.current?.id,
      isCalling: isCalling,
      localStreamExists: !!localStreamRef.current
    });

    if (callRef.current) {
      debugChat('Closing active voice call', {
        callId: callRef.current.id,
        callType: callRef.current.type
      });
      callRef.current.close();
      callRef.current = null;
    }
    setIsCalling(false);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        debugChat('Stopping local audio track (manual end call)', {
          trackId: track.id,
          trackKind: track.kind,
          trackLabel: track.label
        });
        track.stop();
      });
      localStreamRef.current = null;
    }

    debugChat('Voice call ended successfully', {
      callActive: false,
      localStreamActive: false
    });
  };

  // Manual reconnection
  const manualReconnect = () => {
    debugChat('Manual reconnection requested by user', {
      retryCount: retryCount,
      isReconnecting: isReconnecting,
      peerExists: !!peerRef.current,
      peerDestroyed: peerRef.current?.destroyed,
      hasTimeout: !!reconnectTimeoutRef.current
    });

    setError('');
    setRetryCount(0);
    setIsReconnecting(false);
    
    if (reconnectTimeoutRef.current) {
      debugChat('Clearing existing reconnection timeout for manual reconnect');
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        debugChat('Executing manual reconnection', {
          peerId: peerRef.current.id,
          peerDestroyed: peerRef.current.destroyed
        });
        peerRef.current.reconnect();
      } catch (err) {
        debugChat('Manual reconnection execution failed', {
          error: err.message,
          errorType: err.type,
          peerExists: !!peerRef.current
        });
        setError('Échec de la reconnexion manuelle');
      }
    } else {
      debugChat('Manual reconnection failed - peer not available', {
        peerExists: !!peerRef.current,
        peerDestroyed: peerRef.current?.destroyed
      });
      setError('PeerJS non initialisé - redémarrez le chat');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      minWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
        📻 Walkie-Talkie Vocal
      </h4>
      
      {/* Connection Status */}
      <div style={{
        padding: '8px 16px',
        borderRadius: '4px',
        backgroundColor: isConnected ? '#d4edda' : (isReconnecting ? '#fff3cd' : '#f8d7da'),
        color: isConnected ? '#155724' : (isReconnecting ? '#856404' : '#721c24'),
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {isConnected ? '✅ Connecté' : (isReconnecting ? '🔄 Reconnexion...' : '❌ Déconnecté')}
        {isReconnecting && retryCount > 0 && (
          <span style={{ fontSize: '12px', display: 'block' }}>
            Tentative {retryCount}/3
          </span>
        )}
      </div>

      {/* Your Peer ID */}
      {peerId && (
        <div style={{ fontSize: '12px', color: '#666' }}>
          Votre ID: <strong>{peerId}</strong>
        </div>
      )}

      {/* Remote Peer ID Input */}
      <input
        type="text"
        placeholder="ID du partenaire à joindre"
        value={remotePeerId}
        onChange={(e) => setRemotePeerId(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px'
        }}
        disabled={!isConnected}
      />

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#721c24',
          backgroundColor: '#f8d7da',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          width: '100%',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          onClick={connectToPeer}
          disabled={!isConnected || !remotePeerId.trim()}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: isConnected && remotePeerId.trim() ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected && remotePeerId.trim() ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Se connecter
        </button>
        
        <button
          onClick={isCalling ? endCall : startCall}
          disabled={!isConnected || !remotePeerId.trim()}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: isCalling ? '#dc3545' : (isConnected && remotePeerId.trim() ? '#28a745' : '#6c757d'),
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected && remotePeerId.trim() ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          {isCalling ? '📞 Raccrocher' : '📞 Appeler'}
        </button>
      </div>

      {/* Manual Reconnection Button */}
      {!isConnected && !isReconnecting && (
        <button
          onClick={manualReconnect}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '8px'
          }}
        >
          🔄 Reconnecter manuellement
        </button>
      )}

      {/* Call Status */}
      {isCalling && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🔴 Appel en cours...
        </div>
      )}
    </div>
  );
});

PeerJSChat.displayName = 'PeerJSChat';

// Fonction de comparaison personnalisée pour éviter les re-renders inutiles
PeerJSChat.defaultProps = {
  roomId: '',
  playerName: ''
};

export default PeerJSChat;