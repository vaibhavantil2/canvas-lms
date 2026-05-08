## 📋 Summary of Personal Data / PII Elements in the Canvas LMS Codebase  

| # | Data Element | Model / Table | Primary Use | Observed Protection / Mitigation |
|---|--------------|---------------|-------------|-----------------------------------|
| 1 | **User ID** | `users.id` | Primary key for every user‑related record | Internal only; never exposed in plain‑text API responses (masked or omitted). |
| 2 | **Name** | `users.name` | Displayed in UI, email headers, notifications | Rendered as‑is; no special encryption (considered low‑risk). |
| 3 | **Sortable Name** | `users.sortable_name` | Sorting of user lists | Internal only. |
| 4 | **Short Name** | `users.short_name` | UI display where space is limited | Internal only. |
| 5 | **Pronouns** | `users.pronouns` | UI display, profile pages | Internal only. |
| 6 | **Time Zone** | `users.time_zone` | UI localisation, scheduling | Internal only. |
| 7 | **Locale / Language** | `users.locale` | UI localisation | Internal only. |
| 8 | **Avatar URL (Gravatar)** | `users.avatar_image_url` | Profile picture display | Public URL; no secret data. |
| 9 | **Email Address** | `communication_channels.path` (type = email) & `pseudonyms.unique_id` (when email used as login) | Login, notifications, course invitations, API auth | Stored in plain text in DB; transmitted over TLS; can be masked in logs (`MASKED_EMAIL`). |
|10| **Phone Number / SMS Token** | `communication_channels.path` (type = sms) | SMS notifications, 2‑FA | Plain text in DB; limited exposure via API. |
|11| **Push Token** | `communication_channels.path` (type = push) | Mobile push notifications | Plain text; scoped to device. |
|12| **Slack / Twitter Handles** | `communication_channels.path` (type = slack, twitter) | Integrated messaging | Plain text; not used for auth. |
|13| **Communication‑Channel Confirmation Code** | `communication_channels.confirmation_code` | Verify email/SMS ownership | Random token, stored hashed? (code is short‑lived). |
|14| **Bounce Details** | `communication_channels.bounce_count`, `last_bounce_at` | Email deliverability tracking | Internal counters. |
|15| **Pseudonym Unique ID** (username) | `pseudonyms.unique_id` | Login identifier (may be email) | Plain text; unique constraint. |
|16| **Crypted Password** | `pseudonyms.crypted_password` | Authentication | Stored using **scrypt** (high‑cost hash). |
|17| **Password Salt** | `pseudonyms.password_salt` | Authentication | Stored alongside hash; not secret after hash. |
|18| **SIS User ID** | `pseudonyms.sis_user_id` | Integration with Student‑Information‑Systems | Plain text; may be an external identifier. |
|19| **Integration ID** | `pseudonyms.integration_id` | External auth providers (OAuth, LDAP) | Plain text; used for linking accounts. |
|20| **Authentication Provider** | `pseudonyms.authentication_provider` | Indicates source of credentials (ldap, cas, oauth2, etc.) | Enum; internal only. |
|21| **Access Token** | `access_tokens.token` | API authentication (OAuth2, JWT) | **Encrypted at rest** (`encrypted_token` column) and **hashed** for lookup; transmitted over TLS. |
|22| **Developer Key / API Key** | `developer_keys.api_key` | API client identification | Stored **hashed** (`hashed_api_key`). |
|23| **JWT Claims (sub, email, oid, preferred_username, integration_id)** | `access_tokens` payload | Stateless auth, user impersonation | Signed with RSA/ECDSA; token integrity verified server‑side. |
|24| **OTP / 2FA Secret** | `pseudonyms.otp_secret` (if enabled) | Two‑factor authentication | Encrypted using Rails `attr_encrypted`. |
|25| **Enrollment Record** (user_id, course_id, role, limit_privileges) | `enrollments` | Authorization, course roster | No PII beyond linking user to course; user_id is internal. |
|26| **Submission Content** (body, attachments) | `submissions` & `attachments` | Student work, grading | May contain personally identifiable text; stored as‑is, access controlled by course permissions. |
|27| **Submission Grade / Score** | `submissions.grade`, `submissions.score` | Academic record | Internal; not PII but protected as academic data. |
|28| **Conversation Message Author ID** | `conversation_messages.author_id` | Messaging between users | Internal reference; author name resolved via `users`. |
|29| **Conversation Message Body** | `conversation_messages.body` | Private messages | Stored as‑is; access limited to participants. |
|30| **Page View Record** (url, context_id, user_id) | `page_views` | Analytics, security monitoring | URL may contain query parameters with PII; stored plain but limited to admin view. |
|31| **Eportfolio Data** (title, description, content) | `eportfolios` | Student showcase | Stored plain; visibility controlled by user settings. |
|32| **Group Name / Description** | `groups.name`, `groups.description` | Collaboration spaces | May contain user‑provided text; stored plain. |
|33| **Account Name / SIS Source ID** | `accounts.name`, `accounts.sis_source_id` | Institution hierarchy | SIS ID is external identifier; stored plain. |
|34| **App Center Access Token** (partial mask) | `accounts.settings[:app_center_access_token]` | Integration with external apps | Masked when rendered (`MASKED_APP_CENTER_ACCESS_TOKEN: token[0...5]`). |
|35| **Turnitin Shared Secret** | `accounts.turnitin_shared_secret` | Plagiarism service auth | Stored plain in DB; should be encrypted (not observed). |
|36| **Outgoing Email Default Name** | `accounts.settings[:outgoing_email_default_name]` | Email “From” name for system messages | Plain text; not secret. |
|37| **Admin Notification Email** | `admin_notifications.email` (via `admin_json`) | System alerts to admins | Plain text; sent over TLS. |
|38| **MediaObject Metadata** (title, media_type, user_id) | `media_objects` | Uploaded media (audio/video) | Title may contain PII; stored plain. |
|39| **Attachment Metadata** (filename, display_name, content_type, md5) | `attachments` | Files uploaded by users | Filename may contain PII; stored plain; access controlled. |
|40| **Login History / Session Token** | `sessions` (Rails session cookie) | Maintain logged‑in state | Session cookie is signed & encrypted; token stored in DB (`session_id`). |
|41| **OAuth Client Secret** | `oauth_clients.client_secret` | Third‑party app auth | Encrypted at rest (`encrypted_client_secret`). |
|42| **LTI Launch Parameters** (user_id, context_id, roles) | `lti_launches` | External tool integration | User ID is internal; other fields may contain email/username; stored plain but scoped to launch. |
|43| **Audit Log Entries** (user_id, ip_address, action) | `audit_logs` | Security & compliance tracking | IP address is PII; stored plain; access limited to admins. |
|44| **Password Reset Token** | `pseudonyms.password_reset_token` | Reset flow | Random token, stored hashed, expires quickly. |
|45| **SAML / CAS / LDAP Identifiers** | `pseudonyms.sis_user_id` / `pseudonyms.integration_id` | External auth mapping | Plain text; may be email or external UID. |
|46| **OAuth2 Access Token Scopes** | `access_tokens.scopes` | Authorization granularity | Plain text list; not secret. |
|47| **JWT Refresh Token** | `access_tokens.refresh_token` | Token renewal | Encrypted/hashed similar to access token. |
|48| **User Preferences** (JSON blob) | `users.preferences` | UI customization | Stored as JSON; may contain email notification settings. |
|49| **User Custom Data** (profile fields) | `user_profile` (if present) | Additional profile info (address, phone) | Not in core codebase but possible via plugins; stored plain. |

