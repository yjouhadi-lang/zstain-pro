"""
Modèle de données pour un alignement.
"""
from dataclasses import dataclass
from typing import Optional, List
from .point import Point
import math


@dataclass
class Alignement:
    """
    Représente un alignement défini par deux points.
    
    Attributes:
        point_debut: Point de départ de l'alignement
        point_fin: Point d'arrivée de l'alignement
        nom: Nom ou description de l'alignement
    """
    point_debut: Point
    point_fin: Point
    nom: Optional[str] = None

    @property
    def longueur(self) -> float:
        """Longueur horizontale de l'alignement."""
        return self.point_debut.distance_2d(self.point_fin)

    @property
    def gisement(self) -> float:
        """Gisement de l'alignement en grades."""
        return self.point_debut.gisement(self.point_fin)

    @property
    def pente(self) -> Optional[float]:
        """Pente de l'alignement en %."""
        if self.point_debut.z is None or self.point_fin.z is None:
            return None
        dh = self.longueur
        if dh == 0:
            return None
        dz = self.point_fin.z - self.point_debut.z
        return (dz / dh) * 100

    def point_a_distance(self, distance: float) -> Point:
        """
        Calcule un point situé à une distance donnée depuis le point de début
        sur l'alignement.
        """
        g = self.gisement * math.pi / 200  # Conversion en radians
        x = self.point_debut.x + distance * math.cos(g)
        y = self.point_debut.y + distance * math.sin(g)
        
        # Interpolation linéaire de Z
        z = None
        if self.point_debut.z is not None and self.point_fin.z is not None:
            ratio = distance / self.longueur if self.longueur > 0 else 0
            z = self.point_debut.z + ratio * (self.point_fin.z - self.point_debut.z)
        
        return Point(
            id=f"P_{self.nom or 'align'}_{distance:.2f}",
            x=x,
            y=y,
            z=z
        )

    def projection(self, point: Point) -> Point:
        """
        Projette un point sur l'alignement.
        Retourne le projeté orthogonal du point sur la ligne.
        """
        # Vecteur directeur de l'alignement
        dx = self.point_fin.x - self.point_debut.x
        dy = self.point_fin.y - self.point_debut.y
        
        # Vecteur du point de début au point à projeter
        vx = point.x - self.point_debut.x
        vy = point.y - self.point_debut.y
        
        # Produit scalaire
        dot = vx * dx + vy * dy
        len_sq = dx ** 2 + dy ** 2
        
        if len_sq == 0:
            return self.point_debut
        
        # Paramètre de projection
        t = max(0, min(1, dot / len_sq))
        
        # Coordonnées du projeté
        x = self.point_debut.x + t * dx
        y = self.point_debut.y + t * dy
        
        return Point(
            id=f"Proj_{point.id}",
            x=x,
            y=y,
            z=point.z
        )

    def __str__(self) -> str:
        return f"Alignement({self.nom or 'sans nom'}: {self.point_debut.id} -> {self.point_fin.id}, L={self.longueur:.3f}m)"
