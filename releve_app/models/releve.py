"""
Modèle de données pour une opération de relevé.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from datetime import datetime
from .point import Point
from .alignement import Alignement


@dataclass
class Observation:
    """
    Représente une observation stationnaire (mesure depuis une station).
    
    Attributes:
        station: Point de station
        visee: Point visé
        angle_horizontal: Angle horizontal en grades
        angle_vertical: Angle vertical en grades (optionnel)
        distance_inclinee: Distance inclinée en mètres (optionnelle)
        distance_horizontale: Distance horizontale en mètres (optionnelle)
        denivelee: DéniVélation en mètres (optionnelle)
        hauteur_instrument: Hauteur de l'instrument en mètres
        hauteur_visee: Hauteur de la visée en mètres
    """
    station: Point
    visee: Point
    angle_horizontal: Optional[float] = None
    angle_vertical: Optional[float] = None
    distance_inclinee: Optional[float] = None
    distance_horizontale: Optional[float] = None
    denivelee: Optional[float] = None
    hauteur_instrument: float = 0.0
    hauteur_visee: float = 0.0

    def calculer_gh(self) -> Optional[float]:
        """Calcule le gisement de la visée si l'angle horizontal est connu."""
        if self.angle_horizontal is None:
            return None
        g_station = self.station.gisement(self.visee)
        return (g_station + self.angle_horizontal) % 400


@dataclass
class Releve:
    """
    Représente une opération complète de relevé.
    
    Attributes:
        nom: Nom de l'opération de relevé
        date: Date de l'opération
        points: Liste des points du relevé
        observations: Liste des observations
        alignements: Liste des alignements calculés
        description: Description de l'opération
    """
    nom: str
    date: datetime = field(default_factory=datetime.now)
    points: List[Point] = field(default_factory=list)
    observations: List[Observation] = field(default_factory=list)
    alignements: List[Alignement] = field(default_factory=list)
    description: Optional[str] = None

    def ajouter_point(self, point: Point) -> None:
        """Ajoute un point au relevé."""
        self.points.append(point)

    def ajouter_observation(self, observation: Observation) -> None:
        """Ajoute une observation au relevé."""
        self.observations.append(observation)

    def ajouter_alignement(self, alignement: Alignement) -> None:
        """Ajoute un alignement au relevé."""
        self.alignements.append(alignement)

    def get_point_by_id(self, point_id: str) -> Optional[Point]:
        """Recherche un point par son identifiant."""
        for point in self.points:
            if point.id == point_id:
                return point
        return None

    def calculer_cheminement(self) -> List[Point]:
        """
        Calcule les coordonnées des points par cheminement
        à partir des observations.
        """
        # TODO: Implémenter le calcul de cheminement
        return self.points

    def statistiques(self) -> Dict[str, float]:
        """Calcule des statistiques de base sur le relevé."""
        if not self.points:
            return {}
        
        xs = [p.x for p in self.points]
        ys = [p.y for p in self.points]
        zs = [p.z for p in self.points if p.z is not None]
        
        stats = {
            'nombre_points': len(self.points),
            'x_min': min(xs),
            'x_max': max(xs),
            'y_min': min(ys),
            'y_max': max(ys),
            'etendue_x': max(xs) - min(xs),
            'etendue_y': max(ys) - min(ys),
        }
        
        if zs:
            stats['z_min'] = min(zs)
            stats['z_max'] = max(zs)
            stats['etendue_z'] = max(zs) - min(zs)
        
        return stats

    def __str__(self) -> str:
        return f"Releve({self.nom}: {len(self.points)} points, {len(self.observations)} observations)"
