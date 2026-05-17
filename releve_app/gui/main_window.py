"""
Interface graphique principale du logiciel de relevé.
"""
import sys
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTableWidget, QTableWidgetItem,
    QTextEdit, QTabWidget, QGroupBox, QFormLayout, QMessageBox,
    QFileDialog, QHeaderView
)
from PyQt6.QtCore import Qt

from ..models.point import Point
from ..models.alignement import Alignement
from ..models.releve import Releve, Observation
from ..services.calcul_releve import CalculReleveService
from .zstain_tab import ZstainTab


class MainWindow(QMainWindow):
    """Fenêtre principale de l'application."""

    def __init__(self):
        super().__init__()
        self.releve = Releve(nom="Nouveau Relevé")
        self.init_ui()

    def init_ui(self):
        """Initialise l'interface utilisateur."""
        self.setWindowTitle("Logiciel de Détermination de la Relevée")
        self.setGeometry(100, 100, 1200, 800)

        # Widget central avec onglets
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)

        # Onglet Points
        self.tab_points = self._create_points_tab()
        self.tabs.addTab(self.tab_points, "Points")

        # Onglet Calculs
        self.tab_calculs = self._create_calculs_tab()
        self.tabs.addTab(self.tab_calculs, "Calculs")

        # Onglet Résultats
        self.tab_resultats = self._create_resultats_tab()
        self.tabs.addTab(self.tab_resultats, "Résultats")

        # Onglet Zstain Pro
        self.tab_zstain = ZstainTab()
        self.tabs.addTab(self.tab_zstain, "Zstain Pro")

        # Barre de statut
        self.statusBar().showMessage("Prêt")

    def _create_points_tab(self) -> QWidget:
        """Crée l'onglet de gestion des points."""
        widget = QWidget()
        layout = QVBoxLayout()

        # Formulaire d'ajout de point
        form_group = QGroupBox("Ajouter un point")
        form_layout = QFormLayout()

        self.edit_id = QLineEdit()
        self.edit_x = QLineEdit()
        self.edit_y = QLineEdit()
        self.edit_z = QLineEdit()
        self.edit_code = QLineEdit()

        form_layout.addRow("ID:", self.edit_id)
        form_layout.addRow("X:", self.edit_x)
        form_layout.addRow("Y:", self.edit_y)
        form_layout.addRow("Z (optionnel):", self.edit_z)
        form_layout.addRow("Code:", self.edit_code)

        btn_ajouter = QPushButton("Ajouter Point")
        btn_ajouter.clicked.connect(self._ajouter_point)
        form_layout.addRow(btn_ajouter)

        form_group.setLayout(form_layout)
        layout.addWidget(form_group)

        # Tableau des points
        self.table_points = QTableWidget()
        self.table_points.setColumnCount(5)
        self.table_points.setHorizontalHeaderLabels(["ID", "X", "Y", "Z", "Code"])
        self.table_points.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        layout.addWidget(self.table_points)

        # Boutons
        btn_layout = QHBoxLayout()
        btn_supprimer = QPushButton("Supprimer sélection")
        btn_supprimer.clicked.connect(self._supprimer_point)
        btn_layout.addWidget(btn_supprimer)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        widget.setLayout(layout)
        return widget

    def _create_calculs_tab(self) -> QWidget:
        """Crée l'onglet de calculs."""
        widget = QWidget()
        layout = QVBoxLayout()

        # Groupe Distance
        dist_group = QGroupBox("Distance entre deux points")
        dist_layout = QFormLayout()
        
        self.edit_pt1 = QLineEdit()
        self.edit_pt2 = QLineEdit()
        self.label_distance = QLabel("-")
        
        btn_dist = QPushButton("Calculer Distance")
        btn_dist.clicked.connect(self._calculer_distance)
        
        dist_layout.addRow("Point 1:", self.edit_pt1)
        dist_layout.addRow("Point 2:", self.edit_pt2)
        dist_layout.addRow("Résultat:", self.label_distance)
        dist_layout.addRow(btn_dist)
        
        dist_group.setLayout(dist_layout)
        layout.addWidget(dist_group)

        # Groupe Gisement
        gis_group = QGroupBox("Gisement")
        gis_layout = QFormLayout()
        
        self.edit_gis1 = QLineEdit()
        self.edit_gis2 = QLineEdit()
        self.label_gisement = QLabel("-")
        
        btn_gis = QPushButton("Calculer Gisement")
        btn_gis.clicked.connect(self._calculer_gisement)
        
        gis_layout.addRow("Depuis:", self.edit_gis1)
        gis_layout.addRow("Vers:", self.edit_gis2)
        gis_layout.addRow("Résultat:", self.label_gisement)
        gis_layout.addRow(btn_gis)
        
        gis_group.setLayout(gis_layout)
        layout.addWidget(gis_group)

        # Groupe Surface
        surf_group = QGroupBox("Surface d'un polygone")
        surf_layout = QVBoxLayout()
        
        self.label_surface = QLabel("Sélectionnez des points dans l'onglet Points")
        btn_surf = QPushButton("Calculer Surface")
        btn_surf.clicked.connect(self._calculer_surface)
        
        surf_layout.addWidget(self.label_surface)
        surf_layout.addWidget(btn_surf)
        
        surf_group.setLayout(surf_layout)
        layout.addWidget(surf_group)

        layout.addStretch()
        widget.setLayout(layout)
        return widget

    def _create_resultats_tab(self) -> QWidget:
        """Crée l'onglet de résultats."""
        widget = QWidget()
        layout = QVBoxLayout()

        self.text_resultats = QTextEdit()
        self.text_resultats.setReadOnly(True)
        layout.addWidget(self.text_resultats)

        btn_rapport = QPushButton("Générer Rapport")
        btn_rapport.clicked.connect(self._generer_rapport)
        layout.addWidget(btn_rapport)

        widget.setLayout(layout)
        return widget

    def _ajouter_point(self):
        """Ajoute un point au relevé."""
        try:
            point_id = self.edit_id.text().strip()
            x = float(self.edit_x.text().replace(',', '.'))
            y = float(self.edit_y.text().replace(',', '.'))
            z_text = self.edit_z.text().strip()
            z = float(z_text.replace(',', '.')) if z_text else None
            code = self.edit_code.text().strip() or None

            if not point_id:
                QMessageBox.warning(self, "Erreur", "L'identifiant est obligatoire")
                return

            point = Point(id=point_id, x=x, y=y, z=z, code=code)
            self.releve.ajouter_point(point)
            self._rafraichir_tableau()
            self._vider_formulaire()
            self.statusBar().showMessage(f"Point {point_id} ajouté")
        except ValueError as e:
            QMessageBox.warning(self, "Erreur", f"Valeur invalide: {e}")

    def _supprimer_point(self):
        """Supprime le point sélectionné."""
        row = self.table_points.currentRow()
        if row >= 0 and row < len(self.releve.points):
            point_id = self.releve.points[row].id
            del self.releve.points[row]
            self._rafraichir_tableau()
            self.statusBar().showMessage(f"Point {point_id} supprimé")

    def _rafraichir_tableau(self):
        """Met à jour le tableau des points."""
        self.table_points.setRowCount(len(self.releve.points))
        for i, point in enumerate(self.releve.points):
            self.table_points.setItem(i, 0, QTableWidgetItem(point.id))
            self.table_points.setItem(i, 1, QTableWidgetItem(f"{point.x:.3f}"))
            self.table_points.setItem(i, 2, QTableWidgetItem(f"{point.y:.3f}"))
            self.table_points.setItem(i, 3, QTableWidgetItem(f"{point.z:.3f}" if point.z else ""))
            self.table_points.setItem(i, 4, QTableWidgetItem(point.code or ""))

    def _vider_formulaire(self):
        """Vide le formulaire d'ajout."""
        self.edit_id.clear()
        self.edit_x.clear()
        self.edit_y.clear()
        self.edit_z.clear()
        self.edit_code.clear()

    def _get_point(self, point_id: str) -> Point:
        """Recherche un point par son ID."""
        point = self.releve.get_point_by_id(point_id)
        if not point:
            raise ValueError(f"Point '{point_id}' non trouvé")
        return point

    def _calculer_distance(self):
        """Calcule la distance entre deux points."""
        try:
            p1 = self._get_point(self.edit_pt1.text().strip())
            p2 = self._get_point(self.edit_pt2.text().strip())
            dist = p1.distance_2d(p2)
            dist_3d = p1.distance_3d(p2)
            self.label_distance.setText(
                f"DH = {dist:.3f} m | D3D = {dist_3d:.3f} m"
            )
        except Exception as e:
            QMessageBox.warning(self, "Erreur", str(e))

    def _calculer_gisement(self):
        """Calcule le gisement entre deux points."""
        try:
            p1 = self._get_point(self.edit_gis1.text().strip())
            p2 = self._get_point(self.edit_gis2.text().strip())
            gis = p1.gisement(p2)
            self.label_gisement.setText(f"{gis:.4f} gr")
        except Exception as e:
            QMessageBox.warning(self, "Erreur", str(e))

    def _calculer_surface(self):
        """Calcule la surface du polygone formé par les points."""
        try:
            from ..services.geometry import GeometryService
            if len(self.releve.points) < 3:
                QMessageBox.warning(self, "Erreur", "Il faut au moins 3 points")
                return
            surf = GeometryService.surface_polygone(self.releve.points)
            self.label_surface.setText(f"Surface = {surf:.3f} m² = {surf/10000:.4f} ha")
        except Exception as e:
            QMessageBox.warning(self, "Erreur", str(e))

    def _generer_rapport(self):
        """Génère et affiche le rapport."""
        rapport = CalculReleveService.generate_report(self.releve)
        self.text_resultats.setText(rapport)


def main():
    """Point d'entrée de l'application GUI."""
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
