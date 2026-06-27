# 🚚 GangaMaxx — B2B Cleaning Supplies Last-Mile Delivery Tracker

<div align="center">

![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite)

**An enterprise-grade last-mile delivery tracking prototype for B2B institutional cleaning supply logistics.**

*Built for Ganga Maxx Marketplace | Internship Project 2026*

</div>

---

## 📋 Table of Contents
- [Problem Statement](#-problem-statement)
- [What It Solves](#-what-it-solves)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Key Features](#-key-features)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Role-Based Access](#-role-based-access)
- [Setup & Installation](#-setup--installation)
- [Demo Credentials](#-demo-credentials)
- [Core Workflow](#-core-delivery-workflow)
- [Future Scope](#-future-scope)

---

## 🎯 Problem Statement

Ganga Maxx Marketplace delivers bulk cleaning and hygiene products to B2B institutional clients — hospitals, hotels, schools, and commercial dealers — across Hyderabad. The company relied on WhatsApp messages, phone calls, and spreadsheets to manage delivery run planning, driver-stop assignment, proof of delivery capture, and customer order tracking. This resulted in missed deliveries, no audit trails, and slow customer communication.

---

## ✅ What It Solves

| Pain Point | Solution |
|---|---|
| No route structure | AI-optimized delivery routes |
| Verbal driver briefing | In-app dispatch notifications |
| No delivery proof | Digital POD (signature + photo) |
| Customer calling for updates | Self-service customer portal |
| Manual quotations | Smart Quotation Builder with tier pricing |
| No fleet visibility | Real-time vehicle availability tracking |

---

## 🏗 System Architecture

```
┌──────────────────────────────────────┐
│         Frontend (React + Vite)      │
│                                      │
│  Login │ Dashboard │ Tracker │ CRM  │
│  Quotation Builder │ Reports         │
│                                      │
│       api.js ──── HTTP REST ────────►│
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│       Backend (Node.js + Express)    │
│                                      │
│  /api/auth      /api/orders          │
│  /api/customers /api/deliveries      │
│  /api/vehicles  /api/notifications   │
│  /api/products  /api/dashboard       │
│                                      │
│            Prisma ORM               │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│         Database (SQLite)            │
│                                      │
│  User │ Customer │ Product │ Order  │
│  OrderItem │ DeliveryRun             │
│  DeliveryStop │ Vehicle              │
│  Notification │ Visit                │
└──────────────────────────────────────┘
```

---

## 💻 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js + Vite | UI, components, routing |
| Styling | Vanilla CSS | Custom glassmorphism design system |
| Maps | React-Leaflet + OpenStreetMap | Interactive route maps (no API key) |
| Charts | Recharts | Analytics dashboard |
| Icons | Lucide-React | UI icon library |
| Backend | Node.js + Express.js | REST API server |
| ORM | Prisma | Type-safe database queries |
| Database | SQLite | Embedded relational DB |
| Security | bcryptjs | Password hashing |
| AI Logic | Nearest-Neighbor (Haversine) | Route optimization algorithm |

---

## 🚀 Key Features

### 1️⃣ Dual Portal Authentication
- **Staff Portal** — Employee ID login for Sales Admin, Driver, Warehouse Staff
- **Customer Portal** — Customer ID login for institutional clients
- Passwords hashed with bcryptjs. Sessions persisted via localStorage.

### 2️⃣ Role-Based Dashboard
- **Sales Admin** → Full ops dashboard: revenue, stock alerts, active runs
- **Delivery Driver** → Their assigned runs and route map only
- **Warehouse Staff** → Pending orders queue only
- **Customer** → Own order history and delivery tracking

### 3️⃣ Institutional CRM
- 4-tier pricing: **Platinum (15%) | Gold (10%) | Silver (5%) | Dealer (20%)**
- Credit limit and balance tracking with status indicators

### 4️⃣ Smart Quotation Builder
- Select customer → tier discount auto-applied
- Build product cart, apply bulk discount (0–15%)
- Generate PDF-ready quotation
- One-click **"Convert Quote to Live Order"**

### 5️⃣ Delivery Tracker (Core Feature)
- View all runs: Pending, In Transit, Completed
- Schedule Vehicle: select orders → Auto-Optimize → Assign → Dispatch
- Stop-level status tracking with sequence numbers
- **Proof of Delivery:** digital signature + photo reference
- **Failed Delivery Logging:** reason codes

### 6️⃣ Interactive Route Map + AI Optimization
- Real Leaflet + OpenStreetMap maps
- Warehouse pin + customer stop pins + connecting polyline
- **Nearest-Neighbor Algorithm (Haversine)** minimizes driver travel distance

### 7️⃣ Fleet Management
- Vehicle fleet DB with plate number, model, availability status
- Only Available vehicles shown in dispatch dropdown
- Vehicle auto-locked to In Transit when dispatched

### 8️⃣ Driver Notifications
- On dispatch, backend writes Notification for the driver
- Frontend polls every 10s, shows toast alert
- Marked read after display

---

## 🗄 Database Schema

| Table | Key Fields |
|---|---|
| `User` | employeeId, name, role, passwordHash |
| `Customer` | id, name, tier, creditLimit, creditBalance, creditStatus |
| `Product` | id, sku, name, category, price, stock, msds |
| `Order` | id, customerId, status, total, complianceCleared |
| `OrderItem` | orderId, productId, name, qty, price |
| `DeliveryRun` | id, runNumber, driverName, vehicleNo, status |
| `DeliveryStop` | deliveryRunId, orderId, sequence, qty, status, signedBy, podPhoto, failedReason |
| `Vehicle` | plateNo, model, status |
| `Notification` | employeeId, message, read, createdAt |
| `Visit` | salesmanName, customerName, visitDate, notes |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Staff login |
| `POST` | `/api/auth/customer-login` | Customer login |
| `GET` | `/api/products` | Product catalog |
| `GET/POST` | `/api/customers` | List / create customers |
| `GET/POST` | `/api/orders` | List / create orders |
| `GET/POST` | `/api/deliveries` | List / create delivery runs |
| `PUT` | `/api/deliveries/:id/status` | Update run status |
| `PUT` | `/api/deliveries/:id/stops/:orderId` | Capture POD / update stop |
| `GET` | `/api/vehicles` | Fleet list |
| `GET` | `/api/drivers/available` | Available drivers |
| `GET` | `/api/notifications/:employeeId` | Driver alerts |
| `PUT` | `/api/notifications/:id/read` | Mark notification read |
| `GET` | `/api/dashboard` | Aggregated admin stats |

---

## 👥 Role-Based Access

| Role | Login | Modules |
|---|---|---|
| Sales Admin | Employee ID | Dashboard, CRM, Orders, Tracker, Quotation Builder, Reports |
| Delivery Driver | Employee ID | Delivery Tracker (own runs) |
| Warehouse Staff | Employee ID | Orders queue |
| Customer | Customer ID | Customer portal |

---

## 🛠 Setup & Installation

> **Prerequisites:** Node.js v18+ installed

### Backend
```bash
cd backend
npm install
node server.js
# Runs at http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### View Database (Optional)
```bash
cd backend
npx prisma studio
# Runs at http://localhost:5555
```

---

## 🔐 Demo Credentials

### Staff
| Role | ID | Password |
|---|---|---|
| Sales Admin | `E1001` | `password123` |
| Delivery Driver | `E1002` | `password123` |
| Warehouse Staff | `E1003` | `password123` |

### Customers
| Institution | ID | Password |
|---|---|---|
| St. Jude General Hospital (Platinum) | `c1` | `password123` |
| Apex School (Gold) | `c2` | `password123` |
| QuickClean Janitorial (Silver) | `c4` | `password123` |

---

## 🔄 Core Delivery Workflow

```
1. QUOTATION  →  Sales Admin builds quote with tier pricing  →  Converts to Live Order
2. DISPATCH   →  Dispatcher selects orders  →  AI optimizes route  →  Assigns Driver + Vehicle
3. ALERT      →  Driver receives notification toast within 10 seconds
4. DELIVERY   →  Driver stops at each location  →  Captures POD or logs failure reason
5. COMPLETE   →  All stops done  →  Run marked Completed  →  Vehicle freed
```

---

## 🔭 Future Scope

| Feature | Technology |
|---|---|
| Live GPS Driver Tracking | WebSockets (Socket.io) + Geolocation API |
| Real Road Routing | OSRM / Google Maps Directions API |
| Mobile Driver App | React Native |
| Production Database | PostgreSQL on Supabase |
| Cloud Deployment | Railway / Render / AWS |
| JWT Authentication | Secure token rotation |
| WhatsApp Notifications | WhatsApp Business API |

---

*Internship Project — Ganga Maxx Marketplace | 01 June – 30 June 2026*


## 🚀 Key Features

### 1. Dual-Portal Authentication
- **Internal Staff Portal (Green Theme):** Secure access for Sales Admins, Delivery Drivers, and Warehouse Staff via Employee ID.
- **External Customer Portal (Indigo Theme):** Secure client access via Customer ID to view catalogs, order histories, and track live deliveries.

### 2. Live Interactive Route Mapping & AI Optimization
- **Geospatial Tracking:** Uses `react-leaflet` and OpenStreetMap to render real-world maps.
- **Auto-Optimize Routing (AI Layer):** Utilizes a "Nearest Neighbor" heuristic algorithm based on the Haversine formula to instantly sort unassigned route stops by geographic proximity, minimizing driver travel distance.
- **Live Truck Location:** Customers can see dynamic markers representing the estimated live location of delivery trucks when their order is "In Transit".

### 3. Institutional CRM & Contract Pricing
- Centralized management of institutional accounts.
- **Tiered Pricing Logic:** Dynamic real-time discount applications across the catalog based on the customer's contract tier (e.g., Platinum gets 15% off, Gold gets 10% off).

### 4. Smart Quotation Builder
- Allows Sales Admins to dynamically bundle bulk products, apply discretionary pricing/discounts, and instantly generate digital PDF-ready Commercial Quotations for institutional sign-off.

### 5. Last-Mile Delivery Dispatch & POD
- Assign drivers, allocate vehicles, and stage loading sequences.
- **Proof of Delivery (POD):** Capture digital signatures, simulate photo capture of safely stored chemicals, and record detailed failure/exception logs (e.g., "Facility Closed").

### 6. Conversational AI Assistant
- An integrated Natural Language Processing module that queries the database to build cleaning kits, explain chemical safety (MSDS) guidelines, summarize consumption metrics, and recommend products based on facility type.

## 💻 Technology Stack
- **Frontend:** React.js, Vite, Vanilla CSS (Glassmorphism UI), Lucide-React (Icons), React-Leaflet (Mapping).
- **Backend:** Node.js, Express.js.
- **Database:** SQLite managed by Prisma ORM.
- **Security:** bcrypt.js for password hashing.

---

## 🛠️ Installation & Setup Instructions

Because this application uses a decoupled modern architecture, you must run the backend server and frontend client simultaneously.

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v16 or higher recommended).

### Step 1: Start the Backend Server
Open your first terminal, navigate to the project directory, and run:
```bash
cd backend
npm install
node server.js
```
*The backend server will spin up on `http://localhost:5000`.*

### Step 2: Start the Frontend UI
Open a **second** terminal window, navigate to the project directory, and run:
```bash
cd frontend
npm install
npm run dev
```
*The frontend application will compile and open at `http://localhost:5173`.*

### Step 3: View Database (Optional)
To visually inspect or edit the raw SQLite database records, open a **third** terminal window:
```bash
cd backend
npx prisma studio
```
*Prisma Studio will open a database viewer at `http://localhost:5555`.*

---

## 🔐 Demo Credentials

### Internal Staff
- **Sales Admin:** `E1001` / `password123`
- **Delivery Driver:** `E1002` / `password123`
- **Warehouse Staff:** `E1003` / `password123`

### Institutional Customers
- **St. Jude Hospital (Platinum):** `c1` / `password123`
- **Apex School (Gold):** `c2` / `password123`
- **QuickClean Dealer (Silver):** `c4` / `password123`

---

*This project was developed as part of a 26-day intensive internship program, fulfilling all requirements for a B2B Delivery Tracker with AI Logic, CRM functionalities, and comprehensive route mapping.*
