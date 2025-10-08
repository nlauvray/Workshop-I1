// import { useEffect, useRef, useState } from "react";
// import useWebSocket from "react-use-websocket";

// const VoiceChat = ({ roomCode }) => {
//   const localAudioRef = useRef(null);
//   const remoteAudioRef = useRef(null);
//   const pcRef = useRef(null);
//   const [connected, setConnected] = useState(false);

//   const { sendJsonMessage, lastJsonMessage } = useWebSocket(
//     `ws://localhost:8000/ws/${roomCode}`
//   );

//   useEffect(() => {
//     const pc = new RTCPeerConnection();

//     pc.ontrack = (event) => {
//       const audioEl = remoteAudioRef.current;
//       if (audioEl) {
//         audioEl.srcObject = event.streams[0];
//       }
//     };

//     navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
//       const localEl = localAudioRef.current;
//       if (localEl) {
//         localEl.srcObject = stream;
//       }
//       stream.getTracks().forEach((track) => pc.addTrack(track, stream));
//     });

//     pc.onicecandidate = (event) => {
//       if (event.candidate) sendJsonMessage({ candidate: event.candidate });
//     };

//     pcRef.current = pc;

//     return () => {
//       try {
//         pc.getSenders().forEach((s) => s.track && s.track.stop());
//         pc.close();
//       } catch {}
//     };
//   }, [sendJsonMessage]);

//   useEffect(() => {
//     const pc = pcRef.current;
//     if (!lastJsonMessage || !pc) return;

//     if (lastJsonMessage.sdp) {
//       pc.setRemoteDescription(new RTCSessionDescription(lastJsonMessage.sdp))
//         .then(() => {
//           if (lastJsonMessage.sdp.type === "offer") {
//             pc.createAnswer().then((answer) => {
//               pc.setLocalDescription(answer);
//               sendJsonMessage({ sdp: answer });
//             });
//           }
//         });
//     } else if (lastJsonMessage.candidate) {
//       pc.addIceCandidate(new RTCIceCandidate(lastJsonMessage.candidate));
//     }
//   }, [lastJsonMessage, sendJsonMessage]);

//   const startCall = async () => {
//     const pc = pcRef.current;
//     if (!pc) return;
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//     sendJsonMessage({ sdp: offer });
//     setConnected(true);
//   };

//   return (
//     <div className="p-4 text-center bg-gray-800 text-white rounded-xl">
//       <h2 className="text-lg font-semibold mb-2">🎧 Chat Vocal – Partie {roomCode}</h2>
//       <audio ref={localAudioRef} autoPlay muted />
//       <audio ref={remoteAudioRef} autoPlay />
//       <button
//         onClick={startCall}
//         disabled={connected}
//         className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
//       >
//         {connected ? "🔊 En cours" : "Démarrer la conversation"}
//       </button>
//     </div>
//   );
// };

// export default VoiceChat;


