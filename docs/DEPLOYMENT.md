# 🚀 IT-HUB ERP — Deployment & DevOps Guide

## 1. Environment Configurations
Create a `.env` file in the project root:
```env
# Application
VITE_APP_TITLE="IT-HUB ERP"
VITE_APP_ENV="production" # production | staging | development

# Supabase Cloud Database (Optional for Cloud Sync)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Storage & Analytics
VITE_ENABLE_OFFLINE_STORAGE="true"
VITE_TELEMETRY_LOGGING="true"
```

---

## 2. Production Build & Optimization
```bash
# 1. Install exact locked dependencies
npm ci

# 2. Run static validation & linter
npm run lint

# 3. Compile optimized production bundle
npm run build

# 4. Preview compiled bundle locally
npm run preview
```

Output directory: `dist/` (contains compressed minified assets, index.html, CSS and JS chunks).

---

## 3. Hosting Options

### Option A: Vercel / Netlify / Cloudflare Pages
* **Framework Preset**: Vite
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **SPA Routing Rewrite Rule**:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### Option B: Docker Container Deployment
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Database Migrations (Supabase)
Apply migrations via Supabase CLI:
```bash
supabase db push
# or run supabase/migrations/20261010000000_init_erp_schema.sql in SQL Editor
```
