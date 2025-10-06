import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle
from matplotlib.widgets import RadioButtons
from PIL import Image, ImageDraw, ImageFont

# =======================================================
#  CHEMINS RELATIFS (ne dépendent pas du répertoire courant)
# =======================================================
CURRENT_DIR = os.path.dirname(__file__)
p_base  = os.path.join(CURRENT_DIR, "images", "sky.png")                  # base (bleu nuit)
p_nvg   = os.path.join(CURRENT_DIR, "images", "sky_night_vision.png")     # vision nocturne (vert)
p_therm = os.path.join(CURRENT_DIR, "images", "sky_thermal.png")          # thermique (rouge avec drone)
out_photo = os.path.join(CURRENT_DIR, "images", "photo_dron.png")

# =======================================================
#  CHARGEMENT DES IMAGES
# =======================================================
base  = np.asarray(Image.open(p_base).convert("RGB"))
nvg   = np.asarray(Image.open(p_nvg).convert("RGB")).reshape(base.shape)
therm = np.asarray(Image.open(p_therm).convert("RGB")).reshape(base.shape)
H, W, _ = base.shape

# =======================================================
#  FIGURE
# =======================================================
fig = plt.figure(figsize=(7.5, 7.8))
ax_img = fig.add_axes([0.08, 0.18, 0.88, 0.80])
ax_img.axis("off")
ax_img.set_title("Escape Game — Caméra : souris = déplacer le filtre, cliquer en Thermal sur le drone")

# Couche de base + superposition (par défaut NVG)
im_base = ax_img.imshow(base)
im_overlay = ax_img.imshow(nvg, visible=True)
current_mode = "NVG"

# =======================================================
#  FOYER CARRÉ QUI SUIT LA SOURIS
# =======================================================
lens_size = 120  # taille fixe en px (côté du carré)
# Carré qui découpe la superposition (clip)
clip_rect = Rectangle((W/2 - lens_size/2, H/2 - lens_size/2), lens_size, lens_size, transform=ax_img.transData)
im_overlay.set_clip_path(clip_rect)
# Bordure du foyer pour qu'elle soit visible
ring = Rectangle((W/2 - lens_size/2, H/2 - lens_size/2), lens_size, lens_size, fill=False, linewidth=1.2)
ax_img.add_patch(ring)

# HUD (Heads-Up Display)
hud = ax_img.text(12, 22, f"Mode: {current_mode}",
                  color="white", fontsize=10, va="top")

def update_hud():
    hud.set_text(f"Mode: {current_mode}")

def set_mode(mode):
    """Changer le mode (BASE, NVG, THERMAL)."""
    global current_mode
    current_mode = mode
    if mode == "BASE":
        im_overlay.set_visible(False)
        ring.set_visible(False)
    elif mode == "NVG":
        im_overlay.set_visible(True)
        ring.set_visible(True)
        im_overlay.set_data(nvg)
    elif mode == "THERMAL":
        im_overlay.set_visible(True)
        ring.set_visible(True)
        im_overlay.set_data(therm)
    update_hud()
    fig.canvas.draw_idle()

# =======================================================
#  BOUTONS RADIO
# =======================================================
ax_radio = fig.add_axes([0.08, 0.05, 0.19, 0.10])
radio = RadioButtons(ax_radio, ('Base', 'NVG', 'Thermal'), active=1)
for label in radio.labels: label.set_fontsize(10)

def on_radio(label):
    if label.lower() == 'base':
        set_mode("BASE")
    elif label.lower() == 'nvg':
        set_mode("NVG")
    elif label.lower() == 'thermal':
        set_mode("THERMAL")

radio.on_clicked(on_radio)

# =======================================================
#  INTERACTION SOURIS + CLAVIER
# =======================================================
def on_move(event):
    """Le filtre (foyer) suit la souris."""
    if event.inaxes != ax_img or event.xdata is None or event.ydata is None:
        return
    # Déplacer le centre du carré de découpe et de la bordure
    cx, cy = float(event.xdata), float(event.ydata)
    # Mettre à jour la position du rectangle (centré sur le curseur)
    clip_rect.set_xy((cx - lens_size/2, cy - lens_size/2))
    ring.set_xy((cx - lens_size/2, cy - lens_size/2))
    # Forcer la mise à jour du clip path
    im_overlay.set_clip_path(clip_rect)
    fig.canvas.draw_idle()


