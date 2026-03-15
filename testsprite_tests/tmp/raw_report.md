
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** JJIKGO_PHOTOBOOTH
- **Date:** 2026-03-15
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Create a complete transaction and pay successfully (happy path)
- **Test Code:** [TC001_Create_a_complete_transaction_and_pay_successfully_happy_path.py](./TC001_Create_a_complete_transaction_and_pay_successfully_happy_path.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier POS UI not found on http://localhost:5173; no 'Start new transaction' button or other cashier elements present.
- Page contains 0 interactive elements, indicating the SPA did not render and the UI is blank.
- Navigating to http://localhost:3000 returned API JSON ('Jjikgo Photobooth API is running ✨') instead of the Cashier App UI.
- Browser screenshot shows a blank/white page without visible UI components.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/4e164145-02ae-42b4-9048-681c00347d67
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Required-field validation blocks payment until corrected
- **Test Code:** [TC005_Required_field_validation_blocks_payment_until_corrected.py](./TC005_Required_field_validation_blocks_payment_until_corrected.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- ASSERTION: Cashier UI elements ('Start new transaction', 'Pay' button, customer name field) not found on http://localhost:5173.
- ASSERTION: Current page displays Admin Portal login form (username/password fields and 'Sign In' button) instead of the Cashier POS.
- ASSERTION: Waiting (2s + 5s) and scrolling did not reveal the expected Cashier interface or interactive elements.
- ASSERTION: Test cannot proceed because required UI components for validation are absent.
- ASSERTION: Earlier navigation to http://localhost:3000 returned API status JSON, indicating environment mapping issues that prevent reaching the Cashier App.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/c49e5763-e93a-42e8-a8f7-e7257fdd8ccc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Choose a payment method and confirm payment
- **Test Code:** [TC006_Choose_a_payment_method_and_confirm_payment.py](./TC006_Choose_a_payment_method_and_confirm_payment.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier App home not reachable at http://localhost:5173 — the page is blank and contains 0 interactive elements.
- Initial navigation to http://localhost:3000 loaded an unrelated photobooth API response rather than the Cashier App, indicating incorrect service on that port.
- SPA did not render after waiting (multiple wait attempts), so the payment flow (Start new transaction → Pay → Confirm payment) cannot be tested.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/95c88fb3-fb3d-4a0b-81f2-d7dea83abe10
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Card payment failure shows error and allows retry while keeping draft
- **Test Code:** [TC007_Card_payment_failure_shows_error_and_allows_retry_while_keeping_draft.py](./TC007_Card_payment_failure_shows_error_and_allows_retry_while_keeping_draft.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier App at http://localhost:5173 loaded but the page contained 0 interactive elements and appeared blank after waiting (SPA did not render).
- An unrelated service responded at http://localhost:3000 earlier, indicating the expected Cashier UI did not appear on the expected dev port and nearby ports may be misconfigured.
- Required UI elements to perform the test (e.g., 'Start new transaction' button) were not present, so the payment failure flow could not be exercised.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/2eaa23a9-13b9-4ea0-80b7-2e7e788099ef
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 After successful payment, invoice number is displayed and transaction is finalized
- **Test Code:** [TC008_After_successful_payment_invoice_number_is_displayed_and_transaction_is_finalized.py](./TC008_After_successful_payment_invoice_number_is_displayed_and_transaction_is_finalized.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier App not found at http://localhost:5173; the page shows the Jjikgo Photobooth Admin Portal login instead.
- 'Start new transaction' control not present on the current page, preventing the start of a transaction.
- Required UI elements for the payment flow (customer name input, theme selector, package selector, Pay button) are not present, so the final invoice and paid state cannot be verified.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/1f24c334-a7e1-447e-8f51-a665f9583294
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Invalid or expired QR returns Not Found/Invalid QR error
- **Test Code:** [TC010_Invalid_or_expired_QR_returns_Not_FoundInvalid_QR_error.py](./TC010_Invalid_or_expired_QR_returns_Not_FoundInvalid_QR_error.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Staff App UI not present on http://localhost:5174/api/branches (page contains 0 interactive elements).
- 'Search by QR' control not found on the page, preventing the QR error flow test from proceeding.
- QR code input field is missing, so entering an invalid QR code cannot be performed.
- Cannot trigger QR validation (press Enter) because the input/control to receive the input is not available.
- Earlier navigation to http://localhost:3000 returned an API status JSON page instead of the Staff App UI, indicating incorrect server or app not running as expected.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/153b3dee-fb2c-449f-8894-95c4ee13556d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Open a shift with starting cash and verify active status
- **Test Code:** [TC012_Open_a_shift_with_starting_cash_and_verify_active_status.py](./TC012_Open_a_shift_with_starting_cash_and_verify_active_status.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Staff App login page at http://localhost:5174/api/auth/login did not render: page contains 0 interactive elements and shows a blank UI.
- Expected text 'User Login' was not found on the page.
- The SPA did not load after waiting a total of 5 seconds (2s + 3s).
- Prior navigation to http://localhost:3000 returned unrelated API JSON, indicating a possible server/routing misconfiguration.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/35ee4449-5e7a-4cd1-b58d-dc952a646f4e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Confirm opening shift with a valid starting cash amount
- **Test Code:** [TC013_Confirm_opening_shift_with_a_valid_starting_cash_amount.py](./TC013_Confirm_opening_shift_with_a_valid_starting_cash_amount.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login page at http://localhost:5173/api/auth/login did not render the expected UI; page contains 0 interactive elements and appears blank.
- Root URL http://localhost:3000 returned API status JSON ('"status":"Jjikgo Photobooth API is running ✨"') instead of the application UI.
- No email/username or password input fields or 'User Login' text were found on the Cashier app login page, preventing the login step.
- No 'Open Shift', 'Starting cash', or 'Confirm' controls were found on the Cashier app, preventing verification of the open-shift activation.
- The Single Page Application (SPA) appears not to have loaded for the Cashier app (blank screenshot), making required UI interactions unavailable.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/317c68cd-fe8d-4f12-8553-b2ee95c0bbdf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Record an expense during an active shift and verify it appears in totals
- **Test Code:** [TC015_Record_an_expense_during_an_active_shift_and_verify_it_appears_in_totals.py](./TC015_Record_an_expense_during_an_active_shift_and_verify_it_appears_in_totals.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Staff App login UI not rendered at http://localhost:5174; page loaded as blank with 0 interactive elements.
- Navigation to http://localhost:5174/api/auth/login returned a blank response and did not display the expected 'User Login' form or input fields.
- Unable to proceed with login, opening shift, or adding an expense because the login page/UI did not load.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/55ff6fdc-c92a-49fd-a2f0-c9ed7776a7a1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Add addons and cafe snacks before payment
- **Test Code:** [TC002_Add_addons_and_cafe_snacks_before_payment.py](./TC002_Add_addons_and_cafe_snacks_before_payment.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier App page did not render at http://localhost:5173 — page is blank and shows 0 interactive elements.
- 'Start new transaction' button not found on the page, preventing beginning the transaction flow.
- Navigation to http://localhost:3000 returned a different service response (JSON status) instead of the Cashier POS, indicating incorrect service at that port.
- SPA did not load after waiting (3s and 5s), so the required UI elements never became available for interaction.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/429fb07b-f350-4291-8269-8cec7d15dfde
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Apply a valid promo code and see discount reflected
- **Test Code:** [TC003_Apply_a_valid_promo_code_and_see_discount_reflected.py](./TC003_Apply_a_valid_promo_code_and_see_discount_reflected.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier POS entry screen not reachable at http://localhost:5173 — page shows 0 interactive elements or displays non-POS content.
- 'Start new transaction' button not found on the accessible pages, so the POS workflow cannot be started.
- Unable to apply promo code 'PROMO10' or verify 'Discount' because the Cashier POS UI is not accessible.
- Alternative dev ports checked (http://localhost:5174 and http://localhost:3000) did not expose the Cashier POS entry screen.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/2f395481-afcf-4f02-9587-d51497d118d9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Invalid promo code shows an error and does not apply discount
- **Test Code:** [TC004_Invalid_promo_code_shows_an_error_and_does_not_apply_discount.py](./TC004_Invalid_promo_code_shows_an_error_and_does_not_apply_discount.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier App UI did not render on http://localhost:5173 — page shows a blank viewport with 0 interactive elements.
- No 'Start new transaction' button or any input fields were found on the page, preventing continuation of the test steps.
- Navigating to http://localhost:3000 earlier returned unrelated Photobooth API JSON instead of the Cashier App UI.
- The SPA remained unresponsive after waiting 5 seconds; interactive elements are still absent.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/b2cc3b9f-29b5-4b9d-9c62-b22070144c83
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Connect to a branch room and confirm queue page loads
- **Test Code:** [TC009_Connect_to_a_branch_room_and_confirm_queue_page_loads.py](./TC009_Connect_to_a_branch_room_and_confirm_queue_page_loads.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- ASSERTION: Staff App UI not reachable at http://localhost:5174; /api/branches returned a JSON API response instead of the Staff App UI.
- ASSERTION: 'Branches' text not found on the /api/branches page.
- ASSERTION: No interactive elements present on the /api/branches page (0 interactive elements), so a branch cannot be clicked.
- ASSERTION: 'Connected', 'Queue', and 'Theme selector' UI elements are not present on the current page and therefore cannot be verified.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/ac0bc4f9-f608-452b-bbea-2ab6595f3520
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Empty QR submission shows validation message
- **Test Code:** [TC011_Empty_QR_submission_shows_validation_message.py](./TC011_Empty_QR_submission_shows_validation_message.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- 'Search by QR' controls not found on page http://localhost:5173/api/branches; page is blank or returning API JSON instead of the expected UI.
- QR code input field is not present; page reports 0 interactive elements so user-facing validation cannot be tested.
- Click action for 'Search by QR' could not be performed because no interactive elements are available on the page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/10ca18d4-113f-429e-9f3a-9f33693270d3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Prevent opening a shift when starting cash is missing
- **Test Code:** [TC014_Prevent_opening_a_shift_when_starting_cash_is_missing.py](./TC014_Prevent_opening_a_shift_when_starting_cash_is_missing.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Cashier App login page did not load on http://localhost:5173 - 'User Login' text not found.
- No interactive elements (inputs or buttons) are present on the page, preventing login and open-shift actions.
- The SPA did not render after navigation and waiting; the page appears blank.
- An unrelated API JSON was returned from http://localhost:3000 earlier, indicating the incorrect endpoint was previously used.
- Required UI elements for opening a shift (login form and shift controls) are absent, so validation for starting cash cannot be tested.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e731315b-4dc1-4e65-af72-604da9e79c26/4896d4ba-dc18-4b68-891b-84bcf668012a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---