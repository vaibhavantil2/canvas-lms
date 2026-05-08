# Canvas LMS – Business Features Document  

*Prepared from an analysis of the Canvas code‑base (≈16 k files, 200+ ActiveRecord models, extensive Ruby/JS front‑end, and a rich set of gems & NPM packages).*

---  

## 1. Core Business Activities  

| Activity | Description | Key Models / Controllers |
|----------|-------------|--------------------------|
| **Course Lifecycle Management** | Creation, publishing, archiving, and deletion of courses; handling term structures, sections, and cross‑listing. | `Course`, `CourseSection`, `CourseAccountAssociation`, `CoursesController`, `SectionsController` |
| **Learning Content Delivery** | Host and render rich multimedia content (HTML, PDFs, videos, LTI tools) via the Canvas Rich Content Editor (RCE). | `Attachment`, `MediaObject`, `ContentExport`, `ContentImportsController`, `RichContentEditor` (JS) |
| **Assessment & Evaluation** | Assignments, quizzes, peer reviews, rubrics, outcomes, and grading workflows. | `Assignment`, `Submission`, `Quiz`, `QuizQuestion`, `Rubric`, `Outcome`, `AssessmentsController`, `Quizzes::QuizSubmissionsController` |
| **Student Engagement & Collaboration** | Discussions, groups, conferences, messaging, and calendar events to foster interaction. | `DiscussionTopic`, `DiscussionEntry`, `Group`, `GroupMembership`, `Conversation`, `ConversationMessage`, `CalendarEvent`, `ConferencesController` |
| **Analytics & Reporting** | Real‑time dashboards, grade reports, activity logs, and compliance reporting. | `Analytics::CourseAnalytics`, `Gradebook`, `AuditLog`, `ReportsController` |
| **Compliance & Accessibility** | Support for ADA, WCAG, GDPR, and institutional policies (e.g., data retention). | `PrivacyPolicy`, `Compliance::AccessibilityChecker` |
| **Institutional Administration** | Multi‑tenant account hierarchy, SIS synchronization, role/permission management, and branding. | `Account`, `AccountDomain`, `SisImport`, `Role`, `Permission`, `Admin::AccountsController` |

---  

## 2. User‑Facing Features  

### 2.1 Courses & Navigation  
* **Course Catalog & Dashboard** – Users see enrolled courses, favorite courses, and a “to‑do” list.  
* **Modules & Pages** – Hierarchical organization of content; drag‑and‑drop ordering.  
* **Syllabus & Announcements** – Centralized communication of policies and updates.  

**Relevant code**: `Course`, `Course::ModulesController`, `PagesController`, `AnnouncementsController`, front‑end components in `@instructure/ui-*` and `canvas-rce`.

### 2.2 Assignments  
* **Creation** – Rich text, file uploads, external tools (LTI), group assignments, timed releases.  
* **Submission Types** – File upload, text entry, URL, media recording, Google Docs, Office 365.  
* **Grading** – Points, percentages, letter grades, rubric‑based scoring, speedgrader UI, peer review workflow.  
* **Turn‑itin & Plagiarism** – Optional integration via external services.  

**Models/Controllers**: `Assignment`, `Submission`, `AssignmentOverrides`, `AssignmentsController`, `SpeedGraderController`.

### 2.3 Quizzes & Exams  
* **Question Bank** – Reusable question pools, randomization, pre‑test/post‑test.  
* **Question Types** – MC, true/false, fill‑in‑the‑blank, essay, matching, numerical, formula, hotspot, LTI‑based.  
* **Timed Exams & Proctoring** – Time limits, lockdown browser, external proctoring services.  
* **Auto‑grading & Feedback** – Immediate scores, detailed explanations, manual grading for essays.  

**Models/Controllers**: `Quiz`, `QuizQuestion`, `QuizSubmission`, `Quizzes::QuizzesController`, `Quizzes::QuizSubmissionsController`.

### 2.4 Discussions & Collaboration  
* **Threaded Discussions** – Nested replies, attachments, inline media, markdown support.  
* **Group Discussions** – Private groups, moderated forums.  
* **Collaborations** – Integrated Google Docs, Office 365, and external collaboration tools.  

