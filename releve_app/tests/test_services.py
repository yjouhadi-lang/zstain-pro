"""
Tests unitaires pour les services de calcul.
"""
import pytest
import math
from ..models.point import Point
from ..models.alignement import Alignement
from ..models.releve import Releve, Observation
from ..services.geometry import GeometryService
from ..services.calcul_releve import CalculReleveService


class TestGeometryService:
    """Tests pour le service de géométrie."""

    def test_conversion_degrees_gradients(self):
        assert abs(GeometryService.angle_to_gradients(90) - 100) < 1e-10
        assert abs(GeometryService.angle_to_gradients(180) - 200) < 1e-10

    def test_conversion_gradients_degrees(self):
        assert abs(GeometryService.gradients_to_angle(100) - 90) < 1e-10
        assert abs(GeometryService.gradients_to_angle(200) - 180) < 1e-10

    def test_distance_point_droite(self):
        p = Point(id="P", x=0.0, y=3.0)
        d1 = Point(id="D1", x=0.0, y=0.0)
        d2 = Point(id="D2", x=10.0, y=0.0)
        dist = GeometryService.distance_point_droite(p, d1, d2)
        assert abs(dist - 3.0) < 1e-10

    def test_intersection_droites(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=10.0, y=10.0)
        p3 = Point(id="C", x=0.0, y=10.0)
        p4 = Point(id="D", x=10.0, y=0.0)
        inter = GeometryService.intersection_droites(p1, p2, p3, p4)
        assert inter is not None
        assert abs(inter.x - 5.0) < 1e-10
        assert abs(inter.y - 5.0) < 1e-10

    def test_intersection_droites_paralleles(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=10.0, y=0.0)
        p3 = Point(id="C", x=0.0, y=5.0)
        p4 = Point(id="D", x=10.0, y=5.0)
        inter = GeometryService.intersection_droites(p1, p2, p3, p4)
        assert inter is None

    def test_surface_polygone_carre(self):
        points = [
            Point(id="A", x=0.0, y=0.0),
            Point(id="B", x=10.0, y=0.0),
            Point(id="C", x=10.0, y=10.0),
            Point(id="D", x=0.0, y=10.0),
        ]
        surface = GeometryService.surface_polygone(points)
        assert abs(surface - 100.0) < 1e-10

    def test_surface_polygone_triangle(self):
        points = [
            Point(id="A", x=0.0, y=0.0),
            Point(id="B", x=10.0, y=0.0),
            Point(id="C", x=0.0, y=10.0),
        ]
        surface = GeometryService.surface_polygone(points)
        assert abs(surface - 50.0) < 1e-10

    def test_centre_gravite(self):
        points = [
            Point(id="A", x=0.0, y=0.0),
            Point(id="B", x=10.0, y=0.0),
            Point(id="C", x=0.0, y=10.0),
        ]
        cg = GeometryService.centre_gravite(points)
        assert abs(cg.x - 10/3) < 1e-10
        assert abs(cg.y - 10/3) < 1e-10

    def test_angle_entre_3points_droit(self):
        p1 = Point(id="A", x=10.0, y=0.0)
        sommet = Point(id="O", x=0.0, y=0.0)
        p2 = Point(id="B", x=0.0, y=10.0)
        angle = GeometryService.angle_entre_3points(p1, sommet, p2)
        assert abs(angle - 100.0) < 1e-10  # 90° = 100 gr


class TestCalculReleveService:
    """Tests pour le service de calcul de relevé."""

    def test_intersection_visualisation(self):
        p1 = Point(id="S1", x=0.0, y=0.0)
        p2 = Point(id="S2", x=100.0, y=0.0)
        # Visualisations se croisant à (50, 50)
        g1 = 100.0  # Nord depuis S1
        g2 = 100.0  # Nord depuis S2 (parallèles, donc pas d'intersection)
        inter = CalculReleveService.intersection_visualisation(p1, g1, p2, g2)
        assert inter is None  # Parallèles

    def test_intersection_visualisation_valide(self):
        p1 = Point(id="S1", x=0.0, y=0.0)
        p2 = Point(id="S2", x=100.0, y=0.0)
        g1 = 50.0   # Nord-Est depuis S1
        g2 = 150.0  # Nord-Ouest depuis S2
        inter = CalculReleveService.intersection_visualisation(p1, g1, p2, g2)
        assert inter is not None

    def test_nivellement_simple(self):
        station = Point(id="S1", x=0.0, y=0.0, z=100.0)
        visee = Point(id="V1", x=10.0, y=0.0)
        obs = Observation(
            station=station,
            visee=visee,
            denivelee=5.0
        )
        resultats = CalculReleveService.nivellement_simple([obs])
        assert len(resultats) == 1
        assert abs(resultats[0][1] - 105.0) < 1e-10

    def test_generer_rapport(self):
        releve = Releve(nom="Test")
        releve.ajouter_point(Point(id="A", x=0.0, y=0.0, z=10.0))
        rapport = CalculReleveService.generate_report(releve)
        assert "RAPPORT DE RELEVÉ" in rapport
        assert "Test" in rapport
        assert "A" in rapport
