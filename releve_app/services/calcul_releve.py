"""
Service de calcul pour les opérations de relevé.
"""
import math
from typing import List, Optional, Tuple
from ..models.point import Point
from ..models.alignement import Alignement
from ..models.releve import Releve, Observation
from .geometry import GeometryService


class CalculReleveService:
    """Service de calcul pour les relevés topographiques."""

    @staticmethod
    def calculer_coord_from_observation(obs: Observation) -> Optional[Point]:
        """
        Calcule les coordonnées du point visé à partir d'une observation
        polaire (angles + distance).
        """
        if obs.angle_horizontal is None:
            return None
        
        g = obs.station.gisement(obs.visee)
        
        if obs.distance_horizontale is not None:
            dh = obs.distance_horizontale
        elif obs.distance_inclinee is not None and obs.angle_vertical is not None:
            av_rad = GeometryService.gradients_to_radians(obs.angle_vertical)
            dh = obs.distance_inclinee * math.sin(av_rad)
        else:
            return None
        
        g_rad = GeometryService.gradients_to_radians(g)
        x = obs.station.x + dh * math.cos(g_rad)
        y = obs.station.y + dh * math.sin(g_rad)
        
        # Calcul de Z
        z = None
        if obs.denivelee is not None:
            z = obs.station.z + obs.denivelee if obs.station.z is not None else None
        elif obs.distance_inclinee is not None and obs.angle_vertical is not None:
            av_rad = GeometryService.gradients_to_radians(obs.angle_vertical)
            dz = obs.distance_inclinee * math.cos(av_rad) + obs.hauteur_instrument - obs.hauteur_visee
            z = obs.station.z + dz if obs.station.z is not None else None
        
        return Point(id=obs.visee.id, x=x, y=y, z=z)

    @staticmethod
    def intersection_visualisation(p1: Point, g1: float, 
                                   p2: Point, g2: float) -> Optional[Point]:
        """
        Calcule le point d'intersection de deux visualisations (intersection
        à l'estime ou intersection directe).
        
        Args:
            p1: Station 1
            g1: Gisement depuis la station 1 en grades
            p2: Station 2
            g2: Gisement depuis la station 2 en grades
        """
        g1_rad = GeometryService.gradients_to_radians(g1)
        g2_rad = GeometryService.gradients_to_radians(g2)
        
        # Direction des visualisations
        dx1 = math.cos(g1_rad)
        dy1 = math.sin(g1_rad)
        dx2 = math.cos(g2_rad)
        dy2 = math.sin(g2_rad)
        
        denom = dx1 * dy2 - dy1 * dx2
        
        if abs(denom) < 1e-10:
            return None  # Visualisations parallèles
        
        dx = p2.x - p1.x
        dy = p2.y - p1.y
        
        t = (dx * dy2 - dy * dx2) / denom
        
        x = p1.x + t * dx1
        y = p1.y + t * dy1
        
        return Point(id="IntersectionVisu", x=x, y=y)

    @staticmethod
    def cheminement_ferme(points_connus: List[Point],
                          observations: List[Observation]) -> List[Point]:
        """
        Calcule un cheminement fermé (boucle) à partir de points connus
        et d'observations.
        
        TODO: Implémentation complète avec compensation.
        """
        points_calcules = []
        
        for obs in observations:
            pt = CalculReleveService.calculer_coord_from_observation(obs)
            if pt:
                points_calcules.append(pt)
        
        return points_calcules

    @staticmethod
    def nivellement_simple(observations: List[Observation]) -> List[Tuple[Point, float]]:
        """
        Calcule les altitudes par nivellement simple.
        
        Returns:
            Liste de tuples (point, altitude calculée)
        """
        resultats = []
        
        for obs in observations:
            if obs.station.z is not None and obs.denivelee is not None:
                z_calc = obs.station.z + obs.denivelee
                resultats.append((obs.visee, z_calc))
        
        return resultats

    @staticmethod
    def generate_report(releve: Releve) -> str:
        """
        Génère un rapport textuel du relevé.
        """
        lines = []
        lines.append("=" * 60)
        lines.append(f"RAPPORT DE RELEVÉ: {releve.nom}")
        lines.append(f"Date: {releve.date.strftime('%d/%m/%Y %H:%M')}")
        lines.append("=" * 60)
        lines.append("")
        
        # Statistiques
        stats = releve.statistiques()
        if stats:
            lines.append("STATISTIQUES")
            lines.append("-" * 40)
            for key, value in stats.items():
                lines.append(f"  {key}: {value:.3f}" if isinstance(value, float) else f"  {key}: {value}")
            lines.append("")
        
        # Points
        if releve.points:
            lines.append("POINTS")
            lines.append("-" * 40)
            for point in releve.points:
                lines.append(f"  {point}")
            lines.append("")
        
        # Alignements
        if releve.alignements:
            lines.append("ALIGNEMENTS")
            lines.append("-" * 40)
            for align in releve.alignements:
                lines.append(f"  {align}")
            lines.append("")
        
        lines.append("=" * 60)
        return "\n".join(lines)
