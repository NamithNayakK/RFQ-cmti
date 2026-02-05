# Manufacturing STP File Storage - React Frontend

A professional React frontend for the Manufacturing STP File Storage & Management System.

## Features

### User Interface
- ✅ **File Upload** - Drag & drop STP file upload with progress tracking
- ✅ **File Listing** - Browse all uploaded CAD files with pagination
- ✅ **Search** - Search files by filename with advanced filtering
- ✅ **Download** - Direct download links for STP files
- ✅ **Delete** - Remove files from storage
- ✅ **Health Monitoring** - Real-time API and database status

### Technical Features
- ✅ **Vite** - Lightning-fast development and build
- ✅ **React 18** - Latest React features
- ✅ **Tailwind CSS** - Beautiful responsive design
- ✅ **Axios** - HTTP client for API communication
- ✅ **React Icons** - Professional icon library
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Loading States** - Visual feedback during operations

## Prerequisites

- Node.js 16+ and npm/yarn
- Backend API running at http://127.0.0.1:8000

## Installation

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

### 3. Build for Production
```bash
npm run build
```

Output will be in `dist/` folder.

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── fileService.js      # API communication layer
│   ├── components/
│   │   ├── FileUpload.jsx      # Upload component
│   │   ├── FileList.jsx        # File listing component
│   │   └── HealthCheck.jsx     # Health monitoring
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # React entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS config
├── postcss.config.js          # PostCSS config
└── package.json               # Dependencies
```

## API Integration

The frontend communicates with the backend API:

### Upload File
1. Request presigned upload URL from backend
2. Upload file directly to MinIO using presigned URL
3. Display success message with file ID

### List Files
- Fetch paginated list of files
- Display in table format
- Support pagination (20 files per page)

### Search Files
- Search by filename
- Filter by date range (optional)
- Advanced filtering options

### Download File
- Request presigned download URL
- Open in new tab

### Delete File
- Confirmation dialog
- Delete from both database and MinIO

## Configuration

### API Endpoint
Edit `src/api/fileService.js` to change the API base URL:
```javascript
const API_BASE_URL = 'http://127.0.0.1:8000';
```

### Tailwind Colors
Customize manufacturing-specific colors in `tailwind.config.js`:
```javascript
manufacturing: {
  dark: '#1a1a1a',
  light: '#f5f5f5',
  primary: '#0066cc',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
}
```

## Available Commands

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Vercel / Netlify
Simply connect your GitHub repository and deploy!

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimization

- Code splitting with dynamic imports
- Image optimization
- CSS minification
- JavaScript tree-shaking

## Troubleshooting

### API Connection Issues
- Ensure backend is running: `http://127.0.0.1:8000`
- Check browser console for CORS errors
- Verify backend CORS settings allow localhost:3000

### File Upload Fails
- Check file size (max 500 MB)
- Verify file extension (.stp or .step)
- Ensure MinIO is running

### Database Connection Errors
- Check PostgreSQL is running
- Verify database credentials in backend
- Check health status in UI

## License

MIT License

## Support

For issues and questions, refer to the backend README at `../backend/README.md`
