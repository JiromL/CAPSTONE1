# Client Tracking System - Quick Testing Guide

## Prerequisites
- Backend running on `http://localhost:5001`
- Frontend running on `http://localhost:3003`
- Logged-in user with valid JWT token
- MongoDB with sample data (optional)

---

## Quick Test Plan

### 1. New Client Intakes Page

**URL**: `http://localhost:3003/new-intakes`

#### Test 1.1: Page Loads
- [ ] Page loads without errors
- [ ] Header displays "New Client Intakes"
- [ ] Filter fields visible: Search, Month, Refresh, Export buttons
- [ ] Table loads with placeholder or actual data

#### Test 1.2: Search Functionality
- [ ] Type in search box: "john"
- [ ] Results filter in real-time or on Enter
- [ ] Clears to show all when empty

#### Test 1.3: Month Filter
- [ ] Select month "2024-03"
- [ ] Only records from March 2024 display
- [ ] Clear month to show all records

#### Test 1.4: Pagination
- [ ] "Previous" button disabled on page 1
- [ ] Click "Next" moves to page 2
- [ ] Shows correct record count: "Showing X to Y of Z"

#### Test 1.5: Status Badges
- [ ] NEW records show blue badge
- [ ] COMPLETED show green badge
- [ ] IN_PROGRESS show yellow badge

#### Test 1.6: Export to Excel
- [ ] Click "Export" button
- [ ] File downloads: `new-intakes-YYYY-MM-DD.xlsx`
- [ ] Open file in Excel - verify 10 columns
- [ ] Headers: Date, Name, ID, College, Service, Source, Status, Counselor

---

### 2. Check-in Tracking Page

**URL**: `http://localhost:3003/check-in-tracking`

#### Test 2.1: Page Loads
- [ ] Page loads without errors
- [ ] Header displays "Non-Counseling Clients (Check-ins)"
- [ ] Filter fields visible: Search, Concern, Status, Month, Refresh, Export

#### Test 2.2: Search Functionality
- [ ] Type name in search: "jane"
- [ ] Results filter for matching names
- [ ] Clear search to show all

#### Test 2.3: Concern Filter
- [ ] Select "unemployment"
- [ ] Only records with unemployment concern show
- [ ] Try other options: "SDFO", "LCIDWELL", "with MH but needs check-in only"

#### Test 2.4: Status Filter
- [ ] Select "Active"
- [ ] Only active check-in clients show
- [ ] Switch to "Inactive" to see inactive clients

#### Test 2.5: Case Number Display
- [ ] Case numbers display in blue (hyperlink style)
- [ ] Format should be: `CASE-YYYYMM-XXXX`

#### Test 2.6: Combined Filters
- [ ] Set Concern: "SDFO"
- [ ] Set Status: "Active"  
- [ ] Set Month: "2024-03"
- [ ] Results narrow to those matching ALL criteria

#### Test 2.7: Export to Excel
- [ ] Click "Export"
- [ ] File downloads: `check-in-tracking-YYYY-MM-DD.xlsx`
- [ ] Open file - verify 6 columns
- [ ] Headers: Case Number, Client Name, ID Number, Concern, Status, Date Created

---

### 3. Counseling Cases Page

**URL**: `http://localhost:3003/counseling-cases`

#### Test 3.1: Page Loads
- [ ] Page loads without errors
- [ ] Header displays "Counseling Cases"
- [ ] Subtitle mentions "session metrics"

#### Test 3.2: Search Functionality
- [ ] Type case number: "CASE-202403"
- [ ] Records with that case number display
- [ ] Search by client name: "smith"

#### Test 3.3: Status Filter
- [ ] Select "Active"
- [ ] Only active cases show
- [ ] Try "for Termination" to see cases being terminated

#### Test 3.4: Session Progress Display
- [ ] Each row shows progress bar
- [ ] Progress bar width matches: (current_sessions / target_sessions) * 100
- [ ] Percentage displayed next to bar

#### Test 3.5: Session Metrics
- [ ] "Sessions" column shows "X / Y" (current / target)
- [ ] Example: "5 / 10" means 5 sessions completed out of 10 target
- [ ] Progress bar filled to 50% for this example

#### Test 3.6: Month & Status Filters
- [ ] Set Month: "2024-03"
- [ ] Set Status: "Active"
- [ ] Results filtered correctly

#### Test 3.7: Export to Excel
- [ ] Click "Export"
- [ ] File downloads: `counseling-cases-YYYY-MM-DD.xlsx`
- [ ] Open file - verify 7 columns
- [ ] Headers: Case Number, Client Name, ID Number, Target Sessions, Current Sessions, Status, Date Created

---

## Backend API Testing (Manual/Postman)

