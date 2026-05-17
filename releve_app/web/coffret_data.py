"""
Données du coffret GC Initial IQ Lustre Pastes ONE - V-SHADES SET.
Source: LFL_Initial_IQ_One_SQIN_fr-FR.pdf
"""
from typing import List, Dict, Optional


# Mapping groupe Zstain → teinte Lustre Paste Body
ZSTAIN_TO_LUSTRE_BODY = {
    "A1": "L-A",
    "A2": "L-B",
    "A3": "L-C",
}

# Mapping niveau de maquillage → technique recommandée
NIVEAU_TECHNIQUE = {
    0: {
        "nom": "Glaçage seul",
        "description": "Aucune coloration nécessaire. Application du glaçage Lustre NL directement sur la zircone frittée.",
        "produits": ["Lustre Paste ONE Neutral (L-N) — cuisson de connexion + glaçage"],
        "etapes": [
            "Nettoyage à l'IPA 96%",
            "Application de L-N (Lustre Paste Neutral) en couche fine",
            "Cuisson de connexion selon programme Artis®",
            "Vérification du glaçage auto-glaze",
        ],
    },
    1: {
        "nom": "Painting technique — 1 couche Body Shade",
        "description": "Coloration externe monolithique avec 1 couche de Body Shade correspondant à la teinte du groupe.",
        "produits": [
            "Lustre Paste ONE Body Shade (L-A / L-B / L-C selon groupe)",
            "Lustre Paste ONE Neutral (L-N) — base de cuisson",
        ],
        "etapes": [
            "Nettoyage à l'IPA 96%",
            "Application de L-N (base) en couche fine",
            "Cuisson de connexion",
            "Application de 1 couche de Body Shade (L-A/B/C) avec pinceau n°2",
            "Séchage à l'air libre avant mesure",
            "Contrôle Optishade (ΔE cible 1.2–1.5)",
            "Cuisson effets + glaçage Lustre NL (Artis®)",
        ],
    },
    2: {
        "nom": "Painting technique — 2 couches Body + Effects",
        "description": "Coloration en 2 couches successives pour une saturation accrue. 1ère couche Body, 2ème couche Body renforcée ou Effect.",
        "produits": [
            "Lustre Paste ONE Body Shade (L-A / L-B / L-C selon groupe)",
            "Lustre Paste ONE Neutral (L-N) — base",
            "Enamel Effect Shade (L-3 / L-8 / L-9) — optionnel pour brillance",
        ],
        "etapes": [
            "Nettoyage à l'IPA 96%",
            "Application de L-N (base) + cuisson de connexion",
            "1ère couche Body Shade (L-A/B/C) avec pinceau n°2",
            "1ère cuisson effets",
            "2ème couche Body Shade (même teinte) avec pinceau n°2",
            "Séchage + contrôle Optishade (ΔE cible 1.2–1.5)",
            "Cuisson finale + glaçage Lustre NL (Artis®)",
        ],
    },
}

# Stains SPS disponibles pour affiner/caractériser
SPS_STAINS = [
    {"code": "SPS-1", "nom": "White", "usage": "Points blancs, hypoplasies"},
    {"code": "SPS-2", "nom": "White FLUO", "usage": "Fluorescence blanche"},
    {"code": "SPS-7", "nom": "Yellow", "usage": "Caractérisation jaune"},
    {"code": "SPS-8", "nom": "Orange", "usage": "Caractérisation orange"},
    {"code": "SPS-13", "nom": "Brown", "usage": "Caractérisation brune"},
    {"code": "SPS-14", "nom": "Pink", "usage": "Effet cervical, gencive"},
    {"code": "SPS-17", "nom": "Blue-Grey", "usage": "Effet translucide, incisal"},
    {"code": "SPS-18", "nom": "Violet", "usage": "Profondeur 3D"},
    {"code": "SPS-19", "nom": "Grey", "usage": "Ombrage, âge"},
    {"code": "SPS-20", "nom": "Dark Brown", "usage": "Caractérisation marquée"},
]

