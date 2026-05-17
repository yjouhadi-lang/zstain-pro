"""
Onglet Zstain Pro pour le matching colorimétrique dentaire.
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QTableWidget, QTableWidgetItem, QTextEdit,
    QGroupBox, QFormLayout, QHeaderView, QMessageBox, QCheckBox,
    QSplitter, QTabWidget
)
from PyQt6.QtCore import Qt

from ..data.zstain_references import (
    ZSTAIN_REFERENCES, ZSTAIN_SPANS, PROTOCOLE_MAQUILLAGE
)
from ..services.colorimetry import ColorimetryService, ColorMatchResult


class ZstainTab(QWidget):
    """Onglet principal du module Zstain Pro."""

    def __init__(self):
        super().__init__()
        self.last_result: ColorMatchResult = None
        self.init_ui()

    def init_ui(self):
        layout = QHBoxLayout()
        
        # Splitter gauche/droite
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Panneau gauche: saisie et références
        left_panel = self._create_left_panel()
        splitter.addWidget(left_panel)
        
        # Panneau droit: résultats avec onglets
        right_panel = self._create_right_panel()
        splitter.addWidget(right_panel)
        
        splitter.setSizes([500, 700])
        layout.addWidget(splitter)
        self.setLayout(layout)

    def _create_left_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout()
        
        # Groupe Saisie des coordonnées
        input_group = QGroupBox("Coordonnées Lab de la dent du patient")
        input_layout = QFormLayout()
        
        self.edit_L = QLineEdit()
        self.edit_L.setPlaceholderText("Ex: 82.5")
        self.edit_a = QLineEdit()
        self.edit_a.setPlaceholderText("Ex: 3.2")
        self.edit_b = QLineEdit()
        self.edit_b.setPlaceholderText("Ex: 20.1")
        
        input_layout.addRow("L* (luminosité 0-100):", self.edit_L)
        input_layout.addRow("a* (rouge + / vert -):", self.edit_a)
        input_layout.addRow("b* (jaune + / bleu -):", self.edit_b)
        
        self.chk_ciede2000 = QCheckBox("Utiliser CIEDE2000 (recommandé pour petits écarts)")
        self.chk_ciede2000.setChecked(True)
        input_layout.addRow(self.chk_ciede2000)
        
        btn_match = QPushButton("🔍 Trouver le match Zstain le plus proche")
        btn_match.clicked.connect(self._calculer_match)
        input_layout.addRow(btn_match)
        
        input_group.setLayout(input_layout)
        layout.addWidget(input_group)
        
        # Tableau des références Zstain
        ref_group = QGroupBox("Tableau de référence Zstain Pro (Table 5 - corrigé)")
        ref_layout = QVBoxLayout()
        
        self.table_refs = QTableWidget()
        self.table_refs.setColumnCount(7)
        self.table_refs.setHorizontalHeaderLabels(
            ["Code", "Groupe", "Niv", "L*", "a*", "b*", "ΔE conséc."]
        )
        self.table_refs.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table_refs.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.table_refs.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.table_refs.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self._remplir_tableau_references()
        
        ref_layout.addWidget(self.table_refs)
        ref_group.setLayout(ref_layout)
        layout.addWidget(ref_group)
        
        # Tableau des spans
        span_group = QGroupBox("Spans colorimétriques (ΔE entre teintes principales)")
        span_layout = QVBoxLayout()
        
        self.table_spans = QTableWidget()
        self.table_spans.setColumnCount(4)
        self.table_spans.setHorizontalHeaderLabels(
            ["Span", "ΔE Zstain Pro", "Niveaux intermédiaires", "Description"]
        )
        self.table_spans.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._remplir_tableau_spans()
        
        span_layout.addWidget(self.table_spans)
        span_group.setLayout(span_layout)
        layout.addWidget(span_group)
        
        panel.setLayout(layout)
        return panel

    def _create_right_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout()
        
        # Onglets pour les résultats
        self.result_tabs = QTabWidget()
        
        # Onglet Matching
        self.tab_matching = QWidget()
        matching_layout = QVBoxLayout()
        self.text_resultat = QTextEdit()
        self.text_resultat.setReadOnly(True)
        self.text_resultat.setPlaceholderText(
            "Les résultats du matching apparaîtront ici...\n\n"
            "Saisissez les coordonnées Lab et cliquez sur 'Trouver le match'."
        )
        matching_layout.addWidget(self.text_resultat)
        self.tab_matching.setLayout(matching_layout)
        self.result_tabs.addTab(self.tab_matching, "🎯 Matching")
        
        # Onglet Protocole
        self.tab_protocole = QWidget()
        protocole_layout = QVBoxLayout()
        self.text_protocole = QTextEdit()
        self.text_protocole.setReadOnly(True)
        self.text_protocole.setPlaceholderText(
            "Le protocole de maquillage détaillé apparaîtra ici..."
        )
        protocole_layout.addWidget(self.text_protocole)
        self.tab_protocole.setLayout(protocole_layout)
        self.result_tabs.addTab(self.tab_protocole, "🔧 Protocole de maquillage")
        
        # Onglet Tableau Protocoles
        self.tab_protocoles_ref = QWidget()
        protocoles_ref_layout = QVBoxLayout()
        self._creer_tableau_protocoles()
        protocoles_ref_layout.addWidget(self.table_protocoles)
        self.tab_protocoles_ref.setLayout(protocoles_ref_layout)
        self.result_tabs.addTab(self.tab_protocoles_ref, "📋 Protocoles de référence")
        
        layout.addWidget(self.result_tabs)
        
        # Boutons d'action
        btn_layout = QHBoxLayout()
        btn_export = QPushButton("💾 Exporter le rapport complet")
        btn_export.clicked.connect(self._exporter_rapport)
        btn_reset = QPushButton("🔄 Réinitialiser")
        btn_reset.clicked.connect(self._reset)
        btn_layout.addWidget(btn_reset)
        btn_layout.addStretch()
        btn_layout.addWidget(btn_export)
        layout.addLayout(btn_layout)
        
        panel.setLayout(layout)
        return panel

    def _creer_tableau_protocoles(self):
        """Crée le tableau des protocoles de référence."""
        self.table_protocoles = QTableWidget()
        self.table_protocoles.setColumnCount(6)
        self.table_protocoles.setHorizontalHeaderLabels([
            "Niveau", "Préparation", "Couches", "Produit", "Contrôle", "Cuisson"
        ])
        self.table_protocoles.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        self.table_protocoles.setRowCount(len(PROTOCOLE_MAQUILLAGE))
        niveaux_labels = {0: "L0 (Glaçage)", 1: "L1 (1 couche)", 2: "L2 (2 couches)"}
        
        for i, (niveau, proto) in enumerate(sorted(PROTOCOLE_MAQUILLAGE.items())):
            self.table_protocoles.setItem(i, 0, QTableWidgetItem(niveaux_labels.get(niveau, f"L{niveau}")))
            self.table_protocoles.setItem(i, 1, QTableWidgetItem(proto.get("preparation", "")))
            self.table_protocoles.setItem(i, 2, QTableWidgetItem(proto.get("couches", "")))
            self.table_protocoles.setItem(i, 3, QTableWidgetItem(proto.get("produit", "")))
            self.table_protocoles.setItem(i, 4, QTableWidgetItem(proto.get("controle", "")))
            self.table_protocoles.setItem(i, 5, QTableWidgetItem(proto.get("cuisson", "")))

    def _remplir_tableau_references(self):
        """Remplit le tableau avec les références Zstain."""
        self.table_refs.setRowCount(len(ZSTAIN_REFERENCES))
        for i, ref in enumerate(ZSTAIN_REFERENCES):
            self.table_refs.setItem(i, 0, QTableWidgetItem(ref.code))
            self.table_refs.setItem(i, 1, QTableWidgetItem(ref.groupe))
            self.table_refs.setItem(i, 2, QTableWidgetItem(f"L{ref.niveau}"))
            self.table_refs.setItem(i, 3, QTableWidgetItem(f"{ref.L:.2f}"))
            self.table_refs.setItem(i, 4, QTableWidgetItem(f"{ref.a:.2f}"))
            self.table_refs.setItem(i, 5, QTableWidgetItem(f"{ref.b:.2f}"))
            de_val = f"{ref.deltaE_consecutif:.2f}" if ref.deltaE_consecutif else "—"
            self.table_refs.setItem(i, 6, QTableWidgetItem(de_val))

    def _remplir_tableau_spans(self):
        """Remplit le tableau des spans."""
        self.table_spans.setRowCount(len(ZSTAIN_SPANS))
        for i, (span_name, span_data) in enumerate(ZSTAIN_SPANS.items()):
            self.table_spans.setItem(i, 0, QTableWidgetItem(span_name))
            self.table_spans.setItem(i, 1, QTableWidgetItem(f"{span_data['deltaE']:.2f}"))
            inter = ", ".join(span_data.get("niveaux_intermediaires", []))
            self.table_spans.setItem(i, 2, QTableWidgetItem(inter))
            self.table_spans.setItem(i, 3, QTableWidgetItem(span_data.get("description", "")))

    def _calculer_match(self):
        """Calcule le matching colorimétrique."""
        try:
            L = float(self.edit_L.text().replace(',', '.'))
            a = float(self.edit_a.text().replace(',', '.'))
            b = float(self.edit_b.text().replace(',', '.'))
            
            if not (0 <= L <= 100):
                raise ValueError("L* doit être entre 0 et 100")
            
            use_ciede2000 = self.chk_ciede2000.isChecked()
            
            result = ColorimetryService.find_closest_match(
                L, a, b, use_ciede2000=use_ciede2000
            )
            self.last_result = result
            
            self.text_resultat.setText(str(result))
            self.text_protocole.setText(
                ColorimetryService.suggest_zirconia_layering(result)
            )
            
            # Mettre en évidence le meilleur match
            self._highlight_best_match(result.best_match.code)
            
            # Basculer vers l'onglet matching
            self.result_tabs.setCurrentIndex(0)
            
        except ValueError as e:
            QMessageBox.warning(
                self, "Erreur de saisie",
                f"Veuillez entrer des valeurs numériques valides.\nDétail: {e}"
            )

    def _highlight_best_match(self, code: str):
        """Surligne la ligne correspondant au meilleur match dans le tableau."""
        for i in range(self.table_refs.rowCount()):
            item = self.table_refs.item(i, 0)
            if item and item.text() == code:
                for col in range(self.table_refs.columnCount()):
                    self.table_refs.item(i, col).setBackground(
                        self.palette().highlight()
                    )
                    self.table_refs.item(i, col).setForeground(
                        self.palette().highlightedText()
                    )
            else:
                for col in range(self.table_refs.columnCount()):
                    self.table_refs.item(i, col).setBackground(
                        self.palette().base()
                    )
                    self.table_refs.item(i, col).setForeground(
                        self.palette().text()
                    )

    def _exporter_rapport(self):
        """Exporte le rapport dans un fichier texte."""
        if self.last_result is None:
            QMessageBox.information(
                self, "Information",
                "Veuillez d'abord effectuer un calcul de matching."
            )
            return
        
        from PyQt6.QtWidgets import QFileDialog
        filename, _ = QFileDialog.getSaveFileName(
            self, "Exporter le rapport", 
            f"rapport_zstain_{self.last_result.best_match.code}.txt",
            "Fichiers texte (*.txt)"
        )
        if filename:
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(ColorimetryService.generate_full_report(self.last_result))
                QMessageBox.information(
                    self, "Succès",
                    f"Rapport exporté vers:\n{filename}"
                )
            except Exception as e:
                QMessageBox.critical(
                    self, "Erreur",
                    f"Impossible d'exporter le rapport:\n{e}"
                )

    def _reset(self):
        """Réinitialise le formulaire et les résultats."""
        self.edit_L.clear()
        self.edit_a.clear()
        self.edit_b.clear()
        self.text_resultat.clear()
        self.text_protocole.clear()
        self.last_result = None
        for i in range(self.table_refs.rowCount()):
            for col in range(self.table_refs.columnCount()):
                self.table_refs.item(i, col).setBackground(self.palette().base())
                self.table_refs.item(i, col).setForeground(self.palette().text())
