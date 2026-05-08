# 📋 Mapping Personal Data Flows in the Canvas LMS Codebase  

Below is a **complete, end‑to‑end map** of how personally‑identifiable information (PII) enters, moves inside, and leaves the Canvas LMS.  
The map pulls together the **PII inventory**, **third‑party integrations**, **data‑store overview**, and **flow diagrams** that were identified in the earlier analysis.

---

## 1. High‑Level Overview  

| Layer | What it does | Typical PII involved |
|-------|--------------|----------------------|
| **Ingress** | Sources that bring personal data into Canvas. | Names, email addresses, phone numbers, usernames, passwords, SIS IDs, OAuth profile data, file contents, LTI launch parameters. |
| **Internal Movement** | How that data is linked, transformed, and stored across models, services, and background jobs. | User ↔ Pseudonym ↔ CommunicationChannel, Enrollments, Submissions, Conversations, Page‑view logs, Audit logs, etc. |
| **Egress** | Destinations where Canvas sends personal data outside its own trust boundary. | External auth providers, LTI tools, plagiarism services, cloud storage (S3), video hosts (Kaltura), email/SMS gateways, SIS export feeds, monitoring/APM services, analytics pipelines. |
| **Data Stores** | Where the data lives at rest. | PostgreSQL (core relational data), Redis (caches & Sidekiq jobs), Cassandra (audit & event streams), DynamoDB (feature flags, preferences), Pulsar (event bus), S3 (file blobs), Kinesis/SQS (streaming/queues). |

---

## 2. Detailed PII Inventory  

| # | Data Element | Model / Table | Primary Use | Protection / Mitigation |
|---|--------------|---------------|-------------|--------------------------|
| 1 | **User ID** | `users.id` | Primary key for every user‑related record | Internal only; never exposed in plain‑text API responses (masked/omitted). |
| 2 | **Name** | `users.name` | UI display, email headers, notifications | Rendered as‑is; no encryption (low‑risk). |
| 3 | **Sortable Name** | `users.sortable_name` | Sorting of user lists | Internal only. |
| 4 | **Short Name** | `users.short_name` | Compact UI display | Internal only. |
| 5 | **Pronouns** | `users.pronouns` | Profile UI | Internal only. |
| 6 | **Time Zone** | `users.time_zone` | UI localisation, scheduling | Internal only. |
| 7 | **Locale / Language** | `users.locale` | UI localisation | Internal only. |
| 8 | **Avatar URL (Gravatar)** | `users.avatar_image_url` | Profile picture | Public URL; no secret data. |
| 9 | **Email Address** | `communication_channels.path` (type = email) & `pseudonyms.unique_id` (when email used as login) | Login, notifications, invitations, API auth | Stored plain‑text in DB; transmitted over TLS; can be masked in logs (`MASKED_EMAIL`). |
|10| **Phone Number / SMS Token** | `communication_channels.path` (type = sms) | SMS notifications, 2‑FA | Plain‑text in DB; limited exposure via API. |
|11| **Push Token** | `communication_channels.path` (type = push) | Mobile push notifications | Plain‑text; scoped to device. |
|12| **Slack / Twitter Handles** | `communication_channels.path` (type = slack, twitter) | Integrated messaging | Plain‑text; not used for auth. |
|13| **Communication‑Channel Confirmation Code** | `communication_channels.confirmation_code` | Verify email/SMS ownership | Short‑lived random token; stored hashed or cleared after use. |
|14| **Bounce Details** | `communication_channels.bounce_count`, `last_bounce_at` | Email deliverability tracking | Internal counters. |
|15| **Pseudonym Unique ID** (username) | `pseudonyms.unique_id` | Login identifier (may be email) | Plain‑text; unique constraint. |
|16| **Crypted Password** | `pseudonyms.crypted_password` | Authentication | Stored using **scrypt** (high‑cost hash). |
|17| **Password Salt** | `pseudonyms.password_salt` | Authentication | Stored alongside hash; not secret after hash. |
|18| **SIS User ID** | `pseudonyms.sis_user_id` | SIS integration | Plain‑text external identifier. |
|19| **Integration ID** | `pseudonyms.integration_id` | External auth providers (OAuth, LDAP) | Plain‑text linking token. |
|20| **Authentication Provider** | `pseudonyms.authentication_provider` | Source of credentials (ldap, cas, oauth2…) | Enum; internal only. |
|21| **Access Token** | `access_tokens.token` | API authentication (OAuth2, JWT) | **Encrypted at rest** (`encrypted_token`) and **hashed** for lookup; TLS in transit. |
|22| **Developer Key / API Key** | `developer_keys.api_key` | API client identification | Stored **hashed** (`hashed_api_key`). |
|23| **JWT Claims** (sub, email, oid, preferred_username, integration_id) | `access_tokens` payload | Stateless auth, impersonation | Signed with RSA/ECDSA; integrity verified server‑side. |
|24| **OTP / 2FA Secret** | `pseudonyms.otp_secret` (if enabled) | Two‑factor authentication | Encrypted via Rails `attr_encrypted`. |
|25| **Enrollment Record** (user_id, course_id, role, limit_privileges) | `enrollments` | Authorization, roster | No PII beyond linking user to course; user_id internal. |
|26| **Submission Content** (body, attachments) | `submissions` & `attachments` | Student work, grading | May contain PII text; stored as‑is, access‑controlled by course permissions. |
|27| **Submission Grade / Score** | `submissions.grade`, `submissions.score` | Academic record | Protected as academic data (FERPA). |
|28| **Conversation Message Author ID** | `conversation_messages.author_id` | Messaging | Internal reference; author name resolved via `users`. |
|29| **Conversation Message Body** | `conversation_messages.body` | Private messages | Stored as‑is; access limited to participants. |
|30| **Page View Record** (url, context_id, user_id) | `page_views` | Analytics, security monitoring | URL may contain query parameters with PII; stored plain but visible only to admins. |
|31| **E‑portfolio Data** (title, description, content) | `eportfolios` | Student showcase | Stored plain; visibility controlled by user settings. |
|32| **Group Name / Description** | `groups.name`, `groups.description` | Collaboration spaces | May contain user‑provided text; stored plain. |
|33| **Account Name / SIS Source ID** | `accounts.name`, `accounts.sis_source_id` | Institutional hierarchy | Internal; SIS source ID may be external identifier. |
|…| *(additional rows omitted for brevity – see full PII table in the analysis)* | | | |

