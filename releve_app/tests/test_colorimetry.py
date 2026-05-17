"""
Tests unitaires pour le service de colorimétrie Zstain Pro.
Basés sur les données du document VF rub III Prof joe V10++.
"""
import pytest
import math
from ..services.colorimetry import ColorimetryService, ColorMatchResult
from ..data.zstain_references import ZSTAIN_REFERENCES, get_reference_by_code, ZstainReference


class TestDeltaE:
    """Tests pour les formules de ΔE."""

    def test_deltaE_cie76_zero(self):
        """ΔE entre deux couleurs identiques = 0."""
        de = ColorimetryService.deltaE_cie76(50, 10, 20, 50, 10, 20)
        assert abs(de - 0.0) < 1e-10

    def test_deltaE_cie76_simple(self):
        """ΔE CIE76 simple."""
        de = ColorimetryService.deltaE_cie76(0, 0, 0, 3, 4, 0)
        assert abs(de - 5.0) < 1e-10

    def test_deltaE_ciede2000_zero(self):
        """CIEDE2000 entre deux couleurs identiques = 0."""
        de = ColorimetryService.deltaE_ciede2000(50, 10, 20, 50, 10, 20)
        assert abs(de - 0.0) < 1e-10

    def test_span_A1_A2_cie76(self):
        """Vérifie que le span A1L0→A2L0 vaut bien ~4.21 (Table 5)."""
        a1l0 = get_reference_by_code("A1L0")
        a2l0 = get_reference_by_code("A2L0")
        de = ColorimetryService.deltaE_cie76(
            a1l0.L, a1l0.a, a1l0.b,
            a2l0.L, a2l0.a, a2l0.b
        )
        assert abs(de - 4.21) < 0.1

    def test_span_A2_A3_cie76(self):
        """Vérifie que le span A2L0→A3L0 vaut bien ~3.00 (Table 5)."""
        a2l0 = get_reference_by_code("A2L0")
        a3l0 = get_reference_by_code("A3L0")
        de = ColorimetryService.deltaE_cie76(
            a2l0.L, a2l0.a, a2l0.b,
            a3l0.L, a3l0.a, a3l0.b
        )
        assert abs(de - 3.00) < 0.1


class TestChromaAndHue:
    """Tests pour le chroma et l'angle de teinte."""

    def test_chroma(self):
        assert abs(ColorimetryService.chroma(3, 4) - 5.0) < 1e-10
        assert abs(ColorimetryService.chroma(0, 0) - 0.0) < 1e-10

    def test_hue_angle_red(self):
        assert abs(ColorimetryService.hue_angle(5, 0) - 0.0) < 1e-10

    def test_hue_angle_yellow(self):
        assert abs(ColorimetryService.hue_angle(0, 5) - 90.0) < 1e-10


class TestZstainReferences:
    """Tests pour les données de référence Zstain."""

    def test_nombre_references(self):
        assert len(ZSTAIN_REFERENCES) == 8

    def test_groupes(self):
        groups = set(ref.groupe for ref in ZSTAIN_REFERENCES)
        assert groups == {"A1", "A2", "A3"}

    def test_niveaux_A1(self):
        a1_refs = [ref for ref in ZSTAIN_REFERENCES if ref.groupe == "A1"]
        assert len(a1_refs) == 3
        assert a1_refs[0].code == "A1L0"
        assert a1_refs[1].code == "A1L1"
        assert a1_refs[2].code == "A1L2"

    def test_niveaux_A2(self):
        a2_refs = [ref for ref in ZSTAIN_REFERENCES if ref.groupe == "A2"]
        assert len(a2_refs) == 2
        assert a2_refs[0].code == "A2L0"
        assert a2_refs[1].code == "A2L1"

    def test_niveaux_A3(self):
        a3_refs = [ref for ref in ZSTAIN_REFERENCES if ref.groupe == "A3"]
        assert len(a3_refs) == 3
        assert a3_refs[0].code == "A3L0"
        assert a3_refs[1].code == "A3L1"
        assert a3_refs[2].code == "A3L2"

    def test_A1L0_values_from_table5(self):
        """Vérifie les valeurs exactes de A1L0 (Table 5)."""
        ref = get_reference_by_code("A1L0")
        assert ref.L == 85.47
        assert ref.a == 1.87
        assert ref.b == 16.50

    def test_A3L2_values_from_table5(self):
        """Vérifie les valeurs exactes de A3L2 (Table 5)."""
        ref = get_reference_by_code("A3L2")
        assert ref.L == 77.13
        assert ref.a == 5.47
        assert ref.b == 25.46
        assert ref.deltaE_consecutif == 3.20


