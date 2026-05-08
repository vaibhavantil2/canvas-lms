# User Authentication & SSO

## Overview
The **User Authentication & SSO** feature implements Canvas login, logout, and single‑sign‑on (SSO) against a variety of external providers (Canvas, LDAP, SAML, OAuth, CAS, etc.).  
When a user accesses `/login` the `LoginController#new` action decides whether to show the Canvas login form, redirect to an external provider, or forward the user to a discovery URL. After successful credential verification a `Pseudonym` (the Canvas login record) is linked to a `User` and the user is sent to the dashboard. Logout is handled by `LoginController#destroy`, which clears the session and optionally redirects the user to the provider’s logout URL.

## Behavior
- **Redirect logged‑in users to dashboard** – If `@current_user` is present and no forced‑login parameters are set, `LoginController#new` redirects to `dashboard_url` (line 33‑38).  
- **Require cookies for certain flows** – When `params[:needs_cookies] == '1'` the action renders `shared/unauthorized` with a 401 status (line 41‑44).  
- **Persist request‑specific data in the session** – `expected_user_id`, `confirm`, and `enrollment` are stored in `session` (lines 46‑48).  
- **Populate the login form with the current pseudonym** – If `@current_pseudonym` exists its `unique_id` is placed in `params[:pseudonym_session][:unique_id]` (lines 51‑55).  
- **Support legacy “canvas” login param** – `params[:authentication_provider]` is forced to `'canvas'` when `params['canvas_login']` is present (line 57).  
- **Discovery URL redirection** – If the root account defines `auth_discovery_url` and no provider is specified, the request is redirected to that URL, optionally appending a delegated message (lines 62‑73).  
- **Select the authentication provider** – The controller looks up the active provider matching `params[:authentication_provider]` and extracts its `auth_type` (lines 75‑84). If none is supplied the first active provider’s `auth_type` is used, defaulting to `'canvas'` (lines 86‑88).  
- **Redirect to the provider‑specific login controller** – A URL is built for `login/<auth_type>#new` and the request is redirected (lines 90‑92).  
- **Display SSO error messages** – When `flash[:delegated_message]` is present the view is rendered with UI elements hidden (lines 94‑100).  

- **Logout** – `LoginController#destroy` deletes the delegated cookie for the Site Admin account, looks up the provider used for the session (`session[:login_aac]`) and asks it for a logout redirect URL (`aac.user_logout_redirect`) (lines 102‑108). It then calls `logout_current_user`, sets `flash[:logged_out]`, and redirects (lines 110‑115).  

- **Logout landing page** – `LoginController#logout_landing` renders a confirmation page for logged‑in users or redirects to the login page if the user is already logged out (lines 126‑132).  

- **Session token endpoint** – `LoginController#session_token` validates an API access token, checks that the supplied `return_to` URL is absolute and on the same host, creates a `SessionToken` tied to the current pseudonym, appends it as a query param, and returns the full URL as JSON (lines 137‑166).  

- **Clear file‑access session** – `LoginController#clear_file_session` removes temporary file‑access keys and generates a new `permissions_key` (lines 168‑176).  

- **Authentication provider CRUD** – `AuthenticationProvidersController#index` returns a JSON list of active providers for API requests or a presenter for HTML (lines 30‑45).  
- **Create provider** – `AuthenticationProvidersController#create` validates `auth_type` against `AuthenticationProvider.valid_auth_types`, builds a new provider with the supplied parameters, and saves it (lines 70‑115).  

- **Credential verification** – `Pseudonym.valid_arbitrary_credentials?` first attempts LDAP bind (`valid_ldap_credentials?`), then falls back to Canvas password checks (`valid_ssha?`, `valid_password?`) and records the provider if authentication succeeds (lines 210‑235).  

- **LDAP bind** – `Pseudonym.ldap_bind_result` iterates over LDAP providers (explicit or default) and calls `AuthenticationProvider::LDAP#ldap_bind_result`; on success it infers the provider for the pseudonym (lines 260‑274).  

- **Unique‑ID validation** – `Pseudonym.validate_unique_id` ensures the `unique_id` is a valid email when the account allows email pseudonyms and that it is not already taken within the same account/provider (lines 140‑165).  

- **User‑pseudonym linking** – When a pseudonym authenticates successfully, `Pseudonym.login_assertions_for_user` updates the user’s `workflow_state`, time zone, and creates an LDAP communication channel if needed (lines 180‑199).  

