# Procfile — WSGI process declaration for Heroku / Railway / Render
# Production server: gunicorn binds to $PORT (set by the platform)
web: cd backend && gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
