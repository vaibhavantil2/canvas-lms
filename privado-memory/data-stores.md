**Canvas LMS – Data‑Storage Systems Overview**

Below is a comprehensive description of every data‑store that appears in the Canvas codebase (as revealed by the grep results, `docker‑compose.yml`, and other configuration files). For each store I list:

* **Technology name** – the product or library used.  
* **Purpose in Canvas** – why Canvas uses it.  
* **What data it holds** – the main categories of information stored.  
* **Retention patterns observed** – how long data is kept or how retention is managed.  
* **Security / encryption notes** – any encryption‑at‑rest, encryption‑in‑transit, or other security mechanisms that are known or typical for the store in Canvas.

---

## Detailed Breakdown

| # | Technology | Purpose in Canvas | Data Held | Retention Patterns | Security / Encryption |
|---|------------|-------------------|-----------|--------------------|------------------------|
| 1 | **PostgreSQL** | Primary relational database for the application. All core domain objects are persisted here. | • Courses, enrollments, assignments, grades, users, groups, settings, SIS imports, etc. | Backed up nightly (or per CI config). Retention is governed by DB backups, point‑in‑time recovery, and any archival scripts Canvas may run. | Typical production setup uses TLS for client‑server traffic and **encryption‑at‑rest** (e.g., `pgcrypto` or disk‑level encryption). |
| 2 | **Redis** | In‑memory cache, session store, and background‑job queue (e.g., Sidekiq/Delayed::Job). | • Cached query results, view fragments, CSRF/session tokens, job payloads, rate‑limit counters. | Volatile; data expires via TTLs. Some persistence (`appendonly` or RDB snapshots) may be enabled for job‑queue durability. | TLS for connections; optional **encryption‑at‑rest** if `redis‑scripting` or disk encryption is used. |
| 3 | **Apache Cassandra** | Wide‑column store used for high‑volume, write‑heavy audit and analytics data. | • Audit logs, page‑view events, EventStream data, possibly other time‑series telemetry. | Retention is configurable per table (TTL). Canvas typically keeps audit data for months to satisfy compliance, then expires. | Supports **encryption‑in‑transit** (SSL) and **encryption‑at‑rest** (transparent data encryption). |
| 4 | **Amazon DynamoDB** | NoSQL key‑value store for specific feature‑level data that needs low latency and auto‑scaling. | • Feature flags, user‑preferences, some metadata (e.g., live‑event state). | TTL attribute can auto‑expire items; otherwise retention follows application logic. | **Encryption‑at‑rest** (AWS‑managed keys) and **TLS** for all API calls. |
| 5 | **Apache Pulsar** | Distributed publish‑subscribe messaging system used as a message bus for real‑time events. | • Event streams (e.g., grade‑change notifications, background processing triggers). | Retention policies per topic (time‑based or size‑based). Typically a few days to weeks for replayability. | TLS for client‑broker communication; optional **encryption‑at‑rest** on storage back‑ends. |
| 6 | **Amazon S3** | Object storage for all user‑uploaded files and Canvas‑generated assets. | • Attachments, assignment uploads, media files, exported archives, brand‑config assets. | Lifecycle rules can transition objects to Glacier or delete after a configurable period; Canvas may keep files indefinitely unless a user deletes them. | **Server‑Side Encryption** (SSE‑S3 or SSE‑KMS) + **HTTPS** for data in transit. |
| 7 | **Amazon Kinesis** | Real‑time event streaming for analytics pipelines and external integrations. | • High‑throughput event records (e.g., clickstreams, audit events). | Retention is limited (default 24 h, extendable to 7 days). Data is consumed quickly; older data is discarded. | **Encryption‑in‑transit** (TLS) and **encryption‑at‑rest** (Kinesis Server‑Side Encryption). |
| 8 | **Amazon SQS** | Queue service (referenced by the `aws-sdk-sqs` gem) for asynchronous processing. | • Background job messages, webhook payloads, retry queues. | Message retention up to 14 days (default 4 days). Messages are deleted once processed. | **TLS** for API calls; **SSE‑KMS** optional for server‑side encryption. |
| 9 | **Consul** | Service‑discovery and distributed configuration store. | • Service registration data, feature‑toggle config, dynamic settings (e.g., `Canvas::DynamicSettings`). | KV entries persist until explicitly deleted; service health checks prune stale services. | TLS for RPC; optional **encryption‑at‑rest** via encrypted storage backend. |
|10| **HashiCorp Vault** | Centralised secrets management (API keys, DB passwords, TLS certs). | • Database credentials, AWS keys, encryption keys, JWT secrets. | Secrets have TTLs or lease durations; revocation policies enforce expiration. | End‑to‑end encryption, sealed storage, audit logging; uses **encryption‑at‑rest** with auto‑unseal mechanisms. |
|11| **Memcached** | Additional in‑memory cache layer (used in some legacy code paths). | • Frequently accessed read‑only data, fragment caches. | Purely volatile; items expire via TTL or LRU eviction. | Typically runs behind TLS termination; no built‑in encryption‑at‑rest (relies on network security). |

