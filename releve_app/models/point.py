"""
Modèle de données pour un point topographique.
"""
from dataclasses import dataclass, field
from typing import Optional
import math


@dataclass
class Point:
    """
    Représente un point dans un système de coordonnées.
    
    Attributes:
        id: Identifiant unique du point
        x: Coordonnée X (abscisse)
        y: Coordonnée Y (ordonnée)
        z: Coordonnée Z (altitude, optionnelle)
        code: Code ou description du point
    """
    id: str
    x: float
    y: float
    z: Optional[float] = None
    code: Optional[str] = None

    def distance_2d(self, other: 'Point') -> float:
        """Calcule la distance horizontale entre deux points."""
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    def distance_3d(self, other: 'Point') -> float:
        """Calcule la distance spatiale entre deux points."""
        dx = self.x - other.x
        dy = self.y - other.y
        dz = (self.z or 0) - (other.z or 0)
        return math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)

    def gisement(self, other: 'Point') -> float:
        """
        Calcule le gisement (azimut) de l'autre point par rapport à ce point.
        Retourne l'angle en grades (0 à 400).
        """
        dx = other.x - self.x
        dy = other.y - self.y
        
        if dx == 0 and dy == 0:
            raise ValueError("Les deux points sont identiques")
        
        # Calcul en radians puis conversion en grades
        angle_rad = math.atan2(dy, dx)
        angle_grad = angle_rad * 200 / math.pi
        
        # Normalisation entre 0 et 400 grades
        while angle_grad < 0:
            angle_grad += 400
        while angle_grad >= 400:
            angle_grad -= 400
            
        return angle_grad

    def __str__(self) -> str:
        if self.z is not None:
            return f"Point({self.id}: X={self.x:.3f}, Y={self.y:.3f}, Z={self.z:.3f})"
        return f"Point({self.id}: X={self.x:.3f}, Y={self.y:.3f})"
