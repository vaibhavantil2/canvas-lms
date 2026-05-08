# Video Conferencing

## Overview
The Video Conferencing feature enables Canvas users to **schedule**, **launch**, and **record** live video sessions for classes, office hours, and meetings.  
* **Value:** Provides a native, integrated way for instructors to conduct synchronous instruction and for students to attend and later review sessions.  
* **Primary users:**  
  * **Instructors** – schedule and start conferences, control participant permissions, and record sessions.  
  * **Students** – join scheduled conferences and view recordings.  
* **When used:**  
  * Before a class or office‑hour slot (scheduling).  
  * At the start time of a session (launch).  
  * After a session ends (recording storage and playback).

## User stories
* **As an instructor, I want to schedule a video conference** so that I can set up a future class or office‑hour session for my students.  
* **As an instructor, I want to launch a video conference** so that I can start the live session at the scheduled time.  
* **As an instructor, I want to record a video conference** so that students who miss the live session can watch it later.  
* **As a student, I want to join a scheduled video conference** so that I can participate in the live class or office hour.  
* **As a participant, I want controls for audio/video** so that I can manage my presence during the session.

*(These stories are derived from the typical CRUD‑style actions that a `ConferencesController` would expose in a Rails application, even though the exact source code is not available for line‑by‑line citation.)*

## Triggers / Entry points
| Trigger | Path (approx.) |
|---------|----------------|
| HTTP GET `/courses/:course_id/conferences` – list conferences | `conferences_controller.rb` (index action) |
| HTTP POST `/courses/:course_id/conferences` – create/schedule a conference | `conferences_controller.rb` (create action) |
| HTTP GET `/courses/:course_id/conferences/:id` – view conference details | `conferences_controller.rb` (show action) |
| HTTP POST `/courses/:course_id/conferences/:id/start` – launch a conference | `conferences_controller.rb` (start action) |
| HTTP POST `/courses/:course_id/conferences/:id/record` – start recording | `conferences_controller.rb` (record action) |
| UI button “Join” on conference page – join a live session | React component tied to the above routes (not visible in provided files) |

*No concrete line numbers can be cited because the source files were not supplied.*

## End‑to‑end flow (Mermaid)

```mermaid
sequenceDiagram
    participant User as "User (Instructor/Student)"
    participant UI as "React UI"
    participant Router as "Rails Router"
    participant ConferencesController as "ConferencesController"
    participant Conference as "Conference (model)"
    participant Participant as "ConferenceParticipant (model)"
    participant Recording as "Recording (model)"
    participant VideoService as "External Video Provider"

    %% Scheduling
    User->>UI: Click “Schedule Conference”
    UI->>Router: POST /courses/:course_id/conferences
    Router->>ConferencesController: create
    ConferencesController->>Conference: Conference.new(params)
    Conference-->>ConferencesController: validate & save
    ConferencesController->>User: Confirmation page / redirect

    %% Launching
    User->>UI: Click “Start Conference”
    UI->>Router: POST /courses/:course_id/conferences/:id/start
    Router->>ConferencesController: start
    ConferencesController->>Conference: find(id)
    Conference->>VideoService: request_meeting_url
    VideoService-->>Conference: meeting_url
    Conference-->>ConferencesController: update status = "live"
    ConferencesController->>Participant: notify_participants
    Participant-->>User: push notification / UI update

    %% Joining
    User->>UI: Click “Join”
    UI->>Router: GET /courses/:course_id/conferences/:id/join
    Router->>ConferencesController: join
    ConferencesController->>Conference: find(id)
    Conference->>Participant: add(user_id)
    Participant-->>ConferencesController: success
    ConferencesController->>User: redirect to meeting_url

    %% Recording
    User->>UI: Click “Record”
    UI->>Router: POST /courses/:course_id/conferences/:id/record
    Router->>ConferencesController: record
    ConferencesController->>Conference: find(id)
    Conference->>VideoService: start_recording(meeting_id)
    VideoService-->>Recording: recording_id, stream_url
    Recording->>Conference: associate(recording_id)
    ConferencesController->>User: recording started response
```

*The diagram reflects the typical request‑response flow for scheduling, launching, joining, and recording a conference based on conventional Rails controller actions and a presumed external video service. No actual line citations are possible without the source.*

## State / data touched
| Model / Table | Purpose | Path (approx.) |
|---------------|---------|----------------|
| `Conference` (`conferences` table) | Stores conference metadata (title, start time, status, meeting URL, etc.) | `conference.rb` (model definition) |
| `ConferenceParticipant` (`conference_participants` table) | Links users to a conference and stores role/permissions | `conference_participant.rb` |
| `Recording` (`recordings` table) | Persists recording identifiers and URLs returned by the video provider | `recording.rb` |
| `Course` (`courses` table) – referenced for scoping conferences | `course.rb` (not listed but part of domain) |
| `User` (`users` table) – participants & owners | `user.rb` (not listed but part of domain) |

*Exact line numbers cannot be provided because the files were not available.*

## External dependencies
| Dependency | Role | Path (approx.) |
|------------|------|----------------|
| External video‑conferencing provider (e.g., Zoom, BigBlueButton, Microsoft Teams) | Generates meeting URLs, handles live streaming, and provides recording services. Calls are made from the `Conference` model or the controller when starting or recording a session. | Calls would appear in `conference.rb` or `conferences_controller.rb` (not visible). |
| Background job queue (e.g., Sidekiq) – likely used for async recording cleanup or notification dispatch. | Enqueues jobs after a conference ends. | Would be referenced in controller or model callbacks (not visible). |

*No concrete call sites can be cited without source files.*

## Edge cases & failure modes (observed in code)
Because the source code is unavailable, only generic edge cases that a typical Canvas video‑conferencing implementation would need to handle can be listed:

| Situation | Handling (expected) |
|-----------|---------------------|
| **Invalid parameters** when creating a conference (missing title, start time, or invalid course ID). | Model validations would reject the record and return errors to the controller. |
| **Meeting provider API failure** (e.g., unable to obtain a meeting URL). | Controller would rescue the exception, log the error, and present a user‑friendly message. |
| **Permission errors** – a student attempts to start a conference. | Authorization filter (`before_action :require_instructor`) would block the request. |
| **Recording service timeout** – recording never starts or stops. | Background job would retry or mark the conference as “recording_failed”. |
| **Concurrent joins** – many participants joining simultaneously. | Database constraints on `conference_participants` ensure idempotent inserts; possible queueing for notifications. |

*These are inferred from typical patterns; the actual code does not expose them.*

## Open questions
1. **Exact external video service** – Which provider(s) does Canvas integrate with for this feature?  
2. **Authentication flow** – How are API credentials stored and refreshed when communicating with the video provider?  
3. **Recording storage** – Are recordings saved in Canvas’s own file store, a cloud bucket, or left on the provider’s platform?  
4. **Real‑time participant controls** – What UI elements exist for muting, removing, or promoting participants, and how are those actions routed through the backend?  
5. **Background processing** – Which jobs (e.g., post‑conference cleanup, notification dispatch) are enqueued, and what queues are used?  
6. **Rate limiting / quotas** – Does the integration enforce limits on the number of concurrent meetings per account?  

*Answers to these questions require inspection of the actual controller, model, and service implementations, which are not present in the provided material.*