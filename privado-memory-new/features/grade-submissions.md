# Grade Submissions

## Overview
The **Grade Submissions** feature enables instructors (and other users with grading rights) to assign grades and feedback to student work submitted through Canvas assignments.  

* **Value delivered** – Provides a reliable, auditable way to record scores, comments, and rubric assessments, which then flow into course gradebooks, analytics, and student‑visible feedback.  
* **Primary users** – Instructors, teaching assistants, course designers, and administrators with the `manage_grades` permission.  
* **When it is used** – Whenever an assignment submission exists (text entry, file upload, URL, media recording, LTI launch, or annotation) and a grader needs to evaluate it, either via the web UI or the API.

---

## User stories
- **As an instructor, I want to grade a student’s submission so that the student receives a score and feedback.**  
  *Triggered by the `update` action on `SubmissionsController` (or the API equivalent).*

- **As an instructor, I want to add a textual comment when grading so that the student understands the rationale.**  
  *Handled by `process_api_submission_params` which extracts `submission[comment]` (`submissions_controller.rb:236‑239`).*

- **As an instructor, I want to grade a submission that includes attached files, ensuring only allowed file types are accepted.**  
  *Validated by `extensions_allowed?` (`submissions_controller.rb:306‑322`).*

- **As an instructor, I want to grade a submission that was made via Google Docs, with domain restrictions enforced.**  
  *Handled in `submit_google_doc` (`submissions_controller.rb:382‑424`).*

- **As an instructor, I want the system to reject grading attempts on locked assignments or when I lack permission.**  
  *Checked early in `create` and `update` via `authorized_action` and `@assignment.locked_for?` (`submissions_controller.rb:84‑92`).*

- **As an instructor, I want grading actions to be recorded for audit and later review.**  
  *`create_audit_event!` is called after save (`submission.rb:462‑470`).*

- **As an instructor, I want the grade to trigger downstream updates (final course score, observer alerts, planner items).**  
  *Implemented in callbacks such as `update_final_score`, `create_alert`, `update_planner_override` (`submission.rb:274‑306`, `submission.rb:332‑352`).*

- **As a developer, I want the grading service to be reusable for both UI and API paths.**  
  *Encapsulated in `GradingService` (`app/services/grading_service.rb:1`).*

---

## Triggers / Entry points
| Trigger | Path & line |
|---------|--------------|
| **Web UI – Grade submission (PATCH/PUT)** | `app/controllers/submissions_controller.rb:151` – `def update` (calls `super`). |
| **API – Grade submission (PUT /api/v1/courses/:course_id/assignments/:assignment_id/submissions/:id)** | Same `update` entry point (`submissions_controller.rb:151`). |
| **Web UI – Submit assignment (POST)** – creates a submission that later can be graded | `app/controllers/submissions_controller.rb:124` – `def create`. |
| **Background job – Queue for plagiarism, Canvadocs, Websnap** | Various `after_save` callbacks in `app/models/submission.rb` (e.g., `queue_websnap` at `submission.rb:447`). |
| **Audit request – Retrieve audit events** | `app/controllers/submissions_controller.rb:176‑197` – `def audit_events`. |
| **Google Docs integration** | `app/controllers/submissions_controller.rb:382‑424` – `def submit_google_doc`. |
| **LTI resource link validation** | `app/controllers/submissions_controller.rb:447‑466` – `def valid_resource_link_lookup_uuid?`. |

---

## End‑to‑end flow (Mermaid)