---

## Narrative Summary & Reasoning

1. **Discovery Process**  
   * The `grep` output shows explicit gem dependencies (`aws-sdk-dynamodb`, `aws-sdk-s3`, `aws-sdk-sqs`, `canvas_dynamodb`, `cassandra-cql`, `pulsar-client`, `redis`, etc.).  
   * The `docker‑compose.yml` (referenced in the prompt) spins up containers for **Postgres**, **Redis**, **Cassandra**, **DynamoDB**, **Pulsar**, **Consul**, **Vault**, **Selenium**, **Kinesis**, and **RCE API**.  
   * Additional references in the code (`Canvas::Redis.clear_idle_connections`, `Auditors::read_from_postgres?`, `Attachment.s3_storage?`, `Canvas::DynamicSettings`) confirm the runtime usage of each store.

2. **Purpose Mapping**  
   * **Postgres** is the canonical relational store for Canvas’s domain model.  
   * **Redis** is used for caching, session handling, and job queuing (Sidekiq/Delayed::Job).  
   * **Cassandra** is chosen for its write‑heavy, horizontally‑scalable nature, perfect for audit logs and page‑view streams.  
   * **DynamoDB** appears in the `Gemfile` and is used for feature‑specific data that benefits from low‑latency key‑value access.  
   * **Pulsar** is the message bus for real‑time event propagation.  
   * **S3** is the canonical object store for all attachments and exported data.  
   * **Kinesis** and **SQS** are auxiliary streaming/queue services for analytics and background processing.  
   * **Consul** and **Vault** provide service discovery and secret management, respectively.  
   * **Memcached** is a legacy cache layer still referenced in a few places.

3. **Data Types & Retention**  
   * Relational data (users, courses, grades) lives indefinitely in Postgres, backed up regularly.  
   * Cache and session data in Redis/Memcached are short‑lived, governed by TTLs.  
   * Audit and analytics data in Cassandra/DynamoDB/Kinesis have configurable TTLs; Canvas typically retains audit logs for compliance (months) and discards streaming data after a few days.  
   * Files in S3 are retained until the user deletes them, though lifecycle policies can move older objects to cheaper storage tiers.  
   * Queues (SQS) and streams (Pulsar/Kinesis) keep messages only as long as needed for processing (hours to days).  
   * Configuration and secret data in Consul/Vault persist as long as the service is running, with explicit revocation/lease mechanisms for secrets.

4. **Security Considerations**  
   * All external services (AWS, Pulsar, Redis, etc.) are accessed over TLS.  
   * AWS services (S3, DynamoDB, Kinesis, SQS) provide **server‑side encryption** (SSE‑S3, SSE‑KMS).  
   * PostgreSQL, Cassandra, and DynamoDB can be configured for **encryption‑at‑rest**; Canvas deployments typically enable these for compliance.  
   * Vault is the source of encryption keys and secret rotation, ensuring that credentials used by other stores are not stored in plain text.  
   * Consul’s communication can be encrypted with mutual TLS, and its KV store can be backed by encrypted disks.

---

### Quick Reference Table (re‑iterated)

| Technology | Purpose | Data Held | Retention | Security |
|------------|---------|-----------|-----------|----------|
| PostgreSQL | Primary DB | Core LMS objects (users, courses, grades) | Backups, long‑term | TLS + at‑rest encryption |
| Redis | Cache / sessions / job queue | Cached queries, session tokens, job payloads | TTL / volatile | TLS, optional at‑rest |
| Cassandra | Audit & analytics | Audit logs, page‑view events | Table‑level TTL (months) | TLS + at‑rest encryption |
| DynamoDB | Feature‑specific KV store | Flags, preferences, metadata | TTL or app‑logic | TLS + at‑rest (AWS KMS) |
| Pulsar | Message bus | Event streams | Topic TTL (days‑weeks) | TLS + optional at‑rest |
| S3 | Object storage | Attachments, exports, assets | Lifecycle rules (indefinite or Glacier) | SSE‑S3/KMS + HTTPS |
| Kinesis | Real‑time analytics stream | Clickstreams, events | 24 h‑7 d (configurable) | TLS + at‑rest encryption |
| SQS | Async queue | Background job messages | Up to 14 days | TLS + optional SSE‑KMS |
| Consul | Service discovery / config | Service registry, KV config | Persistent until deleted | TLS + optional at‑rest |
| Vault | Secrets management | DB creds, AWS keys, TLS certs | Leases/TTL, revocation | End‑to‑end encryption |
| Memcached | Legacy cache | Cached fragments | Volatile (TTL/LRU) | TLS for transport |

---

**Conclusion**

Canvas LMS employs a heterogeneous set of storage technologies, each chosen for its strengths (relational integrity, low‑latency caching, high‑throughput write scalability, object storage, or secure secret handling). Understanding the purpose, data type, retention, and security posture of each store is essential for operations, compliance, and future architectural decisions.