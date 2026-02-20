# Project Documentation: ADA 3D CAD Viewer Platform

## Overview

This project is a full-stack web application for uploading, viewing, and managing 3D CAD files (STEP/IGES) with advanced visualization features inspired by AutoCAD. It is designed for manufacturing workflows, including quoting, cost management, and production tracking.

---

## 1. Technology Stack

### Frontend
- **Framework:** React (with Vite for fast development)
- **Component Libraries:** 
  - React Icons (for UI icons)
  - Tailwind CSS (utility-first styling)
- **3D Rendering:** Three.js (WebGL-based 3D engine)
- **CAD Parsing:** OpenCascade.js (WASM, via occt-import-js)
- **State Management:** React hooks (useState, useEffect, useRef)
- **Build Tool:** Vite
- **Other:** 
  - Custom components (AutoCADViewCube, grid, color toggles, etc.)

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (via SQLAlchemy ORM)
- **Storage:** Local or MinIO (S3-compatible object storage)
- **CAD Processing:** OpenCascade (via WASM in frontend, backend for future extensions)
- **API:** RESTful endpoints for authentication, cost management, pricing, notifications, and quotes

### DevOps
- **Version Control:** Git (GitHub)
- **Environments:** Python virtualenv, Node.js/npm for frontend
- **Task Runners:** Vite (frontend), Uvicorn (backend)
- **Other:** .env for configuration, requirements.txt/package.json for dependencies

---

## 2. Key Libraries & Frameworks

### Frontend
- **React:** UI framework for building SPA
- **Three.js:** 3D rendering, scene/camera/mesh management
- **occt-import-js:** Loads and parses STEP/IGES files in browser (OpenCascade WASM)
- **Tailwind CSS:** Rapid, consistent styling
- **React Icons:** Iconography
- **Vite:** Fast dev server and build tool

### Backend
- **FastAPI:** High-performance Python web API
- **SQLAlchemy:** ORM for PostgreSQL
- **Uvicorn:** ASGI server for FastAPI
- **MinIO:** S3-compatible object storage (optional)
- **Pydantic:** Data validation

---

## 3. Application Architecture

### Frontend
- **App Structure:**
  - `src/pages/manufacturer/CadViewerPage.jsx`: Main 3D viewer page
  - `src/components/AutoCADViewCube.jsx`: Interactive navigation cube
  - `src/components/FileUpload.jsx`: File upload UI
  - `src/api/fileService.js`: API calls to backend
  - `src/pages/manufacturer/`: Other pages (Dashboard, Quotes, Cost Management, etc.)

- **3D Viewer Workflow:**
  1. User selects a CAD file (STEP/IGES) to view.
  2. File is fetched from backend (via signed URL).
  3. File is parsed in browser using OpenCascade.js (WASM).
  4. Three.js renders the mesh, overlays grid, axes, and ViewCube.
  5. User can rotate, pan, zoom, and change display modes (shaded, wireframe, etc.).
  6. Surface coloring by orientation, measurement panel, and other features are available.

- **Display Modes:**
  - Shaded
  - Shaded with visible edges
  - Wireframe (all edges)
  - Wireframe with hidden edges (visible bold, hidden faint)
  - Wireframe (visible edges only)

- **UI Features:**
  - AutoCAD-style ViewCube (clickable, animated)
  - Isometric home button
  - Grid overlay
  - Color toggle (orientation-based or single color)
  - Measurement panel (dimensions, surface area, volume)
  - Responsive layout

### Backend
- **API Endpoints:**
  - `/auth/`: Authentication (login, register)
  - `/files/`: File upload, download, list
  - `/manufacturing/costs/`: Material pricing
  - `/notifications/`: User notifications
  - `/quotes/`: Quotation management

- **File Storage:**
  - Files are stored in local filesystem or MinIO bucket.
  - Backend provides signed URLs for secure download.

- **Database:**
  - PostgreSQL stores user, file, quote, and notification data.

---

## 4. Workflow

### Development
1. **Clone the repository** and install dependencies:
   - Backend: `python -m venv .venv && .venv\\Scripts\\activate && pip install -r requirements.txt`
   - Frontend: `cd frontend && npm install`
2. **Run backend:** `cd backend && uvicorn app.main:app --reload`
3. **Run frontend:** `cd frontend && npm run dev`
4. **Open app in browser** (usually at http://localhost:5173)
5. **Make changes** in React or Python code as needed.
6. **Commit and push** using Git.

### Usage
- **Upload CAD files** via the UI.
- **View and interact** with 3D models.
- **Switch display modes** for different visualization needs.
- **Manage quotes, costs, and notifications** via the dashboard.

---

## 5. Notable Features
- **AutoCAD-style ViewCube**: For intuitive 3D navigation.
- **Surface coloring by orientation**: Instantly see which way faces are pointing.
- **Wireframe/edge modes**: For engineering clarity.
- **Deferred heavy calculations**: Fast initial load, background surface/volume computation.
- **Responsive, modern UI**: Built with Tailwind and React.
- **Backend extensibility**: Easy to add new endpoints or switch storage providers.

---

## 6. How to Extend
- **Add new 3D features**: Extend CadViewerPage.jsx and use Three.js APIs.
- **Add backend logic**: Create new FastAPI routes and connect to the database.
- **Change storage**: Update backend config to use S3/MinIO or local.
- **Add authentication/authorization**: Use FastAPI’s security features.

---

## 7. Key Files & Directories
- `frontend/src/pages/manufacturer/CadViewerPage.jsx` — Main 3D viewer logic
- `frontend/src/components/AutoCADViewCube.jsx` — ViewCube component
- `frontend/src/api/fileService.js` — API calls
- `backend/app/main.py` — FastAPI entry point
- `backend/app/routes/` — API route definitions
- `backend/app/models/` — Database models
- `backend/app/services/` — Business logic

---

## 8. Libraries Used (Summary Table)

| Library/Framework   | Purpose                        |
|---------------------|--------------------------------|
| React               | Frontend UI                    |
| Three.js            | 3D rendering                   |
| occt-import-js      | CAD file parsing (WASM)        |
| Tailwind CSS        | Styling                        |
| FastAPI             | Backend API                    |
| SQLAlchemy          | Database ORM                   |
| Uvicorn             | ASGI server                    |
| MinIO               | Object storage (optional)      |
| React Icons         | UI icons                       |
| Vite                | Frontend build tool            |

---

## 9. Best Practices
- **Keep dependencies up to date.**
- **Use environment variables** for secrets and config.
- **Write clear commit messages.**
- **Test with large CAD files** to ensure performance.
- **Document new features** in this file for future developers.

---

## 10. Getting Help
- **Three.js docs:** https://threejs.org/docs/
- **OpenCascade.js:** https://github.com/kovacsv/occt-import-js
- **FastAPI docs:** https://fastapi.tiangolo.com/
- **Tailwind CSS:** https://tailwindcss.com/docs

---

This document should give any new developer or stakeholder a clear understanding of the project’s structure, technology, and workflow. If you want this as a markdown file in your repo, let me know!