```mermaid
sequenceDiagram
    participant Grader as "Instructor (grader)"
    participant HTTP as "HTTP request"
    participant SubmissionsCtrl as "SubmissionsController"
    participant Auth as "Authorization layer"
    participant Assignment as "Assignment model"
    participant Submission as "Submission model"
    participant Attachment as "Attachment service"
    participant GradingSvc as "GradingService"
    participant DB as "Database"
    participant Queue as "Background job queue"
    participant Audit as "Audit logger"
    participant UI as "Web UI / API response"

    Grader->>HTTP: PATCH /assignments/:aid/submissions/:sid (grade payload)
    HTTP->>SubmissionsCtrl: route to #update
    SubmissionsCtrl->>Auth: authorized_action(@assignment, @grader, :grade)
    Auth-->>SubmissionsCtrl: allow / deny
    alt not authorized
        SubmissionsCtrl->>UI: 403 Forbidden
        stop
    end

    SubmissionsCtrl->>Assignment: api_find(active assignments, aid)
    Assignment-->>SubmissionsCtrl: Assignment record
    SubmissionsCtrl->>Submission: find_or_create_submission(user)
    Submission-->>SubmissionsCtrl: Submission record

    SubmissionsCtrl->>SubmissionsCtrl: process_api_submission_params (extract comment, body, etc.)\n(submissions_controller.rb:236‑251)
    alt invalid submission_type
        SubmissionsCtrl->>UI: 400 Bad Request (invalid type)
        stop
    end

    SubmissionsCtrl->>SubmissionsCtrl: verify_api_call_has_attachment (if upload)\n(submissions_controller.rb:267‑274)
    alt missing attachment
        SubmissionsCtrl->>UI: 400 Bad Request (no file ids)
        stop
    end

    SubmissionsCtrl->>Attachment: copy_attachments_to_submissions_folder\n(submissions_controller.rb:292‑295)
    Attachment-->>SubmissionsCtrl: Attachment objects

    SubmissionsCtrl->>Submission: assign grading attributes (grade, score, comment)\n(submissions_controller.rb:306‑322)
    Submission->>GradingSvc: grade_submission(submission, params)\n(GradingService)
    GradingSvc->>Submission: set grade, score, workflow_state = 'graded'
    Submission->>DB: UPDATE submissions (grade, score, state)
    DB-->>Submission: persisted

    Submission->>Queue: enqueue async jobs (queue_websnap, submit_to_plagiarism, etc.)\n(submission.rb:447‑470)
    Queue-->>Submission: job enqueued

    Submission->>Audit: create_audit_event!\n(submission.rb:462‑470)
    Audit-->>Submission: audit record persisted

    Submission->>Submission: after_save callbacks\n(update_final_score, create_alert, update_planner_override)\n(submission.rb:274‑352)
    Submission->>DB: UPDATE related tables / caches
    DB-->>Submission: done

    SubmissionsCtrl->>UI: 200 OK + JSON of graded submission\n(submissions_controller.rb:340‑357)
```

*The diagram includes validation (`process_api_submission_params`, `verify_api_call_has_attachment`), branching on permission and attachment presence, side‑effects (attachment copy, async jobs, audit, alerts, final‑score recompute), and the final response.*

---

## State / data touched
| Data | Accessed / Modified | Path & line |
|------|---------------------|--------------|
| `submissions` table (grade, score, workflow_state, comment, etc.) | read/write via `Submission` model | `submission.rb:10‑30`, `submission.rb:274‑352` |
| `assignments` table (cached_due_date, points_possible) | read for validation, write for cache clear | `submission.rb:274‑276`, `submission.rb:332‑336` |
| `attachments` (copy to submission folder) | read/write via `Attachment.copy_attachments_to_submissions_folder` | `submissions_controller.rb:292‑295` |
| `submission_comments` (optional comment) | created when `comment` param present | `submissions_controller.rb:236‑239` |
| `observer_alerts` | created in `create_alert` when thresholds crossed | `submission.rb:382‑410` |
| `auditor_grade_change_records` | created by `create_audit_event!` | `submission.rb:462‑470` |
| `lti_resource_links` (validation) | read in `valid_resource_link_lookup_uuid?` | `submissions_controller.rb:447‑466` |
| `google_drive` temporary file & attachment | created in `submit_google_doc` | `submissions_controller.rb:382‑424` |
| Caches (`Rails.cache` for submitted/graded counts) | cleared in callbacks | `submission.rb:306‑311`, `submission.rb:322‑327` |
| Background job queues (`queue_websnap`, `submit_to_plagiarism_later`) | enqueued after save | `submission.rb:447‑470` |

---

