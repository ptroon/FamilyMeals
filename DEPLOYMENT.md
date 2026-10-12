# FamilyMeals Deployment & Infrastructure Guide

This guide provides instructions to run and deploy **FamilyMeals** locally and to Google Cloud / Google App Hosting while staying **completely within the free tiers**.

---

## 1. Quick Start (Local Development)

### Prerequisites
- Node.js (v18, v20, v22, or v24)
- npm

### Steps
1. **Clone / Open the repository**:
   ```bash
   cd FamilyMeals
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Initialization**:
   - **Automatic Blank Database on First Run (GitHub / Fresh Deployment):** When you clone the repository from GitHub or deploy to a new server where `data/familymeals.db` does not yet exist, **the application automatically creates a new blank SQLite database on first startup** containing only the default Administrator account (`admin@familymeals.local`), UK CoFID reference nutrients, and 0 meal plans, 0 recipes, and 0 shopping lists.
   - **Explicitly Initialize / Reset to a Blank Database via CLI:**
     ```bash
     npm run db:init-blank
     ```
   - **Reset to a Blank Database from the Web UI:** Log in as Admin, navigate to **Admin -> Database Backup & Restore**, and click **Initialize New Blank Database (Admin Only)**.
   - **Optional Sample Data:** If you want to populate sample wholesome recipes and a sample weekly meal plan instead:
     ```bash
     npm run seed
     ```

4. **Build the application**:
   ```bash
   npm run build
   ```

5. **Start the server**:
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) in Chrome, Firefox, Safari, or Edge.

### Default Administrator Credentials
- **Email:** `admin@familymeals.local`
- **Password:** `AdminFamilyMeals123!`
*(You can change this password or configure custom credentials under the Admin Control Panel).*

---

## 2. Google App Hosting Deployment (Free Tier)

Google App Hosting is Google's next-generation serverless hosting platform for full-stack web applications.

### Option A: Via GitHub & Google Cloud Console
1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Release v0.4 - FamilyMeals application"
   git remote add origin https://github.com/ptroon/FamilyMeals.git
   git push -u origin main
   ```