> **Note:** The list above captures every field that either directly stores personally identifiable information (PII) or can be combined with other data to identify an individual. Some elements (e.g., internal IDs, role flags) are not PII on their own but are included because they link to PII elsewhere.

---

## 🔎 Detailed Reasoning & Observations  

### 1. Where the data lives  
* **ActiveRecord models** (`User`, `Pseudonym`, `CommunicationChannel`, `AccessToken`, etc.) map 1‑to‑1 to database tables. The column names in the tables match the attribute names shown above.  
* **Settings stored in JSON columns** (`accounts.settings`, `users.preferences`) are serialized blobs; the keys listed above are the ones that appear in the source when the settings are read or written.  

### 2. How the data is used  

| Data Element | Typical Code Paths (examples) | Security‑relevant usage |
|--------------|------------------------------|--------------------------|
| Email / Phone / Push token | Rendered in `account_json`, `user_json`, `communication_channel_json`; used by `Notification` service to send emails/SMS/push. | Sent over TLS; sometimes masked (`MASKED_EMAIL`). |
| Crypted password / salt | Authlogic (`UserSession`) validates login; password reset flow uses `password_reset_token`. | Never sent to client; stored with **scrypt**. |
| Access tokens / JWTs | `ApplicationController#initiate_session_from_token`, API endpoints (`/api/v1/...`). | Verified with RSA/ECDSA signatures; tokens are short‑lived. |
| OTP secret | `TwoFactorAuth` module; used to generate time‑based OTPs. | Encrypted at rest (`attr_encrypted`). |
| SIS IDs / Integration IDs | Imported via SIS sync; used for cross‑system mapping (`Pseudonym#sis_user_id`). | Plain text; treated as external identifiers. |
| Submission content & attachments | `SubmissionsController`, `AttachmentsController`. | Access controlled by course enrollment; stored in S3 or local storage. |
| Conversation messages | `ConversationMessagesController`. | Private messaging; only participants can read. |
| Page views & audit logs | `PageViewsController`, `AuditLog` model. | Used for analytics & security monitoring; visible only to admins. |
| Turnitin secret / App Center token | `AccountsController` when configuring external services. | Rendered partially masked; should be encrypted (not always). |
| OAuth client secret | `OAuth::ProviderController`. | Encrypted (`encrypted_client_secret`). |
| LTI launch parameters | `Lti::LaunchesController`. | Passed to external tools; includes user email when requested. |
| Admin notification email | `AdminsController#send_notification`. | Sent via ActionMailer over TLS. |