---

## 3. Third‑Party Service & External‑API Inventory  

| Vendor / Service | Primary Purpose in Canvas | Typical Data Shared | Integration Mechanism |
|------------------|---------------------------|---------------------|----------------------|
| **LTI 1.1 / 1.3** | Embed external learning tools | Course IDs, user IDs, roles, grades, assignment metadata, custom launch params | OAuth‑signed JWT (LTI‑1.3) or OAuth‑1.0a (LTI‑1.1) launch |
| **OAuth2 Identity Providers** (Google, Facebook, GitHub, Microsoft, Apple, Clever, generic OIDC) | Social / institutional login | Email, name, avatar URL, provider‑specific user ID, optional scopes | Authorization Code Grant (OAuth2) |
| **SAML** | Enterprise SSO | SAML assertions: name, email, roles, group membership | POST/Redirect binding |
| **CAS** | Campus‑wide SSO | CAS ticket, user identifier, optional attributes | CAS service‑ticket validation |
| **LDAP** | Directory auth & provisioning | Username, password hash, group membership, email, name | Direct LDAP bind queries |
| **OTP / 2‑FA (Twilio, TOTP apps)** | Extra login security | Phone number (SMS), secret key for TOTP, verification timestamps | Twilio SMS API or internal TOTP library |
| **Google Drive** | Attach / import files from Drive | File IDs, names, MIME types, user’s Drive access token | OAuth2 + Google Drive REST API |
| **Turnitin / VeriCite** | Plagiarism detection | Submission text/file, student ID, course ID, timestamp | REST API (POST file, GET similarity report) |
| **Adobe Connect** | Web‑conference rooms | Meeting URL, host/participant IDs, timestamps, recordings | Adobe Connect API (XML/JSON over HTTPS) |
| **BigBlueButton** | Open‑source web conferencing | Meeting ID, attendee list, recordings, timestamps | BBB API (POST with secret) |
| **Kaltura** | Media/video hosting & transcoding | Video files, metadata, user IDs, captions | Kaltura REST API (OAuth‑signed) |
| **Datadog APM** | Performance monitoring | Request latency, error counts, host identifiers | Datadog Agent (UDP/TCP) + API for custom metrics |
| **New Relic** | Performance & error monitoring | Transaction traces, error stack traces, host info | New Relic Ruby Agent (auto‑instrumentation) |
| **Sentry** | Real‑time error tracking | Exception messages, stack traces, user context (anonymized) | Sentry SDK (Raven) |
| **Slack** | Notification channel | Message text, channel ID, user mentions, optional file URLs | Incoming Webhooks & `chat.postMessage` API |
| **Diigo** | Social bookmarking | URL, title, tags, notes, user ID | Diigo REST API (OAuth) |
| **Student Information System (SIS) Integrations** (PowerSchool, Ellucian, Banner, etc.) | Bulk import/export of users, courses, enrollments, grades | CSV/JSON payloads with student IDs, course sections, enrollment dates, grades | CSV/JSON file upload via Canvas SIS API (POST) |
| **Microsoft Teams / Azure AD Sync** | Calendar & meeting sync, roster provisioning | User principal name, Teams channel IDs, meeting URLs | Microsoft Graph API (OAuth2) |
| **Rich Content Editor (RCE) Service** | WYSIWYG editor for course content | HTML content, embedded media URLs, user ID for audit | Internal service calls (REST) |
| **Amazon S3** | Object storage for uploads | Files (attachments, media, exported archives) | HTTPS PUT/GET; SSE‑S3 or SSE‑KMS encryption |
| **Amazon Kinesis / SQS** | Event streaming & async processing | High‑throughput event records, webhook payloads | Kinesis API (TLS) / SQS API (TLS) |
| **Apache Pulsar** | Real‑time event bus | Grade‑change notifications, background triggers | TLS‑secured client‑broker communication |

