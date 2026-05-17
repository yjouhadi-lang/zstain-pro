# Logiciel de Détermination de la Relevée

Application de base pour la détermination et le calcul de relevées topographiques et géométriques.

## Structure du projet

```
releve_app/
├── models/          # Classes de données (Point, Alignement, Releve)
├── services/        # Logique métier et calculs
├── gui/             # Interface utilisateur
├── utils/           # Utilitaires
└── tests/           # Tests unitaires
```

## Fonctionnalités

### Module Topographie
- Gestion des points (coordonnées, altitudes)
- Calcul d'alignements et de distances
- Détermination de relevées
- Visualisation graphique
- Export des résultats

### Module Zstain Pro (Colorimétrie Dentaire)
- **Matching colorimétrique**: Comparaison des coordonnées Lab avec les références du teintier
- **Calcul ΔE**: Écart colorimétrique CIE76 et CIEDE2000
- **Closest match**: Détermination automatique de la pastille la plus proche
- **Effort de saturation**: Quantification de l'écart de chroma nécessaire
- **Suggestions de maquillage**: Recommandations de layering pour zircone

## Installation

```bash
pip install -r requirements.txt
```

## Lancement

```bash
# Interface graphique PyQt6 (desktop)
python3 -m releve_app.main

# Interface web (navigateur)
python3 -m releve_app.main --web

# Exemple topographique (CLI)
python3 -m releve_app.main --example

# Exemple colorimétrique Zstain Pro (CLI)
python3 -m releve_app.main --color
```

## Tests

```bash
python3 -m pytest releve_app/tests/
```

## Utilisation du module Zstain Pro

1. **Mesurer la couleur** du patient avec un spectrophotomètre ou un teintier
2. **Saisir les coordonnées Lab** (L*, a*, b*) dans l'onglet Zstain Pro
3. **Cliquer sur "Trouver le match"** pour obtenir:
   - La référence Zstain la plus proche
   - Le ΔE (écart colorimétrique)
   - L'effort de saturation nécessaire
   - Une suggestion de stratégie de maquillage
4. **Exporter le rapport** pour documentation
