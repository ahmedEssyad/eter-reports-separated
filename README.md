# ETER Reports System - Separated Architecture

A modern frontend-backend separated architecture for ETER (Établissement des Travaux d'Entretien Routier) daily reports management system.

## 🏗️ Architecture

```
eter-reports-separated/
├── backend/                 # Express.js API Server
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   ├── .env.example        # Environment variables template
│   └── uploads/            # Signature files storage
└── frontend/               # HTML/CSS/JS Frontend
    ├── index.html          # Employee form (main page)
    ├── login.html          # Admin login
    ├── admin-dashboard.html # Admin dashboard
    ├── css/                # Stylesheets
    ├── js/                 # JavaScript files
    │   ├── api-client.js   # API communication layer
    │   ├── eter-form.js    # Employee form logic
    │   └── admin-dashboard.js # Admin interface
    └── package.json        # Frontend dev dependencies
```

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

4. **Start backend server:**
   ```bash
   npm run dev
   # Server runs on http://localhost:5000
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start frontend server:**
   ```bash
   npm start
   # Frontend runs on http://localhost:3000
   ```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify JWT token

### Forms
- `POST /api/forms` - Submit employee report

### Admin (Protected)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/reports` - List reports with pagination
- `GET /api/admin/reports/:id` - Get specific report
- `GET /api/admin/reports/:id/pdf` - Download report as PDF

### Health
- `GET /api/health` - Server health check

## 🔧 Configuration

### Backend Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/eter_reports
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

### Frontend API Configuration
The frontend automatically connects to the backend at `http://localhost:5000`. To change this, update the `baseURL` in `js/api-client.js`.

## 👥 Default Credentials
- **Username:** admin
- **Password:** admin123

⚠️ **Change these credentials in production!**

## 🔄 Key Features

### Frontend (HTML/CSS/JS/Bootstrap)
- **Responsive design** with Bootstrap 5
- **Digital signature capture** via HTML5 Canvas
- **Offline-first approach** with localStorage fallback
- **PWA capabilities** (if service worker implemented)
- **Real-time API communication** via fetch

### Backend (Express.js)
- **RESTful API** with proper HTTP status codes
- **JWT authentication** with bcrypt password hashing
- **MongoDB integration** with fallback to memory storage
- **File upload handling** for signatures
- **PDF generation** with exact formatting
- **CORS configured** for frontend-backend separation

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm run dev  # Uses live-server with auto-reload
```

## 📱 Production Deployment

### Backend Deployment
1. Set production environment variables
2. Use a process manager (PM2, Docker)
3. Configure reverse proxy (Nginx)
4. Set up MongoDB Atlas or similar

### Frontend Deployment
1. Build static files (already ready)
2. Deploy to CDN or static hosting
3. Update API base URL for production
4. Configure CORS on backend for production domain

## 🔒 Security Features

- **JWT token authentication** with expiration
- **Password hashing** with bcryptjs
- **CORS protection** configured for specific origins
- **Input validation** on both frontend and backend
- **Protected admin routes** with middleware
- **Secure file upload** handling

## 📊 Database Schema

### Forms Collection
```javascript
{
  id: String (unique),
  entree: String,
  origine: String,
  depot: String,
  chantier: String,
  date: Date,
  stockDebut: Number,
  stockFin: Number,
  sortieGasoil: Number,
  vehicles: [{
    matricule: String,
    chauffeur: String,
    heureRevif: String,
    quantiteLivree: Number,
    lieuComptage: String
  }],
  signatureResponsable: String (base64),
  signatureChef: String (base64),
  timestamp: Date
}
```

### Users Collection
```javascript
{
  username: String (unique),
  password: String (hashed),
  name: String,
  role: String,
  createdAt: Date,
  lastLogin: Date
}
```

## 🎯 Benefits of This Architecture

1. **Separation of Concerns** - Frontend and backend can be developed independently
2. **Scalability** - Each tier can be scaled separately
3. **Technology Flexibility** - Frontend and backend can use different technologies
4. **API-First** - Backend can serve multiple frontends (web, mobile, etc.)
5. **Deployment Flexibility** - Can deploy to different servers/CDNs
6. **Team Collaboration** - Frontend and backend teams can work in parallel

## 🔄 Migration from Monolith

This separated architecture maintains 100% feature parity with the original monolithic version while providing better maintainability and scalability.