---

## 4. Data‑Store Overview & Retention  

| # | Store | What it Holds (PII‑relevant) | Retention Pattern | Security / Encryption |
|---|-------|-----------------------------|-------------------|-----------------------|
| 1 | **PostgreSQL** | Core relational data: users, pseudonyms, enrollments, submissions, conversations, audit logs, SIS imports/exports | Backups nightly; archival scripts may purge old audit logs per policy | TLS for client‑server; disk‑level encryption (e.g., LUKS) or `pgcrypto` column‑level encryption for sensitive columns (access tokens). |
| 2 | **Redis** | Session store, CSRF tokens, Sidekiq job payloads, rate‑limit counters | Volatile; TTLs (seconds‑to‑hours). Persistence (`appendonly`/RDB) optional for job durability | TLS; optional at‑rest encryption via encrypted disks. |
| 3 | **Cassandra** | High‑volume audit & analytics events (page views, event streams) | Table‑level TTL (weeks‑months) configurable per compliance needs | SSL/TLS for client‑node; Transparent Data Encryption (TDE) available. |
| 4 | **DynamoDB** | Feature flags, user preferences, low‑latency key‑value data | TTL attribute auto‑expires items; otherwise app‑controlled | Server‑Side Encryption (AWS‑managed KMS); TLS for API calls. |
| 5 | **Apache Pulsar** | Real‑time event bus (grade changes, notifications) | Topic retention: time‑based (days‑weeks) or size‑based | TLS; optional encryption‑at‑rest on storage back‑ends. |
| 6 | **Amazon S3** | All user‑uploaded files & generated assets (attachments, media, exports) | Lifecycle rules: transition to Glacier or delete after configurable period; otherwise indefinite until user deletes | Server‑Side Encryption (SSE‑S3 or SSE‑KMS); HTTPS for all transfers. |
| 7 | **Amazon Kinesis** | Streaming analytics events (clickstreams, audit) | Default 24 h, extendable to 7 d; consumed quickly | TLS + Server‑Side Encryption. |
| 8 | **Amazon SQS** | Async processing queues (webhook payloads, retry) | Message retention up to 14 days; deleted on successful processing | TLS; no built‑in at‑rest encryption (relies on underlying storage). |

---

## 5. End‑to‑End Flow Maps  

### 5.1 Data Ingress  

