# JJIKGO Photobooth - Product Specification

## 1. Product Overview
JJIKGO Photobooth is a comprehensive management system designed for modern photobooth businesses. It streamlines the point-of-sale (POS) process, queue management, and administrative tracking across multiple branches. The system ensures a seamless experience for customers, staff, and business owners through real-time synchronization and a centralized backend.

## 2. Target Audience
*   **Customers**: Individuals visiting the photobooth for photos and snacks.
*   **Staff (Cashiers/Operators)**: Responsible for starting shifts, processing transactions, and managing queues.
*   **Admins (Business Owners/Managers)**: Responsible for managing multiple branches, users, pricing, and viewing business analytics.

## 3. Key Applications

### 3.1 Cashier App (POS)
The primary interface for processing customer orders.
*   **Transaction Creation**: Record customer name, email, and specific preferences.
*   **Product Selection**: Choose from various photo packages, themes, addons, and cafe snacks.
*   **Payment Processing**: Support multiple payment methods.
*   **Invoice Generation**: Unique invoice number for every transaction.
*   **Promo/Discount Integration**: Apply active promotional codes to transactions.
*   **Print Integration**: Automatic triggers for booth printing upon payment confirmation.

### 3.2 Staff App (Queue & Shift Management)
Used by staff on the floor to manage the operation.
*   **Shift Management**: Open and close shifts with cash tracking (Starting/Ending cash).
*   **Expense Tracking**: Log operational expenses during a shift.
*   **Queue Control**: Real-time status updates of customer queues for each photobooth theme.
*   **Booth Monitoring**: Check the availability and status of physical photobooth units.
*   **Live Notifications**: Real-time alerts for new transactions and print status.

### 3.3 Admin Dashboard (Management Interface)
A centralized hub for business administration.
*   **Branch Management**: Create and configure multiple branch locations.
*   **User Management**: Role-based access control (RBAC) for Staff and Admin users.
*   **Theme & Pricing**: Manage photobooth themes, booth numbers, capacities, and pricing.
*   **Analytics**: Real-time synchronization of transactions across all branches for unified reporting.
*   **Global Settings**: Configure system-wide parameters and branch-specific settings.

---

## 4. Functional Requirements

### 4.1 Payment & Transactions
*   System must generate a unique `invoice_number` for each transaction.
*   Transactions must track `theme_id`, `package_name`, and `total_price`.
*   Support for optional components like `addons` and `cafe_snacks` stored as JSON.

### 4.2 Queue System
*   Upon payment, a customer is automatically placed in a `Queue`.
*   Queues are tied to a specific `Theme` and `Transaction`.
*   Staff can update queue status (waiting, in-progress, completed).
*   **Customer QR Tracking**: Customers can track their position in the queue via a unique QR code identifier tied to their transaction.

### 4.3 Shift Handling
*   Staff must open a `Shift` to start processing transactions at a branch.
*   System tracks `starting_cash` and `ending_cash` for reconciliation.
*   `total_expenses` are calculated based on logged `Expense` items during the shift.

### 4.4 Real-time Synchronization
*   **Branch Isolation**: Data updates are scoped to specific branch rooms using Socket.IO.
*   **Admin Global View**: Admins can monitor any branch or the entire system's activity in real-time.
*   **Print Requests**: Decoupled printing system that listens for `printRequested` events to trigger local photobooth hardware.

---

## 5. Technical Specifications

### 5.1 Technology Stack
*   **Frontend**: Vite + React (Modular applications: Cashier, Staff, Admin).
*   **Backend**: Node.js + Express.
*   **Database**: PostgreSQL managed via Prisma ORM.
*   **Real-time**: Socket.IO for instant data sync between apps.
*   **Styling**: Vanilla CSS with modern aesthetics (Cyber-Luxe, Glassmorphism).

### 5.2 Data Architecture (Core Entities)
*   **Branch**: Logical grouping of booths and staff.
*   **User**: Role-based identities (Admin/Staff).
*   **Theme**: The visual/priced category of the photo session.
*   **Booth**: The physical unit used by customers.
*   **Transaction**: The central record of a sale.
*   **Shift**: Time-boxed operational window for financial tracking.

---

## 6. Design System & UX
*   **Aesthetics**: Cyber-Luxe / Premium Dark Mode.
*   **Responsiveness**: Mobile-friendly interfaces for all applications.
*   **Interactivity**: Significant use of micro-animations and smooth transitions.
*   **SEO**: Semantic HTML and performance-optimized layouts.

## 7. Future Roadmap
*   **Customer Loyalty Program**: Integration of points and rewards.
*   **Cloud Storage Integration**: Automatic upload of photos to cloud galleries for customers.
*   **Advanced Analytics**: Predictive revenue modeling and peak-hour analysis.
*   **Mobile App for Owners**: Dedicated mobile notification app for real-time sales alerts.
