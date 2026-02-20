# ADA - RFQ / CAD Management System

A full-stack RFQ (Request for Quotation) and CAD cost management system with buyer and manufacturer roles. Buyers upload CAD files and receive quotations. Manufacturers review requests, send quotes, and manage production queue.

## Features

- Buyer and manufacturer role-based UI
- CAD file upload to MinIO with metadata stored in PostgreSQL
- Notifications for file uploads and quote updates
- Quote workflow: send, accept, reject
- Production queue from accepted quotes
- Cost management with INR pricing and manual refresh

## Tech Stack

- Frontend: React + Vite + TailwindCSS
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Object Storage: MinIO

## Project Structure

- frontend/ — React app
- backend/ — FastAPI app
- minio/ — MinIO helper scripts

## Setup

### 1) Backend

- Create a Python virtual environment
- Install dependencies
- Ensure PostgreSQL is running
- Configure backend/.env

Example .env values:
- DATABASE_URL=postgresql://postgres:nnk123@localhost:5432/filedb
- MINIO_ENDPOINT=localhost:9000
- MINIO_ACCESS_KEY=cmti
- MINIO_SECRET_KEY=cmti@1234
- MINIO_BUCKET=stp-file

Run backend:
- python start_all.py

### 2) Frontend

From the frontend/ folder:
- npm install
- npm run dev

Frontend runs at http://localhost:3000
Backend runs at http://localhost:8000

## Default Login

Buyer:
- Username: buyer
- Password: buyer123

Manufacturer:
- Username: admin
- Password: admin123

## API Docs

FastAPI docs: http://localhost:8000/docs

## Notes

- CAD files are stored in MinIO.
- All metadata, quotes, and notifications are stored in PostgreSQL.
- If GitHub rejects large files, add them to .gitignore and remove from history.