```
+-------------------+      +-------------------+      +-------------------+
|   User Sign‑up    |      |   SIS Bulk Import |      |   OAuth / Social  |
| (name, email, …) | ---> | (CSV/JSON payload)| ---> |   Login (Google) |
+-------------------+      +-------------------+      +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+   +-------------------+   +-------------------+
|  Users Table      |   |  Users + Enroll   |   |  Users + Pseudonym|
|  (core profile)  |   |  (via SIS models) |   |  (OAuth profile) |
+-------------------+   +-------------------+   +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+   +-------------------+   +-------------------+
|  Pseudonyms Table |   |  Communication    |   |  Communication    |
|  (login, password)|   |  Channels (email) |   |  Channels (email) |
+-------------------+   +-------------------+   +-------------------+
```

* **File uploads / assignment submissions**  

```
User --> Browser --> Canvas Front‑end (RCE) --> POST /files
        |
        v
+-------------------+        +-------------------+
|  Attachments Table| <----> |  Amazon S3 bucket |
|  (metadata)       |        |  (binary blobs)   |
+-------------------+        +-------------------+
```

* **LTI Tool Launch**  

```
Canvas (Course/Assignment) --> LTI Launch URL (POST) --> External LTI Tool
   |
   v
Parameters include: user_id, email, name, role, course_id, custom vars
```

### 5.2 Internal Data Movement  

```
+-------------------+          +-------------------+          +-------------------+
|   Users Table     |          |   Enrollments    |          |   Courses Table   |
| (id, name, …)    |<-------->| (user_id, course_id, role) |<---->| (id, name, …) |
+-------------------+          +-------------------+          +-------------------+
        |                               |                               |
        v                               v                               v
+-------------------+          +-------------------+          +-------------------+
|  Pseudonyms Table |          |  Submissions Table|          |  Assignments Table|
| (login, password) |          | (user_id, assignment_id, …) | (course_id, …) |
+-------------------+          +-------------------+          +-------------------+
        |                               |
        v                               v
+-------------------+          +-------------------+
| Communication     |          | Conversation      |
| Channels (email)  |          | Messages          |
+-------------------+          +-------------------+
```

* **Page‑view / audit flow**  

```
Browser --> Canvas (Rails) --> PageViews model (PostgreSQL)
          |
          v
   +-------------------+      +-------------------+
   |   Cassandra (audit) | <--|   Pulsar (event) |
   +-------------------+      +-------------------+
```

* **Background jobs (Sidekiq)**  

```
Rails controller --> enqueue job (Redis) --> Sidekiq worker
   |
   v
   Accesses: Users, Submissions, Notifications, Export jobs
```

### 5.3 Data Egress  

```
+-------------------+      +-------------------+      +-------------------+
|  Canvas API       | ---> |  External Apps    | <--- |  OAuth Providers  |
| (JSON responses) |      |  (LTI, SIS, etc.)|      |  (Google, Azure) |
+-------------------+      +-------------------+      +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+   +-------------------+   +-------------------+
|  Email Service    |   |  Plagiarism API   |   |  Video Host (Kaltura)|
|  (SMTP / Sendgrid)|   | (Turnitin)        |   +-------------------+
+-------------------+   +-------------------+            |
        |                         |                     v
        v                         v            +-------------------+
+-------------------+   +-------------------+ |  Amazon S3 (shared)|
|  SMS Gateway (Twilio) | |  Google Drive API | +-------------------+
+-------------------+   +-------------------+
```

* **Specific egress examples**

| Destination | What leaves Canvas | Typical Path |
|------------|-------------------|--------------|
| **LTI Tool** | `user_id`, `email`, `name`, `role`, `course_id`, `assignment_id`, grade (if pass‑back) | LTI launch POST (OAuth‑signed JWT) |
| **Turnitin** | Submission file/content, student identifier, course ID | HTTPS POST to Turnitin REST endpoint |
| **Google Drive** | File ID, user’s OAuth token, file metadata | OAuth2 token exchange → Drive API upload |
| **Kaltura** | Video file, title, description, user ID | HTTPS POST to Kaltura API (OAuth) |
| **Email/SMS** | Email address, name, message body (may contain PII) | SMTP/Sendgrid or Twilio API (TLS) |
| **SIS Export** | CSV/JSON containing student IDs, enrollment dates, grades | Canvas SIS API → Institution’s SIS endpoint |
| **Datadog / New Relic / Sentry** | Request latency, error stack traces, optional user context (anonymized) | Agent → HTTPS API (TLS) |
| **Analytics pipelines (Kinesis, Pulsar)** | Page‑view URLs, user IDs, timestamps | Event producer → Kinesis/Pulsar → downstream analytics store |

