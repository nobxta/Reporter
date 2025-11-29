# TG Report Shield - Complete Working Flow

## 🎯 System Overview

TG Report Shield is a complete Next.js 14 application for creating, managing, and tracking Telegram abuse reports. It uses Supabase for persistent storage, sends emails to multiple Telegram support addresses, and automatically monitors reported channels for bans.

---

## 📋 Complete System Flow

### 1. **Initial Setup & Authentication**

#### Landing Page (`/`)
- User visits the homepage
- Sees tool description and features
- Clicks "Login" button → redirects to `/login`

#### Login Page (`/login`)
- User enters admin password
- Frontend validates (client-side check)
- Sends POST to `/api/login` with password
- Server compares with `ADMIN_PASSWORD` env var
- On success: Sets HTTP-only cookie `auth=1` (7 days expiry)
- Redirects to `/report` page

**Middleware Protection:**
- `middleware.ts` checks all protected routes (`/report`, `/history`, `/settings`)
- If no `auth` cookie → redirects to `/login`
- If authenticated on `/login` → redirects to `/report`

---

### 2. **Report Creation Flow** (`/report`)

#### Step 1: Target Input
- User enters one or more targets (newline or comma-separated)
- Examples: `@username`, `https://t.me/channel`, multiple links
- Validates: Target field is required

#### Step 2: Violation Type
- User selects from dropdown:
  - Scam / Fraud
  - Illegal content
  - Impersonation
  - Spam / Malware
  - Other
- Validates: Violation type is required

#### Step 3: Full Report Text
- User enters complete description including:
  - Type of crime/violation
  - Laws violated (e.g., IPC 420, IT Act 66C)
  - Impact on users/public safety
  - Any other relevant details
- Validates: Description is required
- **Note:** Additional notes field (Step 4) will be combined with this

#### Step 4: Evidence & Notes
- **Evidence:** User enters links (one per line or comma-separated)
  - Can type "none" if no evidence
  - Examples: `https://t.me/channel/123`, `https://t.me/channel/456`
- **Additional Notes:** Optional extra information
  - Will be combined with description for report text

#### Step 5: Review & Send
- **Complaint Generation:**
  - Frontend calls `POST /api/report` with form data
  - Server calls `generateComplaint()` from `lib/complaint-generator.ts`
  
**Complaint Generator Process:**
1. **Fixed Subject:** `"URGENT: Please Check this fraud , scam , channel , report"`
2. **Parse Targets:** Splits by newlines/commas into array
3. **Combine Text:** Merges description + notes into REPORT_TEXT
4. **Parse Evidence:** Splits evidence links or handles "none"
5. **Extract Legal References:** Auto-detects patterns like "IPC 420", "IT Act 66C"
6. **Extract Harmful Activities:** Creates 3-8 bullet points from report text
7. **Create Summary:** Formats into 1-3 paragraphs
8. **Generate Email Body:**
   - Introduction with targets as bullets
   - Summary of issue
   - Key harmful activities
   - Legal references (if found)
   - Evidence links (if provided)
   - Requested actions (always included)
   - Closing statements
   - Random name sign-off (from 20 names)

- **Save to Database:**
  - Report saved to Supabase `reports` table
  - Status: `pending`
  - Returns report with generated complaint

- **User Reviews:**
  - Sees formatted email subject and body
  - Can go back to edit or click "Send Report"

- **Send Email:**
  - User clicks "Send Report"
  - Frontend calls `POST /api/send-report` with `reportId`
  
**Email Sending Process:**
1. Gets report from Supabase
2. Gets settings from Supabase (support emails)
3. **Multi-Email Support:**
   - Loops through all emails in `settings.support_emails` array
   - Sends email to each address sequentially
   - 500ms delay between emails
   - Requires at least one success
4. Updates report status to `sent`
5. Sets `email_sent_at` timestamp

---

### 3. **Report History** (`/history`)

#### Viewing Reports
- Loads all reports from Supabase (sorted by newest first)
- Displays in cards with:
  - Target username/link
  - Status badge (pending/sent/banned)
  - Violation type
  - Description preview
  - Timestamps (created, sent, banned, last checked)

#### Report Details
- Click any report card → Opens modal
- Shows full report details:
  - All form fields
  - Generated complaint subject & body
  - Status information

#### Manual Actions
- **Check Now Button:**
  - Calls `POST /api/check-reports-manual`
  - Triggers immediate status check
  - Shows results: how many checked, how many banned

- **Mark as Banned:**
  - For reports with status "sent"
  - Calls `PATCH /api/send-report` with `reportId`
  - Updates status to `banned`
  - Sets `banned_at` timestamp
  - Sends Telegram notification to admin

---

### 4. **Settings Management** (`/settings`)

#### View Settings
- Loads current settings from Supabase
- Falls back to env vars if settings table is empty

#### Manage Support Emails
- **Add Email:**
  - Enter email in input field
  - Validates email format
  - Adds to list (prevents duplicates)