### Test 3.1: GET /new-intakes
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/client-tracking/new-intakes?page=1&limit=10"
```
Expected:
```json
{
  "data": [
    {
      "_id": "...",
      "client_name": "John Doe",
      "client_id_number": "12345678",
      "college_unit": "Engineering",
      "service_requested": "Mental Health",
      "status": "NEW",
      "created_date": "2024-03-20T..."
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

### Test 3.2: POST /check-ins (Create)
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Jane Smith",
    "client_id_number": "87654321",
    "concern": "unemployment",
    "counselor_id": "COUNSELOR_ID"
  }' \
  "http://localhost:5001/api/client-tracking/check-ins"
```
Expected: Returns created record with auto-generated case_number and created_date

### Test 3.3: GET /export/counseling-cases?month=2024-03
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/client-tracking/export/counseling-cases?month=2024-03"
```
Expected: Returns JSON array of all counseling cases from March 2024

---

## Error Scenarios to Test

### Test 4.1: No Token
- [ ] Don't include Authorization header
- [ ] Expected: 401 Unauthorized error
- [ ] Frontend should show "Authentication required" or redirect to login

### Test 4.2: Invalid Token
- [ ] Use malformed JWT token
- [ ] Expected: 401 Unauthorized error

### Test 4.3: Unauthorized Role (STUDENT)
- [ ] Log in as STUDENT user
- [ ] Try to access /new-intakes page
- [ ] Expected: 403 Forbidden error

### Test 4.4: Invalid Search
- [ ] Search for text that matches NO records
- [ ] Expected: Empty results with "No records found" message
- [ ] No errors

### Test 4.5: Invalid Month Format
- [ ] Type "2024-13" (invalid month)
- [ ] Expected: No results (graceful handling)

### Test 4.6: Export with No Data
- [ ] Filter to show no results
- [ ] Click Export
- [ ] Expected: Empty XLSX file with headers only (or message)

---

## Performance Tests

### Test 5.1: Large Dataset
- [ ] Add 100+ records to database
- [ ] Load /new-intakes page
- [ ] [ ] Page maintains responsiveness
- [ ] Pagination works smoothly
- [ ] Export includes all records

### Test 5.2: Rapid Filtering
- [ ] Quickly change filters multiple times
- [ ] Search: type quickly, delete, type again
- [ ] Expected: No crashes, UI remains responsive

### Test 5.3: Multiple Exports
- [ ] Click Export button 5 times rapidly
- [ ] Expected: 5 different files generated
- [ ] Files have different timestamps

---

## Data Validation Tests

### Test 6.1: Create with Missing Fields
- [ ] POST to /new-intakes with incomplete data
- [ ] Expected: 400 Bad Request with error message

### Test 6.2: Case Number Format
- [ ] Check all check-in and counseling case records
- [ ] All case numbers should match: `CASE-YYYYMM-XXXX`
- [ ] Example: `CASE-202403-0001`, `CASE-202403-0002`

### Test 6.3: Date Formatting
- [ ] Check created_date field
- [ ] Should be ISO timestamp: `2024-03-20T10:30:00Z`
- [ ] Display on frontend should be: `3/20/2024`

### Test 6.4: Session Values
- [ ] Counseling cases should have target_sessions > 0
- [ ] current_sessions should be ≤ target_sessions
- [ ] Progress bar calculated correctly

---

## Accessibility Tests

### Test 7.1: Keyboard Navigation
- [ ] Tab through search, filter, and button fields
- [ ] Enter key submits search
- [ ] Shift+Tab goes backwards

### Test 7.2: Screen Reader (Optional)
- [ ] Headings properly labeled
- [ ] Buttons have clear labels
- [ ] Table headers associated with rows

### Test 7.3: Color Contrast
- [ ] Text readable on all backgrounds
- [ ] Status badges have sufficient contrast
- [ ] Links underlined or distinctly styled

---

## Success Criteria Checklist

### Application Must:
- [ ] ✅ Load all 3 pages without JavaScript errors
- [ ] ✅ Fetch data from backend API
- [ ] ✅ Display data in tables with proper formatting
- [ ] ✅ Filter by search, status, concern, month
- [ ] ✅ Paginate through results (10/page)
- [ ] ✅ Export data to Excel with correct formatting
- [ ] ✅ Enforce role-based access (block STUDENT)
- [ ] ✅ Handle errors gracefully
- [ ] ✅ Show loading states
- [ ] ✅ Show empty states

### Backend Must:
- [ ] ✅ Return 10 records per page
- [ ] ✅ Support search across specified fields
- [ ] ✅ Support filters (status, concern, month)
- [ ] ✅ Auto-generate case numbers
- [ ] ✅ Log all create/update operations
- [ ] ✅ Enforce JWT authentication
- [ ] ✅ Enforce role-based access control
- [ ] ✅ Create indexes for performance

---

## Regression Testing (After Any Changes)

After deploying, re-test:
1. All 3 pages load
2. Each filter type works independently
3. Combined filters work together
4. Pagination works
5. Export generates valid Excel
6. Authentication still required
7. Role-based access still enforced
8. No console JavaScript errors

---

## Known Limitations / TODO

- Navigation menu links not yet added (manual URL navigation required for now)
- No bulk import functionality
- Case notes not yet implemented
- No real-time collaboration
- No email notifications

---

**Test Date**: ___________
**Tester**: ___________
**Browser**: ___________
**Result**: [ ] PASS [ ] FAIL

**Notes**:
```


```