---

## 6. Security & Mitigation Summary  

| Threat Vector | Mitigation(s) Implemented in Canvas |
|---------------|--------------------------------------|
| **Data in transit** | All external HTTP endpoints enforce TLS 1.2+; internal service‑to‑service calls (Redis, PostgreSQL, Cassandra, Pulsar) also use TLS where configured. |
| **Data at rest** | Sensitive columns (`access_tokens.encrypted_token`, `pseudonyms.crypted_password`, `pseudonyms.otp_secret`) are encrypted or hashed. Object storage (S3) uses SSE‑S3 or SSE‑KMS. |
| **Credential leakage** | Passwords hashed with **scrypt**; API keys stored hashed; JWTs signed with RSA/ECDSA. |
| **Logging of PII** | Logging helpers mask email addresses (`MASKED_EMAIL`) and other identifiers. |
| **Access control** | Role‑based checks (cancancan‑style) guard every controller/action; background jobs inherit the same policies. |
| **Retention & Deletion** | TTLs on Cassandra/DynamoDB; explicit purge jobs for old audit logs; user‑initiated file deletion removes S3 objects. |
| **Third‑party data sharing** | Only the minimal required fields are sent; consent is required for LTI launches that request additional data; OAuth scopes are limited. |
| **2‑FA** | OTP secrets encrypted; SMS tokens stored temporarily with expiration. |
| **Compliance** | GDPR‑ready features (data export, right‑to‑be‑forgotten) and FERPA‑aware handling of academic records. |

---

## 7. Quick Reference Flow Cheat‑Sheet  

| Flow | Entry Point | Core Models Involved | External Destination (if any) |
|------|-------------|----------------------|------------------------------|
| **User sign‑up** | `/register` | `User → Pseudonym → CommunicationChannel` | – |
| **SIS bulk import** | `/sis_imports` | `User, Pseudonym, Enrollment, Account, Course` | – |
| **OAuth login** | `/login/oauth2` | `User (lookup/creation) → Pseudonym → CommunicationChannel` | Identity Provider (Google, Azure, etc.) |
| **LTI launch** | `/lti/launch` | `User → Pseudonym → Enrollment → Course → Assignment` | External LTI Tool (OAuth‑signed JWT) |
| **File upload / submission** | `/files` / `/submissions` | `Attachment → S3`, `Submission → Attachment` | – |
| **Plagiarism check** | `TurnitinService#submit` | `Submission` (file content) | Turnitin / VeriCite API |
| **Push notification** | `PushService#send` | `CommunicationChannel (type=push)` | APNs / Firebase |
| **Analytics event** | `Analytics::Tracker.track` | `PageView`, `EventStream` | Cassandra / Pulsar / Kinesis |
| **Error reporting** | `Sentry.capture_exception` | – | Sentry SaaS |
| **Export to SIS** | `SisExportJob` | `User, Enrollment, Course, Grade` | Institution’s SIS endpoint (CSV/JSON) |
| **API response** | Any `/api/v1/*` endpoint | Varies (User, Course, Assignment, etc.) | API consumer (internal or external) |

---

### 📌 Bottom Line  

* **All personal data** originates from **user‑initiated actions**, **institutional SIS imports**, or **external auth/LTI launches**.  
* Inside Canvas, data is **joined via foreign‑key relationships** (user → pseudonym → communication channels, enrollments, submissions, conversations, audit logs).  
* **Outbound flows** are tightly scoped: only the data required for the specific integration is transmitted, and most outbound channels are protected by TLS and, where appropriate, additional encryption or hashing.  
* **Retention** is governed by a mix of **TTL‑based stores** (Cassandra, DynamoDB, Pulsar) and **application‑level purge scripts** for relational data.  

This map should give you a clear, end‑to‑end picture of **where personal data lives, how it moves, and where it leaves Canvas**, enabling you to assess privacy impact, compliance, and where additional safeguards may be needed.