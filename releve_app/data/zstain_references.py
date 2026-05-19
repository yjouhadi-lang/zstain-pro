"""
Données de référence du teintier Zstain Pro.

Ce module contient les coordonnées Lab (CIELAB) des pastilles de référence
du Zstain Pro, issues du tableau fourni par l'utilisateur (image de référence).

Tableau de référence officiel (8 pastilles):
- A1L0, A1L1, A1L2 (groupe A1)
- A2L0, A2L1 (groupe A2)
- A3L0, A3L1, A3L2 (groupe A3)
"""
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ZstainReference:
    """
    Représente une pastille de référence Zstain Pro avec ses coordonnées Lab.

    Attributes:
        code: Code de la pastille (ex: A1L0, A2L1, ...)
        description: Description de la pastille
        L: Luminosité L* (0 = noir, 100 = blanc)
        a: Composante rouge-vert a* (+ = rouge, - = vert)
        b: Composante jaune-bleu b* (+ = jaune, - = bleu)
        deltaE_consecutif: ΔE par rapport à la pastille précédente
    """
    code: str
    description: str
    L: float
    a: float
    b: float
    deltaE_consecutif: Optional[float] = None

    @property
    def groupe(self) -> str:
        """Groupe de teinte (A1, A2, A3)."""
        return self.code[:2]

    @property
    def niveau(self) -> int:
        """Niveau de maquillage (0, 1, 2)."""
        return int(self.code[3:])

    @property
    def chroma(self) -> float:
        """Chroma C* = sqrt(a*² + b*²) - intensité de saturation."""
        return (self.a ** 2 + self.b ** 2) ** 0.5

    @property
    def hue_angle(self) -> float:
        """Angle de teinte h° = atan2(b*, a*) en degrés."""
        import math
        angle = math.degrees(math.atan2(self.b, self.a))
        return angle if angle >= 0 else angle + 360

    def __str__(self) -> str:
        return f"{self.code}: L*={self.L:.2f} a*={self.a:.2f} b*={self.b:.2f} (C*={self.chroma:.2f})"


# ============================================================================
# TABLEAU DE RÉFÉRENCE ZSTAIN PRO (source: image fournie par l'utilisateur)
# ============================================================================
ZSTAIN_REFERENCES: List[ZstainReference] = [
    # --- GROUPE A1 ---
    ZstainReference(
        code="A1L0",
        description="Pastille brute A1 (niveau 0)",
        L=85.47,
        a=1.87,
        b=18.55,
        deltaE_consecutif=None,
    ),
    ZstainReference(
        code="A1L1",
        description="A1 - 1ère couche de maquillage",
        L=84.43,
        a=2.15,
        b=17.17,
        deltaE_consecutif=1.27,
    ),
    ZstainReference(
        code="A1L2",
        description="A1 - 2ème couche de maquillage",
        L=83.94,
        a=2.49,
        b=17.77,
        deltaE_consecutif=1.70,
    ),
    # --- GROUPE A2 ---
    ZstainReference(
        code="A2L0",
        description="Pastille brute A2 (niveau 0)",
        L=82.80,
        a=2.41,
        b=19.70,
        deltaE_consecutif=None,
    ),
    ZstainReference(
        code="A2L1",
        description="A2 - 1ère couche de maquillage",
        L=82.37,
        a=2.97,
        b=22.07,
        deltaE_consecutif=2.46,
    ),
    # --- GROUPE A3 ---
    ZstainReference(
        code="A3L0",
        description="Pastille brute A3 (niveau 0)",
        L=81.23,
        a=4.47,
        b=21.90,
        deltaE_consecutif=None,
    ),
    ZstainReference(
        code="A3L1",
        description="A3 - 1ère couche de maquillage",
        L=78.88,
        a=5.77,
        b=23.50,
        deltaE_consecutif=3.00,
    ),
    ZstainReference(
        code="A3L2",
        description="A3 - 2ème couche de maquillage",
        L=77.13,
        a=5.47,
        b=25.48,
        deltaE_consecutif=3.20,
    ),
]


# ============================================================================
# PROTOCOLE DE MAQUILLAGE STANDARDISÉ
# Source: VF rub III Prof joe V10++ - Table 6
# ============================================================================
PROTOCOLE_MAQUILLAGE = {
    0: {
        "preparation": "Nettoyage IPA 96 %",
        "couches": "Aucune",
        "produit": "—",
        "controle": "—",
        "cuisson": "Glaçage seul (Lustre NL)",
    },
    1: {
        "preparation": "Nettoyage IPA 96 %",
        "couches": "1 couche Body Stain (teinte correspondante)",
        "produit": "GC Initial IQ Lustre Pastes ONE",
        "controle": "Mesure Optishade (ΔE cible = 1.2 à 1.5)",
        "cuisson": "1 cuisson effets + glaçage",
    },
    2: {
        "preparation": "Nettoyage IPA 96 %",
        "couches": "2 couches Body Stain successives",
        "produit": "GC Initial IQ Lustre Pastes ONE",
        "controle": "Mesure Optishade (ΔE cible = 1.2 à 1.5)",
        "cuisson": "2 cuissons effets + glaçage",
    },
}


def get_reference_by_code(code: str) -> Optional[ZstainReference]:
    """Recherche une référence par son code."""
    for ref in ZSTAIN_REFERENCES:
        if ref.code == code:
            return ref
    return None


def get_references_by_group(group: str) -> List[ZstainReference]:
    """Retourne les références d'un groupe (A1, A2, A3)."""
    return [ref for ref in ZSTAIN_REFERENCES if ref.code.startswith(group)]


def get_references_by_niveau(niveau: int) -> List[ZstainReference]:
    """Retourne les références d'un niveau de maquillage (0, 1, 2)."""
    return [ref for ref in ZSTAIN_REFERENCES if ref.niveau == niveau]


def get_all_groups() -> List[str]:
    """Retourne la liste des groupes disponibles."""
    groups = set()
    for ref in ZSTAIN_REFERENCES:
        groups.add(ref.groupe)
    return sorted(groups)


# ============================================================================
# SPANS calculés dynamiquement à partir des coordonnées Lab du tableau
# ============================================================================
import math


def _calculer_span(code1: str, code2: str) -> float:
    """Calcule le ΔE CIE76 entre deux références."""
    r1 = get_reference_by_code(code1)
    r2 = get_reference_by_code(code2)
    if r1 is None or r2 is None:
        return 0.0
    return math.sqrt(
        (r1.L - r2.L) ** 2 +
        (r1.a - r2.a) ** 2 +
        (r1.b - r2.b) ** 2
    )


ZSTAIN_SPANS = {
    "A1L0 → A2L0": {
        "deltaE": _calculer_span("A1L0", "A2L0"),
        "description": "Span A1/A2",
        "niveaux_intermediaires": ["A1L1", "A1L2"],
    },
    "A2L0 → A3L0": {
        "deltaE": _calculer_span("A2L0", "A3L0"),
        "description": "Span A2/A3",
        "niveaux_intermediaires": ["A2L1"],
    },
}


def get_protocole(niveau: int) -> dict:
    """Retourne le protocole de maquillage pour un niveau donné."""
    return PROTOCOLE_MAQUILLAGE.get(niveau, {})
