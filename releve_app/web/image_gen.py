"""
Générateur d'images de pastilles Zstain Pro à partir des coordonnées Lab.

Conversion Lab (D65) → XYZ → sRGB pour un rendu visuel approximatif.
"""
import io
import math
from typing import Tuple, Optional
from PIL import Image, ImageDraw, ImageFont


def lab_to_xyz(L: float, a: float, b: float) -> Tuple[float, float, float]:
    """Convertit Lab (D65) en XYZ."""
    # Référence D65
    Xn, Yn, Zn = 95.047, 100.0, 108.883
    
    fy = (L + 16.0) / 116.0
    fx = a / 500.0 + fy
    fz = fy - b / 200.0
    
    delta = 6.0 / 29.0
    
    def f_inv(t: float) -> float:
        if t > delta:
            return t ** 3
        else:
            return 3 * (delta ** 2) * (t - 4.0 / 29.0)
    
    X = Xn * f_inv(fx)
    Y = Yn * f_inv(fy)
    Z = Zn * f_inv(fz)
    
    return X / 100.0, Y / 100.0, Z / 100.0


def xyz_to_srgb(X: float, Y: float, Z: float) -> Tuple[int, int, int]:
    """Convertit XYZ en sRGB (0-255)."""
    # Matrice de conversion XYZ → sRGB (D65)
    r =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z
    g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z
    b =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z
    
    # Gamma correction
    def gamma_correct(c: float) -> float:
        if c <= 0.0031308:
            return 12.92 * c
        else:
            return 1.055 * (c ** (1.0 / 2.4)) - 0.055
    
    r = gamma_correct(r)
    g = gamma_correct(g)
    b = gamma_correct(b)
    
    # Clamp 0-255
    def clamp(v: float) -> int:
        return max(0, min(255, int(round(v * 255))))
    
    return clamp(r), clamp(g), clamp(b)


def lab_to_rgb(L: float, a: float, b: float) -> Tuple[int, int, int]:
    """Convertit Lab en RGB (sRGB)."""
    X, Y, Z = lab_to_xyz(L, a, b)
    return xyz_to_srgb(X, Y, Z)


def generate_pastille_image(
    L: float, a: float, b: float,
    code: str,
    size: int = 200,
    highlight: bool = False,
    measured: bool = False
) -> bytes:
    """
    Génère une image PNG de pastille ronde avec sa couleur Lab.
    
    Args:
        L, a, b: Coordonnées Lab
        code: Code de la pastille (affiché sur l'image)
        size: Taille de l'image en pixels
        highlight: Si True, ajoute un cadre doré/rouge pour indiquer le match
        measured: Si True, style différent pour la couleur mesurée
    """
    rgb = lab_to_rgb(L, a, b)
    
    # Création de l'image avec fond transparent
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Ombre portée
    shadow_offset = 4
    shadow_radius = size // 2 - 4
    draw.ellipse(
        [shadow_offset, shadow_offset, size - 4 + shadow_offset, size - 4 + shadow_offset],
        fill=(0, 0, 0, 40)
    )
    
    # Cercle principal avec la couleur
    margin = 8
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(*rgb, 255)
    )
    
    # Effet de brillance (gloss) en haut à gauche
    gloss_margin = margin + size // 8
    draw.ellipse(
        [gloss_margin, gloss_margin, size - gloss_margin - size//4, size - gloss_margin - size//4],
        fill=(255, 255, 255, 50)
    )
    
    # Bordure
    border_width = 3 if highlight else 2
    border_color = (220, 170, 30, 255) if highlight else (200, 200, 200, 255)
    if measured:
        border_color = (50, 120, 220, 255)
    
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        outline=border_color,
        width=border_width
    )
    
    # Texte du code
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size // 5)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size // 8)
    except:
        font_large = ImageFont.load_default()
        font_small = font_large
    
    # Calcul de la luminance pour choisir la couleur du texte
    luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255.0
    text_color = (255, 255, 255, 230) if luminance < 0.5 else (30, 30, 30, 230)
    
    # Centrer le texte
    bbox = draw.textbbox((0, 0), code, font=font_large)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2
    y = (size - text_h) // 2 - 5
    
    draw.text((x, y), code, fill=text_color, font=font_large)
    
    # Légende L*a*b*
    lab_text = f"L{L:.1f}"
    bbox2 = draw.textbbox((0, 0), lab_text, font=font_small)
    text_w2 = bbox2[2] - bbox2[0]
    x2 = (size - text_w2) // 2
    y2 = y + text_h + 4
    draw.text((x2, y2), lab_text, fill=text_color, font=font_small)
    
    # Si highlight, ajouter un badge "MATCH"
    if highlight:
        badge_h = size // 7
        badge_w = size // 2
        badge_x = (size - badge_w) // 2
        badge_y = size - margin - badge_h - 4
        draw.rounded_rectangle(
            [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
            radius=badge_h // 2,
            fill=(220, 170, 30, 240),
            outline=(180, 140, 20, 255),
            width=1
        )
        match_text = "★ MATCH"
        try:
            font_badge = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", badge_h // 2)
        except:
            font_badge = ImageFont.load_default()
        bbox_b = draw.textbbox((0, 0), match_text, font=font_badge)
        bw = bbox_b[2] - bbox_b[0]
        bh = bbox_b[3] - bbox_b[1]
        draw.text(
            (badge_x + (badge_w - bw) // 2, badge_y + (badge_h - bh) // 2 - 1),
            match_text,
            fill=(255, 255, 255, 255),
            font=font_badge
        )
    
    # Convertir en PNG
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()


def generate_comparison_image(
    measured_L: float, measured_a: float, measured_b: float,
    ref_L: float, ref_a: float, ref_b: float,
    ref_code: str,
    size: int = 300
) -> bytes:
    """
    Génère une image comparant la couleur mesurée et la référence.
    """
    measured_rgb = lab_to_rgb(measured_L, measured_a, measured_b)
    ref_rgb = lab_to_rgb(ref_L, ref_a, ref_b)
    
    img = Image.new('RGBA', (size * 2 + 40, size + 60), (245, 245, 245, 255))
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        font_label = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        font_title = ImageFont.load_default()
        font_label = font_title
    
    # Titre
    draw.text((20, 10), "Comparaison visuelle", fill=(60, 60, 60, 255), font=font_title)
    
    # Pastille mesurée
    m_img = Image.open(io.BytesIO(generate_pastille_image(
        measured_L, measured_a, measured_b, "Mesuré", size=size, measured=True
    )))
    img.paste(m_img, (20, 50), m_img)
    
    # Pastille référence
    r_img = Image.open(io.BytesIO(generate_pastille_image(
        ref_L, ref_a, ref_b, ref_code, size=size, highlight=True
    )))
    img.paste(r_img, (size + 40, 50), r_img)
    
    # Flèche entre les deux
    arrow_x = size + 20
    arrow_y = 50 + size // 2
    draw.polygon(
        [(arrow_x - 8, arrow_y - 6), (arrow_x + 8, arrow_y), (arrow_x - 8, arrow_y + 6)],
        fill=(120, 120, 120, 255)
    )
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()
