# MALAI VIZHI — AI-Based Landslide Early Warning System

> Watching Over Every Mountain — Northeast India (NER) Landslide Early Warning Intelligence

[![Deployment Ready](https://img.shields.io/badge/Render-Deployment%20Ready-green.svg)](https://render.com)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![Flask 3.0](https://img.shields.io/badge/Backend-Flask%203.0%20%2B%20Gunicorn-black.svg)](https://flask.palletsprojects.com/)

---

## 🏔️ System Architecture

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + Leaflet + Recharts (`/frontend-react`)
- **Backend API**: Python 3.13 + Flask + Gunicorn WSGI (`app.py`, `models.py`, `risk_logic.py`, `seed_data.py`)
- **Database**: SQLite (`database.db`) with automatic table creation and location seeding
- **External Integration**: NASA POWER API for real-time daily precipitation telemetry
- **Citizen Science**: Geospatial community hazard reporting with photographic verification

---

## 🗄️ Database Architecture & Ephemeral Storage Notice

> **IMPORTANT DEPLOYMENT NOTICE (TASK 4):**
> 
> The application uses **SQLite** (`database.db`) for zero-configuration local development and rapid cloud demonstrations during the **Smart India Hackathon (SIH)**.
>
> On cloud platforms like **Render**, the filesystem is **ephemeral**:
> - Whenever a free-tier web service restarts or redeploys, any runtime changes written to `database.db` or the `uploads/` directory reset back to the baseline image.
> - On every restart, `models.init_db()` and `seed_data.seed()` automatically ensure all tables and 12 baseline Northeast India stations are initialized without duplicating records.
> - **For production releases beyond the hackathon evaluation**, persistent storage should be transitioned to a managed relational database such as **PostgreSQL** (e.g., Render Managed PostgreSQL or Supabase) and object storage (e.g., AWS S3 or Cloudinary) for citizen photos.

---

## 🚀 Deployment Instructions (Render)

### Option A: Backend Web Service (Render)
- **Environment**: Python
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
- **Environment Variables**:
  - `PORT`: (Provided automatically by Render)
  - `FLASK_DEBUG`: `false`

### Option B: Frontend Static Site (Render)
- **Root Directory**: `frontend-react`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variable**:
  - `VITE_API_URL`: `https://backend-malaivizhi2-0.onrender.com`

---

## 💻 Local Development

### 1. Run Backend
```bash
python app.py
# Runs on http://127.0.0.1:5000
```

### 2. Run React Frontend
```bash
cd frontend-react
npm install
npm run dev
# Runs on http://localhost:5173
```
