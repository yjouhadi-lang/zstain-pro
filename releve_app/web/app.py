"""
Application web Flask pour le logiciel Zstain Pro.

Lancement:
    source venv/bin/activate && python -m releve_app.web.app

Ou depuis la racine:
    python -m releve_app.main --web
"""
import os
from flask import Flask, render_template, jsonify, request


def create_app() -> Flask:
    """Factory d'application Flask."""
    template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    app.config['SECRET_KEY'] = 'zstain-pro-secret-key-2026'
    
    @app.route('/')
    def index():
        """Page principale."""
        return render_template('index.html')
    
    @app.route('/api/zstain_data')
    def api_zstain_data():
        """Retourne les données du tableau Zstain Pro."""
        from releve_app.data.zstain_references import ZSTAIN_REFERENCES, PROTOCOLE_MAQUILLAGE
        
        refs = []
        for ref in ZSTAIN_REFERENCES:
            refs.append({
                'code': ref.code,
                'description': ref.description,
                'groupe': ref.groupe,
                'niveau': ref.niveau,
                'L': ref.L,
                'a': ref.a,
                'b': ref.b,
                'chroma': round(ref.chroma, 3),
                'deltaE_consecutif': ref.deltaE_consecutif,
            })
        
        protocoles = {}
        for niveau, proto in PROTOCOLE_MAQUILLAGE.items():
            protocoles[niveau] = dict(proto)
        
        return jsonify({
            'references': refs,
            'protocoles': protocoles,
        })
    
    @app.route('/api/match', methods=['POST'])
    def api_match():
        """Calcule le matching colorimétrique côté serveur."""
        from releve_app.services.colorimetry import ColorimetryService
        
        data = request.get_json()
        L = float(data.get('L', 0))
        a = float(data.get('a', 0))
        b = float(data.get('b', 0))
        use_ciede2000 = bool(data.get('use_ciede2000', True))
        
        result = ColorimetryService.find_closest_match(L, a, b, use_ciede2000)
        
        matches = []
        for ref, de in result.all_matches:
            matches.append({
                'code': ref.code,
                'groupe': ref.groupe,
                'niveau': ref.niveau,
                'description': ref.description,
                'L': ref.L,
                'a': ref.a,
                'b': ref.b,
                'chroma': round(ref.chroma, 3),
                'deltaE': round(de, 4),
            })
        
        return jsonify({
            'measured': {
                'L': result.measured_L,
                'a': result.measured_a,
                'b': result.measured_b,
                'chroma': round(result.measured_chroma, 3),
            },
            'best_match': {
                'code': result.best_match.code,
                'groupe': result.best_match.groupe,
                'niveau': result.best_match.niveau,
                'description': result.best_match.description,
                'L': result.best_match.L,
                'a': result.best_match.a,
                'b': result.best_match.b,
                'chroma': round(result.best_match.chroma, 3),
            },
            'deltaE': round(result.deltaE, 4),
            'deltaL': round(result.deltaL, 4),
            'deltaa': round(result.deltaa, 4),
            'deltab': round(result.deltab, 4),
            'deltaC': round(result.deltaC, 4),
            'deltaH': round(result.deltaH, 4),
            'effort_saturation': round(result.effort_saturation, 2),
            'saturation_direction': result.saturation_direction,
            'interpretation': ColorimetryService.interpret_deltaE(result.deltaE),
            'all_matches': matches,
        })
    
    @app.route('/api/suggestion', methods=['POST'])
    def api_suggestion():
        """Génère la suggestion de maquillage."""
        from releve_app.services.colorimetry import ColorimetryService
        
        data = request.get_json()
        L = float(data.get('L', 0))
        a = float(data.get('a', 0))
        b = float(data.get('b', 0))
        use_ciede2000 = bool(data.get('use_ciede2000', True))
        
        result = ColorimetryService.find_closest_match(L, a, b, use_ciede2000)
        suggestion = ColorimetryService.suggest_zirconia_layering(result)
        
        return jsonify({
            'suggestion': suggestion,
            'best_match_code': result.best_match.code,
            'niveau': result.best_match.niveau,
            'groupe': result.best_match.groupe,
        })
    
    @app.route('/api/pastille/<code>.png')
    def api_pastille_image(code):
        """Génère et sert l'image d'une pastille."""
        from releve_app.data.zstain_references import get_reference_by_code
        from .image_gen import generate_pastille_image
        
        ref = get_reference_by_code(code)
        if ref is None:
            return "Pastille non trouvée", 404
        
        highlight = request.args.get('highlight', 'false').lower() == 'true'
        measured = request.args.get('measured', 'false').lower() == 'true'
        
        img_data = generate_pastille_image(
            ref.L, ref.a, ref.b, ref.code,
            size=200, highlight=highlight, measured=measured
        )
        
        return img_data, 200, {'Content-Type': 'image/png'}
    
    @app.route('/api/comparison.png')
    def api_comparison_image():
        """Génère une image de comparaison mesuré vs référence."""
        from releve_app.data.zstain_references import get_reference_by_code
        from .image_gen import generate_comparison_image
        
        mL = float(request.args.get('mL', 0))
        ma = float(request.args.get('ma', 0))
        mb = float(request.args.get('mb', 0))
        ref_code = request.args.get('ref', '')
        
        ref = get_reference_by_code(ref_code)
        if ref is None:
            return "Référence non trouvée", 404
        
        img_data = generate_comparison_image(
            mL, ma, mb, ref.L, ref.a, ref.b, ref.code, size=200
        )
        return img_data, 200, {'Content-Type': 'image/png'}
    
    @app.route('/api/rgb/<code>')
    def api_rgb(code):
        """Retourne la valeur RGB approximative d'une pastille."""
        from releve_app.data.zstain_references import get_reference_by_code
        from .image_gen import lab_to_rgb
        
        ref = get_reference_by_code(code)
        if ref is None:
            return jsonify({'error': 'Not found'}), 404
        
        r, g, b = lab_to_rgb(ref.L, ref.a, ref.b)
        return jsonify({
            'code': code,
            'rgb': [r, g, b],
            'hex': f"#{r:02x}{g:02x}{b:02x}"
        })
    
    @app.route('/api/coffret/<groupe>/<int:niveau>')
    def api_coffret(groupe, niveau):
        """Retourne la recommandation du coffret pour un groupe/niveau."""
        from .coffret_data import (
            get_recommandation_coffret, SPS_STAINS, LIQUIDES_ACCESSOIRES,
            ENAMEL_EFFECTS, PINCEAUX, PROGRAMME_CUISSON
        )
        
        reco = get_recommandation_coffret(groupe, niveau)
        return jsonify({
            'recommandation': reco,
            'stains_disponibles': SPS_STAINS,
            'liquides_accessoires': LIQUIDES_ACCESSOIRES,
            'enamel_effects': ENAMEL_EFFECTS,
            'pinceaux': PINCEAUX,
            'programme_cuisson': PROGRAMME_CUISSON,
        })
    
    @app.route('/api/coffret/all')
    def api_coffret_all():
        """Retourne toutes les données du coffret."""
        from .coffret_data import (
            SPS_STAINS, LIQUIDES_ACCESSOIRES, ENAMEL_EFFECTS,
            PINCEAUX, PROGRAMME_CUISSON, NIVEAU_TECHNIQUE,
            ZSTAIN_TO_LUSTRE_BODY
        )
        return jsonify({
            'mapping_body': ZSTAIN_TO_LUSTRE_BODY,
            'techniques': NIVEAU_TECHNIQUE,
            'stains': SPS_STAINS,
            'liquides_accessoires': LIQUIDES_ACCESSOIRES,
            'enamel_effects': ENAMEL_EFFECTS,
            'pinceaux': PINCEAUX,
            'programme_cuisson': PROGRAMME_CUISSON,
        })
    
    return app


if __name__ == '__main__':
    app = create_app()
    print("=" * 60)
    print("  ZSTAIN PRO - Interface Web")
    print("=" * 60)
    print("  Ouvrir dans le navigateur: http://127.0.0.1:5000")
    print("  Ctrl+C pour arrêter")
    print("=" * 60)
    app.run(debug=True, host='127.0.0.1', port=5000)
