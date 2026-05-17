"""
Utilitaires de calcul géométrique pour les relevés.
"""
import math
from typing import List, Optional, Tuple
from ..models.point import Point


class GeometryService:
    """Service de calculs géométriques de base."""

    @staticmethod
    def angle_to_gradients(angle_degrees: float) -> float:
        """Convertit des degrés en grades."""
        return angle_degrees * 400 / 360

    @staticmethod
    def gradients_to_angle(angle_gradients: float) -> float:
        """Convertit des grades en degrés."""
        return angle_gradients * 360 / 400

    @staticmethod
    def radians_to_gradients(angle_radians: float) -> float:
        """Convertit des radians en grades."""
        return angle_radians * 200 / math.pi

    @staticmethod
    def gradients_to_radians(angle_gradients: float) -> float:
        """Convertit des grades en radians."""
        return angle_gradients * math.pi / 200

    @staticmethod
    def distance_point_droite(point: Point, 
                               point_droite1: Point, 
                               point_droite2: Point) -> float:
        """
        Calcule la distance d'un point à une droite définie par deux points.
        """
        x0, y0 = point.x, point.y
        x1, y1 = point_droite1.x, point_droite1.y
        x2, y2 = point_droite2.x, point_droite2.y
        
        numer = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        denom = math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
        
        if denom == 0:
            raise ValueError("Les deux points de la droite sont identiques")
        
        return numer / denom

    @staticmethod
    def intersection_droites(p1: Point, p2: Point, p3: Point, p4: Point) -> Optional[Point]:
        """
        Calcule le point d'intersection de deux droites définies par
        (p1, p2) et (p3, p4).
        Retourne None si les droites sont parallèles.
        """
        x1, y1 = p1.x, p1.y
        x2, y2 = p2.x, p2.y
        x3, y3 = p3.x, p3.y
        x4, y4 = p4.x, p4.y
        
        denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        
        if abs(denom) < 1e-10:
            return None  # Droites parallèles
        
        x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom
        y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom
        
        return Point(id="Intersection", x=x, y=y)

    @staticmethod
    def surface_polygone(points: List[Point]) -> float:
        """
        Calcule la surface d'un polygone défini par une liste de points
        (formule du shoelace).
        """
        if len(points) < 3:
            return 0.0
        
        n = len(points)
        surface = 0.0
        
        for i in range(n):
            j = (i + 1) % n
            surface += points[i].x * points[j].y
            surface -= points[j].x * points[i].y
        
        return abs(surface) / 2.0

    @staticmethod
    def centre_gravite(points: List[Point]) -> Point:
        """Calcule le centre de gravité d'un ensemble de points."""
        if not points:
            raise ValueError("La liste de points est vide")
        
        n = len(points)
        x = sum(p.x for p in points) / n
        y = sum(p.y for p in points) / n
        
        zs = [p.z for p in points if p.z is not None]
        z = sum(zs) / len(zs) if zs else None
        
        return Point(id="CentreGravite", x=x, y=y, z=z)

    @staticmethod
    def angle_entre_3points(p1: Point, sommet: Point, p2: Point) -> float:
        """
        Calcule l'angle entre trois points (p1, sommet, p2) en grades.
        """
        v1x = p1.x - sommet.x
        v1y = p1.y - sommet.y
        v2x = p2.x - sommet.x
        v2y = p2.y - sommet.y
        
        dot = v1x * v2x + v1y * v2y
        det = v1x * v2y - v1y * v2x
        
        angle_rad = math.atan2(det, dot)
        angle_grad = GeometryService.radians_to_gradients(angle_rad)
        
        return abs(angle_grad)