def is_drone_pixel(px):
    """Heuristique de pixels chauds (thermique) - détection du triangle jaune."""
    r, g, b = px.astype(np.float32) / 255.0
    # Détection plus sensible pour les pixels jaunes/oranges du drone
    bright = (r + g + b) / 3.0 > 0.4  # Seuil plus bas
    # Détection des couleurs chaudes (jaune/orange/rouge)
    warm = (r > 0.5) and (g > 0.3) and (b < 0.6) and (r >= g * 0.8)
    # Détection spécifique du jaune/orange
    yellow_orange = (r > 0.6) and (g > 0.4) and (b < 0.4)
    return bright and (warm or yellow_orange)

def on_click(event):
    """Clic pour détecter le drone (seulement en mode THERMAL)."""
    if event.inaxes != ax_img or current_mode != "THERMAL":
        return
    if event.xdata is None or event.ydata is None:
        return
    x = int(np.clip(event.xdata, 0, W-1))
    y = int(np.clip(event.ydata, 0, H-1))
    k = 6
    y0 = max(0, y-k); y1 = min(H, y+k+1)
    x0 = max(0, x-k); x1 = min(W, x+k+1)
    region = therm[y0:y1, x0:x1, :]
    matches = sum(is_drone_pixel(region[i, j]) for i in range(region.shape[0]) for j in range(region.shape[1]))
    print(f"Debug: Clic à ({x}, {y}), matches trouvés: {matches}")
    if matches >= 5:
        print("Drone détecté ! Affichage de l'écran de succès...")
        show_drone_found_screen((x, y))
    else:
        print(f"Pas assez de matches ({matches} < 5)")
        # Pas d'affichage de croix - rien ne se passe

def show_drone_found_screen(click_xy):
    """Affiche l'image photo_dron.png existante quand le drone est détecté."""
    print("Affichage de l'image photo_dron.png...")
    
    # Charger et afficher directement l'image photo_dron.png existante
    try:
        drone_image = Image.open(out_photo)
        drone_array = np.asarray(drone_image)
        
        # Créer une nouvelle fenêtre pour afficher l'image
        fig2, ax2 = plt.subplots(figsize=(12, 9))
        ax2.imshow(drone_array)
        ax2.axis("off")
        ax2.set_title("DRONE DÉTECTÉ", fontsize=18, fontweight='bold', color='red')
        
        plt.tight_layout()
        plt.show()
        print(f"Image photo_dron.png affichée avec succès!")
        
    except Exception as e:
        print(f"Erreur lors du chargement de l'image: {e}")
        # Fallback: afficher un message simple
        fig2, ax2 = plt.subplots(figsize=(8, 6))
        ax2.text(0.5, 0.5, "DRONE DÉTECTÉ!\nCode GPS: 10388", 
                ha='center', va='center', fontsize=24, fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.5", facecolor="yellow", alpha=0.8))
        ax2.axis("off")
        ax2.set_title("Succès — Drone détecté")
        plt.show()

def on_key(event):
    """Raccourcis optionnels."""
    if event.key == "n":
        set_mode("NVG")
        radio.set_active(1)
    elif event.key == "t":
        set_mode("THERMAL")
        radio.set_active(2)
    elif event.key == "b":
        set_mode("BASE")
        radio.set_active(0)

# =======================================================
#  ÉVÉNEMENTS
# =======================================================
cid_move   = fig.canvas.mpl_connect('motion_notify_event', on_move)
cid_click  = fig.canvas.mpl_connect('button_press_event', on_click)
cid_key    = fig.canvas.mpl_connect('key_press_event', on_key)

# Mode par défaut
set_mode("NVG")
plt.show()
