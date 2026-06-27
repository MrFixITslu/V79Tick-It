# On-Premise Deployment Guide

Hardened production deployment for V79 Tick-It on a Linux server.

## Prerequisites
- Node.js 20+
- PM2 (`npm install -g pm2`)
- Nginx (for SSL and reverse proxy)

## 1. Prepare Environment
1. Clone the repository to the server.
2. Run `npm install --production`.
3. Create `.env` based on `.env.example`.
4. Generate production secrets:
   ```bash
   node scripts/generate-secrets.js
   ```
   Paste the output into your `.env`.

## 2. Build Frontend
```bash
npm run build
```
This generates the optimized static files in `dist/`.

## 3. Launch Backend with PM2
```bash
npm run start:prod
```
Verify the backend is running and healthy:
```bash
curl http://localhost:3001/health
```

## 4. Configure Local Backups
Add a cron job to backup the database daily at 3 AM:
```bash
0 3 * * * cd /path/to/app && /usr/bin/node scripts/backup-db.js >> /path/to/app/logs/cron.log 2>&1
```

## 5. Nginx Reverse Proxy (Recommended)
Configure Nginx to serve the `dist/` folder and proxy API requests.

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL Certs (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend Statics
    root /path/to/v79tickit/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security Headers (Redundant with app helmet but good practice)
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

## 6. Maintenance
- **Logs**: `pm2 logs` or view `logs/` directory.
- **Audit**: Check `logs/audit-YYYY-MM-DD.log` for security events.
- **Update**: `git pull`, `npm install`, `npm run build`, `npm run restart:prod`.
