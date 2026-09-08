### E-Commerce-App

# 🚀 Scalable REST API (Node.js, Prisma, Neon & Redis)

A production-ready backend service featuring secure OAuth 2.0 authentication, caching layers, and fully containerized environments for stable deployments.

## 🛠️ Tech Stack & Architecture

- **Runtime:** Node.js (Express)
- **Database ORM:** Prisma with Neon PostgreSQL (Cloud Managed)
- **Caching & Sessions:** Redis (Containerized)
- **Payment Service:** Stripe
- **Authentication:** Passport.js (Google OAuth 2.0)
- **Infrastructure:** Docker & Docker Compose (Multi-stage builds)

## 🐳 Container Architecture

To eliminate configuration drift, this application uses **Docker Compose** to orchestrate an isolated local developer environment:

- **`backend` service:** Runs an Alpine Node image leveraging multi-stage layer caching for faster builds.
- **`cache` service:** Runs a Redis instance to manage stateless user session storage.

---

## 💻 Local Setup & Installation

Follow these steps to run the complete stack locally on your machine.

### 1. Prerequisites

Ensure you have the following installed:

- [Docker Desktop](https://docker.com) (Make sure the daemon is running)
- Git
- [Stripe CLI](https://stripe.com) (Required only if you want to test live webhook event forwarding to localhost)

### 2. Clone the Repository

```bash
git clone https://github.com/Ray-Ibno/e-commerce-store.git
cd e-commerce-store
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```text
CLIENT_URL=http://localhost:5173
PORT=4005
SESSION_SECRET="your_session_secret"
ACCESS_TOKEN_EXP=900000
REFRESH_TOKEN_EXP=604800000
ENCRYPTION_KEY=2d01e898292ccf033695b96c9d4d43e1

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

# Database (Neon Cloud)
DATABASE_URL="postgresql://user:password@ep-your-neon-url.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-your-neon-url.tech/neondb?sslmode=require"

# Stripe (Use Test Mode Keys Only)
STRIPE_SECRET_KEY="sk_test_your_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

### 4. Boot Up the Containers

Run the following command to build the images, generate the Prisma client, and start the environment:

```bash
docker compose up --build
```

The server will be live and listening for requests at `http://localhost:4005`.

---

## 📡 API Testing with Insomnia

An **Insomnia Workspace YAML v5** file is included in the root of this repository to make testing all API endpoints (Products, Orders, Stripe Checkout, etc.) seamless.

### How to use it:

1. Download and open [Insomnia REST Client](https://insomnia.rest/download).
2. Click **Create** or **Import** in the top right corner.
3. Select **File** and upload the `insomnia.rest.yml` file from this project's root folder.
4. The workspace will automatically pre-populate all backend routes, header requirements, and payload bodies for you.
5. Use the **Environment Dropdown** in the top left corner of Insomnia to switch instantly between **Development** (Localhost) and **Production** (Live API server).

---

## 🔐 Testing Google OAuth 2.0 Locally

Because Google OAuth requires a real browser interaction, you cannot easily test the initial login directly inside Insomnia. Follow these steps to test the flow:

1. Ensure your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly configured in your `.env` file.
2. In your Google Cloud Developer Console, ensure your **Authorized Redirect URI** is exactly matched to your local callback path:  
   `http://localhost:4005/api/auth/google/callback`
3. Open your browser and navigate to your server's initiation route:  
   `http://localhost:4005/api/auth/google`
4. Complete the Google sign-in prompt. Upon success, you can set a Cookie header inside insomnia with the "sid" cookie from the browser to gain authorization and send requests.

---

## 💳 Testing Payments & Webhooks

- Use Stripe's official mock credit card numbers (e.g., `4242 4242 4242 4242`) to complete payment requests safely in development mode.
- For local webhook testing, utilize the Stripe CLI tool to forward events to your containerized server endpoint via `stripe listen --forward-to localhost:4005/api/checkout/stripe-webhook`.

- For Insomnia testing, simply send the CHECKOUT request and all the items in your cart will be processed for payment. Complete the payment by openning the url from the response.

- For Stripe CLI triggers, just run any of the commands below in a separate terminal with the orderId and userId of your "pending" Order.

```bash
stripe trigger checkout.session.completed --add checkout_session:metadata.orderId="Your Order Id" --add checkout_session:client_reference_id="Your User Id"
```

```bash
stripe trigger checkout.session.expired --add checkout_session:metadata.orderId="Your Order Id" --add checkout_session:client_reference_id="Your User Id"
```

```bash
stripe trigger payment_intent.payment_failed --add payment_intent:metadata.orderId="Your Order Id" --add payment_intent:metadata.userId="Your User Id"
```

---

## 🛠️ Useful Commands

- **Stop services and clear cache volumes:** `docker compose down -v`
- **Rebuild from scratch:** `docker compose up --build`
- **View container logs:** `docker compose logs -f`

## 📂 Backend Architecture Map

```text
├── backend/
│   ├── config/             # Third-party service credentials & settings (Stripe, Redis, Cloudinary)
│   ├── constants/          # Application-wide immutable freeze values and static codes
│   ├── controllers/        # Express HTTP layer mapping endpoints, parsing requests, & returning responses
│   ├── errors/             # Global centralized structural error definitions (AppError class)
│   ├── helpers/            # Specialized text tools, layout key-mappings, & async wrappers
│   ├── lib/                # Multi-tenant custom Neon database adapter client configurations
│   ├── middleware/         # Security gates, rate-limiters, schema validations, & global exception catchers
│   ├── pipelines/          # Complex multi-table analytical aggregation sequences for product data
│   ├── repositories/       # Split Data Layers (Postgres Prisma queries vs. Ultra-fast Redis Cache reads)
│   ├── routes/             # Structural HTTP endpoint declarations mapping URLs to controller gates
│   ├── services/           # CORE BUSINESS LOGIC layers & matching automated unit test files (*.test.js)
│   ├── utils/              # Cryptographic token encryption, cookie generation, & payload response formatting
│   └── validations/        # Strict backend Zod request payload structural schemas
│
├── prisma/                 # Relational database configurations, migrations histories, & source schemas
├── Dockerfile              # Single container footprint parameters to bundle and compile the application
└── docker-compose.yml      # Orchestration stack settings to spin up local isolated service runtimes
```
