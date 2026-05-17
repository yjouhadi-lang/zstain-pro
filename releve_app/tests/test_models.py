"""
Tests unitaires pour les modèles de données.
"""
import pytest
import math
from ..models.point import Point
from ..models.alignement import Alignement
from ..models.releve import Releve, Observation


class TestPoint:
    """Tests pour la classe Point."""

    def test_creation_point(self):
        p = Point(id="P1", x=100.0, y=200.0, z=50.0)
        assert p.id == "P1"
        assert p.x == 100.0
        assert p.y == 200.0
        assert p.z == 50.0

    def test_distance_2d(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=3.0, y=4.0)
        assert p1.distance_2d(p2) == 5.0

    def test_distance_3d(self):
        p1 = Point(id="A", x=0.0, y=0.0, z=0.0)
        p2 = Point(id="B", x=1.0, y=1.0, z=math.sqrt(2))
        expected = 2.0
        assert abs(p1.distance_3d(p2) - expected) < 1e-10

    def test_gisement_est(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=100.0, y=0.0)
        # Est = 0 gr
        assert abs(p1.gisement(p2) - 0.0) < 1e-10

    def test_gisement_nord(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=0.0, y=100.0)
        # Nord = 100 gr
        assert abs(p1.gisement(p2) - 100.0) < 1e-10

    def test_gisement_ouest(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=-100.0, y=0.0)
        # Ouest = 200 gr
        assert abs(p1.gisement(p2) - 200.0) < 1e-10

    def test_gisement_sud(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=0.0, y=-100.0)
        # Sud = 300 gr
        assert abs(p1.gisement(p2) - 300.0) < 1e-10


class TestAlignement:
    """Tests pour la classe Alignement."""

    def test_longueur(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=3.0, y=4.0)
        align = Alignement(point_debut=p1, point_fin=p2)
        assert align.longueur == 5.0

    def test_pente(self):
        p1 = Point(id="A", x=0.0, y=0.0, z=100.0)
        p2 = Point(id="B", x=100.0, y=0.0, z=110.0)
        align = Alignement(point_debut=p1, point_fin=p2)
        assert align.pente == 10.0  # 10% de pente

    def test_point_a_distance(self):
        p1 = Point(id="A", x=0.0, y=0.0, z=100.0)
        p2 = Point(id="B", x=100.0, y=0.0, z=110.0)
        align = Alignement(point_debut=p1, point_fin=p2)
        pt = align.point_a_distance(50.0)
        assert abs(pt.x - 50.0) < 1e-10
        assert abs(pt.y - 0.0) < 1e-10
        assert abs(pt.z - 105.0) < 1e-10

    def test_projection(self):
        p1 = Point(id="A", x=0.0, y=0.0)
        p2 = Point(id="B", x=100.0, y=0.0)
        align = Alignement(point_debut=p1, point_fin=p2)
        p3 = Point(id="C", x=50.0, y=50.0)
        proj = align.projection(p3)
        assert abs(proj.x - 50.0) < 1e-10
        assert abs(proj.y - 0.0) < 1e-10


class TestReleve:
    """Tests pour la classe Releve."""

    def test_creation_releve(self):
        r = Releve(nom="Test")
        assert r.nom == "Test"
        assert len(r.points) == 0

    def test_ajouter_point(self):
        r = Releve(nom="Test")
        p = Point(id="P1", x=10.0, y=20.0)
        r.ajouter_point(p)
        assert len(r.points) == 1

    def test_get_point_by_id(self):
        r = Releve(nom="Test")
        p = Point(id="P1", x=10.0, y=20.0)
        r.ajouter_point(p)
        found = r.get_point_by_id("P1")
        assert found is not None
        assert found.x == 10.0

    def test_get_point_by_id_not_found(self):
        r = Releve(nom="Test")
        found = r.get_point_by_id("INEXISTANT")
        assert found is None

    def test_statistiques(self):
        r = Releve(nom="Test")
        r.ajouter_point(Point(id="A", x=0.0, y=0.0, z=10.0))
        r.ajouter_point(Point(id="B", x=100.0, y=50.0, z=20.0))
        stats = r.statistiques()
        assert stats['nombre_points'] == 2
        assert stats['x_min'] == 0.0
        assert stats['x_max'] == 100.0
        assert stats['etendue_x'] == 100.0
