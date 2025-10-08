# from fastapi import FastAPI, WebSocket
# from fastapi.middleware.cors import CORSMiddleware
# import uvicorn

# app = FastAPI()

# # Autoriser le front à se connecter
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Dictionnaire des rooms : { "code_partie": [list des websockets] }
# rooms = {}

# @app.websocket("/ws/{room_code}")
# async def websocket_endpoint(websocket: WebSocket, room_code: str):
#     await websocket.accept()

#     # Crée la room si elle n’existe pas
#     if room_code not in rooms:
#         rooms[room_code] = []
#     rooms[room_code].append(websocket)

#     try:
#         while True:
#             data = await websocket.receive_text()
#             # Diffuse le message seulement aux autres de la même room
#             for conn in rooms[room_code]:
#                 if conn != websocket:
#                     await conn.send_text(data)
#     except:
#         # Nettoyer quand un joueur quitte
#         rooms[room_code].remove(websocket)
#         if not rooms[room_code]:
#             del rooms[room_code]

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
