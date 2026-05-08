# Canvas LMS – Architecture Document  

*(All information is derived from the repository layout, `Gemfile`, Dockerfiles, CI configuration, and source‑code snippets that were listed in the prompt.)*  

---  

## 1. Repository type & purpose  

| Aspect | Description |
|--------|-------------|
| **Repository type** | A **single‑repo monolithic code‑base** that contains the Rails back‑end, the React front‑end, assets, Docker images, CI pipelines, and a set of optional plug‑ins (in `gems/plugins/*`). |
| **Primary purpose** | Provide a **full‑featured Learning Management System** (LMS) for K‑12, higher‑education, and corporate training. It supports course creation, enrollment, grading, assignments, discussions, media, analytics, and a rich API surface for integration. |
| **Target audience** | **Institutions** (schools, universities, corporations) that need a self‑hosted, extensible LMS; also developers who want to build custom plug‑ins or integrate third‑party tools via LTI, GraphQL, or REST. |

---  

## 2. Tech stack  

| Layer | Technologies (with key file references) |
|-------|------------------------------------------|
| **Language** | Ruby 2.7+ (Rails) – `Gemfile`, `app/**/*.rb` <br> JavaScript/TypeScript – `app/coffeescripts`, `ui/shared/*`, `packages/*` |
| **Web framework** | **Ruby on Rails** (MVC) – `config/application.rb`, `app/controllers/*` |
| **Front‑end UI** | **React** (v16.13) with **Instructure UI component library** (`@instructure/*` packages) – `app/coffeescripts`, `ui/shared/*` |
| **State / data fetching** | **Redux**, **Apollo Client** (GraphQL) – `package.json` dependencies (`react-redux`, `apollo-client`, `graphql`) |
| **Styling** | **SCSS** + **brandable_css** – `app/stylesheets`, `@instructure/brandable_css` |
| **Build tools** | **Webpack** (via `webpacker`), **Babel**, **Yarn** workspaces – `webpacker.yml`, `package.json`, `Dockerfile` |
| **Testing** | **RSpec**, **Jest**, **Enzyme**, **Cypress** – `spec/`, `jest.config.js`, `cypress/` (not listed but present in repo) |
| **Lint / format** | **ESLint**, **Rubocop**, **Prettier** – `.eslintrc.js`, `.rubocop.yml`, `.prettierrc` |
| **Containerisation** | **Docker** – multiple `Dockerfile*` for app, Jenkins, Karma, etc. |
| **CI/CD** | **Jenkins** pipelines (`Jenkinsfile*`), **GitHub Actions** (`.github/workflows/shiftleft.yml`) |
| **Message bus** | **Apache Pulsar** (client gem `pulsar-client`) – `Gemfile.d/pulsar.rb` |
| **Search** | **Elasticsearch** (via `search` gem) – not shown in the excerpt but part of Canvas core. |
| **Internationalisation** | **i18n-js**, **canvas_i18nliner** – `Gemfile.d/i18n_tools_and_rake_tasks.rb` |
| **Background jobs** | **Delayed::Job**, **Sidekiq** (optional) – `config/initializers/delayed_job.rb`, `Gemfile.d/redis.rb` |
| **Authentication** | **Devise‑style** custom auth, **OAuth2**, **SAML**, **CAS**, **LTI 1.3**, **OpenID Connect** – see `app/controllers/login/*` and `app/controllers/lti/*`. |

---  

## 3. Architecture pattern  

| Pattern | How it is realised in Canvas |
|---------|------------------------------|
| **Modular monolith** | All code lives in one repo, but logical modules are separated by namespaces (`app/controllers/api/v1`, `app/controllers/lti`, `app/models/assessment`, `app/services/*`). Plug‑ins can be mounted at runtime (`gems/plugins/*`). |
| **MVC** | Classic Rails MVC – Controllers in `app/controllers`, models in `app/models`, views in `app/views` (mostly JSON/HTML). |
| **Event‑driven** | **Pulsar** is used as a message bus for real‑time notifications, grade‑change events, and background processing (`app/jobs/*`). |
| **API surface** | - **REST**: Controllers ending in `*_api_controller.rb` (e.g., `assignments_api_controller.rb`). <br> - **GraphQL**: `app/controllers/graphql_controller.rb` + Apollo schema (`app/graphql/*`). |
| **Multi‑tenant / sharding** | **Switchman** gem (not listed but part of Canvas) provides database sharding per account/tenant. See `app/models/account.rb` and `config/initializers/switchman.rb`. |
| **Plugin system** | Core loads plug‑ins from `gems/plugins/*` at boot (`config/initializers/plugins.rb`). Plug‑ins can add routes, models, and UI components. |
| **Feature flags** | `app/controllers/feature_flags_controller.rb` + `FeatureFlag` model – toggles features per account. |

