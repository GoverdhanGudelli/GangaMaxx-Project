# GangaMaxx — B2B Cleaning Supplies Last-Mile Delivery Tracker
## Full System Information Document — Review 2 Reference

**Company:** Ganga Maxx Marketplace  
**Project:** B2B Cleaning Supplies Last-Mile Delivery Tracker  
**Internship Duration:** 01 June 2026 – 30 June 2026  
**Team Size:** 3 Students (Frontend | Backend | Testing & Deployment)

---

## 1. Problem Statement

Ganga Maxx Marketplace delivers bulk cleaning and hygiene products to B2B institutional clients — hospitals, hotels, schools, and commercial dealers — across the Ranga Reddy / Hyderabad region. 

**Before this system, the company faced:**
- No centralized digital record of delivery runs or stops
- Drivers received verbal or WhatsApp instructions — no structured route
- No proof of delivery was captured digitally
- Sales admins had no way to generate formal quotations with tier discounts
- Warehouse staff had no visibility into which vehicles or drivers were currently available
- No real-time status updates for institutional customers tracking their orders

**This project solves all of the above** with a fully working web prototype.

---

## 2. Technology Stack

| Layer | Technology Used | Purpose |
|---|---|---|
| Frontend | React.js + Vite | UI rendering and component architecture |
| Styling | Vanilla CSS (Custom) | Glassmorphism design system, dark/light tokens |
| Mapping | React-Leaflet + OpenStreetMap | Real-world interactive route maps, free, no API key |
| Icons | Lucide-React | UI icon library |
| Charts | Recharts | Analytics dashboard charts |
| Backend | Node.js + Express.js | REST API server |
| ORM | Prisma ORM | Database query layer with type-safe models |
| Database | SQLite (`dev.db`) | Embedded relational database (upgradeable to PostgreSQL) |
| Security | bcryptjs | Password hashing for all user credentials |
| Environment | dotenv | Secure environment variable management |
| AI Layer | Nearest-Neighbor Heuristic | Rule-based route optimization algorithm (Haversine formula) |

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────┐
│            BROWSER (React + Vite)           │
│                                             │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Login    │  │ Dashboard │  │  Maps   │ │
│  │  Portal   │  │ + Tracker │  │ Leaflet │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        │              │             │       │
│        └──────────────▼─────────────┘       │
│                api.js (fetch wrapper)        │
└────────────────────┬────────────────────────┘
                     │ HTTP REST API (JSON)
                     ▼
