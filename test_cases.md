# Testing & Deployment Plan
**Role:** Student 3 (Testing & Deployment)

This document outlines the 10 core sample test cases required to validate the core logic, AI modules, and edge cases of the GangaMaxx B2B Delivery Tracker.

---

## Part 1: Last-Mile Delivery Tracker & Map Routing

### Test Case 1: Standard Route Dispatch
- **Input/Action:** Admin logs into the Staff Portal, clicks "Schedule Vehicle", selects two pending orders (e.g., St. Jude Hospital & Apex School), and assigns a Driver and Vehicle Number.
- **Expected Output:** A new Delivery Run is created in the database with status "Pending". The Orders are transitioned from "Pending" to "Dispatched". The interactive Map renders the warehouse and the two customer pins.
- **Pass/Fail:** [ ] Pass

### Test Case 2: AI Route Optimization (Nearest Neighbor)
- **Input/Action:** Admin selects 4 pending orders and clicks the "✨ Auto-Optimize Route" button.
- **Expected Output:** The UI shows a loading state ("Calculating optimal vectors..."). After 1.5 seconds, the array sequence is visually reordered based on geographical proximity to the Shamshabad warehouse.
- **Edge Case Reviewed:** What if only 1 order is selected? The button remains disabled, preventing the algorithm from running on a single coordinate.
- **Pass/Fail:** [ ] Pass

### Test Case 3: Driver POD Capture (Happy Path)
- **Input/Action:** Driver selects an "In Transit" delivery run, clicks on a specific stop, fills out the Authorized Signatory name, uploads a mock POD image URL, and submits.
- **Expected Output:** Stop status updates to "Delivered". The "Live Truck Location" map marker moves to the customer's coordinates.
- **Pass/Fail:** [ ] Pass

### Test Case 4: Delivery Failure Logging (Exception Handling)
- **Input/Action:** Driver selects a stop, but clicks the red "Log Delivery Failure" button. Selects "Facility Closed" from the dropdown.
- **Expected Output:** The Stop status updates to "Failed". The timeline visual turns red, highlighting the "Delivery Exception" box with the specific reason so Admins can follow up.
- **Pass/Fail:** [ ] Pass

### Test Case 5: Auto-Complete Run Logic
- **Input/Action:** Driver marks the final remaining stop in a run as "Delivered".
- **Expected Output:** The system detects that all stops in the route are now "Delivered" or "Failed", and automatically transitions the overarching macro-run status from "In Transit" to "Completed".
- **Edge Case Reviewed:** System correctly handles a mix of Delivered and Failed stops and still closes out the route.
- **Pass/Fail:** [ ] Pass

---

## Part 2: Institutional CRM & Ordering

### Test Case 6: Dynamic Tiered Pricing
- **Input/Action:** Admin goes to Quotation Builder and selects a "Platinum" tier customer (e.g., St. Jude Hospital).
- **Expected Output:** The product catalog instantly re-calculates to show prices with a 15% discount applied. 
- **Edge Case Reviewed:** If a "Silver" tier customer is selected, the discount correctly drops to 5%.
- **Pass/Fail:** [ ] Pass

### Test Case 7: Form Validation on Empty Submissions
- **Input/Action:** Admin tries to dispatch a vehicle without entering a Vehicle Registration Number or Driver Name.
- **Expected Output:** The form prevents submission and the browser highlights the missing required fields. No incomplete database entries are created.
- **Pass/Fail:** [ ] Pass

---

## Part 3: AI & Customer Portal

### Test Case 8: Conversational AI Product Recommendation
- **Input/Action:** User types "What should I use for a hospital?" into the AI Chatbot.
- **Expected Output:** AI intercepts the keyword "hospital" and queries the database for Sanitizers, returning: *"For medical facilities, I strongly recommend our MaxxClean Sanitizer 5L. It meets strict compliance standards."*
- **Pass/Fail:** [ ] Pass

### Test Case 9: Conversational AI Error Handling
- **Input/Action:** User types an empty message or a string of random characters.
- **Expected Output:** The AI ignores empty submissions (button disabled). For random characters, it gracefully defaults to its standard greeting without throwing a backend crash.
- **Edge Case Reviewed:** Invalid inputs do not break the AI endpoints.
- **Pass/Fail:** [ ] Pass

### Test Case 10: Customer Portal Live Map Rendering
- **Input/Action:** Customer (e.g., `c1`) logs into the Customer Portal and clicks an active "In Transit" shipment.
- **Expected Output:** The Leaflet map securely renders ONLY their specific delivery. It plots the Warehouse, the Customer Address, and the Live Truck Marker. It does NOT expose other customer coordinates from the same delivery run.
- **Pass/Fail:** [ ] Pass
