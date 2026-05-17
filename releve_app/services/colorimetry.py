"""
Service de calcul colorimétrique pour le teintier Zstain Pro.

Fournit les outils de calcul d'écarts colorimétriques (ΔE) et de matching
entre une couleur mesurée et les références du teintier.

Basé sur le document: VF rub III Prof joe V10++
"""
import math
from dataclasses import dataclass
from typing import List, Optional, Tuple
from ..data.zstain_references import (
    ZSTAIN_REFERENCES, ZSTAIN_SPANS, PROTOCOLE_MAQUILLAGE,
    get_reference_by_code, get_protocole
)


@dataclass
class ColorMatchResult:
    """
    Résultat d'une analyse de matching colorimétrique Zstain Pro.
    """
    measured_L: float
    measured_a: float
    measured_b: float
    best_match: 'ZstainReference'  # type: ignore
    deltaE: float
    deltaL: float
    deltaa: float
    deltab: float
    deltaC: float
    deltaH: float
    effort_saturation: float
    saturation_direction: str
    all_matches: List[Tuple['ZstainReference', float]]  # type: ignore

    @property
    def measured_chroma(self) -> float:
        """Chroma de la couleur mesurée."""
        return math.sqrt(self.measured_a ** 2 + self.measured_b ** 2)

    def __str__(self) -> str:
        lines = [
            "=" * 60,
            "RÉSULTAT DU MATCHING COLORIMÉTRIQUE ZSTAIN PRO",
            "=" * 60,
            f"",
            f"COULEUR MESURÉE (Dent du patient):",
            f"  L* = {self.measured_L:.2f}",
            f"  a* = {self.measured_a:.2f}",
            f"  b* = {self.measured_b:.2f}",
            f"  C* = {self.measured_chroma:.2f}",
            f"",
            f"RÉFÉRENCE ZSTAIN LA PLUS PROCHE: {self.best_match.code}",
            f"  {self.best_match.description}",
            f"  L* = {self.best_match.L:.2f}",
            f"  a* = {self.best_match.a:.2f}",
            f"  b* = {self.best_match.b:.2f}",
            f"  C* = {self.best_match.chroma:.2f}",
            f"",
            f"ÉCARTS COLORIMÉTRIQUES:",
            f"  ΔE  (écart total)    = {self.deltaE:.2f}",
            f"  ΔL* (luminosité)     = {self.deltaL:+.2f} {'→ plus clair' if self.deltaL > 0 else '→ plus foncé' if self.deltaL < 0 else ''}",
            f"  Δa* (rouge-vert)     = {self.deltaa:+.2f} {'→ plus rouge' if self.deltaa > 0 else '→ plus vert' if self.deltaa < 0 else ''}",
            f"  Δb* (jaune-bleu)     = {self.deltab:+.2f} {'→ plus jaune' if self.deltab > 0 else '→ plus bleu' if self.deltab < 0 else ''}",
            f"  ΔC* (chroma/sat)     = {self.deltaC:+.2f}",
            f"  ΔH* (teinte)         = {self.deltaH:.2f}",
            f"",
            f"EFFORT DE SATURATION:",
            f"  Valeur: {self.effort_saturation:.2f}%",
            f"  Direction: {self.saturation_direction}",
            f"",
            f"CLASSEMENT DES MATCHES:",
        ]
        for i, (ref, de) in enumerate(self.all_matches[:5], 1):
            marker = " ★ CHOIX" if i == 1 else ""
            lines.append(f"  {i}. {ref.code} ({ref.groupe} L{ref.niveau}) - ΔE = {de:.2f}{marker}")
        lines.append("=" * 60)
        return "\n".join(lines)