## Triggers / Entry points
| Trigger | Route / Action | Source |
|---------|----------------|--------|
| Visit login page | `GET /login` → `LoginController#new` | `app/controllers/login_controller.rb:20` |
| Submit login form (Canvas) | `POST /login` (handled by provider‑specific controller) | `app/controllers/login_controller.rb:45` |
| Logout (DELETE) | `DELETE /logout` → `LoginController#destroy` | `app/controllers/login_controller.rb:102` |
| Logout landing (GET) | `GET /logout` → `LoginController#logout_landing` | `app/controllers/login_controller.rb:126` |
| Session‑token API | `GET /login/session_token` → `LoginController#session_token` | `app/controllers/login_controller.rb:137` |
| Clear file session | `GET /login/clear_file_session` → `LoginController#clear_file_session` | `app/controllers/login_controller.rb:168` |
| List auth providers (API) | `GET /api/v1/accounts/:id/authentication_providers` → `AuthenticationProvidersController#index` | `app/controllers/authentication_providers_controller.rb:30` |
| Create auth provider (API) | `POST /api/v1/accounts/:id/authentication_providers` → `AuthenticationProvidersController#create` | `app/controllers/authentication_providers_controller.rb:70` |
| Credential lookup (internal) | `Pseudonym.authenticate` called by login flow | `app/models/pseudonym.rb:236‑254` |

## End‑to‑end flow (Mermaid)

```mermaid
sequenceDiagram
    participant Browser
    participant LoginCtrl as LoginController
    participant AAC as AuthenticationProvider
    participant Pseudo as Pseudonym
    participant User as User
    participant Redis as Redis (session token cache)

    Browser->>LoginCtrl: GET /login
    alt Already logged in & no force‑login
        LoginCtrl->>Browser: 302 → dashboard_url
    else Needs discovery URL
        LoginCtrl->>Browser: 302 → auth_discovery_url
    else Provider selected
        LoginCtrl->>LoginCtrl: Determine auth_type
        LoginCtrl->>Browser: 302 → /login/<auth_type>
    end

    Browser->>LoginCtrl: POST credentials to provider‑specific controller
    LoginCtrl->>Pseudo: Pseudonym.find_by_unique_id
    Pseudo->>Pseudo: valid_arbitrary_credentials?(pwd)
    alt LDAP success
        Pseudo->>AAC: LDAP bind
        AAC-->>Pseudo: success + attrs
        Pseudo->>Pseudo: infer_auth_provider
    else Canvas password success
        Pseudo->>Pseudo: valid_password? / valid_ssha?
    else Failure
        Pseudo-->>LoginCtrl: false
        LoginCtrl->>Browser: render login with error
        deactivate Browser
    end
    Pseudo->>User: login_assertions_for_user (set workflow_state, tz, etc.)
    LoginCtrl->>Browser: 302 → dashboard_url

    Browser->>LoginCtrl: DELETE /logout
    LoginCtrl->>AAC: aac.user_logout_redirect (if present)
    LoginCtrl->>LoginCtrl: logout_current_user
    LoginCtrl->>Browser: 302 → redirect (provider or login_url)

    Browser->>LoginCtrl: GET /login/session_token?return_to=...
    LoginCtrl->>LoginCtrl: validate token & host
    LoginCtrl->>Redis: SessionToken.new(...).to_s
    LoginCtrl->>Browser: JSON {session_url: ...}
```

## State / data touched
| Entity | Table / Model | Access |
|--------|---------------|--------|
| Authentication providers | `authentication_providers` (STI on `account_authorization_configs`) | read/write in `AuthenticationProvider` and `AuthenticationProvidersController` (`app/models/authentication_provider.rb:10`, `app/controllers/authentication_providers_controller.rb:30‑115`) |
| Pseudonyms | `pseudonyms` | lookup (`by_unique_id`), create, update, destroy (`app/models/pseudonym.rb:10`, `app/models/pseudonym.rb:140‑165`, `app/models/pseudonym.rb:210‑235`) |
| Users | `users` | read/write via `User` associations (`app/models/user.rb:10`) |
| Sessions / cookies | Rails session store, `cookies` hash | set/clear in `LoginController#new`, `#destroy`, `#clear_file_session` (`app/controllers/login_controller.rb:20‑176`) |
| Redis (optional) | `Canvas.redis` for CAS ticket expiration and auth‑provider debugging | `Pseudonym.cas_ticket_key`, `AuthenticationProvider.debug_*` (`app/models/pseudonym.rb:260‑280`, `app/models/authentication_provider.rb:140‑170`) |
| SessionToken records | In‑memory token object (no DB) | created in `LoginController#session_token` (`app/controllers/login_controller.rb:150‑166`) |