# Liquides et accessoires
LIQUIDES_ACCESSOIRES = [
    {"code": "L-DIL", "nom": "Diluting Liquide", "usage": "Dilution des Lustre Pastes ONE", "volume": "8ml"},
    {"code": "L-REF", "nom": "Refreshing Liquide", "usage": "Rafraîchissement de la pâte", "volume": "8ml"},
    {"code": "SPS-GL", "nom": "SPS Glaze Liquide", "usage": "Mélange des poudres SPS Stains", "volume": "25ml"},
    {"code": "SPS-FLUO", "nom": "SPS Glaze Fluo (GL-FLUO)", "usage": "Fluorescence des Stains", "volume": "10g"},
]

# Émaux / Enamel Effects disponibles
ENAMEL_EFFECTS = [
    {"code": "L-3", "nom": "Enamel Effect 3", "usage": "Émail translucide"},
    {"code": "L-6", "nom": "Enamel Effect 6", "usage": "Émail moyen"},
    {"code": "L-8", "nom": "Enamel Effect 8", "usage": "Émail clair"},
    {"code": "L-9", "nom": "Enamel Effect 9", "usage": "Émail très clair"},
    {"code": "L-10", "nom": "Enamel Effect 10", "usage": "Émail blanc"},
    {"code": "L-OP", "nom": "Enamel Opal", "usage": "Effet opalescent"},
    {"code": "L-V", "nom": "Enamel Value", "usage": "Valeur lumineuse"},
]

# Pinceaux
PINCEAUX = [
    {"code": "BR-00", "nom": "Pinceau 00", "usage": "Détails fins, caractérisations"},
    {"code": "BR-2", "nom": "Pinceau n°2", "usage": "Application couches Body Shade"},
]

# Programme de cuisson Artis® (infos du PDF)
PROGRAMME_CUISSON = {
    "nom": "Artis® / Four programmable",
    "cuisson_connexion": {
        "temperature": "~900–920°C",
        "description": "Cuisson de connexion Lustre Pastes ONE sur zircone",
    },
    "cuisson_effets": {
        "temperature": "~900–920°C",
        "description": "Cuisson des effets / Body Shades",
    },
    "glacage": {
        "description": "Auto-glaze Lustre NL — glaçage naturel sans surcuisson",
    },
}


def get_recommandation_coffret(groupe: str, niveau: int) -> Dict:
    """
    Retourne la recommandation de produits du coffret pour un groupe et niveau donnés.
    """
    body_shade = ZSTAIN_TO_LUSTRE_BODY.get(groupe, "L-N")
    technique = NIVEAU_TECHNIQUE.get(niveau, NIVEAU_TECHNIQUE[0])
    
    recommandation = {
        "groupe": groupe,
        "niveau": niveau,
        "body_shade": body_shade,
        "technique": technique["nom"],
        "description": technique["description"],
        "produits": technique["produits"],
        "etapes": technique["etapes"],
        "stains_suggeres": [],
        "enamel_suggeres": [],
    }
    
    # Stains suggérés selon le groupe
    if groupe == "A1":
        recommandation["stains_suggeres"] = ["SPS-1", "SPS-2", "SPS-7"]  # White, fluo, jaune léger
        recommandation["enamel_suggeres"] = ["L-8", "L-9", "L-10"]
    elif groupe == "A2":
        recommandation["stains_suggeres"] = ["SPS-7", "SPS-8", "SPS-13"]  # Jaune, orange, brun
        recommandation["enamel_suggeres"] = ["L-6", "L-8", "L-9"]
    elif groupe == "A3":
        recommandation["stains_suggeres"] = ["SPS-8", "SPS-13", "SPS-19", "SPS-20"]  # Orange, brun, gris, brun foncé
        recommandation["enamel_suggeres"] = ["L-3", "L-6", "L-OP"]
    
    return recommandation
