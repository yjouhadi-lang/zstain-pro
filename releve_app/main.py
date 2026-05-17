"""
Point d'entrée principal du logiciel de détermination de la relevée.
"""
import sys
import argparse


def launch_gui():
    """Lance l'interface graphique."""
    from .gui.main_window import main
    main()


def run_example():
    """Exécute un exemple de calcul en ligne de commande."""
    from .models.point import Point
    from .models.alignement import Alignement
    from .models.releve import Releve, Observation
    from .services.geometry import GeometryService
    from .services.calcul_releve import CalculReleveService

    print("=" * 60)
    print("EXEMPLE - Logiciel de Détermination de la Relevée")
    print("=" * 60)

    # Création d'un relevé
    releve = Releve(nom="Exemple de relevé", description="Démonstration des fonctionnalités")

    # Ajout de points connus
    p1 = Point(id="S1", x=100.000, y=100.000, z=50.000, code="Station")
    p2 = Point(id="S2", x=150.000, y=150.000, z=52.000, code="Station")
    p3 = Point(id="A", x=200.000, y=100.000, z=51.000, code="Point d'appui")
    p4 = Point(id="B", x=100.000, y=200.000, z=49.000, code="Point d'appui")

    for p in [p1, p2, p3, p4]:
        releve.ajouter_point(p)

    print(f"\nPoints créés: {len(releve.points)}")
    for p in releve.points:
        print(f"  {p}")

    # Calcul de distances
    print(f"\nDistance S1 -> S2: {p1.distance_2d(p2):.3f} m")
    print(f"Distance 3D S1 -> S2: {p1.distance_3d(p2):.3f} m")

    # Calcul de gisement
    print(f"\nGisement S1 -> S2: {p1.gisement(p2):.4f} gr")
    print(f"Gisement S2 -> S1: {p2.gisement(p1):.4f} gr")

    # Alignement
    align = Alignement(point_debut=p1, point_fin=p2, nom="Alignement principal")
    releve.ajouter_alignement(align)
    print(f"\n{align}")
    print(f"Pente: {align.pente:.2f}%")

    # Point à distance sur alignement
    pt_mid = align.point_a_distance(align.longueur / 2)
    print(f"Point milieu: {pt_mid}")

    # Surface d'un polygone
    surface = GeometryService.surface_polygone([p1, p3, p2, p4])
    print(f"\nSurface du polygone S1-A-S2-B: {surface:.3f} m²")

    # Centre de gravité
    cg = GeometryService.centre_gravite(releve.points)
    print(f"Centre de gravité: {cg}")

    # Rapport
    print("\n" + CalculReleveService.generate_report(releve))


def run_colorimetry_example():
    """Exécute un exemple de matching colorimétrique Zstain Pro."""
    from .services.colorimetry import ColorimetryService
    
    print("=" * 60)
    print("EXEMPLE - Matching Colorimétrique Zstain Pro")
    print("=" * 60)
    
    # Exemple: une couleur mesurée proche de A2L0
    L, a, b = 82.90, 2.50, 19.80
    print(f"\nCouleur mesurée: L*={L}, a*={a}, b*={b}")
    
    result = ColorimetryService.find_closest_match(L, a, b, use_ciede2000=True)
    print(result)
    print()
    print(ColorimetryService.suggest_zirconia_layering(result))
    
    print("\n" + "=" * 60)
    print("Deuxième exemple - couleur plus saturée (proche de A3L1)")
    print("=" * 60)
    
    L2, a2, b2 = 79.0, 5.8, 23.6
    print(f"\nCouleur mesurée: L*={L2}, a*={a2}, b*={b2}")
    
    result2 = ColorimetryService.find_closest_match(L2, a2, b2, use_ciede2000=True)
    print(result2)
    print()
    print(ColorimetryService.suggest_zirconia_layering(result2))


def main():
    """Point d'entrée principal."""
    parser = argparse.ArgumentParser(
        description="Logiciel de Détermination de la Relevée"
    )
    parser.add_argument(
        "--example", "-e",
        action="store_true",
        help="Exécute un exemple topographique en ligne de commande"
    )
    parser.add_argument(
        "--color", "-c",
        action="store_true",
        help="Exécute un exemple de matching colorimétrique Zstain Pro"
    )
    parser.add_argument(
        "--web", "-w",
        action="store_true",
        help="Lance l'interface web (Flask)"
    )
    parser.add_argument(
        "--gui", "-g",
        action="store_true",
        help="Lance l'interface graphique PyQt6 (par défaut)"
    )

    args = parser.parse_args()

    if args.example:
        run_example()
    elif args.color:
        run_colorimetry_example()
    elif args.web:
        from .web.app import create_app
        app = create_app()
        print("=" * 60)
        print("  ZSTAIN PRO - Interface Web")
        print("=" * 60)
        print("  Ouvrir dans le navigateur: http://127.0.0.1:5000")
        print("  Ctrl+C pour arrêter")
        print("=" * 60)
        app.run(debug=True, host='127.0.0.1', port=5000)
    else:
        launch_gui()


if __name__ == "__main__":
    main()
