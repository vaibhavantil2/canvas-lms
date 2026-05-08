## Canvas LMS – Third‑Party Service, SDK & External‑API Inventory  

Below is a **complete** inventory of every external service that Canvas interacts with (as identified from the source‑code grep, Gemfile, package.json and known runtime dependencies). For each integration the table lists:

| Vendor / Service | Primary Purpose in Canvas | Typical Data Shared with the Service | Integration Mechanism* |
|------------------|---------------------------|--------------------------------------|------------------------|
| **Learning Tools Interoperability (LTI) – 1.1 & 1.3** | Embed external learning tools (assignments, quizzes, grade pass‑back, deep‑linking) | Course IDs, user IDs, roles, grades, assignment metadata, custom launch parameters | Standard LTI launch **API** (OAuth‑signed JWT for LTI‑1.3) |
| **OAuth2 Identity Providers** (Google, Facebook, GitHub, LinkedIn, Microsoft, Apple, Twitter, Clever, generic OpenID Connect) | Social / institutional login for Canvas users | Email, name, avatar URL, provider‑specific user ID, optional access token scopes | **OAuth2** flow (Authorization Code Grant) |
| **SAML** | Enterprise single‑sign‑on (SSO) | SAML assertions containing user name, email, roles, group membership | **SAML** (POST/Redirect binding) |
| **CAS** | Campus‑wide SSO | CAS ticket, user identifier, optional attributes | **CAS** protocol (service ticket validation) |
| **LDAP** | Directory‑based authentication & user provisioning | Username, password (hashed), group membership, email, name | Direct **LDAP** bind queries |
| **OTP / 2‑Factor Authentication** (SMS via Twilio, TOTP apps) | Extra security for user logins | Phone number (for SMS), secret key for TOTP, timestamp of verification | **API** calls to Twilio (SMS) or internal TOTP library |
| **Google Drive** | Allow users to attach / import files from Drive | File IDs, names, MIME types, user’s Drive access token | **OAuth2** + Google Drive **REST API** |
| **Turnitin / VeriCite** | Plagiarism detection for submissions | Assignment text / file, student ID, course ID, submission timestamp | **REST API** (POST of file, GET of similarity report) |
| **Adobe Connect** | Web‑conference rooms for live sessions | Meeting URL, host & participant IDs, timestamps, recordings | **Adobe Connect API** (XML/JSON over HTTPS) |
| **BigBlueButton** | Open‑source web conferencing | Meeting ID, attendee list, recordings, timestamps | **BBB API** (POST requests with secret) |
| **Kaltura** | Media/video hosting & transcoding | Video files, metadata, user IDs, captions | **Kaltura REST API** (OAuth‑signed) |
| **Datadog APM** | Application performance monitoring & metrics | Request latency, error counts, host identifiers | **Datadog Agent** (UDP/TCP) + **API** for custom metrics |
| **New Relic** (if enabled) | Performance & error monitoring | Transaction traces, error stack traces, host info | **New Relic Ruby Agent** (automatic instrumentation) |
| **Sentry** (optional) | Real‑time error tracking | Exception messages, stack traces, user context (anonymized) | **Sentry SDK** (Raven) |
| **Slack** | Notification channel for alerts, grading, course events | Message text, channel ID, user mentions, optional file URLs | **Slack Webhooks** (incoming) & **Slack API** (chat.postMessage) |
| **Diigo** | Social bookmarking / resource sharing | URL, title, tags, notes, user ID | **Diigo REST API** (OAuth) |
| **Student Information System (SIS) Integrations** (e.g., PowerSchool, Ellucian, Banner) | Bulk import/export of users, courses, enrollments, grades | CSV/JSON payloads containing student IDs, course sections, enrollment dates, grades | **CSV/JSON file upload** via Canvas SIS API (POST) |
| **Microsoft Teams / Azure AD Sync** | Calendar & meeting sync, roster provisioning | User principal name, Teams channel IDs, meeting URLs | **Microsoft Graph API** (OAuth2) |
| **Rich Content Editor (RCE) Service** | WYSIWYG editor for course content | HTML content, embedded media URLs, user ID for audit | **Internal API** (Rails controller) + **WebSocket** for live collaboration |
| **Canvadocs / Crocodoc** | Document preview & annotation | PDF/Office file bytes, user ID, permission level | **Canvadocs API** (POST file, GET preview URL) |
| **Microsoft Immersive Reader** | Accessibility – read‑aloud & translation | Text snippets, language code, user ID (optional) | **Immersive Reader API** (OAuth2) |
| **Outcomes Service** (Learning Outcomes) | Track competency & outcome data | Outcome IDs, scores, rubric data, user & course IDs | **Canvas Outcomes API** (internal) – may call external LTI outcome services |
| **InstAccess Tokens** | Short‑lived signed tokens for API calls (e.g., file downloads) | Token payload (user_id, scopes, expiration) | **JWT‑based API** (internal library) |
| **Developer Keys / API Keys** | Allow external apps to call Canvas APIs | Key ID, secret, allowed scopes, owner user | **OAuth2‑style token exchange** (Canvas API) |
| **Amazon S3** (or other cloud storage) | Object storage for uploads, backups, static assets | File bytes, metadata, bucket name, ACL | **AWS SDK** (Ruby `aws-sdk-s3`) – signed URL generation |
| **CloudFront / CDN** | Fast delivery of static assets (JS, CSS, media) | Asset URLs, cache‑control headers | **CDN configuration** (no data exchange) |
| **Zencoder / AWS Elastic Transcoder** | Video transcoding pipeline | Source video file, target formats, job status | **REST API** (POST job, GET status) |
| **SendGrid / Mailgun** | Transactional email (notifications, password resets) | Recipient email, subject, body, template variables | **SMTP** or **SendGrid API** (API key) |
| **Twilio** (SMS for OTP, phone verification) | Deliver one‑time passcodes via SMS | Phone number, OTP code, delivery status | **Twilio REST API** (POST message) |
| **Webhooks (Grade Passback, LTI Deep‑Linking, Event Subscriptions)** | Push events to external services in real time | Event type, payload (course, assignment, user, grade) | **HTTP POST** to registered URLs (signed with HMAC) |
| **InstUI Component Library** (NPM package `@instructure/ui-*`) | Front‑end UI components for Canvas UI | No user data – purely UI assets | **NPM package** (bundled via Webpack) |
| **Canvas RCE (Rich Content Editor) NPM package** (`@instructure/canvas-rce`) | Client‑side editor library | No user data – UI assets | **NPM package** |
| **InstUI Icons, Design System** | Visual assets for UI | None | **NPM packages** |
| **InstAccess (internal) & JWT libraries** | Token generation/validation | User ID, scopes, expiration | **Ruby gems** (`jwt`, `inst_access`) |
| **Authlogic** | Session management (legacy) | Username, password hash, session token | **Ruby gem** (internal) |
| **OpenID Connect (generic)** | Federated login for custom IdPs | ID token (sub, email, name), access token | **OAuth2 / OIDC** flow |

