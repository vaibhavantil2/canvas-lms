# Canvas LMS – Architecture Overview  

*Repository:* https://github.com/instructure/canvas-lms  
*License:* AGPL‑v3  
*Primary purpose:* A full‑featured, open‑source Learning Management System (LMS) used by K‑12 schools, higher‑education institutions, and corporate training programs.

---  

## 1. Repository Type & Purpose  

| Aspect | Description |
|--------|-------------|
| **Repository type** | Open‑source application source code (monorepo) |
| **Primary purpose** | Deliver a modern, extensible LMS that supports courses, assignments, quizzes, grading, communication, analytics, and integrations with external tools (LTI, SIS, video, etc.) |
| **Target audience** | Educational institutions, instructors, students, and developers who want to customize or extend the platform |

---  

## 2. Tech Stack  

### 2.1 Languages  

| Language | Files (approx.) | Typical use |
|----------|----------------|-------------|
| Ruby | 5 731 (`.rb`) | Backend business logic, ActiveRecord models, controllers, services |
| JavaScript | 4 944 (`.js`) | Front‑end UI, client‑side behavior, webpack bundles |
| TypeScript | 44 (`.ts`/`.tsx`) | Newer UI components, typed front‑end code |
| CoffeeScript | 220 (`.coffee`) | Legacy front‑end scripts (being phased out) |
| Handlebars | 305 (`.hbs`) | Template rendering for dynamic UI fragments |
| ERB | 893 (`.erb`) | Server‑side view templates (HTML + Ruby) |
| SCSS | 398 (`.scss`) | Styling/theme assets |
| JSON | 1 135 (`.json`) | Configuration, API contracts, static data |
| YAML | 133 (`.yml/.yaml`) | Configuration (Rails, CI, Docker, Kubernetes) |
| Markdown | 159 (`.md`) | Documentation, README, guides |
| Shell | 128 (`.sh`) | Build scripts, Docker entrypoints, CI helpers |

### 2.2 Frameworks & Core Libraries  

| Category | Key Components |
|----------|----------------|
| **Ruby / Rails** | `rails` (MVC web framework), `activerecord` (ORM), `actioncable` (WebSockets), `actionmailbox`, `actionmailbox`, `activejob` |
| **Authentication** | `authlogic` (session handling), `devise`‑style custom modules, `json_token`, `encrypted_cookie_store` |
| **Authorization** | Role‑based checks in models/controllers, `cancancan`‑style policies (custom implementation) |
| **Background jobs** | `sidekiq` (Redis‑backed workers) |
| **Front‑end UI** | `@instructure/ui-*` (InstUI component library), `@instructure/canvas-rce` (Rich Content Editor), `tinymce`, `react` (via TypeScript/JSX), `webpack` (asset bundling) |
| **Testing** | `rspec`, `minitest`, `capybara`, `selenium-webdriver`, `karma`, `jest` |
| **API** | `jsonapi-serializer`, `rack-cors`, `jwt` |
| **Data stores** | `pg` (PostgreSQL), `redis`, `cassandra-driver`, `aws-sdk-dynamodb` |
| **Message bus** | `pulsar-client` (Apache Pulsar) |
| **Configuration / Secrets** | `vault` client libraries, `consul` for service discovery |
| **CI/CD** | Jenkins, GitHub Actions (ShiftLeft static analysis) |
| **Containerisation** | Docker, Docker‑Compose, multiple Dockerfiles (app, CI, webpack, linters, etc.) |

---  

## 3. Architecture Pattern  