**Models/Controllers**: `DiscussionTopic`, `DiscussionEntry`, `DiscussionEntriesController`, `GroupsController`.

### 2.5 Gradebook & Reporting  
* **Gradebook Views** – Grid, individual student, and assignment‑centric views.  
* **Bulk Grade Upload** – CSV import, grading periods, late policies.  
* **Analytics** – Course‑level and institution‑level dashboards, outcome tracking.  

**Models/Controllers**: `Gradebook`, `GradesController`, `Analytics::CourseAnalytics`, `Reports::GradesReport`.

### 2.6 Calendar & Scheduling  
* **Unified Calendar** – Course events, assignment due dates, conference sessions, personal events.  
* **Sync** – iCal/Google Calendar export, mobile push notifications.  

**Models/Controllers**: `CalendarEvent`, `CalendarEventsController`, `Calendars::CalendarController`.

### 2.7 Messaging & Notifications  
* **Inbox** – One‑to‑one, group, and broadcast messages; conversation threading.  
* **Notifications** – Email, SMS (via integrations), in‑app alerts, push for mobile apps.  

**Models/Controllers**: `Conversation`, `ConversationMessage`, `CommunicationChannel`, `Notifications::Notification`, `InboxController`.

### 2.8 Mobile & Accessibility  
* **Responsive UI** – Built with InstUI components, React/TypeScript front‑end for modern browsers and mobile web.  
* **Native Apps** – iOS/Android wrappers using the same REST/GraphQL APIs.  
* **Accessibility** – ARIA landmarks, keyboard navigation, screen‑reader support.  

---  

## 3. Administrative Features  

| Feature | Description | Key Models / Controllers |
|---------|-------------|--------------------------|
| **Account Hierarchy** | Root account → sub‑accounts → courses; each level can have its own branding, settings, and SIS sync. | `Account`, `AccountDomain`, `Admin::AccountsController` |
| **SIS Imports** | Bulk CSV/JSON import of users, enrollments, sections, terms, and outcomes; supports incremental updates and error reporting. | `SisImport`, `SisBatch`, `SisImport::CsvImporter`, `SisImportsController` |
| **User Management** | Create/edit users, manage pseudonyms (login IDs), authentication methods, and profile data. | `User`, `Pseudonym`, `UserObserver`, `Admin::UsersController` |
| **Roles & Permissions** | Pre‑defined roles (Teacher, TA, Designer, Student, Observer) plus custom roles; fine‑grained permission matrix. | `Role`, `Permission`, `RoleOverrides`, `Admin::RolesController` |
| **Authentication** | Built‑in Authlogic, LDAP, CAS, SAML, OAuth2, and Shibboleth; supports multi‑factor via plugins. | `Login::LoginController`, `Auth::Ldap`, `Auth::Saml`, `OAuth::Provider` |
| **Branding & Themes** | Custom logos, color palettes, CSS overrides per account; supports white‑label deployments. | `BrandConfig`, `BrandConfigsController`, SCSS assets |
| **Compliance & Auditing** | GDPR data export/deletion, audit logs for admin actions, retention policies. | `AuditLog`, `DataExportsController`, `Compliance::PrivacyPolicy` |
| **Feature Flags** | Granular enable/disable of experimental UI components, beta tools, and third‑party integrations. | `FeatureFlag`, `FeatureFlagsController` |
| **Analytics Administration** | Define custom reports, schedule data extracts, configure data warehouse connections. | `Analytics::Report`, `Analytics::DataWarehouse` |

---  

## 4. Integration Points  