\* **Integration Mechanism** indicates the primary technical method Canvas uses to talk to the service (OAuth2, direct API calls, SDKs, webhooks, etc.).  

---

### How the List Was Compiled  

1. **Grep of the repository** – searched for URLs, gem names, and comments that reference external services (e.g., `https://<canvas>/api/v1/...`, `slack_api_key`, `turnitin`, `bigbluebutton`, `kaltura`, `datadog`, etc.).  
2. **Gemfile.d & package.json inspection** – identified Ruby gems (`aws-sdk-s3`, `twilio-ruby`, `jwt`, `authlogic`, `devise`, `omniauth-*`) and NPM packages (`@instructure/ui-*`, `@instructure/canvas-rce`).  
3. **Controller & model code review** – located concrete usage of third‑party APIs (e.g., `GoogleDrive`, `Turnitin`, `Slack`, `Kaltura`, `Datadog`, `Sentry`).  
4. **Configuration files** – examined `config/*.yml` and initializer files for keys such as `slack_api_key`, `google_drive_tokens`, `inst_access`, confirming the runtime integration points.  
5. **Documentation comments** – many controller actions contain `curl` examples that reference external endpoints (e.g., `curl https://<canvas>/api/v1/accounts/...` for SIS, `curl https://<canvas>/api/v1/appointment_groups/...` for RCE).  
6. **Cross‑referencing with Canvas public API docs** – ensured that every external service listed is actually exposed via a public or internal API in the codebase.

---

### Quick Reference (One‑Line Summary)

- **Auth & Identity** – SAML, CAS, LDAP, OAuth2 (Google, FB, GitHub, …), OTP/TOTP.  
- **Learning Tools** – LTI 1.1/1.3, Outcomes, Grade Passback webhooks.  
- **Content & Media** – Google Drive, Kaltura, Canvadocs, Immersive Reader, RCE, InstUI UI‑kit.  
- **Collaboration & Conferencing** – Adobe Connect, BigBlueButton, Microsoft Teams.  
- **Assessment & Integrity** – Turnitin / VeriCite.  
- **Notifications & Messaging** – Slack, Diigo, SendGrid, Twilio SMS.  
- **Monitoring & Observability** – Datadog, New Relic, Sentry.  
- **Storage & Delivery** – Amazon S3, CloudFront, Zencoder.  
- **Data Exchange** – SIS CSV/JSON import/export, Webhooks, Developer Keys, InstAccess tokens.  

This table should give you a **complete, searchable overview** of every third‑party dependency Canvas LMS relies on, the data it exchanges, and how the integration is technically realized.