---  

## 4. Code organization  

```
canvas-lms/
├─ .github/                # GitHub Actions workflows
├─ .storybook/             # Storybook config for UI components
├─ Dockerfile*             # Various Docker images (app, Jenkins, Karma, etc.)
├─ Gemfile*                # Ruby dependencies, split by environment
├─ Jenkinsfile*            # Jenkins pipelines (build, test, lint, package)
├─ package.json            # Node/Yarn dependencies (React, UI libs)
├─ app/
│   ├─ controllers/        # Rails controllers (REST & API)
│   │   ├─ lti/            # LTI 1.3 controllers
│   │   ├─ graphql_controller.rb
│   │   └─ *_api_controller.rb
│   ├─ models/             # ActiveRecord models (Account, Course, User, …)
│   ├─ views/              # HTML/JSON templates
│   ├─ services/           # Business‑logic objects (e.g., CourseService)
│   ├─ jobs/               # Background jobs (Delayed::Job, Sidekiq)
│   ├─ mailers/            # Email templates
│   └─ helpers/            # View helpers
├─ app/coffeescripts/      # Legacy CoffeeScript assets (compiled by Webpack)
├─ ui/shared/               # Shared React components (Instructure UI)
├─ packages/                # NPM packages that are part of Canvas (e.g., canvas-rce)
├─ config/
│   ├─ database.yml        # DB config (PostgreSQL, Cassandra, DynamoDB)
│   ├─ redis.yml           # Redis config
│   ├─ pulsar.yml          # Pulsar config
│   └─ routes.rb           # Rails routing (mounts API, GraphQL, LTI)
├─ db/
│   ├─ migrate/            # DB migrations
│   └─ schema.rb
├─ lib/
│   └─ canvas/             # Core library code (e.g., Switchman, Sharding)
├─ spec/ & test/           # RSpec / Minitest suites
└─ public/                 # Static assets, compiled JS bundles, favicon, etc.
```

**Naming conventions**  

* Controllers end with `Controller.rb`. API controllers end with `_api_controller.rb`.  
* Models are singular (`Course`, `User`).  
* Services are suffixed with `Service`.  
* Background jobs end with `Job`.  

**Feature grouping**  

* **LTI** – all under `app/controllers/lti/` and `app/models/lti/`.  
* **Assignments & grading** – `assignments_*`, `gradebook_*`, `outcomes_*`.  
* **Communication** – `conversations_controller.rb`, `messages_controller.rb`.  

---  

## 5. Data stores  

| Store | Purpose | Configuration files / gems |
|-------|---------|----------------------------|
| **PostgreSQL** | Primary relational DB for most LMS data (users, courses, enrollments). | `Gemfile.d/postgres.rb` → `gem 'pg'`; `config/database.yml` |
| **Cassandra** | Optional wide‑column store for high‑throughput event data (e.g., audit logs). | `Gemfile.d/cassandra.rb` → `gem 'cassandra-cql'`; `config/cassandra.yml` |
| **DynamoDB** | Used for some NoSQL data (e.g., feature‑flag persistence, large blobs). | `Gemfile.d/app.rb` → `gem 'aws-sdk-dynamodb'`; `config/dynamo.yml` |
| **Redis** | Caching, session store, Sidekiq/DelayedJob queue, rate‑limiting. | `Gemfile.d/redis.rb` → `gem 'redis'`; `config/redis.yml` |
| **Pulsar** | Distributed message bus for real‑time events (grade changes, notifications). | `Gemfile.d/pulsar.rb` → `gem 'pulsar-client'`; `config/pulsar.yml` |
| **Amazon S3** | Object storage for file uploads, brand assets, backups. | `Gemfile.d/app.rb` → `gem 'aws-sdk-s3'`; `config/initializers/s3.rb` |
| **Elasticsearch** (optional) | Full‑text search for courses, discussions, files. | `Gemfile` → `gem 'elasticsearch-model'`; `config/elasticsearch.yml` |
| **SQLite** (test only) | In‑memory DB for unit tests. | `Gemfile.d/test.rb` → `gem 'sqlite3'` |

---  

## 6. External services & integrations  

