#!/usr/bin/env python3
"""
Script de lancement de l'interface web Zstain Pro.
"""
import sys
sys.path.insert(0, '.')

from releve_app.web.app import create_app

if __name__ == "__main__":
    app = create_app()
    print("=" * 60)
    print("  ZSTAIN PRO - Interface Web")
    print("=" * 60)
    print("  Ouvrir dans le navigateur: http://127.0.0.1:5000")
    print("  Ctrl+C pour arrêter")
    print("=" * 60)
    app.run(debug=True, host='127.0.0.1', port=5000)
