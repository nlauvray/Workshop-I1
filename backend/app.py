from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import base64
import numpy as np
from PIL import Image, ImageFilter
import random
import os
from typing import Dict, List
import uuid

app = FastAPI()

# Configuration CORS pour React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir les fichiers statiques (images) pour afficher la photo du drone
app.mount(
    "/images",
    StaticFiles(directory=os.path.join(os.path.dirname(os.path.dirname(__file__)), "images")),
    name="images",
)

# Gestion des salles de jeu
game_rooms: Dict[str, Dict] = {}

class GameRoom:
    def __init__(self, room_id: str, is_private: bool = False, solo: bool = False):
        self.room_id = room_id
        self.players = {}
        self.connections = []
        self.can_see_drone = {}  # player_id -> bool
        self.first_assigned = False  # vision assigned for first player
        self.secret_assigned = False  # vision assigned for both players
        self.player_names: Dict[int, str] = {}
        self.is_private = is_private
        self.solo = solo
        self.game_state = {
            "player1": {
                "mode": "NVG", 
                "position": {"x": 400, "y": 300}, 
                "score": 0,
                "active": True
            },
            "player2": {
                "mode": "NVG", 
                "position": {"x": 400, "y": 300}, 
                "score": 0,
                "active": True
            },
            "current_player": 1,
            "game_started": False
        }
        self.images = self.load_images()
    
    def load_images(self):
        """Charge les images de base"""
        current_dir = os.path.dirname(os.path.dirname(__file__))
        p_base = os.path.join(current_dir, "images", "sky.png")
        p_nvg = os.path.join(current_dir, "images", "sky_night_vision.png")
        p_therm = os.path.join(current_dir, "images", "sky_thermal.png")
        p_therm_nodrone = os.path.join(current_dir, "images", "sky_non_dron_thermal.png")
        
        print(f"Chargement des images depuis: {current_dir}")
        print(f"Base: {p_base} - Existe: {os.path.exists(p_base)}")
        print(f"NVG: {p_nvg} - Existe: {os.path.exists(p_nvg)}")
        print(f"Thermal: {p_therm} - Existe: {os.path.exists(p_therm)}")
        print(f"Thermal (no-drone): {p_therm_nodrone} - Existe: {os.path.exists(p_therm_nodrone)}")
        
        base = np.asarray(Image.open(p_base).convert("RGB"))
        nvg = np.asarray(Image.open(p_nvg).convert("RGB"))
        therm = np.asarray(Image.open(p_therm).convert("RGB"))
        # Image thermique officielle SANS DRONE fournie par l'utilisateur
        therm_nodrone = np.asarray(Image.open(p_therm_nodrone).convert("RGB"))
        
        # S'assurer que toutes les images ont la même taille
        if nvg.shape != base.shape:
            nvg = np.resize(nvg, base.shape)
        if therm.shape != base.shape:
            therm = np.resize(therm, base.shape)
        if therm_nodrone.shape != base.shape:
            therm_nodrone = np.resize(therm_nodrone, base.shape)
        
        print(f"Images chargées - Base: {base.shape}, NVG: {nvg.shape}, Thermal: {therm.shape}")

        # Préparer des versions 512x512 pour un rendu et des coordonnées cohérents
        target_size = (512, 512)
        base_small = np.asarray(Image.fromarray(base.astype('uint8')).resize(target_size, Image.Resampling.LANCZOS))
        nvg_small = np.asarray(Image.fromarray(nvg.astype('uint8')).resize(target_size, Image.Resampling.LANCZOS))
        therm_small = np.asarray(Image.fromarray(therm.astype('uint8')).resize(target_size, Image.Resampling.LANCZOS))
        therm_small_nodrone = np.asarray(Image.fromarray(therm_nodrone.astype('uint8')).resize(target_size, Image.Resampling.LANCZOS))

        # Utiliser directement l'image thermique fournie sans drone

        return {
            "base": base,
            "nvg": nvg,
            "thermal": therm,
            "base_small": base_small,
            "nvg_small": nvg_small,
            "thermal_small": therm_small,
            "thermal_nodrone": therm_nodrone,
            "thermal_small_nodrone": therm_small_nodrone,
        }
    
    def get_image_data(self, player_id, mode):
        """Retourne l'image encodée en base64 (512x512) avec superposition dans le foyer.
        Les coordonnées (x,y) sont attendues dans l'espace 512x512 pour coller au rendu à l'écran.
        """
        player = self.game_state[f"player{player_id}"]
        pos = player["position"]

        # Travailler en 512x512 pour correspondre à l'affichage
        img = self.images["base_small"].copy()

        overlay_img = None
        if mode == "NVG":
            overlay_img = self.images["nvg_small"].copy()
        elif mode == "THERMAL":
            if getattr(self, 'solo', False):
                # Solo: toujours l'image thermique avec drone, pas de version sans drone
                overlay_img = self.images["thermal_small"].copy()
            else:
                can_see = self.can_see_drone.get(player_id, True)
                overlay_img = self.images["thermal_small"].copy() if can_see else self.images["thermal_small_nodrone"].copy()

        if overlay_img is not None:
            lens_size = 60
            x0 = max(0, int(pos["x"] - lens_size / 2))
            y0 = max(0, int(pos["y"] - lens_size / 2))
            x1 = min(img.shape[1], x0 + lens_size)
            y1 = min(img.shape[0], y0 + lens_size)
            img[y0:y1, x0:x1] = overlay_img[y0:y1, x0:x1]

        return self._encode_image(img)

    def _encode_image(self, img_np):
        import io
        pil_img = Image.fromarray(img_np.astype('uint8'))
        buffer = io.BytesIO()
        pil_img.save(buffer, format='JPEG', quality=85, optimize=True)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/jpeg;base64,{img_str}"
    
    def is_drone_pixel(self, px):
        """Heuristique de pixels chauds (thermique) - détection du triangle jaune - IDENTIQUE à main.py"""
        r, g, b = px.astype(np.float32) / 255.0
        # Détection plus sensible pour les pixels jaunes/oranges du drone
        bright = (r + g + b) / 3.0 > 0.4  # Seuil plus bas
        # Détection des couleurs chaudes (jaune/orange/rouge)
        warm = (r > 0.5) and (g > 0.3) and (b < 0.6) and (r >= g * 0.8)
        # Détection spécifique du jaune/orange
        yellow_orange = (r > 0.6) and (g > 0.4) and (b < 0.4)
        return bright and (warm or yellow_orange)
    
    def check_drone_detection(self, player_id, x, y):
        """Vérifie si le drone est détecté à la position donnée - IDENTIQUE à main.py"""
        if self.game_state[f"player{player_id}"]["mode"] != "THERMAL":
            return False
        # Si ce joueur ne peut pas voir le drone, il ne peut pas le détecter
        if not self.can_see_drone.get(player_id, True):
            return False
            
        # Les clics viennent de l'affichage 512x512 → convertir en coordonnées de l'image d'origine
        therm = self.images["thermal"]
        therm_small = self.images["thermal_small"]
        sx = float(therm.shape[1]) / float(therm_small.shape[1])
        sy = float(therm.shape[0]) / float(therm_small.shape[0])

        xb = int(round(float(x) * sx))
        yb = int(round(float(y) * sy))

        k = 6
        y0 = max(0, int(yb - k))
        y1 = min(therm.shape[0], int(yb + k + 1))
        x0 = max(0, int(xb - k))
        x1 = min(therm.shape[1], int(xb + k + 1))
        
        region = therm[y0:y1, x0:x1, :]
        matches = sum(self.is_drone_pixel(region[i, j]) for i in range(region.shape[0]) for j in range(region.shape[1]))
        
        print(f"Debug: Clic à ({x}, {y}) → ({xb}, {yb}) base, matches trouvés: {matches}")
        if matches >= 5:
            print("Drone détecté !")
            return True
        else:
            print(f"Pas assez de matches ({matches} < 5)")
            return False
    
    async def broadcast_to_room(self, message):
        """Envoie un message à tous les joueurs de la salle"""
        for connection in self.connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

