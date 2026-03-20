<div align="center">

# OrderFlow API

**SaaS REST API for restaurant order management**

**Live:** http://srv885701.hstgr.cloud/health &nbsp;|&nbsp; **Docs:** http://srv885701.hstgr.cloud/docs

[![CI](https://github.com/mhateus07/orderflow-api/actions/workflows/ci.yml/badge.svg)](https://github.com/mhateus07/orderflow-api/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## About

OrderFlow API is a production-ready multi-tenant SaaS backend for restaurant management. Each restaurant registers as an isolated **tenant** with its own users, products, customers and orders — with zero data leakage between tenants.

Built to demonstrate real-world backend skills: not just CRUD, but proper authentication flows, role-based access control, audit logging and business-logic-aware data operations.

---

## Features

- **Multi-tenant** — complete data isolation per restaurant via `tenantId`
- **JWT Auth** — access token (15min) + refresh token rotation (7d, HttpOnly cookie)
- **RBAC** — `ADMIN` and `EMPLOYEE` roles with route-level enforcement
- **Order flow** — enforced status transitions: `PENDING → PREPARING → DELIVERED | CANCELLED`
- **Soft delete** — no hard deletes; all records preserved with `deletedAt`
- **Pagination & filters** — all list endpoints support `page`, `limit`, `search`, and domain-specific filters
- **Action logs** — every mutation is recorded: who did what, when, on which entity
- **Sales reports** — revenue summary, orders by status, top products, daily breakdown
- **Swagger UI** — auto-generated API docs available at `/docs`
- **Docker ready** — `docker-compose up` and you're running

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 |
| Framework | Fastify 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Validation | Zod |
| Auth | JWT + bcryptjs |
| Docs | Swagger / OpenAPI 3 |
| Container | Docker + docker-compose |

---

## Architecture

```
src/
├── @types/           # Fastify JWT type augmentation
├── lib/              # Prisma client singleton
├── modules/
│   ├── auth/         # Register, login, refresh, logout
│   ├── users/        # User management (admin only)
│   ├── products/     # Product catalog
│   ├── customers/    # Customer registry
│   ├── orders/       # Order lifecycle
│   └── reports/      # Sales analytics
└── shared/
    ├── errors/        # AppError class
    ├── middlewares/   # authenticate, authorize
    ├── plugins/       # Swagger
    └── utils/         # hash, paginate, action-log
```

Each module follows the same pattern: `schemas.ts` → `service.ts` → `routes.ts`.

---

## Order Status Flow

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> PREPARING
    PENDING --> CANCELLED
    PREPARING --> DELIVERED
    PREPARING --> CANCELLED
    DELIVERED --> [*]
    CANCELLED --> [*]
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & docker-compose

### 1. Clone and install

```bash
git clone https://github.com/mhateus07/orderflow-api.git
cd orderflow-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orderflow"
JWT_SECRET=your-secret-here
COOKIE_SECRET=your-cookie-secret-here
PORT=3333
NODE_ENV=development
```

### 3. Start the database

```bash
docker-compose up db -d
```

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the server

```bash
npm run dev
```

API running at `http://localhost:3333`
Swagger UI at `http://localhost:3333/docs`

---

## Demo Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | admin123 |
| Employee | employee@demo.com | emp123 |

---

## API Endpoints

### Auth
| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register restaurant + admin user | — |
| POST | `/auth/login` | Login, receive access token | — |
| POST | `/auth/refresh` | Rotate refresh token | Cookie |
| POST | `/auth/logout` | Invalidate tokens | JWT |

### Users
| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/users` | List users (paginated + search) | ADMIN |
| POST | `/users` | Create user | ADMIN |
| PUT | `/users/:id` | Update user | ADMIN |
| DELETE | `/users/:id` | Soft delete user | ADMIN |

### Products
| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/products` | List products (filter by category, availability) | ANY |
| GET | `/products/:id` | Get product | ANY |
| POST | `/products` | Create product | ADMIN |
| PUT | `/products/:id` | Update product | ADMIN |
| DELETE | `/products/:id` | Soft delete product | ADMIN |

### Customers
| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/customers` | List customers (search) | ANY |
| GET | `/customers/:id` | Get customer + recent orders | ANY |
| POST | `/customers` | Create customer | ANY |
| PUT | `/customers/:id` | Update customer | ANY |
| DELETE | `/customers/:id` | Soft delete customer | ADMIN |

### Orders
| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/orders` | List orders (filter by status, date range) | ANY |
| GET | `/orders/:id` | Get order with items | ANY |
| POST | `/orders` | Create order | ANY |
| PATCH | `/orders/:id/status` | Update order status | ANY |
| DELETE | `/orders/:id` | Cancel order | ADMIN |

### Reports
| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/reports/sales` | Sales report with date range | ADMIN |

---

## Example Requests

### Register a restaurant

```bash
curl -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "My Restaurant",
    "adminName": "John Admin",
    "email": "admin@myrestaurant.com",
    "password": "secret123"
  }'
```

```json
{
  "message": "Restaurant registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Create an order

```bash
curl -X POST http://localhost:3333/orders \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid-here",
    "notes": "No onions please",
    "items": [
      { "productId": "uuid-here", "quantity": 2 },
      { "productId": "uuid-here", "quantity": 1 }
    ]
  }'
```

### Get sales report

```bash
curl "http://localhost:3333/reports/sales?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer <access_token>"
```

```json
{
  "period": { "startDate": "...", "endDate": "..." },
  "summary": {
    "totalRevenue": 4820.50,
    "totalOrders": 143,
    "averageOrderValue": 33.71
  },
  "topProducts": [
    { "name": "Pepperoni Pizza", "quantitySold": 89, "revenue": 3464.10 }
  ],
  "dailyBreakdown": [
    { "date": "2024-01-01", "revenue": 320.00, "orders": 9 }
  ]
}
```

---

## Running with Docker

```bash
# Start everything (API + database)
docker-compose up -d

# Run migrations
docker-compose exec api npx prisma migrate deploy

# Check logs
docker-compose logs -f api
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode |
| `npm run build` | Compile to `/dist` |
| `npm start` | Run compiled build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run tests |

---

## License

MIT
