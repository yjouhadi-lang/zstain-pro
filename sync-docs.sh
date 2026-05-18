#!/bin/bash
# Script de synchronisation du site statique (docs/) depuis les sources Flask

echo "Syncing static site to docs/..."

# CSS
cp releve_app/web/static/css/style.css docs/static/css/style.css

# JS
cp releve_app/web/static/js/app.js docs/static/js/app.js

# HTML (convert Jinja2 url_for to relative paths)
sed \
  -e "s|{{ url_for('static', filename='css/style.css') }}|static/css/style.css|g" \
  -e "s|{{ url_for('static', filename='js/app.js') }}|static/js/app.js|g" \
  -e "s|{{ url_for('static', filename='pdf/coffret_gc_initial.pdf') }}|static/pdf/coffret_gc_initial.pdf|g" \
  releve_app/web/templates/index.html > docs/index.html

echo "Done. Commit and push to deploy to GitHub Pages."