- **Remove Email:**
  - Click "Remove" button
  - Requires at least one email (validation)
- **Save:**
  - Updates `settings.support_emails` array in Supabase
  - All future reports will be sent to all emails in this list

#### Check Interval
- Input field (1-5 minutes)
- Updates `settings.check_interval_minutes` in Supabase
- Used by automatic status checker

#### Telegram Chat ID
- Input field for chat ID
- Updates `settings.telegram_chat_id` in Supabase
- Used for ban notifications

#### Save Settings
- Validates all inputs
- Updates Supabase `settings` table
- Shows success message

---

### 5. **Automatic Status Checking**

#### How It Works
- **Cron Job:** Runs every minute (Vercel Cron or external)
- **Endpoint:** `GET /api/check-reports`
- **Authentication:** 
  - Cron: Uses `Authorization: Bearer <CRON_SECRET>` header
  - Manual: Requires admin cookie

#### Check Process
1. **Get Reports to Check:**
   - Queries Supabase for reports with:
     - Status = `sent`
     - `banned_at` is null
     - `last_checked` is null OR older than check interval
   - Uses `settings.check_interval_minutes` from database

2. **Check Each Report:**
   - For each report:
     - Updates `last_checked` timestamp
     - Calls Telegram Bot API `getChat()` to check if username exists
     - If 404 error → Target is banned/unavailable
     - If 403 error → Private/no access (treated as active)
     - 1 second delay between checks (rate limiting)

3. **Handle Banned Targets:**
   - If banned detected:
     - Updates report status to `banned`
     - Sets `banned_at` timestamp
     - Sends Telegram notification: "✅ Target Taken Down!"
     - Notification includes target and report ID

4. **Return Results:**
   - JSON response with:
     - Number checked
     - Number banned
     - Individual results per report

---

### 6. **Database Structure (Supabase)**

#### `reports` Table
```sql
- id (UUID, primary key)
- target (TEXT) - Can contain multiple targets separated by newlines/commas
- violation_type (TEXT)
- description (TEXT) - Full report text
- evidence (TEXT) - Evidence links or "none"
- notes (TEXT) - Additional notes
- status (TEXT) - 'pending', 'sent', or 'banned'
- complaint_subject (TEXT) - Generated email subject
- complaint_body (TEXT) - Generated email body
- email_sent_at (TIMESTAMPTZ)
- banned_at (TIMESTAMPTZ)
- last_checked (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

#### `settings` Table
```sql
- id (TEXT, primary key, default: 'default')
- support_emails (TEXT[]) - Array of email addresses
- check_interval_minutes (INTEGER, 1-5)
- telegram_chat_id (TEXT, nullable)
- updated_at (TIMESTAMPTZ)
```

---

## 🔄 Complete User Journey Example

1. **User logs in** → Enters password → Gets authenticated
2. **Creates report:**
   - Step 1: Enters `https://t.me/ArkhamXVI\nhttps://t.me/sabotaged`
   - Step 2: Selects "Scam / Fraud"
   - Step 3: Enters full description with legal references
   - Step 4: Adds evidence links
   - Step 5: Reviews generated complaint → Clicks "Send Report"
3. **System sends emails:**
   - Gets all support emails from Settings (e.g., `abuse@telegram.org`, `support@telegram.org`)
   - Sends email to each address
   - Updates report status to `sent`
4. **Automatic monitoring:**
   - Every 2 minutes (or configured interval), system checks if targets are banned
   - Uses Telegram Bot API to verify channel existence
   - If banned → Updates status, sends notification
5. **User views history:**
   - Sees all reports with status
   - Can manually check status
   - Can mark as banned if needed

---

## 🛠️ Technical Architecture

### Frontend (React/Next.js)
- **Pages:** Landing, Login, Report, History, Settings
- **Components:** Reusable UI components (Button, Input, Card, etc.)
- **State Management:** React hooks (useState, useEffect)
- **Routing:** Next.js App Router with middleware protection

### Backend (Next.js API Routes)
- **Authentication:** Cookie-based (HTTP-only)
- **Database:** Supabase (PostgreSQL)
- **Email:** Nodemailer (SMTP)
- **Telegram:** Telegraf (Bot API)

### Storage
- **Reports:** Supabase `reports` table
- **Settings:** Supabase `settings` table
- **Session:** HTTP-only cookies

### External Services
- **Supabase:** Database and storage
- **SMTP Server:** Email sending (Gmail, etc.)
- **Telegram Bot API:** Status checking and notifications

---

## ✅ System Status: COMPLETE & READY

All features are implemented:
- ✅ Multi-step report creation
- ✅ Professional email generation
- ✅ Multi-email sending
- ✅ Supabase integration
- ✅ Settings management
- ✅ Automatic status checking
- ✅ Telegram notifications
- ✅ Report history
- ✅ Authentication & security

**Ready to deploy after:**
1. Setting up Supabase project
2. Running database schema
3. Configuring environment variables
4. Setting up Telegram bot