class ColorimetryService:
    """Service de calculs colorimétriques pour Zstain Pro."""

    @staticmethod
    def deltaE_cie76(L1: float, a1: float, b1: float,
                     L2: float, a2: float, b2: float) -> float:
        """
        Calcule le ΔE CIE76 entre deux couleurs Lab.
        Formule utilisée dans le développement du Zstain Pro.
        """
        dL = L2 - L1
        da = a2 - a1
        db = b2 - b1
        return math.sqrt(dL ** 2 + da ** 2 + db ** 2)

    @staticmethod
    def deltaE_ciede2000(L1: float, a1: float, b1: float,
                         L2: float, a2: float, b2: float,
                         kl: float = 1.0, kc: float = 1.0, kh: float = 1.0) -> float:
        """
        Calcule le ΔE CIEDE2000 entre deux couleurs Lab.
        Plus précis pour les petits écarts colorimétriques.
        """
        C1 = math.sqrt(a1**2 + b1**2)
        C2 = math.sqrt(a2**2 + b2**2)
        C_bar = (C1 + C2) / 2.0
        G = 0.5 * (1 - math.sqrt(C_bar**7 / (C_bar**7 + 25**7)))
        a1_prime = a1 * (1 + G)
        a2_prime = a2 * (1 + G)
        C1_prime = math.sqrt(a1_prime**2 + b1**2)
        C2_prime = math.sqrt(a2_prime**2 + b2**2)
        h1_prime = math.degrees(math.atan2(b1, a1_prime))
        h1_prime = h1_prime if h1_prime >= 0 else h1_prime + 360
        h2_prime = math.degrees(math.atan2(b2, a2_prime))
        h2_prime = h2_prime if h2_prime >= 0 else h2_prime + 360
        dL_prime = L2 - L1
        dC_prime = C2_prime - C1_prime
        dh_prime = 0.0
        if C1_prime * C2_prime != 0:
            if abs(h2_prime - h1_prime) <= 180:
                dh_prime = h2_prime - h1_prime
            elif h2_prime - h1_prime > 180:
                dh_prime = h2_prime - h1_prime - 360
            else:
                dh_prime = h2_prime - h1_prime + 360
        dH_prime = 2 * math.sqrt(C1_prime * C2_prime) * math.sin(math.radians(dh_prime / 2))
        L_bar_prime = (L1 + L2) / 2.0
        C_bar_prime = (C1_prime + C2_prime) / 2.0
        H_bar_prime = h1_prime + h2_prime
        if C1_prime * C2_prime != 0:
            if abs(h1_prime - h2_prime) <= 180:
                H_bar_prime = (h1_prime + h2_prime) / 2.0
            elif h1_prime + h2_prime < 360:
                H_bar_prime = (h1_prime + h2_prime + 360) / 2.0
            else:
                H_bar_prime = (h1_prime + h2_prime - 360) / 2.0
        T = (1 - 0.17 * math.cos(math.radians(H_bar_prime - 30))
             + 0.24 * math.cos(math.radians(2 * H_bar_prime))
             + 0.32 * math.cos(math.radians(3 * H_bar_prime + 6))
             - 0.20 * math.cos(math.radians(4 * H_bar_prime - 63)))
        SL = 1 + (0.015 * (L_bar_prime - 50)**2) / math.sqrt(20 + (L_bar_prime - 50)**2)
        SC = 1 + 0.045 * C_bar_prime
        SH = 1 + 0.015 * C_bar_prime * T
        dtheta = 30 * math.exp(-((H_bar_prime - 275) / 25)**2)
        RC = 2 * math.sqrt(C_bar_prime**7 / (C_bar_prime**7 + 25**7))
        RT = -math.sin(math.radians(2 * dtheta)) * RC
        term1 = dL_prime / (kl * SL)
        term2 = dC_prime / (kc * SC)
        term3 = dH_prime / (kh * SH)
        deltaE = math.sqrt(term1**2 + term2**2 + term3**2 + RT * term2 * term3)
        return deltaE

    @staticmethod
    def chroma(a: float, b: float) -> float:
        """Calcule le chroma C* = sqrt(a*² + b*²)."""
        return math.sqrt(a**2 + b**2)

    @staticmethod
    def hue_angle(a: float, b: float) -> float:
        """Calcule l'angle de teinte h° en degrés."""
        angle = math.degrees(math.atan2(b, a))
        return angle if angle >= 0 else angle + 360

    @staticmethod
    def find_closest_match(L: float, a: float, b: float,
                           use_ciede2000: bool = True) -> ColorMatchResult:
        """
        Trouve la référence Zstain la plus proche d'une couleur mesurée.
        """
        measured_chroma = ColorimetryService.chroma(a, b)
        matches: List[Tuple] = []
        
        for ref in ZSTAIN_REFERENCES:
            if use_ciede2000:
                de = ColorimetryService.deltaE_ciede2000(L, a, b, ref.L, ref.a, ref.b)
            else:
                de = ColorimetryService.deltaE_cie76(L, a, b, ref.L, ref.a, ref.b)
            matches.append((ref, de))
        
        matches.sort(key=lambda x: x[1])
        best_match, best_deltaE = matches[0]
        
        deltaL = L - best_match.L
        deltaa = a - best_match.a
        deltab = b - best_match.b
        deltaC = measured_chroma - best_match.chroma
        
        de76 = ColorimetryService.deltaE_cie76(L, a, b, best_match.L, best_match.a, best_match.b)
        deltaH_sq = de76**2 - deltaL**2 - deltaC**2
        deltaH = math.sqrt(max(0, deltaH_sq))
        
        if best_match.chroma > 0:
            effort_saturation = abs(deltaC) / best_match.chroma * 100
        else:
            effort_saturation = 0.0
        
        if deltaC > 0.5:
            saturation_direction = "Augmenter la saturation (plus chromatique)"
        elif deltaC < -0.5:
            saturation_direction = "Diminuer la saturation (moins chromatique)"
        else:
            saturation_direction = "Saturation quasi identique"
        
        return ColorMatchResult(
            measured_L=L, measured_a=a, measured_b=b,
            best_match=best_match, deltaE=best_deltaE,
            deltaL=deltaL, deltaa=deltaa, deltab=deltab,
            deltaC=deltaC, deltaH=deltaH,
            effort_saturation=effort_saturation,
            saturation_direction=saturation_direction,
            all_matches=matches,
        )

    @staticmethod
    def interpret_deltaE(deltaE: float) -> str:
        """Interprète la valeur de ΔE en termes de perceptibilité."""
        if deltaE < 1.0:
            return "Imperceptible - Accord colorimétrique parfait"
        elif deltaE < 1.2:
            return "Très faible - Seuil de perceptibilité (PT)"
        elif deltaE < 2.0:
            return "Faible - Perceptible par un observateur entraîné"
        elif deltaE < 3.5:
            return "Modéré - Perceptible par un observateur moyen"
        elif deltaE < 5.0:
            return "Moyen - Différence visible"
        else:
            return "Fort - Couleurs clairement différentes"

    @staticmethod
    def suggest_zirconia_layering(result: ColorMatchResult) -> str:
        """
        Génère une suggestion de stratégie de maquillage zircone complète
        basée sur le document VF rub III Prof joe V10++.
        """
        best = result.best_match
        groupe = best.groupe
        niveau = best.niveau
        protocole = get_protocole(niveau)
        
        lines = [
            "=" * 60,
            "SUGGESTION DE STRATÉGIE DE MAQUILLAGE ZIRCONE",
            "Basée sur le protocole Zstain Pro (VF rub III Prof joe V10++)",
            "=" * 60,
            f"",
            f"► RÉFÉRENCE IDENTIFIÉE: {best.code}",
            f"  Groupe de teinte: {groupe}",
            f"  Niveau: L{niveau}",
            f"  Description: {best.description}",
            f"",
            f"► QUALITÉ DU MATCH: {ColorimetryService.interpret_deltaE(result.deltaE)}",
            f"  ΔE = {result.deltaE:.2f}",
            f"",
            f"► ÉCARTS À COMPENSER:",
        ]
        
        # Analyse détaillée des écarts
        if abs(result.deltaL) > 0.5:
            if result.deltaL > 0:
                lines.append(f"  • La dent est PLUS CLAIRE de {abs(result.deltaL):.2f} L*")
                lines.append(f"    → Choisir un disque zircone légèrement plus clair")
            else:
                lines.append(f"  • La dent est PLUS FONCÉE de {abs(result.deltaL):.2f} L*")
                lines.append(f"    → Choisir un disque zircone légèrement plus foncé")
        
        if abs(result.deltaC) > 0.5:
            if result.deltaC > 0:
                lines.append(f"  • La dent est PLUS SATURÉE de {abs(result.deltaC):.2f} C*")
                lines.append(f"    → Augmenter légèrement la concentration de Body Stain")
            else:
                lines.append(f"  • La dent est MOINS SATURÉE de {abs(result.deltaC):.2f} C*")
                lines.append(f"    → Réduire légèrement la concentration de Body Stain")
        
        if abs(result.deltaH) > 1.0:
            lines.append(f"  • Décalage de teinte ΔH* = {result.deltaH:.2f}")
            lines.append(f"    → Ajuster le mélange de pigments (jaune/rouge)")
        
        # Protocole standard
        lines.extend([
            f"",
            f"► PROTOCOLE DE MAQUILLAGE STANDARDISÉ (Niveau L{niveau}):",
            f"  ─────────────────────────────────────────",
            f"  Préparation:     {protocole.get('preparation', 'N/A')}",
            f"  Produit:         {protocole.get('produit', 'N/A')}",
            f"  Application:     {protocole.get('couches', 'N/A')}",
            f"  Outil:           Pinceau n°2",
            f"  Contrôle:        {protocole.get('controle', 'N/A')}",
            f"  Cuisson:         {protocole.get('cuisson', 'N/A')}",
            f"  Four:            Artis®",
            f"",
        ])
        
        # Recommandation spécifique selon le niveau
        if niveau == 0:
            lines.extend([
                f"► INSTRUCTIONS CLINIQUES:",
                f"  • Utiliser le disque zircone {groupe} (4Y-PSZ Cercon ht ML)",
                f"  • Usiner la prothèse en CAD/CAM",
                f"  • Frittage selon protocole fabricant",
                f"  • Appliquer le glaçage Lustre NL uniquement",
                f"  • AUCUN maquillage de saturation nécessaire",
            ])
        elif niveau == 1:
            lines.extend([
                f"► INSTRUCTIONS CLINIQUES:",
                f"  • Utiliser le disque zircone {groupe} (4Y-PSZ Cercon ht ML)",
                f"  • Usiner la prothèse en CAD/CAM",
                f"  • Frittage selon protocole fabricant",
                f"  • Nettoyer à l'IPA 96%",
                f"  • Appliquer 1 couche de Body Stain {groupe}",
                f"  • Contrôler avec l'Optishade (ΔE cible: 1.2-1.5)",
                f"  • Cuisson effets + glaçage Lustre NL",
            ])
        elif niveau == 2:
            lines.extend([
                f"► INSTRUCTIONS CLINIQUES:",
                f"  • Utiliser le disque zircone {groupe} (4Y-PSZ Cercon ht ML)",
                f"  • Usiner la prothèse en CAD/CAM",
                f"  • Frittage selon protocole fabricant",
                f"  • Nettoyer à l'IPA 96%",
                f"  • Appliquer la 1ère couche de Body Stain {groupe}",
                f"  • 1ère cuisson effets",
                f"  • Appliquer la 2ème couche de Body Stain {groupe}",
                f"  • Contrôler avec l'Optishade (ΔE cible: 1.2-1.5)",
                f"  • 2ème cuisson effets + glaçage Lustre NL",
            ])
        
        # Effort de saturation
        lines.extend([
            f"",
            f"► EFFORT DE SATURATION ESTIMÉ: {result.effort_saturation:.1f}%",
            f"  ({result.saturation_direction})",
            f"",
            f"► SPANS DE RÉFÉRENCE:",
        ])
        
        for span_name, span_data in ZSTAIN_SPANS.items():
            if groupe in span_name:
                lines.append(f"  • {span_name}: ΔE = {span_data['deltaE']:.2f}")
                lines.append(f"    {span_data['description']}")
        
        lines.extend([
            f"",
            f"=" * 60,
        ])
        
        return "\n".join(lines)

    @staticmethod
    def generate_full_report(result: ColorMatchResult) -> str:
        """Génère un rapport complet combinant matching et suggestion."""
        return str(result) + "\n\n" + ColorimetryService.suggest_zirconia_layering(result)