| Integration | Protocol / Tech | Primary Use‑Cases | Relevant Code |
|-------------|----------------|-------------------|---------------|
| **LTI (Learning Tools Interoperability)** | LTI 1.1, 1.3 (LTI‑Advantage) | Embed external tools (e.g., Turnitin, external labs); launch Canvas resources from third‑party tools. | `Lti::ToolProxy`, `Lti::LaunchesController`, `Lti::Advantage::Services` |
| **OAuth 2.0 / OpenID Connect** | OAuth 2.0, JWT | API authentication for third‑party apps, single‑sign‑on, token‑based access. | `OAuth::ProviderController`, `OAuth::Token`, `Jwt::Token` |
| **REST API** | JSON over HTTPS | CRUD operations for courses, users, enrollments, grades, files, etc. | `Api::V1::CoursesController`, `Api::V1::UsersController`, `Api::V1::EnrollmentsController` |
| **GraphQL API** | GraphQL schema, query language | Efficient data fetching for modern front‑ends and mobile apps. | `GraphQL::Schema`, `GraphQL::Types::*`, `GraphQL::Resolvers::*` |
| **SIS (Student Information System) Connectors** | CSV/JSON bulk import, webhooks | Sync of institutional rosters, grades, sections, and outcomes. | `SisImport`, `SisBatch`, `Sis::CsvImporter`, `Sis::JsonImporter` |
| **Webhooks / Event Streams** | HTTP POST, JSON payloads | Real‑time notifications to external services (e.g., analytics, CRM). | `Webhooks::SubscriptionsController`, `EventStream::Publisher` |
| **Media & File Services** | Amazon S3, Azure Blob, local storage, CloudFront CDN | Store and stream video/audio, large file uploads, transcoding. | `Attachment`, `MediaObject`, `FileStore`, `Aws::S3::Client` |
| **Third‑Party Apps Marketplace** | LTI, API keys, OAuth scopes | Installable apps (e.g., plagiarism checkers, virtual labs). | `AppCenter::AppsController`, `Marketplace::Integration` |
| **Calendar Sync** | iCal, Google Calendar API | Export/import of course calendars to personal calendars. | `CalendarExportService`, `GoogleCalendarSyncJob` |

---  

## 5. Background Jobs & Asynchronous Processing  

| Job Category | Typical Tasks | Queue / Worker | Key Classes |
|--------------|---------------|----------------|-------------|
| **Data Imports / Exports** | SIS CSV imports, course content export, grade export. | `sis_imports` (Sidekiq) | `SisImportJob`, `ContentExportJob` |
| **Media Processing** | Video/audio transcoding, thumbnail generation, virus scanning. | `media_processing` | `MediaObjectTranscodeJob`, `Attachment::VirusScanJob` |
| **Notification Delivery** | Email, push, SMS, in‑app alerts, digest generation. | `notifications` | `NotificationDeliveryJob`, `DelayedMessageJob` |
| **Analytics & Reporting** | Aggregating usage stats, outcome calculations, gradebook snapshots. | `analytics` | `Analytics::CourseAnalyticsJob`, `OutcomeCalculationJob` |
| **Cache Warm‑up / Pre‑generation** | Pre‑rendering of page fragments, pre‑computing LTI launch tokens. | `default` | `CacheWarmupJob`, `Lti::TokenRefreshJob` |
| **Maintenance & Housekeeping** | Soft‑delete purges, audit log rotation, expired session cleanup. | `maintenance` | `PurgeDeletedRecordsJob`, `SessionCleanupJob` |
| **External Service Calls** | LTI launches, OAuth token refresh, external grading services. | `external` | `Lti::LaunchJob`, `OAuth::RefreshTokenJob` |

*Implementation details*: Canvas uses **Sidekiq** (or the legacy **Delayed::Job**) for most background processing. Jobs are defined under `app/jobs/` and are enqueued via `Canvas::LiveEvents` or direct `perform_async`. Queue priorities are configured in `config/sidekiq.yml`.

---  

## 6. Domain Model Overview  

Below is a high‑level map of the most important entities and their relationships. (Only a subset is shown; the full codebase contains >200 models.)

```
Account ──< has many >── SubAccount
   │
   └─< has many >── Course ──< has many >── CourseSection
          │                     │
          ├─< has many >── Enrollment (User ↔ CourseSection)
          │                     │
          ├─< has many >── Assignment ──< has many >── Submission
          │                     │
          ├─< has many >── Quiz ──< has many >── QuizQuestion
          │                     │
          ├─< has many >── DiscussionTopic ──< has many >── DiscussionEntry
          │
          ├─< has many >── Group ──< has many >── GroupMembership
          │
          ├─< has many >── CalendarEvent
          │
          ├─< has many >── Attachment / MediaObject
          │
          └─< has many >── Outcome / Rubric
```