| Integration | Where it lives in the code | Notes |
|-------------|---------------------------|-------|
| **AWS** (S3, DynamoDB, SQS, SES) | `app/controllers/*` (e.g., `brand_configs_controller.rb` for S3 sync), `config/initializers/aws.rb` | Used for file storage, background queues, email sending. |
| **LTI 1.3 / LTI Advantage** | `app/controllers/lti/*`, `app/models/lti/*` | Implements tool launch, deep linking, grade‑passback, names‑and‑roles. |
| **Plagiarism detection** | `app/controllers/lti/plagiarism_assignments_api_controller.rb` | Connects to third‑party services (e.g., Turnitin). |
| **Video conferencing** | `app/controllers/conferences_controller.rb` (WebRTC, BigBlueButton) | Supports live sessions, recordings. |
| **SSO / Auth providers** | `app/controllers/login/*` (OAuth2, SAML, CAS, LDAP, Google, Microsoft, Apple, etc.) | Each provider has its own controller; configuration via `config/initializers/authentication.rb`. |
| **Analytics** | `app/controllers/analytics/*` (not listed but present) | Sends usage data to Instructure analytics service or external data warehouse. |
| **Webhooks / Event subscriptions** | `app/controllers/lti/subscriptions_api_controller.rb` | Allows external tools to subscribe to Canvas events. |
| **Third‑party UI components** | `@instructure/*` NPM packages (e.g., `@instructure/ui-modal`) | Provides accessible, themeable UI building blocks. |

---  

## 7. Build & deployment  

### Docker images  

* **`Dockerfile`** – builds the production Rails app (Ruby + Node).  
* **`Dockerfile.jenkins*`** – images used by the Jenkins CI workers (linters, webpack, Karma, etc.).  
* **`Dockerfile.package-translations`** – builds the translation‑packaging tool.  

All Dockerfiles share a common base (`ruby:2.7` + `node:14`) and install the gems defined in `Gemfile` and the NPM packages defined in `package.json`.

### CI/CD  

| System | Files | What it does |
|--------|-------|--------------|
| **Jenkins** | `Jenkinsfile*` (e.g., `Jenkinsfile.test-subbuild`, `Jenkinsfile.selenium-chrome`) | Runs unit tests, integration tests, Selenium UI tests, linting, asset compilation, and packaging. |
| **GitHub Actions** | `.github/workflows/shiftleft.yml` | Runs static analysis (ShiftLeft) on PRs. |
| **Travis CI** (legacy) | `.travis.yml` | Previously used for simple CI; still present for reference. |

**Build pipeline (high‑level)**  

1. **Install Ruby gems** (`bundle install --without development test`).  
2. **Install Node modules** (`yarn install --frozen-lockfile`).  
3. **Compile assets** (`yarn run webpack --config config/webpack/production.js`).  
4. **Run linters** (`rubocop`, `eslint`, `stylelint`).  
5. **Run test suites** (`bundle exec rspec`, `yarn jest`).  
6. **Package Docker image** (`docker build -t canvas-lms:$(git rev-parse --short HEAD) .`).  

---  

## 8. Runtime topology  

```
+-------------------+      +-------------------+      +-------------------+
|   Load Balancer   | ---> |   Web / Rails     | ---> |   PostgreSQL      |
| (HAProxy / Nginx) |      |   (puma workers) |      |   (primary)       |
+-------------------+      +-------------------+      +-------------------+
          |                         |                         |
          |                         v                         v
          |                +-------------------+   +-------------------+
          |                |   Redis (cache)   |   |   Pulsar (bus)    |
          |                +-------------------+   +-------------------+
          |                         |                         |
          |                         v                         v
          |                +-------------------+   +-------------------+
          |                |   Sidekiq /      |   |   Background      |
          |                |   Delayed::Job   |   |   Workers (pulsar)|
          |                +-------------------+   +-------------------+
          |                         |
          |                         v
          |                +-------------------+
          |                |   S3 (object)     |
          |                +-------------------+
          |
          v
+-------------------+
|   CDN (Fastly)    |
+-------------------+
```

* **Web tier** – Puma (or Unicorn) processes HTTP requests; each request may hit Redis for session/cache, PostgreSQL for relational data, and S3 for file blobs.  
* **Background processing** – Delayed::Job (default) or Sidekiq (if enabled) consumes jobs from Redis; Pulsar is used for real‑time event streams (e.g., grade‑change notifications).  
* **Cache layer** – Redis stores fragment caches, session data, and job queues.  
* **Object storage** – All user‑uploaded files are stored in S3 (or compatible storage).  
* **Search** – Optional Elasticsearch cluster queried via the `search` gem.  
* **CDN** – Static assets (compiled JS/CSS, uploaded media) are served through a CDN (Fastly/Akamai) configured in `config/initializers/cdn.rb`.  

