# Rork Nightlife Backend API

Production-ready Express.js backend for contact and Instagram sync features.

## 🚀 Features

- **Contact Sync**: Match users by hashed phone numbers (SHA-256)
- **Instagram OAuth**: Secure token exchange with Instagram Graph API
- **Instagram Sync**: Fetch and match Instagram following list
- **Rate Limiting**: Prevent API abuse
- **Security**: Helmet, CORS, input validation
- **Monitoring**: Health checks and logging
- **Database**: MongoDB with Mongoose ODM

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm or yarn
- Instagram Developer Account (for OAuth)

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
PORT=3000
MONGODB_URI=mongodb://localhost:27017/rork-nightlife
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Optional (defaults provided)
NODE_ENV=development
INSTAGRAM_REDIRECT_URI=nox://instagram-callback
ALLOWED_ORIGINS=http://localhost:19006,exp://localhost:19000
```

### 3. Start MongoDB

```bash
# Using Homebrew (macOS)
brew services start mongodb-community

# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify connection
mongosh
```

### 4. Seed Database (Optional)

```bash
npm run seed
```

This creates 10 sample users with:
- Hashed phone numbers (+1415555100X)
- Instagram usernames
- Profile data

### 5. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start at: http://localhost:3000

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-02T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### Contact Sync

```bash
POST /api/social/sync/contacts
Content-Type: application/json

{
  "phoneNumbers": ["hashed_phone_1", "hashed_phone_2"],
  "userId": "user_id_here"
}
```

Response:
```json
{
  "matches": [
    {
      "hashedPhone": "hashed_phone_1",
      "userId": "670abc123def456...",
      "displayName": "Sarah Chen",
      "avatarUrl": "https://..."
    }
  ],
  "totalMatches": 1
}
```

### Instagram Token Exchange

```bash
POST /api/auth/instagram/token
Content-Type: application/json

{
  "code": "instagram_auth_code"
}
```

Response:
```json
{
  "accessToken": "long_lived_token",
  "userId": "instagram_user_id",
  "username": "johndoe",
  "expiresAt": "2026-03-02T10:00:00.000Z",
  "appUserId": "670abc123def456..."
}
```

### Instagram Sync

```bash
POST /api/social/sync/instagram
Content-Type: application/json

{
  "accessToken": "instagram_access_token",
  "userId": "app_user_id"
}
```

Response:
```json
{
  "matches": [
    {
      "instagramId": "instagram_id",
      "instagramUsername": "sarah_vibes",
      "userId": "670abc123def456...",
      "displayName": "Sarah Chen",
      "avatarUrl": "https://..."
    }
  ],
  "totalMatches": 1
}
```

### Token Refresh

```bash
POST /api/auth/instagram/refresh
Content-Type: application/json

{
  "accessToken": "current_token",
  "userId": "app_user_id"
}
```

## 🧪 Testing

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:3000/health

# Contact sync (using seed data)
curl -X POST http://localhost:3000/api/social/sync/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d"],
    "userId": "test-user-123"
  }'
```

### Automated Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 📦 Deployment

### Option 1: Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway add mongodb
railway up
```

3. Set environment variables in Railway dashboard

### Option 2: Heroku

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create rork-nightlife-api

# Add MongoDB
heroku addons:create mongodbatlas:M0

# Set env vars
heroku config:set INSTAGRAM_CLIENT_ID=your_id
heroku config:set INSTAGRAM_CLIENT_SECRET=your_secret

# Deploy
git push heroku main
```

### Option 3: Docker

```bash
# Build image
docker build -t rork-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/rork \
  -e INSTAGRAM_CLIENT_ID=your_id \
  -e INSTAGRAM_CLIENT_SECRET=your_secret \
  --name rork-backend \
  rork-backend
```

### Option 4: VPS (DigitalOcean, AWS EC2)

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
# Follow: https://www.mongodb.com/docs/manual/administration/install-on-linux/

# Clone repo
git clone https://github.com/yourusername/rork-nightlife-app.git
cd rork-nightlife-app/backend

# Install dependencies
npm install --production

# Setup PM2 for process management
sudo npm install -g pm2
pm2 start src/server.js --name rork-api
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure Nginx (see NGINX_CONFIG.md)
```

## 🔒 Security

### Environment Variables

**Never commit these to git:**
- `INSTAGRAM_CLIENT_SECRET`
- `JWT_SECRET`
- `MONGODB_URI` (if contains password)

### Rate Limiting

Default: 100 requests per 15 minutes per IP

Adjust in `.env`:
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### CORS

Configure allowed origins in `.env`:
```env
ALLOWED_ORIGINS=https://yourapp.com,https://api.yourapp.com
```

### Input Validation

All endpoints use `express-validator` for input validation.

### Phone Number Hashing

Phone numbers are hashed client-side with SHA-256. Backend only stores hashes.

## 📊 Monitoring

### Health Endpoint

Monitor uptime:
```bash
curl http://localhost:3000/health
```

### Logging

Development: Pretty console logs
Production: JSON logs (easily parseable)

### Error Tracking

Add Sentry:
```bash
npm install @sentry/node
```

```javascript
// src/server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Add before error handler
app.use(Sentry.Handlers.errorHandler());
```

## 🔧 Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Start MongoDB:
```bash
brew services start mongodb-community
```

### Instagram API Errors

```
Failed to exchange Instagram authorization code
```

**Solutions**:
1. Verify `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` in `.env`
2. Check redirect URI matches Instagram app settings
3. Ensure using valid authorization code (codes expire quickly)

### CORS Errors

```
Not allowed by CORS
```

**Solution**: Add origin to `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:19006,exp://localhost:19000
```

### Rate Limit Errors

```
Too many requests from this IP
```

**Solution**: Increase limits or wait for reset:
```env
RATE_LIMIT_MAX_REQUESTS=200
```

## 📚 API Documentation

Full API documentation: [API_DOCS.md](./API_DOCS.md)

Postman Collection: [postman_collection.json](./postman_collection.json)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

- Issues: [GitHub Issues](https://github.com/yourusername/rork-nightlife-app/issues)
- Email: support@rork.app
- Discord: [Join our community](https://discord.gg/rork)

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env`
3. ✅ Start MongoDB
4. ✅ Seed database (optional)
5. ✅ Start server
6. ⏳ Deploy to production
7. ⏳ Setup monitoring
8. ⏳ Configure Instagram app
9. ⏳ Test with mobile app

---

**Built with ❤️ by the Rork team**