| Aspect | Detail |
|--------|--------|
| **Overall pattern** | **Monolithic** application that runs as a single process (Rails server) but is modularised internally. |
| **Design style** | **Model‑View‑Controller (MVC)** – classic Rails separation of concerns. |
| **Service boundaries** | Logical services (e.g., **Assignments**, **Quizzes**, **Conversations**, **Analytics**) are implemented as separate namespaces/modules within the monolith, each with its own models, controllers, and services. |
| **Extensibility** | Plugin system via **Rails Engines** and **Canvas plugins** (LTI, custom JavaScript, API extensions). |
| **Micro‑service aspirations** | Some components (e.g., **RCE API**, **Canvas Data Export**, **WebSocket notifications**) are deployed as separate services in production, but they still share the same codebase. |
| **Scalability** | Horizontal scaling achieved by running multiple Rails/Sidekiq instances behind a load balancer; state is externalised to PostgreSQL, Redis, Cassandra, DynamoDB, and Pulsar. |

---  

## 4. Code Organization  

```
canvas-lms/
├─ app/
│   ├─ controllers/          # MVC controllers
│   ├─ models/               # 200+ ActiveRecord models
│   ├─ views/                # ERB/Handlebars templates
│   ├─ helpers/
│   ├─ jobs/                 # Sidekiq workers
│   └─ services/             # Business‑logic service objects
├─ config/
│   ├─ environments/         # dev / test / production configs
│   ├─ initializers/         # gem & library setup
│   ├─ locales/
│   └─ routes.rb
├─ db/
│   ├─ migrate/              # DB migrations
│   └─ seeds.rb
├─ lib/
│   ├─ canvas/               # Core Canvas libraries (auth, api, utils)
│   └─ tasks/                # Rake tasks
├─ spec/ & test/             # RSpec / Minitest suites
├─ public/
│   └─ assets/               # Pre‑compiled JS/CSS
├─ vendor/
│   └─ assets/               # Third‑party front‑end libs (tinymce, etc.)
├─ Gemfile.d/                # Split Gemfiles for optional components
├─ package.json & yarn.lock   # Node dependencies (InstUI, RCE, etc.)
├─ Dockerfile*, docker-compose.yml
└─ .github/, .jenkins/       # CI/CD configuration
```

* **Modules / Namespaces** – Most domain areas live under `app/models/<domain>` and `app/controllers/<domain>`. Example: `app/models/course.rb`, `app/controllers/api/v1/courses_controller.rb`.  
* **Gems / Plugins** – Core gems are declared in `Gemfile.d/` (e.g., `Gemfile.authlogic`, `Gemfile.canvas`). Optional features (e.g., Adobe Connect integration) are isolated in their own gemfiles and loaded conditionally.  
* **Front‑end assets** – Managed by **Webpacker** (now native Webpack) with entry points under `app/javascript/`. InstUI components are imported from `@instructure/ui-*`.  
* **API** – JSON:API‑compliant endpoints under `app/controllers/api/v1/`. Serializers in `app/serializers/`.  

---  

## 5. Authentication & Authorization  

| Layer | Mechanism |
|-------|-----------|
| **Primary auth** | **Authlogic** (session cookies) for native Canvas login. |
| **External providers** | SAML, CAS, LDAP, OAuth2 (Google, Facebook, GitHub, LinkedIn, Microsoft, Apple, Twitter, Clever, OpenID Connect). Configured via `config/initializers/authentication.rb`. |
| **Token‑based auth** | **JWT** for API clients, **access tokens** for OAuth2 apps, **developer keys** for third‑party integrations. |
| **Two‑factor** | OTP via authenticator apps or SMS; stored in `User#otp_secret`. |
| **Authorization model** | Role‑based (admin, teacher, TA, student, observer) plus **permission checks** (`can?`, `has_permission?`) scattered throughout controllers and services. Permissions are derived from **Account**, **Course**, **Group**, and **Enrollment** records. |
| **Session store** | Encrypted cookie store (`encrypted_cookie_store`). |
| **Password storage** | BCrypt (via Authlogic). |
| **SSO flow** | SAML / CAS / LDAP → Authlogic session creation → optional JWT issuance for API calls. |
| **API scopes** | Scopes defined per developer key (read/write, course‑level, user‑level). |

---  

## 6. Build, Test & Deployment Pipeline  