## External dependencies
| Dependency | Where used |
|------------|------------|
| LDAP servers (via `net‑ldap`) | `Pseudonym.ldap_bind_result` → `AuthenticationProvider::LDAP#ldap_bind_result` (`app/models/pseudonym.rb:260‑274`) |
| SAML / OAuth / CAS endpoints | Redirect URLs stored in `AuthenticationProvider` (`log_in_url`, `log_out_url`) and used by provider‑specific login controllers (outside the shown files) |
| Redis (optional) | CAS ticket storage (`Pseudonym.cas_ticket_key`) and auth‑provider debugging (`AuthenticationProvider.debug_*`) (`app/models/pseudonym.rb:260‑280`, `app/models/authentication_provider.rb:140‑170`) |
| Email validation (`EmailAddressValidator`) | `Pseudonym.validate_unique_id` (`app/models/pseudonym.rb:140‑150`) |

## Configuration / parameters
| Parameter | Source |
|-----------|--------|
| `auth_discovery_url` (account setting) | `@domain_root_account.auth_discovery_url` in `LoginController#new` (`app/controllers/login_controller.rb:62`) |
| `auth_type` values (allowed list) | `AuthenticationProvider.valid_auth_types` (`app/models/authentication_provider.rb:84`) |
| LDAP connection settings (`auth_host`, `auth_port`, `auth_over_tls`, `auth_filter`, etc.) | attributes on `AuthenticationProvider::LDAP` (defined via STI, referenced in `Pseudonym.ldap_bind_result`) |
| Feature flag `persist_inferred_authentication_providers` | checked in `Pseudonym.strip_inferred_authentication_provider` (`app/models/pseudonym.rb:300‑312`) |
| Account‑level MFA requirement (`account.mfa_settings`) | `AuthenticationProvider#mfa_required?` (`app/models/authentication_provider.rb:120‑130`) |
| Session token expiration (default 30 min) | `SessionToken` initialization in `LoginController#session_token` (`app/controllers/login_controller.rb:150`) |
| `remember_me_cookie_domain` (used when deleting delegated cookie) | `LoginController#destroy` (`app/controllers/login_controller.rb:103`) |

## Edge cases & failure modes (observed in code)
- **Already logged‑in user** – `LoginController#new` short‑circuits to dashboard unless `force_login`, `confirm`, `expected_user_id`, or a remembered‑me token is present (lines 33‑38).  
- **Missing or malformed `return_to` URL** – `session_token` returns 400 with JSON error if parsing fails or host mismatches (lines 144‑152).  
- **Invalid credentials** – `Pseudonym.valid_arbitrary_credentials?` returns `false` after LDAP and password checks; the login controller then re‑renders the login page with an error (implicit via `new` flow).  
- **Too many login attempts** – `Pseudonym.find_all_by_arbitrary_credentials` aborts early and returns `:too_many_attempts` if `audit_login` signals rate‑limit (lines 225‑232).  
- **Duplicate pseudonym unique_id** – `Pseudonym.validate_unique_id` adds an error and aborts the save (`throw :abort`) if another active pseudonym with the same `unique_id` exists in the same account/provider (lines 150‑165).  
- **LDAP bind errors** – Exceptions are rescued, logged to `Canvas::Errors`, and `valid_ldap_credentials?` returns `nil` (lines 270‑279).  
- **Provider‑specific logout URL missing** – `LoginController#destroy` falls back to `login_url` if `aac.user_logout_redirect` is nil (lines 108‑110).  
- **Discovery URL with delegated message** – The discovery URL is appended with a `message=` query param only when `flash[:delegated_message]` is present (lines 66‑73).  

## Open questions
1. **Password reset flow** – The code for initiating a password reset (e.g., sending a reset token) is not present in the examined files; it likely lives in a separate controller.  
2. **Account lockout / throttling** – While `Pseudonym.audit_login` returns `:too_many_attempts`, the exact lockout policy (duration, counters) is defined elsewhere.  
3. **Provider‑specific login controllers** – The actual SAML/OAuth/LDAP login handling (e.g., `login/saml_controller.rb`) is not included, so the exact request/response exchange with external IdPs is unknown.  
4. **Federated attribute provisioning** – The mapping of provider attributes to Canvas user fields is defined in `AuthenticationProvider#apply_federated_attributes`, but the code that triggers JIT provisioning on first login is not shown here.  
5. **Session token revocation** – The lifecycle of the `SessionToken` generated in `session_token` (e.g., expiration handling) is not visible in the current source.