# ETER Reports Backend API

A clean, modular Node.js/Express backend API for the ETER daily reports management system.

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/           # Configuration management
│   │   ├── index.js      # Main config with environment validation
│   │   └── database.js   # MongoDB connection setup
│   ├── controllers/      # Request handlers
│   │   ├── authController.js    # Authentication logic
│   │   └── formController.js    # Form management logic
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # JWT authentication & authorization
│   │   ├── error.js      # Error handling & custom API errors
│   │   ├── security.js   # Security headers, CORS, rate limiting
│   │   ├── validation.js # Request validation helpers
│   │   └── index.js      # Middleware exports
│   ├── models/          # Database models
│   │   ├── User.js      # User authentication model
│   │   ├── Form.js      # Daily report form model
│   │   └── index.js     # Model exports
│   ├── routes/          # API routes
│   │   ├── auth.js      # Authentication endpoints
│   │   ├── forms.js     # Form management endpoints
│   │   ├── pdf.js       # PDF generation endpoints
│   │   └── index.js     # Route aggregation
│   ├── services/        # Business logic services
│   │   └── pdfService.js # PDF generation service
│   └── utils/           # Utility functions
│       ├── helpers.js   # Common helper functions
│       └── logger.js    # Winston logging configuration
├── uploads/             # File uploads storage
├── logs/               # Application logs (production)
├── server.js           # Main application entry point
├── package.json        # Dependencies and scripts
└── .env.example        # Environment variables template
```

## 🚀 Features

### Security
- JWT-based authentication
- Bcrypt password hashing
- Rate limiting
- CORS protection
- Security headers with Helmet
- Input validation and sanitization
- Account lockout after failed attempts

### API Endpoints
- **Authentication**: Login, logout, profile management, user administration
- **Forms**: Submit, retrieve, update, delete daily reports
- **PDF Generation**: Single reports, batch reports, date range reports, summary reports
- **Statistics**: Dashboard analytics and reporting metrics

### Database
- MongoDB with Mongoose ODM
- Optimized queries and indexing
- Data validation and schema enforcement
- Connection pooling and error handling

### Logging & Monitoring
- Structured logging with Winston
- Request/response logging
- Error tracking and security event logging
- Performance monitoring

## 📦 Installation

1. **Clone and navigate to backend directory:**
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
   # Edit .env with your configuration
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `HOST` | Server host | `localhost` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/eter-reports` |
| `JWT_SECRET` | JWT signing secret | **Change in production!** |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |
| `LOG_LEVEL` | Logging level | `debug` |

### Database Setup

1. **Install MongoDB locally** or use a cloud service like MongoDB Atlas
2. **Update MONGODB_URI** in your `.env` file
3. **Start the application** - it will create indexes and initial admin user automatically

### Default Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`

*Change this immediately in production!*

## 📝 API Documentation

### Authentication Endpoints
```
POST   /api/auth/login           # User login
GET    /api/auth/verify          # Verify JWT token
POST   /api/auth/logout          # User logout
GET    /api/auth/profile         # Get user profile
PUT    /api/auth/profile         # Update user profile
PUT    /api/auth/change-password # Change password
GET    /api/auth/users           # Get all users (admin)
POST   /api/auth/users           # Create user (admin)
PUT    /api/auth/users/:id       # Update user (admin)
DELETE /api/auth/users/:id       # Delete user (admin)
```

### Form Management Endpoints
```
POST   /api/forms/submit         # Submit new form
GET    /api/forms               # Get all forms (admin)
GET    /api/forms/:id           # Get form by ID (admin)
PUT    /api/forms/:id/status    # Update form status (admin)
DELETE /api/forms/:id           # Delete form (admin)
GET    /api/forms/statistics    # Get form statistics (admin)
GET    /api/forms/date-range    # Get forms by date range (admin)
PUT    /api/forms/bulk          # Bulk update forms (admin)
```

### PDF Generation Endpoints
```
GET    /api/pdf/report/:id              # Generate single report PDF
POST   /api/pdf/reports/multiple        # Generate multiple reports PDF
GET    /api/pdf/reports/date-range      # Generate date range reports PDF
GET    /api/pdf/summary                 # Generate summary report PDF
```

### Health Check
```
GET    /api/health              # API health status
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📊 Monitoring

### Logs
- **Development**: Console output with colors
- **Production**: File logging with rotation
  - `logs/error.log` - Error events
  - `logs/combined.log` - All events
  - `logs/access.log` - HTTP requests

### Metrics
- Request/response times
- Authentication events
- Database operations
- Security events
- Performance tracking

## 🔐 Security Features

- **Password Security**: Bcrypt hashing with configurable rounds
- **JWT Authentication**: Secure token-based auth with expiration
- **Rate Limiting**: Configurable request limits per IP
- **Input Validation**: Schema validation with express-validator
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js security headers
- **Account Lockout**: Protection against brute force attacks

## 🚀 Deployment

### Production Checklist
- [ ] Change default JWT secret
- [ ] Configure production MongoDB URI
- [ ] Set NODE_ENV to 'production'
- [ ] Configure proper CORS origins
- [ ] Set up log rotation
- [ ] Configure reverse proxy (nginx)
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Follow the established file structure
2. Add tests for new features
3. Update documentation
4. Follow security best practices
5. Use ESLint for code formatting

## 📄 License

MIT License - see LICENSE file for details.