┌─────────────────────────────────────────────┐
│         BACKEND (Node.js + Express)         │
│                                             │
│  Auth Routes  →  /api/auth/login            │
│  Orders       →  /api/orders                │
│  Deliveries   →  /api/deliveries            │
│  Customers    →  /api/customers             │
│  Products     →  /api/products              │
│  Fleet        →  /api/vehicles              │
│  Drivers      →  /api/drivers/available     │
│  Notifications →  /api/notifications/:id   │
│  Dashboard    →  /api/dashboard             │
│                                             │
│              Prisma ORM                     │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│         DATABASE (SQLite via Prisma)        │
│                                             │
│  User | Customer | Product | Order          │
│  OrderItem | DeliveryRun | DeliveryStop     │
│  Vehicle | Notification | Visit             │
└─────────────────────────────────────────────┘
```

---

## 4. Database Schema (All Tables)

### `User` — Internal Staff Accounts
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| employeeId | String (unique) | Login ID (e.g. E1001) |
| name | String | Full Name |
| role | String | Sales Admin / Delivery Driver / Warehouse Staff |
| passwordHash | String | bcrypt hashed password |

### `Customer` — Institutional Clients
| Field | Type | Description |
|---|---|---|
| id | String | Primary Key (e.g. c1) |
| name | String | Institution name |
| type | String | Hospital / Hotel / School / Dealer |
| tier | String | Platinum / Gold / Silver / Dealer |
| creditLimit | Float | Maximum credit allowed |
| creditBalance | Float | Current outstanding balance |
| creditStatus | String | Good Standing / Near Limit / Overlimit |
| address | String | Physical delivery address |
| passwordHash | String | Customer portal password |

### `Product` — Cleaning Products Catalog
| Field | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String | Product name |
| sku | String | Stock Keeping Unit |
| category | String | Sanitizers / Floor Care / etc. |
| stock | Int | Current warehouse stock |
| price | Float | Base price per unit |
| msds | Boolean | Has Material Safety Data Sheet |
| safety | String | Safe handling notes |

### `Order` — Bulk Orders
| Field | Type | Description |
|---|---|---|
| id | String | Primary Key (e.g. o102) |
| customerId | String | Links to Customer |
| customerName | String | Denormalized for speed |
| total | Float | Invoice total |
| status | String | Pending / In Transit / Delivered |
| orderDate | String | Date placed |
| warehouse | String | Fulfilling warehouse |
| complianceCleared | Boolean | Chemical compliance check |

### `OrderItem` — Line items per Order
| Field | Type | Description |
|---|---|---|
| id | Auto Int | Primary Key |
| orderId | String | Links to Order |
| productId | String | Links to Product |
| name | String | Product name snapshot |
| qty | Int | Quantity ordered |
| price | Float | Unit price at time of order |

### `DeliveryRun` — A single vehicle dispatch route
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| runNumber | String | Human readable (RUN-2026-0001) |
| driverName | String | Assigned driver |
| vehicleNo | String | Vehicle plate number |
| date | String | Dispatch date |
| status | String | Pending / In Transit / Completed |

### `DeliveryStop` — One stop in a delivery run
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| deliveryRunId | UUID | Links to DeliveryRun |
| orderId | String | Links to Order |
| customerName | String | Stop destination |
| address | String | Physical address |
| sequence | Int | Stop order (1 = first stop) |
| qty | Int | Quantity loaded for stop |
| status | String | Pending / In Transit / Delivered / Failed |
| deliveredQty | Int | Actual quantity delivered |
| failedReason | String | If failed: reason logged |
| podPhoto | String | URL/reference to photo |
| signedBy | String | Recipient acknowledgement name |

### `Vehicle` — Fleet Registry
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| plateNo | String (unique) | e.g. KA-01-MJ-8822 |
| model | String | e.g. Tata Ace Gold |
| status | String | Available / In Transit / Maintenance |

### `Notification` — Driver Alert System
| Field | Type | Description |
|---|---|---|
| id | Auto Int | Primary Key |
| employeeId | String | Target employee |
| message | String | Alert text |
| read | Boolean | Has driver seen this |
| createdAt | DateTime | Timestamp |

### `Visit` — Salesman Field Visits
| Field | Type | Description |
|---|---|---|
| id | String | Primary Key |
| salesmanName | String | Who visited |
| customerName | String | Who was visited |
| visitDate | String | Date |
| notes | String | Visit notes |
| followUpRequired | Boolean | Follow-up flag |
| repeatReorderCheckbox | Boolean | Reorder discussed |

---

## 5. Role-Based Access Control

| Role | Login Type | Access |
|---|---|---|
| **Sales Admin** | Employee ID | Dashboard, CRM, Orders, Delivery Tracker, Reports, Quotation Builder |
| **Delivery Driver** | Employee ID | Delivery Tracker only (their assigned runs) |
| **Warehouse Staff** | Employee ID | Orders management only |
| **Customer** | Customer ID | Customer portal — order history, catalog, own delivery status |

All routes are server-guarded. Unauthorized role → redirected to default tab.

---

## 6. All Backend API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Internal staff authentication |
| POST | `/api/auth/customer-login` | Customer portal authentication |
| GET | `/api/products` | Get all products from catalog |
| GET | `/api/customers` | Get all institutional customers |
| POST | `/api/customers` | Register new customer |
| GET | `/api/orders` | Get all orders |
| POST | `/api/orders` | Create new order (from Quotation Builder) |
| GET | `/api/deliveries` | Get all delivery runs with stops |
| POST | `/api/deliveries` | Create new delivery run |
| PUT | `/api/deliveries/:id/status` | Update run status |
| PUT | `/api/deliveries/:id/stops/:orderId` | Update individual stop (POD capture) |
| GET | `/api/vehicles` | Get fleet vehicle list |
| GET | `/api/drivers/available` | Get only currently-free drivers |
| GET | `/api/notifications/:employeeId` | Get unread driver notifications |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| GET | `/api/dashboard` | Aggregated stats for admin dashboard |

---

## 7. Core Features Built (A to Z)

### 7.1 Dual Portal Authentication
- Two completely separate login flows — Staff (green theme) and Customer (indigo theme)
- Passwords hashed with `bcryptjs` (salt factor 10)
- Session persisted in `localStorage` across page refreshes

### 7.2 Role-Based Dashboard
- Sales Admin sees full ops dashboard: revenue, pending orders, active runs, stock alerts
- Driver sees only their delivery runs
- Warehouse Staff sees only pending orders queue
- Customer sees only their own orders and delivery status

### 7.3 Institutional CRM
- Full customer database with Tier system (Platinum 15% | Gold 10% | Silver 5% | Dealer 20%)
- Credit limit tracking with status: Good Standing / Near Limit / Overlimit
- Add new institutional accounts directly

### 7.4 Product Catalog
- Full SKU-based catalog with MSDS flags and safety notes
- Stock levels tracked per product
- Category filtering

### 7.5 Smart Quotation Builder
- Sales Admin selects a customer and sees their tier discount auto-applied
- Builds a "cart" of products with quantities
- Applies optional discretionary bulk discount (0-15%)
- Generates a professional PDF-ready quotation document
- "Convert to Live Order" instantly pushes the quotation to the orders pipeline

### 7.6 Orders Management
- Full order table with status tracking
- Compliance clearance flag per order
- Orders feed directly into the Delivery Tracker as pending stops

### 7.7 Delivery Tracker (Core Feature)
- **Route Registry:** All delivery runs listed with status pills and driver assignments
- **Vehicle Assignment:** Smart dispatch modal with available vehicle dropdown
- **Driver Assignment:** Text/dropdown input for assigning drivers to runs
- **Stop Management:** Each run has multiple stops with individual status tracking
- **Proof of Delivery (POD):** Captures signatory name, photo reference, and delivered quantity per stop
- **Failed Delivery Logging:** Records reason (Receiver Unavailable, Incorrect Address, etc.)

### 7.8 Interactive Route Mapping (react-leaflet)
- Real OpenStreetMap rendered inside the app
- Warehouse origin pin, customer stop pins
- Polyline drawn connecting stops in delivery sequence
- Route stats: Total Stops, Expected Load (cases), Route Status

### 7.9 AI Route Optimization (Rule-Based)
- "Auto-Optimize Route" button in dispatch modal
- Implements Nearest Neighbor algorithm using Haversine formula
- Calculates shortest geographic sequence of stops to minimize driver travel
- Reorders the stop array before saving to database

### 7.10 Fleet Management
- Vehicle database: 4 seeded vehicles (Tata Ace, Mahindra Bolero, etc.) with plate numbers
- Status tracking: Available / In Transit / Maintenance
- Vehicle locked to "In Transit" when dispatched, freed when run completes

### 7.11 Driver Notification System
- When dispatcher assigns a run, backend writes a `Notification` record for the driver
- Frontend polls `/api/notifications` every 10 seconds
- Unread notifications pop up as toast alerts on driver's dashboard
- Marked as read after display to prevent re-showing

### 7.12 Customer Self-Service Portal
- Customers log in with their Customer ID
- View their own order history and real-time delivery status
- Separate visual theme (indigo/blue) from staff portal

### 7.13 Reports & Analytics
- Aggregated delivery success rate
- Revenue pipeline (total vs pending)
- Stock alert counts
- Active runs vs completed runs

### 7.14 AI Conversational Assistant
- Embedded chat widget available on all screens
- Can query product catalog, answer MSDS/safety questions, recommend cleaning kits

---

## 8. Core Business Logic / Workflow

```
STEP 1 — ORDER CREATION
Customer submits bulk order  →  Sales Admin builds quotation  →  Converts to Live Order
                                      ↓