### Key Model Groups  

| Group | Representative Models | Primary Responsibilities |
|-------|-----------------------|--------------------------|
| **Identity & Auth** | `User`, `Pseudonym`, `CommunicationChannel`, `AuthenticationProvider` | Store personal data, login credentials, contact methods, SSO integration. |
| **Course Structure** | `Course`, `CourseSection`, `CourseAccountAssociation`, `Module`, `Page`, `WikiPage` | Organize curriculum, sections, and modular content. |
| **Enrollment & Roles** | `Enrollment`, `EnrollmentState`, `Role`, `Permission`, `RoleOverride` | Map users to courses/sections with specific permissions. |
| **Assessment** | `Assignment`, `Submission`, `Rubric`, `Outcome`, `Quiz`, `QuizSubmission`, `QuizQuestion`, `AssessmentRequest` | Define tasks, collect work, grade, and track learning outcomes. |
| **Collaboration** | `DiscussionTopic`, `DiscussionEntry`, `Group`, `GroupMembership`, `Conversation`, `ConversationMessage` | Enable threaded discussions, group work, and private messaging. |
| **Calendar & Events** | `CalendarEvent`, `Conference`, `Scheduler` | Schedule due dates, live sessions, and personal events. |
| **File & Media** | `Attachment`, `MediaObject`, `FileUpload`, `S3Bucket` | Store and serve uploaded files, videos, audio, and external links. |
| **External Integration** | `Lti::ToolProxy`, `Lti::Launch`, `OAuth::AccessToken`, `SisImport`, `SisBatch` | Connect to LTI tools, OAuth clients, and SIS data feeds. |
| **Analytics & Reporting** | `Analytics::CourseAnalytics`, `OutcomeResult`, `Gradebook`, `AuditLog` | Capture usage, performance, and compliance data. |
| **Background Processing** | `Delayed::Job`, `Sidekiq::Job`, `Canvas::LiveEvents` | Queue and execute asynchronous tasks. |

### Relationships Highlights  

* **`User` ↔ `Pseudonym`** – A user can have multiple login identifiers (e.g., email, SIS ID).  
* **`Enrollment`** – Joins `User`, `CourseSection`, and `Role`; includes state machine (`active`, `invited`, `completed`).  
* **`Assignment` ↔ `Rubric`** – Optional rubric attached for scoring.  
* **`Quiz` ↔ `QuizQuestion`** – Polymorphic question types (`QuizQuestion::MultipleChoice`, `QuizQuestion::Essay`, etc.).  
* **`DiscussionTopic` ↔ `DiscussionEntry`** – Threaded hierarchy; entries can have attachments.  
* **`Group` ↔ `GroupMembership`** – Users can belong to multiple groups across courses.  
* **`Conversation` ↔ `ConversationMessage`** – Private messaging; supports participants, attachments, and read receipts.  
* **`CalendarEvent`** – Polymorphic owner (Course, Assignment, Quiz, Group, etc.) and can be exported via iCal.  

---  

## 7. Summary  

Canvas LMS provides a **full‑stack educational platform** that supports:

* **End‑to‑end course delivery** (creation → content → assessment → grading).  
* **Rich, accessible user experiences** powered by React/InstUI components and a robust Ruby on Rails backend.  
* **Enterprise‑grade administration** with multi‑tenant accounts, SIS synchronization, granular role‑based access control, and compliance tooling.  
* **Extensive integration ecosystem** (LTI, OAuth, REST/GraphQL APIs, webhooks) enabling institutions to embed Canvas within broader campus IT landscapes.  
* **Scalable asynchronous processing** via Sidekiq/DelayedJob for imports, media handling, notifications, and analytics.  

The domain model, with its >200 interconnected ActiveRecord classes, reflects the complexity of modern higher‑education workflows while remaining extensible for custom extensions and third‑party apps.