### 3. Protection measures observed  

| Protection Technique | Applied To | Comments |
|----------------------|------------|----------|
| **Transport security** (HTTPS) | All API endpoints, web UI, email links | Enforced by Rails config (`force_ssl`). |
| **Hashing** (scrypt) | `pseudonyms.crypted_password` | Strong, adaptive hash. |
| **Encryption at rest** (`attr_encrypted`) | `pseudonyms.otp_secret`, `oauth_clients.encrypted_client_secret`, `access_tokens.encrypted_token` | AES‑256 with per‑record IV. |
| **Token masking** | `accounts.settings[:app_center_access_token]` (first 5 chars only) | Prevents full token leakage in logs/UI. |
| **Short‑lived random tokens** | `communication_channels.confirmation_code`, `password_reset_token` | Expire after minutes/hours. |
| **Access control checks** (`grants_right?`, `grants_any_right?`) | Every controller rendering JSON | Ensures only authorized users see PII. |
| **Parameter whitelisting** (`PERMITTED_SETTINGS_FOR_UPDATE`) | `AccountsController` updates | Prevents mass‑assignment of sensitive fields. |
| **Audit logging** | `audit_logs` table | Records who accessed/changed PII. |
| **CSRF protection** | Rails default (`protect_from_forgery`) | Mitigates token theft. |
| **Rate limiting / CAPTCHA** (where applicable) | Login, password reset | Reduces credential‑stuffing attacks. |
| **Partial redaction in logs** | `lograge` / custom log filters | Email addresses are often replaced with `***@example.com`. |

### 4. Gaps / Recommendations  

| Gap | Recommendation |
|-----|----------------|
| **Turnitin & App Center secrets stored in plain text** | Move to encrypted columns (`attr_encrypted`) or use Rails credentials. |
| **Email addresses in `communication_channels.path` stored plain** | Consider hashing or tokenizing for non‑auth use‑cases; ensure DB encryption at rest is enabled. |
| **Audit‑log IP addresses** | Mask or truncate IPs in logs that are exported outside the secure environment. |
| **User‑provided profile fields (address, phone) via plugins** | Enforce encryption at rest and restrict API exposure. |
| **Attachment filenames may contain PII** | Provide a sanitization step before persisting filenames; store original name in a separate encrypted column if needed. |
| **Session cookie secret rotation** | Ensure regular rotation of `secret_key_base` and enable `expire_after` for sessions. |

---

## 📦 How to Use This Catalog  

* **Data‑Protection Impact Assessments (DPIA):** Reference the table to identify which fields need a risk analysis.  
* **Compliance Mapping (GDPR, CCPA, FERPA):** Cross‑reference the “Data Element” column with legal categories (e.g., “identifiers”, “contact information”, “academic records”).  
* **Secure‑by‑Design Reviews:** Verify that each “Protection Measures” entry is still in place for the current version of Canvas; add missing encryption where gaps are noted.  
* **Logging & Monitoring:** Ensure that any logging framework respects the masking rules shown (e.g., `MASKED_EMAIL`, `MASKED_APP_CENTER_ACCESS_TOKEN`).  

---  

**End of analysis.**