2. **Create an App Hosting Backend**:
   - Navigate to the [Firebase Console](https://console.firebase.google.com/) or [Google Cloud Console](https://console.cloud.google.com/).
   - Select **App Hosting** from the left navigation.
   - Click **Get started** and link your GitHub repository.
   - Select your branch (`main`).
   - App Hosting detects `apphosting.yaml` automatically.

3. **Configure Environment Secrets**:
   - In the App Hosting configuration panel, add secret environment variables:
     - `JWT_SECRET`: A long random secret string.
     - `DEFAULT_ADMIN_EMAIL`: `admin@familymeals.local`
     - `DEFAULT_ADMIN_PASSWORD`: Your chosen secure password.
     - `GEMINI_API_KEY`: *(Optional)* Your free Google AI Studio key.

---

## 3. Alternative: Deploy to Google Cloud Run (100% Free Tier)

Google Cloud Run offers **2 million requests per month, 360,000 vCPU-seconds, and 180,000 GiB-seconds of memory for FREE every month**.

### Steps
1. **Install the Google Cloud CLI (gcloud)** if you haven't already:
   ```bash
   gcloud init
   ```

2. **Build and deploy directly from source**:
   ```bash
   gcloud run deploy familymeals \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --min-instances 0 \
     --max-instances 1 \
     --memory 512Mi \
     --set-env-vars NODE_ENV=production,DATABASE_PATH=data/familymeals.db,ENFORCE_HTTPS=true
   ```

3. **Result**:
   You will receive a live HTTPS URL (e.g. `https://familymeals-xyz.a.run.app`) with SSL certificates automatically provisioned at zero cost!

---

## 4. Setting up Google AI Studio (Gemini Free Tier)

To enable **AI Recipe Parsing** and **AI Meal Plan Recommendations**:

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** in the left sidebar.
4. Click **Create API key** (select a Google Cloud project or create a free one).
5. Copy your API key (`AIzaSy...`).
6. Open your FamilyMeals application, navigate to **Admin -> App Settings**, and paste the key into the **Google Gemini AI API Key** field.
7. Click **Save App Variables**.

> [!TIP]
> Google AI Studio provides **15 requests per minute (RPM)** and **1,500 requests per day (RPD)** completely free on the Gemini 2.5 Flash / Pro models.

---

## 5. Setting up SMTP Email Delivery (Human Steps)

To allow users to email meal plan links to saved family contacts or distribution lists:

### Using Gmail (Free):
1. Log in to your Google Account at [myaccount.google.com](https://myaccount.google.com/).
2. Enable **2-Step Verification** under Security.
3. Go to **Security -> 2-Step Verification -> App passwords** (or search "App passwords").
4. Create a new App Password named `FamilyMeals`.
5. Google will generate a 16-letter password (e.g., `abcd efgh ijkl mnop`).
6. In FamilyMeals, go to **Admin -> SMTP Email Config**:
   - **SMTP Host:** `smtp.gmail.com`
   - **SMTP Port:** `587`
   - **SMTP Username:** `your-email@gmail.com`
   - **SMTP Password:** `your-16-character-app-password`
   - **From Email:** `your-email@gmail.com`
   - **From Name:** `FamilyMeals Kitchen`
   - **Use SSL/TLS:** Unchecked (uses STARTTLS on port 587)
7. Click **Save SMTP Settings**, then click **Send Test Email** to verify!

### Using SendGrid or Brevo (Free Tiers):
- **SendGrid**: 100 emails/day free forever. Host: `smtp.sendgrid.net`, Port `587`, User `apikey`, Pass `<Your-API-Key>`.
- **Brevo**: 300 emails/day free forever. Host: `smtp-relay.brevo.com`, Port `587`.

---

## 6. Setting up Google Single Sign-On (SSO)

FamilyMeals supports Google Sign-In for seamless authentication without passwords.

### Steps:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > OAuth consent screen**:
   - User Type: **External** (or Internal for Google Workspace).
   - App Name: `FamilyMeals`.
   - User Support Email: your email.
   - Developer Contact Info: your email.
   - Click **Save and Continue**.
4. Navigate to **APIs & Services > Credentials**:
   - Click **+ Create Credentials > OAuth client ID**.
   - Application Type: **Web application**.
   - Name: `FamilyMeals Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://your-domain.app` (for your production domain or Cloud Run URL)
   - Click **Create**.
5. Copy your **Client ID** (e.g. `123456789-abcdefg.apps.googleusercontent.com`).
6. In FamilyMeals, navigate to **Admin -> App Settings & Nutrients**.
7. Paste the Client ID into the **Google SSO OAuth Client ID** field and click **Save App Variables** (or set environment variable `GOOGLE_CLIENT_ID`).
8. The login modal will automatically activate the **"Continue with Google"** button!

---

## 7. Configuring SSL/TLS Certificates on Google Cloud Platform (GCP)

FamilyMeals (`v0.4+`) is pre-configured for secure HTTPS operation on Google Cloud Platform:
- **Reverse-Proxy Trust (`trust proxy`)**: Automatically trusts GCP's Google Front End (GFE) load balancers (`X-Forwarded-Proto: https`).
- **Automatic HTTP -> HTTPS Redirect & HSTS**: When running in production (`NODE_ENV=production`, `K_SERVICE` on Cloud Run, `GAE_APPLICATION` on App Engine, or `ENFORCE_HTTPS=true`), any plain HTTP request is automatically `301` redirected to `https://`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS) headers are attached to all responses.
- **Direct Node.js HTTPS Server**: Also supports loading PEM certificates directly via `SSL_CERT_PATH` and `SSL_KEY_PATH` when hosted on a Compute Engine VM without an external load balancer.

### Option A: Default `.run.app` or `.hosted.app` Domain (Zero Configuration)
When you deploy to **Google Cloud Run** or **Firebase App Hosting**, Google automatically provisions and renews a **Google-managed SSL/TLS certificate** for your default `.a.run.app` or `.hosted.app` URL. No manual certificate upload is required.

### Option B: Custom Domain on Cloud Run with Automatic Google-Managed SSL Certificate
To attach your own custom domain (e.g., `meals.yourdomain.com`) with an auto-renewing Google-managed TLS certificate:

1. **Verify domain ownership** in Google Cloud (one-time per root domain):
   ```bash
   gcloud domains verify yourdomain.com
   ```
2. **Create a Cloud Run domain mapping** (this automatically requests and provisions a Google-managed SSL certificate):
   ```bash
   gcloud beta run domain-mappings create \
     --service familymeals \
     --domain meals.yourdomain.com \
     --region us-central1
   ```
3. **Configure DNS records**:
   Run the following command to view the DNS records required by Google Cloud:
   ```bash
   gcloud beta run domain-mappings describe \
     --domain meals.yourdomain.com \
     --region us-central1
   ```
   Add the displayed `CNAME` (typically `ghs.googlehosted.com.`) or `A`/`AAAA` records at your DNS registrar.
4. **Certificate Provisioning**:
   Once DNS propagates (usually 5–15 minutes), Google Certificate Authority automatically issues and binds the SSL certificate to your Cloud Run service and renews it before expiration.

### Option C: Google Cloud External Application Load Balancer (Managed or Self-Managed Certificate)
If you use a global External Application Load Balancer in front of Cloud Run:
1. Create a Google-managed SSL certificate:
   ```bash
   gcloud compute ssl-certificates create familymeals-ssl-cert \
     --domains=meals.yourdomain.com \
     --global
   ```
   *(Or upload your own certificate and private key with `--certificate=fullchain.pem --private-key=privkey.pem`).*
2. Attach the certificate to your HTTPS target proxy:
   ```bash
   gcloud compute target-https-proxies create familymeals-https-proxy \
     --ssl-certificates=familymeals-ssl-cert \
     --url-map=familymeals-urlmap
   ```

### Option D: Direct TLS Certificate on Google Compute Engine VM (Self-Hosted / Let's Encrypt)
If running FamilyMeals directly on a GCE VM without a Cloud Load Balancer, provide paths to your PEM certificate files:
```bash
export NODE_ENV=production
export PORT=443
export SSL_CERT_PATH=/etc/letsencrypt/live/meals.yourdomain.com/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/meals.yourdomain.com/privkey.pem
npm start
```
FamilyMeals will detect `SSL_CERT_PATH` and `SSL_KEY_PATH` and launch a native `https` server with TLS enabled.