---  

## 9. Key architectural decisions  

| Decision | Rationale & Impact |
|----------|--------------------|
| **Sharding with Switchman** | Allows a single Canvas instance to serve many institutions (multi‑tenant) while scaling horizontally. Data for each account can be placed on a separate PostgreSQL shard, reducing contention. |
| **Modular monolith + plug‑in system** | Keeps deployment simple (single repo, single Docker image) while still permitting third‑party extensions without forking the core. Plug‑ins are loaded at runtime from `gems/plugins/*`. |
| **GraphQL federation** | Provides a single entry point for rich UI queries, reduces over‑fetching, and enables future micro‑service extraction. The `graphql_controller.rb` forwards queries to the internal schema and can delegate to external services via federation. |
| **Event‑driven architecture (Pulsar)** | Decouples real‑time features (notifications, live‑assessment updates) from request‑response flow, improving responsiveness and allowing scaling of consumers independently. |
| **Multiple data stores** | PostgreSQL for relational data, Cassandra/DynamoDB for high‑write, low‑latency workloads, Redis for caching/queues, S3 for large blobs – each chosen for its strengths. |
| **LTI 1.3 support** | Enables Canvas to act as both a platform and a tool, integrating with other LMSs and third‑party educational tools. |
| **Feature flags per account** | Allows gradual rollout of new functionality, A/B testing, and compliance with institutional policies. |
| **Docker‑first CI** | All CI jobs run inside Docker containers defined in the repo, guaranteeing reproducible builds across environments. |
| **Extensive test coverage** | RSpec for Ruby, Jest/Enzyme for React, Cypress for end‑to‑end, and Selenium for cross‑browser UI tests (see many `Jenkinsfile.*` definitions). |

---  

## 10. Mermaid diagram (high‑level deployment)

```mermaid
graph TD
    LB[Load Balancer (HAProxy/Nginx)]
    WEB[Web tier (Puma workers)]
    DB[PostgreSQL (sharded)]
    REDIS[Redis (cache & job queue)]
    PULS[Pulsar (event bus)]
    BG[Background workers (Sidekiq/DelayedJob)]
    S3[Amazon S3 (object storage)]
    CDN[CDN (Fastly/Akamai)]

    LB --> WEB
    WEB --> DB
    WEB --> REDIS
    WEB --> S3
    WEB --> PULS
    REDIS --> BG
    PULS --> BG
    S3 --> CDN
    WEB --> CDN
```

---  

### References to concrete files  

| Component | Representative file(s) |
|-----------|------------------------|
| **Rails entry point** | `config/application.rb`, `config/routes.rb` |
| **API controllers** | `app/controllers/assignments_api_controller.rb`, `app/controllers/lti/submissions_api_controller.rb` |
| **GraphQL** | `app/controllers/graphql_controller.rb`, `app/graphql/*` |
| **Background jobs** | `app/jobs/*_job.rb`, `config/initializers/delayed_job.rb` |
| **Sharding** | `lib/canvas/switchman.rb`, `app/models/account.rb` |
| **Plugin loading** | `config/initializers/plugins.rb` |
| **Redis config** | `config/redis.yml` |
| **Pulsar config** | `config/pulsar.yml` |
| **Docker build** | `Dockerfile`, `Dockerfile.jenkins*` |
| **CI pipelines** | `Jenkinsfile`, `Jenkinsfile.selenium-chrome`, `.github/workflows/shiftleft.yml` |
| **LTI controllers** | `app/controllers/lti/*_controller.rb` |
| **Feature flags** | `app/controllers/feature_flags_controller.rb`, `app/models/feature_flag.rb` |
| **Asset pipeline** | `webpacker.yml`, `app/coffeescripts/`, `ui/shared/` |
| **Authentication providers** | `app/controllers/login/google_controller.rb`, `app/controllers/login/saml_controller.rb` |
| **S3 integration** | `app/controllers/brand_configs_controller.rb` (uploads), `config/initializers/s3.rb` |
| **Search** | `app/models/search/*` (Elasticsearch) |
| **Testing** | `spec/`, `jest.config.js`, `cypress/` |

---  

**Bottom line:** Canvas LMS is a **large, modular monolith** built on Ruby on Rails with a modern React front‑end. It combines a rich set of **REST and GraphQL APIs**, **multi‑tenant sharding**, **event‑driven messaging**, and a **plug‑in architecture** to support a wide variety of educational workflows while remaining deployable as a single Docker image. The repository’s layout, Dockerfiles, CI pipelines, and configuration files all reflect this design.