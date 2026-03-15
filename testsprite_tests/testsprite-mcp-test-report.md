# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** JJIKGO_PHOTOBOOTH
- **Date:** 2026-03-15
- **Prepared by:** TestSprite AI Team and Antigravity Assistant

---

## 2️⃣ Requirement Validation Summary

### 📌 Requirement 1: Transaction & Payment Flow (Cashier App)

#### Test TC001 Create a complete transaction and pay successfully (happy path)
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Expected Cashier UI elements were not found at `http://localhost:5173`. Testsprite encountered a blank page, because the Cashier app had actually started on port `5178` due to port conflicts. 

#### Test TC002 Add addons and cafe snacks before payment
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Failed due to the Cashier App frontend not being accessible on `http://localhost:5173`. The application rendered blank.

#### Test TC003 Apply a valid promo code and see discount reflected
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** The Cashier POS entry screen was not reachable. UI elements like the "Start new transaction" button were completely absent.

#### Test TC004 Invalid promo code shows an error and does not apply discount
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Same as above. Navigation to `localhost:5173` returned a blank screen.

#### Test TC005 Required-field validation blocks payment until corrected
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Testsprite discovered the Admin portal loaded instead, or no elements loaded at all. The wrong application was served on the expected port.

#### Test TC006 Choose a payment method and confirm payment
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** The SPA did not render after multiple wait attempts, so the payment flow could not be tested.

#### Test TC007 Card payment failure shows error and allows retry while keeping draft
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Required UI elements to interact with the POS were missing due to incorrect port routing.

#### Test TC008 After successful payment, invoice number is displayed and transaction is finalized
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** The Jjikgo Admin Portal login showed up on `localhost:5173` instead of the Cashier POS, which prevented the transaction from starting.


### 📌 Requirement 2: Queue & QR Management (Staff App)

#### Test TC009 Connect to a branch room and confirm queue page loads
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Test attempted to verify Staff App at `http://localhost:5174/api/branches` but instead hit a raw API data response, preventing the UI flow.

#### Test TC010 Invalid or expired QR returns Not Found/Invalid QR error
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Could not find the "Search by QR" button because the Staff App was not correctly served or the test searched the wrong endpoint path. 

#### Test TC011 Empty QR submission shows validation message
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** Missing UI elements because the page was blank. Validation could not be performed.


### 📌 Requirement 3: Shift Management & Expenses (Staff App)

#### Test TC012 Open a shift with starting cash and verify active status
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** The login UI at `http://localhost:5174/api/auth/login` did not render. It showed a blank page and 0 interactive elements.

#### Test TC013 Confirm opening shift with a valid starting cash amount
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** No interactive elements were found. Navigating to `http://localhost:3000` returned API JSON instead.

#### Test TC014 Prevent opening a shift when starting cash is missing
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** The Staff login screen was unavailable. Without logging in, the shift UI could not be reached.

#### Test TC015 Record an expense during an active shift and verify it appears in totals
- **Test Error:** TEST FAILURE
- **Status:** ❌ Failed
- **Analysis / Findings:** The login UI didn't render at `http://localhost:5174`, failing immediately.

---

## 3️⃣ Coverage & Matching Metrics

- **0.00%** of tests passed

| Requirement                          | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------------------------|-------------|-----------|------------|
| Requirement 1: Transaction & Payment | 8           | 0         | 8          |
| Requirement 2: Queue & QR Management | 3           | 0         | 3          |
| Requirement 3: Shift Management      | 4           | 0         | 4          |

---

## 4️⃣ Key Gaps / Risks

1. **Port Conflicts & Dynamic Dev Server Ports:**
   Vite assigns different ports dynamically if the default ones are used. In this case, `5173` - `5177` were already taken, so the apps ran on ports like `5178`. Testsprite expected `5173`/`5174` and thus encountered blank pages, APIs, or the wrong application. 

   **Mitigation:** 
   We must strict-bind the ports in Vite configurations (`--port 5173 --strictPort=true`), or find and terminate the zombie Node processes occupying these ports before running tests.

2. **Backend API Overlaps in Test Routing:**
   The test agent occasionally attempted to use `http://localhost:3000` or navigated to `/api/branches` assuming they were frontend routes. However, these are strictly Node.js Express routes returning JSON.

   **Mitigation:**
   Tests need strict URL instructions. For example, the Staff App doesn't use `/api/branches` as a page URL—it fetches from it. The tests must navigate correctly through the SPA routing instead of jumping straight to API paths.