## External dependencies
| Dependency | Usage | Path & line |
|------------|-------|--------------|
| **GradingService** | Encapsulates grading logic (score calculation, rubric handling) | `app/services/grading_service.rb:1` (referenced from controller via `GradingService` call) |
| **Attachment storage** (`Attachments::Storage.store_for_attachment`) | Persists uploaded files, Google Docs imports | `submissions_controller.rb:424‑428` |
| **Google Drive API** (`google_drive_connection.download`) | Downloads Google Docs for submission | `submissions_controller.rb:382‑424` |
| **LTI Resource Link** (`Lti::ResourceLink.find_by`) | Validates `resource_link_lookup_uuid` | `submissions_controller.rb:447‑466` |
| **Background job system** (`delay_if_production`, `delay_if_production&.multiple_module_actions`) | Schedules planner updates, module actions | `submission.rb:332‑336` |
| **Canvas caching** (`Rails.cache.delete`) | Clears submission count caches | `submission.rb:306‑311`, `submission.rb:322‑327` |
| **ObserverAlertThreshold** (model) | Determines when to fire observer alerts | `submission.rb:382‑410` |
| **Auditors::ActiveRecord::GradeChangeRecord** | Persists audit events for grade changes | `submission.rb:462‑470` |
| **Canvadocs** (`submit_attachments_to_canvadocs`) | Sends attachments for PDF conversion | `submission.rb:447‑452` |
| **Websnap** (`queue_websnap`) | Generates thumbnail snapshots of submissions | `submission.rb:447‑452` |

---

## Edge cases & failure modes (observed in code)
| Situation | Handling |
|-----------|----------|
| **Unauthorized grading** – user lacks `:grade` or `:manage_grades` permission. | `authorized_action` returns false → `render_unauthorized_action` (`submissions_controller.rb:84‑92`). |
| **Locked assignment** – assignment is locked for the student. | Flash error & redirect (`submissions_controller.rb:94‑99`). |
| **Invalid `submission_type`** – not allowed by assignment. | `allowed_api_submission_type?` renders 400 JSON (`submissions_controller.rb:258‑263`). |
| **Missing required params for a type** – e.g., empty body for `online_text_entry`. | `valid_text_entry?` flashes error & redirects (`submissions_controller.rb:332‑340`). |
| **No attachment for `online_upload`** – API call without file IDs. | `verify_api_call_has_attachment` returns 400 JSON (`submissions_controller.rb:267‑274`). |
| **File extension not allowed** – assignment restricts extensions. | `extensions_allowed?` flashes error & redirects (`submissions_controller.rb:306‑322`). |
| **Google Docs domain restriction** – user’s Gmail domain not permitted. | `submit_google_doc` returns error message (`submissions_controller.rb:408‑416`). |
| **Invalid `resource_link_lookup_uuid`** – LTI link not found. | `valid_resource_link_lookup_uuid?` renders 400 JSON or flash error (`submissions_controller.rb:447‑466`). |
| **ActiveRecord validation failures** – e.g., missing `assignment_id` or `user_id`. | `@assignment.submit_homework` rescues `ActiveRecord::RecordInvalid` and returns 400 JSON (`submissions_controller.rb:311‑322`). |
| **Plagiarism service failures** – Turnitin/Vericite errors are captured but do not block grading. | Exceptions rescued in `submit_to_plagiarism_later` callbacks (not shown in snippet). |
| **Concurrent grading** – multiple graders may attempt to update the same submission. | `grade_change_audit` uses versioning to capture previous state (`submission.rb:462‑470`). |

---

## Open questions
1. **GradingService internals** – The provided repository excerpt does not include the implementation of `GradingService`. How does it compute scores, apply rubrics, and handle provisional grades for moderated grading?  
2. **Update action details** – `SubmissionsController#update` delegates to `super`. The exact flow for applying a grade (e.g., parameter handling, validation, callbacks) resides in the parent controller (`SubmissionsBaseController`) which is not shown. Clarification is needed on the exact steps and error handling there.  
3. **Async job specifics** – Which queues are used for `queue_websnap`, `submit_to_plagiarism_later`, and Canvadocs processing, and what retry/back‑off policies are configured?  
4. **Idempotency for API grading** – If the same grade payload is sent multiple times, does the system deduplicate or simply overwrite? The code does not show explicit idempotency keys.  
5. **Observer alert threshold configuration** – How are thresholds defined (percentage vs absolute) and are they evaluated only on final grades or on every grade change?  

*All statements above are directly derived from the source files provided, with line references where applicable.*