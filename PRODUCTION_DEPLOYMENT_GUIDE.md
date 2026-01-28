# Rork Nightlife App - Production Deployment Guide

## Overview

This guide walks you through deploying the Rork Nightlife App to production, including backend API deployment and mobile app distribution.

**Deployment Architecture**:
- **Backend**: Node.js/Express API on cloud server (AWS, DigitalOcean, Railway, etc.)
- **Database**: MongoDB Atlas (cloud-hosted)
- **Media Storage**: Cloudinary
- **Mobile App**: iOS App Store & Google Play Store via EAS Build

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Mobile App Deployment](#mobile-app-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Security Checklist](#security-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts & Services

- [ ] **Domain Name**: Purchase domain (e.g., rork.app)
- [ ] **MongoDB Atlas Account**: Already set up ✅
- [ ] **Cloudinary Account**: Already set up ✅
- [ ] **Cloud Hosting**: Choose one:
  - AWS EC2 / Elastic Beanstalk
  - DigitalOcean Droplet / App Platform
  - Railway.app
  - Render.com
  - Heroku
- [ ] **Apple Developer Account** ($99/year for iOS distribution)
- [ ] **Google Play Console** ($25 one-time fee for Android distribution)
- [ ] **Expo Account** (free, for EAS Build)

### Tools & Software

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Expo CLI: `npm install -g expo-cli`
- [ ] EAS CLI: `npm install -g eas-cli`
- [ ] PM2 (for production process management): `npm install -g pm2`

---

## Backend Deployment

### Step 1: Prepare Production Environment

#### 1.1 Create Production Environment File

```bash
cd backend
cp .env.production.example .env.production
```

#### 1.2 Configure Production Variables

Edit `backend/.env.production` with your production values:

```bash
# REQUIRED - Update these
PORT=5000
NODE_ENV=production
DOMAIN=https://api.rork.app
FRONTEND_URL=https://rork.app

# MongoDB Atlas (already configured)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rork-nightlife-prod

# JWT Secret - Generate strong random secret
JWT_SECRET=$(openssl rand -base64 32)

# Cloudinary (already configured)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS - Only allow your production domains
ALLOWED_ORIGINS=https://rork.app,https://www.rork.app

# Security
BCRYPT_SALT_ROUNDS=12
```

**Generate Strong Secrets**:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate API key
openssl rand -hex 32
```

---

### Step 2: Choose Hosting Platform

#### Option A: Railway.app (Recommended - Easiest)

**Pros**: Zero config, auto-deploys from Git, includes SSL, environment variables UI
**Cost**: Free tier available, then ~$5-20/month

**Steps**:
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your backend repository
5. Railway auto-detects Node.js and installs dependencies
6. Add environment variables:
   - Go to Variables tab
   - Copy/paste from `.env.production`
7. Railway generates domain: `your-app.railway.app`
8. Optional: Add custom domain `api.rork.app`

**Deploy**:
```bash
# Railway auto-deploys on git push
git push origin main
```

---

#### Option B: DigitalOcean App Platform

**Pros**: Managed platform, auto-scaling, integrated with DO ecosystem
**Cost**: ~$5-12/month

**Steps**:
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App" → Connect GitHub
3. Select repository and branch
4. Configure:
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **Port**: `5000`
5. Add environment variables (from `.env.production`)
6. Choose plan: Basic ($5) or Professional ($12)
7. Click "Create Resources"

**Custom Domain**:
```
1. Go to App → Settings → Domains
2. Add custom domain: api.rork.app
3. Update DNS records:
   - Type: CNAME
   - Name: api
   - Value: your-app.ondigitalocean.app
```

---

#### Option C: AWS EC2 (Advanced - Most Control)

**Pros**: Full control, scalable, industry standard
**Cons**: More setup required
**Cost**: ~$5-50/month depending on instance size

**Steps**:

1. **Launch EC2 Instance**:
   ```bash
   # Choose Ubuntu 22.04 LTS
   # Instance type: t2.micro (free tier) or t2.small
   # Configure security group:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 5000 (API)
   ```

2. **Connect to Instance**:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install Nginx (for reverse proxy)
   sudo apt install -y nginx

   # Install Certbot (for SSL)
   sudo apt install -y certbot python3-certbot-nginx
   ```

4. **Clone Repository**:
   ```bash
   cd /var/www
   sudo git clone https://github.com/yourusername/rork-nightlife-app.git
   cd rork-nightlife-app/backend
   sudo npm install --production
   ```

5. **Create Production Environment**:
   ```bash
   sudo nano .env.production
   # Paste your production environment variables
   ```

6. **Start with PM2**:
   ```bash
   # Start application
   pm2 start src/server.js --name rork-api --env production

   # Save PM2 configuration
   pm2 save

   # Auto-start on system reboot
   pm2 startup
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
   ```

7. **Configure Nginx Reverse Proxy**:
   ```bash
   sudo nano /etc/nginx/sites-available/rork-api
   ```

   ```nginx
   server {
       listen 80;
       server_name api.rork.app;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/rork-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Set Up SSL with Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d api.rork.app
   # Follow prompts to configure SSL
   ```

9. **Configure Firewall**:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

---

### Step 3: DNS Configuration

Point your domain to your server:

**For Railway/DigitalOcean**:
```
Type: CNAME
Name: api
Value: your-app.railway.app (or .ondigitalocean.app)
TTL: 3600
```

**For AWS EC2**:
```
Type: A
Name: api
Value: YOUR_EC2_IP_ADDRESS
TTL: 3600
```

**Verify DNS**:
```bash
dig api.rork.app
# Should return your server IP or CNAME
```

---

### Step 4: Verify Backend Deployment

```bash
# Test health endpoint
curl https://api.rork.app/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z"
}

# Test with authentication
curl -X POST https://api.rork.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Mobile App Deployment

### Step 1: Configure EAS Build

#### 1.1 Install EAS CLI

```bash
npm install -g eas-cli
```

#### 1.2 Login to Expo

```bash
eas login
```

#### 1.3 Configure EAS Project

```bash
cd /path/to/rork-nightlife-app
eas build:configure
```

This creates:
- `eas.json` - Already created ✅
- Links project to Expo account

#### 1.4 Update Environment Variables

Create `.env.production` in root:

```bash
# Production Environment Variables for Mobile App
APP_ENV=production
API_URL=https://api.rork.app
APP_NAME=Rork Nightlife
APP_VERSION=1.0.0
BUILD_NUMBER=1
IOS_BUNDLE_ID=app.rork.nightlife
ANDROID_PACKAGE=app.rork.nightlife
EAS_PROJECT_ID=your-eas-project-id
CLOUDINARY_CLOUD_NAME=your-cloud-name
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

---

### Step 2: Build for iOS

#### 2.1 Apple Developer Setup

**Prerequisites**:
- Apple Developer Account ($99/year)
- Enrolled in Apple Developer Program
- Certificates and Provisioning Profiles (EAS handles this)

#### 2.2 Build iOS App

```bash
# Production build for App Store
eas build --platform ios --profile production

# This will:
# 1. Create iOS certificates and provisioning profiles
# 2. Build the app on Expo servers
# 3. Generate .ipa file for App Store
```

**First-time Setup Prompts**:
```
? Would you like to automatically create certificates? Yes
? Would you like to create a new push notification key? Yes
? What would you like your iOS Bundle Identifier to be? app.rork.nightlife
```

**Build takes 10-20 minutes**. Monitor progress:
```bash
eas build:list
```

#### 2.3 Download Build

```bash
# Download .ipa file
eas build:download --platform ios --profile production
```

---

### Step 3: Build for Android

#### 3.1 Google Play Setup

**Prerequisites**:
- Google Play Console account ($25 one-time)
- Create app in Play Console
- Generate upload key

#### 3.2 Generate Android Keystore

```bash
# EAS will generate keystore for you
eas build --platform android --profile production

# Or generate manually:
keytool -genkeypair -v -storetype PKCS12 \
  -keystore rork-upload-key.keystore \
  -alias rork-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

#### 3.3 Build Android App

```bash
# Production build for Play Store (AAB format)
eas build --platform android --profile production

# This will:
# 1. Generate keystore (first time)
# 2. Build Android App Bundle (.aab)
# 3. Sign with upload key
```

**Build takes 15-25 minutes**.

#### 3.4 Download Build

```bash
# Download .aab file
eas build:download --platform android --profile production
```

---

### Step 4: Submit to App Stores

#### 4.1 Submit to iOS App Store

```bash
# Option 1: Using EAS Submit (Automated)
eas submit --platform ios --profile production

# You'll be prompted for:
# - Apple ID
# - App-specific password
# - App Store Connect info

# Option 2: Manual Upload via Xcode
# 1. Download .ipa file
# 2. Open Xcode → Window → Organizer
# 3. Drag .ipa to Organizer
# 4. Click "Distribute App" → App Store Connect
```

**App Store Connect Setup**:
1. Go to https://appstoreconnect.apple.com
2. Create new app:
   - **Name**: Rork Nightlife
   - **Bundle ID**: app.rork.nightlife
   - **SKU**: rork-nightlife-001
3. Fill in App Information:
   - Description
   - Keywords
   - Screenshots (required for all device sizes)
   - Privacy Policy URL
   - Support URL
4. Submit for Review

**Review Time**: 1-3 days

---

#### 4.2 Submit to Google Play Store

```bash
# Option 1: Using EAS Submit (Automated)
eas submit --platform android --profile production

# Option 2: Manual Upload
# 1. Go to Google Play Console
# 2. Select your app → Production → Create new release
# 3. Upload .aab file
# 4. Fill in release notes
# 5. Review and rollout
```

**Play Console Setup**:
1. Go to https://play.google.com/console
2. Create new app:
   - **App name**: Rork Nightlife
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
3. Complete Store Listing:
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots (min 2, max 8)
   - Feature graphic (1024x500)
   - App category
   - Content rating
   - Privacy policy URL
4. Set up Content Rating (questionnaire)
5. Set up Pricing & Distribution
6. Create Production Release

**Review Time**: 1-7 days (usually faster than iOS)

---

### Step 5: Over-the-Air (OTA) Updates

EAS Update allows you to push JavaScript/asset updates without resubmitting to app stores.

#### 5.1 Configure EAS Update

```bash
# Already configured in app.config.js ✅
```

#### 5.2 Publish Update

```bash
# Publish update to production channel
eas update --branch production --message "Fix minor bug"

# Or with automatic branch detection
eas update --auto
```

#### 5.3 Update Flow

```
1. User opens app
2. App checks for updates
3. Downloads update in background
4. Applies on next app restart
```

**Limitations**:
- Only updates JavaScript and assets
- Cannot update native code (requires new build)
- Cannot update app.json configuration

---

## Environment Configuration

### Backend Environment Variables

**Critical Variables** (Must be set):
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-secret>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ALLOWED_ORIGINS=https://rork.app
```

**Optional Variables**:
```bash
SENTRY_DSN=...               # Error tracking
STRIPE_SECRET_KEY=...        # Payment processing
SMTP_HOST=...                # Email notifications
REDIS_URL=...                # Caching
```

### Frontend Environment Variables

**Set in EAS Build**:
```bash
API_URL=https://api.rork.app
APP_ENV=production
CLOUDINARY_CLOUD_NAME=...
SENTRY_DSN=...
```

**Or via eas.json**:
```json
{
  "build": {
    "production": {
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://api.rork.app"
      }
    }
  }
}
```

---

## Security Checklist

### Backend Security

- [ ] **HTTPS Only**: Enforce SSL/TLS (no HTTP)
- [ ] **Strong JWT Secret**: Min 32 characters, random
- [ ] **CORS**: Only allow production domains
- [ ] **Rate Limiting**: Enabled (100 req/15min)
- [ ] **Helmet.js**: Security headers enabled
- [ ] **Environment Variables**: Not committed to Git
- [ ] **Database**: MongoDB Atlas with authentication
- [ ] **Cloudinary**: Signed uploads, access control
- [ ] **API Keys**: Rotated regularly
- [ ] **Logs**: No sensitive data logged
- [ ] **Dependencies**: Updated, no vulnerabilities

**Verify Security Headers**:
```bash
curl -I https://api.rork.app

# Should include:
# Strict-Transport-Security
# X-Content-Type-Options
# X-Frame-Options
# X-XSS-Protection
```

### Mobile App Security

- [ ] **API URL**: Points to HTTPS backend
- [ ] **Code Obfuscation**: Enabled in production builds
- [ ] **Secrets**: No hardcoded secrets in code
- [ ] **App Transport Security**: HTTPS only (iOS)
- [ ] **SSL Pinning**: Consider for high-security
- [ ] **Jailbreak Detection**: Consider if needed
- [ ] **Analytics**: Privacy-compliant (GDPR, CCPA)

---

## Monitoring & Maintenance

### Health Checks

**Automated Monitoring**:
```bash
# UptimeRobot (free tier)
https://uptimerobot.com

# Monitor endpoints:
- https://api.rork.app/health
- https://api.rork.app/api/auth/login (test endpoint)
```

**Set up Alerts**:
- Email/SMS when API goes down
- Response time > 2 seconds
- Error rate > 5%

### Error Tracking

**Sentry Integration**:

1. Sign up at https://sentry.io
2. Create project: "Rork Nightlife API"
3. Get DSN
4. Add to `.env.production`:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   ```
5. Backend auto-reports errors

**Mobile App Sentry**:
```bash
# Install
npx expo install @sentry/react-native

# Configure in app.config.js (already done ✅)
```

### Logging

**Backend Logs**:
```bash
# PM2 logs
pm2 logs rork-api

# View last 100 lines
pm2 logs rork-api --lines 100

# Clear logs
pm2 flush
```

**Application Logs**:
```bash
# Production logs saved to file
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/production.log

# View logs
tail -f backend/logs/production.log
```

### Database Backups

**MongoDB Atlas Auto-Backup**:
1. Go to Atlas → Backup
2. Enable Continuous Cloud Backup
3. Configure retention: 7-30 days
4. Test restore procedure monthly

**Manual Backup**:
```bash
# Export database
mongodump --uri="mongodb+srv://..." --out=./backup-$(date +%Y%m%d)

# Restore database
mongorestore --uri="mongodb+srv://..." ./backup-20240120
```

### Performance Monitoring

**Metrics to Track**:
- API response times
- Database query performance
- Upload success rates
- User signup/login success rates
- Crash-free rate (mobile apps)

**Tools**:
- New Relic
- Datadog
- AWS CloudWatch (if using AWS)
- PM2 Plus

---

## Rollback Procedures

### Backend Rollback

**If deployment fails**:

```bash
# With PM2
pm2 stop rork-api
pm2 delete rork-api

# Checkout previous version
git checkout previous-commit-hash
npm install
pm2 start src/server.js --name rork-api --env production
```

**With Railway/DigitalOcean**:
1. Go to Deployments
2. Click "Rollback" to previous deployment

### Mobile App Rollback

**OTA Update Rollback**:
```bash
# Publish previous update
eas update:republish --branch production --group <previous-group-id>
```

**Full App Rollback**:
- Cannot rollback published app store versions
- Can only release new version
- Keep previous .ipa/.aab builds archived

---

## Post-Deployment Checklist

### Backend

- [ ] Health endpoint returns 200 OK
- [ ] Authentication works (login/signup)
- [ ] File uploads work (profile, studio, memories)
- [ ] Database connection stable
- [ ] Cloudinary uploads working
- [ ] HTTPS enabled and valid
- [ ] Monitoring/alerts configured
- [ ] Logs being captured
- [ ] Backups scheduled

### Mobile App

- [ ] iOS app submitted and approved
- [ ] Android app submitted and approved
- [ ] API URL points to production backend
- [ ] All features work (auth, uploads, locations)
- [ ] Push notifications configured (if enabled)
- [ ] Analytics tracking (if enabled)
- [ ] App store listings complete
- [ ] Support email configured
- [ ] Privacy policy published

---

## Common Issues & Solutions

### Issue: API Returns 502 Bad Gateway
**Solution**: Backend not running or crashed. Check PM2 logs.

### Issue: CORS Errors in Mobile App
**Solution**: Add mobile app bundle IDs to ALLOWED_ORIGINS in backend.

### Issue: Uploads Failing
**Solution**: Verify Cloudinary credentials in production environment.

### Issue: JWT Token Expired
**Solution**: Check JWT_EXPIRES_IN setting, refresh token flow.

### Issue: Database Connection Timeout
**Solution**: Check MongoDB Atlas IP whitelist, add server IP.

### Issue: App Store Rejection
**Solution**: Review rejection reason, common issues:
- Missing privacy policy
- Incomplete metadata
- Crashes on launch
- Violations of guidelines

---

## Support & Resources

**Documentation**:
- Expo: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Cloudinary: https://cloudinary.com/documentation

**Community**:
- Expo Forums: https://forums.expo.dev
- Stack Overflow: Tag [expo] [react-native]

---

## Appendix

### A. Cost Estimate

**Monthly Costs**:
- Domain: $1-2/month
- Backend Hosting: $5-50/month
- MongoDB Atlas: Free tier / $9-57/month
- Cloudinary: Free tier / $89+/month
- **Total: $6-200/month** (depending on scale)

**One-Time Costs**:
- Apple Developer: $99/year
- Google Play: $25 one-time

### B. Scaling Considerations

**When to scale**:
- Response times > 2 seconds
- CPU usage > 80%
- Memory usage > 80%
- Database connections maxed out

**Scaling options**:
- Vertical: Upgrade server instance size
- Horizontal: Add more backend instances + load balancer
- Database: Upgrade MongoDB Atlas tier
- CDN: Add Cloudflare for static assets

---

**Deployment Complete!** 🎉

Your Rork Nightlife App is now live in production.

**Last Updated**: Production deployment guide v1.0
**Next Steps**: Monitor app performance, gather user feedback, iterate on features