STEP 2 — DISPATCH PLANNING                        
Dispatcher opens Delivery Tracker  →  Sees Pending Orders  →  Opens "Schedule Vehicle"
  →  Selects stops  →  Auto-Optimize Route  →  Assigns Driver + Vehicle  →  Dispatches

STEP 3 — DRIVER NOTIFICATION
Backend creates Notification record  →  Driver sees toast alert within 10 seconds
Driver opens their Delivery Tracker  →  Sees assigned Run + Map

STEP 4 — DELIVERY EXECUTION  
Driver marks Run as "In Transit"  →  Each stop: deliver quantity + capture POD
  →  If successful: photo + signature captured  →  Status → "Delivered"
  →  If failed: reason logged  →  Status → "Failed"

STEP 5 — COMPLETION & REPORTING
All stops complete  →  Run marked "Completed"
Vehicle status resets to "Available"
Dashboard stats update in real time
```

---

## 9. Seeded Demo Data

| Entity | Count | Examples |
|---|---|---|
| Staff Users | 3 | Sales Admin (E1001), Driver (E1002), Warehouse (E1003) |
| Customers | 4+ | St. Jude Hospital (Platinum), Grand Royal Hotel (Gold), Apex School (Silver) |
| Products | 10+ | MaxxClean Sanitizer 5L, Ganga Pine Floor Cleaner 10L, ChemShield Disinfectant |
| Orders | 6+ | Active pending orders across multiple customers |
| Delivery Runs | 3+ | RUN-2026-001, RUN-2026-002, etc. |
| Vehicles | 4 | KA-01-MJ-8822 Tata Ace, KA-03-EP-4580 Mahindra Bolero, etc. |

---

## 10. Existing System vs. Proposed System

| Criteria | Manual / WhatsApp Method | GangaMaxx Tracker |
|---|---|---|
| Order Management | Spreadsheet / verbal | Digital form with auto-validation |
| Route Planning | Driver decides on the spot | AI Nearest-Neighbor optimization |
| Delivery Proof | Paper or photo on WhatsApp | Digital POD with sign & photo |
| Driver Notification | WhatsApp message | In-app push notification (<10s) |
| Customer Visibility | Phone call to sales team | Self-service portal |
| Vehicle Tracking | No tracking | Fleet status management |
| Reporting | Manual Excel | Live aggregated dashboard |
| Quotation | Word document or verbal | PDF-ready digital quote |

---

## 11. Future Scope (v2.0 Roadmap)

| Feature | Technology |
|---|---|
| Live GPS Driver Tracking | WebSockets (socket.io) + `navigator.geolocation` |
| Real Road Routing | OSRM (open-source) / Google Maps Directions API |
| Instant Push Notifications | Socket.io replacing polling |
| Mobile Driver App | React Native / Flutter |
| Production Database | PostgreSQL on Supabase / AWS RDS |
| Deployment | Docker + Railway / Render / AWS ECS |
| Authentication | JWT tokens with refresh rotation |
| WhatsApp Alerts | WhatsApp Business API |

---

*Document prepared for Internship Review 2 — 19-20 June 2026*  
*GangaMaxx Marketplace | B2B Cleaning Supplies Last-Mile Delivery Tracker*