| Stage | Tooling & Artifacts |
|-------|---------------------|
| **Source control** | Git (GitHub) – main branch `master`, feature branches, PR workflow. |
| **Dependency management** | Ruby gems via Bundler (`Gemfile.d/*`), Node packages via Yarn workspaces (`package.json`). |
| **Containerisation** | Multiple Dockerfiles: `Dockerfile.app`, `Dockerfile.jenkins`, `Dockerfile.webpack`, `Dockerfile.linter`, etc. Images built and stored in an internal registry. |
| **Local development** | `docker-compose.yml` spins up PostgreSQL, Redis, Cassandra, DynamoDB, Pulsar, Consul, Vault, Selenium, Kinesis, RCE API. `bin/dev` script orchestrates. |
| **Continuous Integration** | **Jenkins** pipelines run on every PR: <br>• `bundle exec rspec` (unit tests) <br>• `yarn test` (JS/TS unit tests) <br>• `karma`/`jest` for front‑end <br>• `rubocop`, `eslint` linters <br>• Security scan with **ShiftLeft** via GitHub Actions. |
| **Static analysis** | `brakeman` (Rails security), `bundler-audit`, `eslint`, `typescript-eslint`. |
| **Artifact publishing** | Docker images pushed to registry; compiled assets uploaded to S3 for CDN. |
| **Deployment** | Typically **Kubernetes** or **AWS ECS** clusters: <br>• Rolling updates of the Rails app containers <br>• Sidekiq workers as separate pods <br>• Database migrations run as one‑off jobs <br>• Feature flags via **LaunchDarkly**‑style config (custom). |
| **Monitoring** | Prometheus + Grafana for metrics, Sentry for error tracking, New Relic APM (optional). |
| **Rollback** | Docker image tag rollback + database migration reversal (if needed). |

---  

## 7. Infrastructure Dependencies  

| Category | Services & Role |
|----------|-----------------|
| **Relational DB** | **PostgreSQL** – primary data store for users, courses, assignments, grades, etc. |
| **Key‑value / Cache** | **Redis** – session store, Sidekiq job queue, caching of API responses. |
| **Wide‑column store** | **Cassandra** – analytics‑heavy tables (e.g., event streams, large logs). |
| **NoSQL Document DB** | **DynamoDB** – Canvas Data export, some feature flags, and external integrations. |
| **Message bus** | **Apache Pulsar** – real‑time event streaming (notifications, grade updates). |
| **Search / Index** | **Elasticsearch** (optional, for full‑text search in discussions, assignments). |
| **Secret management** | **HashiCorp Vault** – stores encryption keys, API secrets, DB passwords. |
| **Service discovery / config** | **Consul** – registers services (RCE API, background workers) and provides KV config. |
| **Browser testing** | **Selenium Grid** – UI integration tests run in CI. |
| **Streaming / analytics** | **Amazon Kinesis** – ingest of audit logs and real‑time analytics pipelines. |
| **Rich Content Editor API** | **RCE API** – separate Node service that hosts the TinyMCE‑based editor used by Canvas. |
| **External video / conferencing** | Integrations with **Adobe Connect**, **Zoom**, **Microsoft Teams** (via LTI). |
| **CI/CD runners** | Jenkins agents (Docker‑based) and GitHub Actions runners. |
| **Static asset CDN** | Amazon CloudFront (or similar) serves compiled JS/CSS/images. |

---  

### TL;DR  

Canvas LMS is a **monolithic Rails application** built with a rich **Ruby + JavaScript** stack, organised around **MVC** and a large collection of **ActiveRecord models**. Authentication is flexible (native + SAML/CAS/LDAP/OAuth2) and authorization is role‑based. The codebase is containerised, tested with a full suite of unit, integration, and UI tests, and deployed via Docker/Kubernetes with supporting services such as PostgreSQL, Redis, Cassandra, DynamoDB, Pulsar, Vault, and Consul. The architecture balances a single‑code‑base monolith with modular internal services and a robust CI/CD pipeline.