@app.get("/")
async def root():
    return {"message": "Escape Game API"}

@app.get("/rooms")
async def get_rooms():
    """Retourne la liste des salles disponibles"""
    rooms_info = {}
    for room_id, room in game_rooms.items():
        if getattr(room, 'is_private', False):
            continue  # ne pas lister les salles privées (solo)
        rooms_info[room_id] = {
            "players": len(room.players),
            "game_started": room.game_state["game_started"]
        }
    return rooms_info

@app.post("/rooms")
async def create_room():
    """Crée une nouvelle salle de jeu"""
    room_id = str(uuid.uuid4())[:8]
    game_rooms[room_id] = GameRoom(room_id)
    return {"room_id": room_id, "message": "Salle créée avec succès"}

@app.post("/rooms/private")
async def create_private_room():
    """Crée une salle privée (solo), non listée"""
    room_id = f"solo-{str(uuid.uuid4())[:8]}"
    game_rooms[room_id] = GameRoom(room_id, is_private=True, solo=True)
    return {"room_id": room_id, "message": "Salle privée créée"}

@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    """Retourne des infos si la salle existe, sinon 404"""
    if room_id in game_rooms:
        room = game_rooms[room_id]
        return {
            "exists": True,
            "players": len(room.players),
            "game_started": room.game_state["game_started"],
            "names": list(room.player_names.values()),
        }
    raise HTTPException(status_code=404, detail="Room not found")

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    
    if room_id not in game_rooms:
        await websocket.close()
        return
    
    room = game_rooms[room_id]
    room.connections.append(websocket)
    
    # Assigner un ID de joueur
    player_id = None
    if len(room.players) == 0:
        player_id = 1
    elif len(room.players) == 1:
        # En solo, refuser un second joueur
        if getattr(room, 'is_private', False):
            await websocket.close()
            return
        player_id = 2
        room.game_state["game_started"] = True
    else:
        await websocket.close()
        return
    
    room.players[player_id] = websocket

    # Si c'est le premier joueur
    if len(room.players) == 1 and not room.first_assigned and not room.secret_assigned:
        # Solo: toujours visible. Multi: attribution aléatoire comme avant
        room.can_see_drone[player_id] = True if getattr(room, 'solo', False) else bool(random.getrandbits(1))
        room.first_assigned = True

    # Lorsque 2 joueurs sont présents: garantir qu'au moins un voit le drone
    if len(room.players) == 2 and not room.secret_assigned:
        # Si le premier a déjà une attribution, donner l'opposé au second
        if 1 in room.can_see_drone and 2 not in room.can_see_drone:
            room.can_see_drone[2] = not room.can_see_drone[1]
        elif 2 in room.can_see_drone and 1 not in room.can_see_drone:
            room.can_see_drone[1] = not room.can_see_drone[2]
        else:
            # Sinon choisir aléatoirement exactement un voyant
            chosen = random.choice([1, 2])
            room.can_see_drone[chosen] = True
            room.can_see_drone[1 if chosen == 2 else 2] = False
        room.secret_assigned = True
    
    try:
        # Envoyer l'état initial
        current_state = {
            "type": "game_state",
            "player_id": player_id,
            "game_state": room.game_state,
            "image_data": room.get_image_data(player_id, room.game_state[f"player{player_id}"]["mode"]),
            "game_started": room.game_state["game_started"]
        }
        try:
            await websocket.send_text(json.dumps(current_state))
            print(f"📤 État initial envoyé au joueur {player_id}")
        except Exception as send_err:
            # Client fermé avant l'envoi → nettoyer et sortir proprement
            print(f"❌ Envoi état initial échoué: {send_err}")
            if player_id in room.players:
                del room.players[player_id]
            if websocket in room.connections:
                room.connections.remove(websocket)
            return
        
        while True:
            # Attendre les commandes du client
            data = await websocket.receive_text()
            command = json.loads(data)
            print(f"📥 Commande reçue: {command['type']}")
            
            if command["type"] == "move":
                # Mettre à jour la position (dans l'espace 512x512)
                room.game_state[f"player{player_id}"]["position"] = {
                    "x": float(command["position"]["x"]),
                    "y": float(command["position"]["y"]),
                }
                # Renvoyer l'image mise à jour comme dans main.py
                update_state = {
                    "type": "frame",
                    "player_id": player_id,
                    "position": room.game_state[f"player{player_id}"]["position"],
                    "image_data": room.get_image_data(player_id, room.game_state[f"player{player_id}"]["mode"]) ,
                }
                await websocket.send_text(json.dumps(update_state))
                
            elif command["type"] == "mode_change":
                room.game_state[f"player{player_id}"]["mode"] = command["mode"]
                # Envoyer la mise à jour
                update_state = {
                    "type": "game_state",
                    "player_id": player_id,
                    "game_state": room.game_state,
                    "image_data": room.get_image_data(player_id, room.game_state[f"player{player_id}"]["mode"]),
                    "game_started": room.game_state["game_started"]
                }
                await websocket.send_text(json.dumps(update_state))
                
            elif command["type"] == "click":
                if room.check_drone_detection(player_id, command["x"], command["y"]):
                    room.game_state[f"player{player_id}"]["score"] += 1
                    # Notifier tous les joueurs de la salle
                    await room.broadcast_to_room({
                        "type": "drone_detected",
                        "player_id": player_id,
                        "position": command,
                        "new_score": room.game_state[f"player{player_id}"]["score"]
                    })
            elif command["type"] == "set_name":
                desired = str(command.get("name", "")).strip()
                if len(desired) == 0:
                    await websocket.send_text(json.dumps({"type": "name_status", "ok": False, "reason": "empty"}))
                    continue
                # Limiter longueur
                desired = desired[:32]
                # Unicité (insensible à la casse)
                lower_names = {pid: n.lower() for pid, n in room.player_names.items()}
                if any(n == desired.lower() for pid, n in lower_names.items() if pid != player_id):
                    await websocket.send_text(json.dumps({"type": "name_status", "ok": False, "reason": "duplicate"}))
                    continue
                room.player_names[player_id] = desired
                await websocket.send_text(json.dumps({"type": "name_status", "ok": True, "name": desired}))
                    
            elif command["type"] == "switch_player":
                room.game_state["current_player"] = 2 if room.game_state["current_player"] == 1 else 1
                await room.broadcast_to_room({
                    "type": "player_switched",
                    "current_player": room.game_state["current_player"]
                })
            
    except WebSocketDisconnect:
        if player_id in room.players:
            del room.players[player_id]
        if websocket in room.connections:
            room.connections.remove(websocket)
        if len(room.players) == 0:
            del game_rooms[room_id]
    except Exception as e:
        # Autres erreurs WebSocket
        print(f"❌ Erreur WebSocket inattendue: {e}")
        if player_id in room.players:
            del room.players[player_id]
        if websocket in room.connections:
            room.connections.remove(websocket)
        if len(room.players) == 0:
            del game_rooms[room_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
