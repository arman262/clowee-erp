Clowee ERP - Project Summary & Logic Documentation
==================================================

1. Project Overview
-------------------
Clowee ERP is a comprehensive Enterprise Resource Planning system designed for managing franchises, machines (likely gaming or vending), inventory, and financial operations. It is a web-based application with a modern frontend and a custom Node.js backend.

2. Technology Stack
-------------------
- Frontend: React (Vite), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query.
- Backend: Node.js, Express.js.
- Database: PostgreSQL.
- File Storage: Local filesystem (via Multer).

3. System Architecture & Logic
------------------------------

A. Client-Server Communication (The "Supabase-like" Adapter)
   The most distinct architectural feature is the custom data access layer found in `src/integrations/postgres/client.ts`.
   - Instead of using a standard REST client or GraphQL, the frontend uses a custom helper that mimics the Supabase JavaScript Client syntax (e.g., `db.from('users').select('*').eq('id', 1)`).
   - This helper internally translates these chainable method calls into standard HTTP REST requests (GET, POST, PUT, DELETE) to the backend.
   - This allows for a developer experience similar to using a BaaS (Backend-as-a-Service) while maintaining full control over a custom Node.js backend.

B. Backend Logic (Generic CRUD)
   To support the flexible frontend client, the Express backend (`server/index.js`) implements "Generic CRUD Endpoints":
   - `GET /api/:table`: Dynamically fetches records from the specified table.
   - `POST /api/:table`: Dynamically inserts records into the specified table.
   - `PUT /api/:table/:id`: Dynamically updates records.
   - `DELETE /api/:table/:id`: Dynamically deletes records.
   
   *Security Note*: While flexible, this pattern relies heavily on the backend to ensure sensitive tables (like `login` or `employees`) are protected or excluded from these generic routes, which is implemented via hardcoded checks (e.g., `if (req.params.table === 'login') return;`).

C. Authentication Flow
   - Login is handled via a specific `/api/login` endpoint.
   - It verifies credentials against the `users` table using `bcrypt` for password hashing.
   - On success, it returns user details and a role.
   - Frontend manages session state using React Context (`AuthContext`) and `localStorage`.
   - Roles include: Super Admin, Admin, User, and Spectator.

D. Key Modules & Business Logic
   1. Franchise Management:
      - Tracks franchise details, agreements, and profit-sharing ratios (Franchise Share vs. Clowee Share).
      - Handles bank account associations for payments.
   
   2. Machine Management:
      - Tracks individual machines, their locations (franchises), and operational status.
      - Linked to "Counter Readings" to track usage/sales volume.

   3. Financials:
      - Sales: Records daily or periodic sales data.
      - Expenses: Tracks operational costs, categorized by custom categories.
      - Payments: Manages payouts to franchises or other entities.
      - Banks: Manages bank account details for transactions.

   4. Inventory:
      - Tracks stock levels of items (likely spare parts or merchandise).
      - Supports adding, updating, and monitoring stock.

   5. Reports:
      - Generates monthly reports aggregating sales, expenses, and profit splits based on the defined franchise agreements.

4. Directory Structure Highlights
---------------------------------
- /src/components: Reusable UI components (shadcn/ui).
- /src/pages: Main application views (Dashboard, Sales, Inventory, etc.).
- /src/hooks: Custom React hooks, primarily for data fetching (e.g., `useFranchises`, `useSales`).
- /server: The production backend code.
- /server-dev: A development version of the backend (running on a different port).

5. Business Logic & Calculations
--------------------------------

A. Sales & Profit Calculation (PayToCloweeModal.tsx & Sales.tsx)
   The core financial logic revolves around splitting profits between Clowee and the Franchise.

   1. Basic Metrics:
      - Coin Sales = Current Coin Counter - Previous Coin Counter
      - Prize Out = Current Prize Counter - Previous Prize Counter
      - Sales Amount = Coin Sales * Coin Price
      - Prize Cost = Prize Out * Doll Price

   2. Net Profit Calculation:
      - VAT Amount = Sales Amount * VAT Percentage / 100
      - Net Profit = Sales Amount - VAT Amount - Prize Cost

   3. Maintenance (if applicable):
      - Maintenance Amount = Net Profit * Maintenance Percentage / 100
      - Profit After Maintenance = Net Profit - Maintenance Amount

   4. Profit Sharing:
      - Clowee Profit = Profit After Maintenance * Clowee Share %
      - Franchise Profit = Profit After Maintenance * Franchise Share %

   5. "Pay To Clowee" (The amount the franchise owes Clowee):
      - Formula: Clowee Profit + Prize Cost + Maintenance Amount - Electricity Cost - Amount Adjustments
      - Logic: Clowee gets their profit share, gets reimbursed for the prizes (since Clowee likely supplies them), gets the maintenance fee, but pays for electricity (deducted from what is owed).

B. Invoice Generation (InvoicePrint.tsx)
   - Generates a printable invoice showing the breakdown calculated above.
   - Determines Payment Status:
     - Due: Total Paid = 0
     - Partial: 0 < Total Paid < Pay To Clowee
     - Paid: Total Paid >= Pay To Clowee
     - Overpaid: Total Paid > Pay To Clowee

C. Monthly Reporting (MonthlyReport.tsx)
   - Aggregates data for financial analysis.
   - Prize Profit Calculation:
     - Calculates average purchase cost of prizes from 'Prize Purchase' expenses.
     - Prize Profit = (Total Prize Out Cost [Sales Value]) - (Total Prize Out Qty * Average Purchase Cost).
   - Total Revenue = Clowee Profit + Prize Profit + Maintenance.
   - Net Profit (Company Level) = Total Revenue - Total Expenses (Fixed + Variable).