class TestClosestMatch:
    """Tests pour le matching avec les références Zstain."""

    def test_match_exact_A1L0(self):
        """Match exact avec A1L0."""
        ref = get_reference_by_code("A1L0")
        result = ColorimetryService.find_closest_match(
            ref.L, ref.a, ref.b, use_ciede2000=False
        )
        assert result.best_match.code == "A1L0"
        assert abs(result.deltaE - 0.0) < 1e-10

    def test_match_proche_A2L0(self):
        """Une couleur proche de A2L0 doit matcher A2L0."""
        ref = get_reference_by_code("A2L0")
        result = ColorimetryService.find_closest_match(
            ref.L + 0.2, ref.a + 0.1, ref.b + 0.1, use_ciede2000=False
        )
        assert result.best_match.code == "A2L0"
        assert result.deltaE < 1.0

    def test_match_all_references_ranked(self):
        """Toutes les références doivent être classées."""
        result = ColorimetryService.find_closest_match(80, 3, 20)
        assert len(result.all_matches) == len(ZSTAIN_REFERENCES)
        for i in range(len(result.all_matches) - 1):
            assert result.all_matches[i][1] <= result.all_matches[i + 1][1]

    def test_result_structure(self):
        """Vérifier la structure complète du résultat."""
        result = ColorimetryService.find_closest_match(82, 2, 19)
        assert isinstance(result, ColorMatchResult)
        assert result.measured_L == 82
        assert result.measured_a == 2
        assert result.measured_b == 19
        assert result.deltaE >= 0
        assert result.effort_saturation >= 0


class TestInterpretation:
    """Tests pour l'interprétation des résultats."""

    def test_interpret_perfect(self):
        assert "parfait" in ColorimetryService.interpret_deltaE(0.5).lower()

    def test_interpret_threshold(self):
        assert "perceptibilité" in ColorimetryService.interpret_deltaE(1.1).lower()

    def test_interpret_visible(self):
        assert "visible" in ColorimetryService.interpret_deltaE(4.0).lower()

    def test_interpret_different(self):
        assert "différentes" in ColorimetryService.interpret_deltaE(6.0).lower()


class TestZirconiaSuggestion:
    """Tests pour les suggestions de maquillage."""

    def test_suggestion_contains_group(self):
        ref = get_reference_by_code("A1L0")
        result = ColorimetryService.find_closest_match(ref.L, ref.a, ref.b)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        assert "A1" in suggestion

    def test_suggestion_L0_no_maquillage(self):
        ref = get_reference_by_code("A1L0")
        result = ColorimetryService.find_closest_match(ref.L, ref.a, ref.b)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        assert "AUCUN maquillage" in suggestion
        assert "Glaçage seul" in suggestion

    def test_suggestion_L1_one_couche(self):
        ref = get_reference_by_code("A2L1")
        result = ColorimetryService.find_closest_match(ref.L, ref.a, ref.b)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        assert "1 couche" in suggestion
        assert "Body Stain" in suggestion

    def test_suggestion_L2_two_couches(self):
        ref = get_reference_by_code("A3L2")
        result = ColorimetryService.find_closest_match(ref.L, ref.a, ref.b)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        assert "2ème couche" in suggestion

    def test_suggestion_contains_protocole_details(self):
        ref = get_reference_by_code("A3L1")
        result = ColorimetryService.find_closest_match(ref.L, ref.a, ref.b)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        assert "Optishade" in suggestion
        assert "IPA 96" in suggestion
        assert "Artis" in suggestion

    def test_suggestion_contains_span_info(self):
        ref = get_reference_by_code("A2L0")
        result = ColorimetryService.find_closest_match(ref.L, ref.a, ref.b)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        assert "Span" in suggestion
        assert "4.21" in suggestion or "3.00" in suggestion
