# File Management

## Overview
The File Management feature lets Canvas users upload, organize, version, and share files and folders inside courses and personal spaces. It provides value by giving instructors a way to distribute course materials and by giving students a convenient place to submit and retrieve files. The primary users are **instructors** (who create and manage files) and **students** (who access and upload files). It is used throughout a course lifecycle—when setting up a syllabus, posting assignments, sharing resources, and submitting work.

## User stories
- **As an instructor**, I want to upload files to a course so that I can share resources with my students.  
- **As an instructor**, I want to create folders and move files into them so that my course files stay organized.  
- **As an instructor**, I want to set view/edit permissions on files and folders so that only the intended audience can access them.  
- **As an instructor**, I want to see version history for a file so that I can revert to a previous version if needed.  
- **As a student**, I want to upload assignment files to the appropriate folder so that my instructor can review them.  
- **As a student**, I want to preview supported file types (PDF, images, etc.) directly in the UI so I can verify what I’m submitting.

*These stories are derived from the documented purpose of the `files_controller.rb`, `folders_controller.rb`, and the supporting models (`file.rb`, `folder.rb`, `attachment.rb`). No concrete code paths were available to cite.*

## Triggers / Entry points
| Trigger / Entry point | Source location |
|-----------------------|-----------------|
| HTTP POST `/api/v1/courses/:course_id/files` – upload a file | `files_controller.rb:??` |
| HTTP GET `/api/v1/courses/:course_id/files/:id` – download / preview a file | `files_controller.rb:??` |
| HTTP DELETE `/api/v1/files/:id` – delete a file | `files_controller.rb:??` |
| HTTP POST `/api/v1/folders` – create a folder | `folders_controller.rb:??` |
| HTTP PATCH `/api/v1/folders/:id` – rename / move a folder | `folders_controller.rb:??` |
| UI actions in the React “Files” page (upload button, drag‑and‑drop, folder tree) | UI component files (not provided) |
| Background job that cleans up orphaned attachments | `attachment.rb` (possible `after_destroy` callback) |

*`??` indicates that the exact line numbers could not be extracted because the source files were not available.*

## End-to-end flow (Mermaid)
```mermaid
sequenceDiagram
    participant User as "User (Instructor/Student)"
    participant Router as "Rails Router"
    participant FilesCtrl as "FilesController"
    participant FoldersCtrl as "FoldersController"
    participant FileSvc as "File Service (model logic)"
    participant FolderSvc as "Folder Service (model logic)"
    participant DB as "Database (files, folders, attachments)"
    participant Storage as "Object Storage (S3/Canvas Cloud)"
    participant Preview as "Preview Service (optional)"

    %% Upload file
    User->>Router: POST /courses/:cid/files (multipart)
    Router->>FilesCtrl: route to #create
    FilesCtrl->>FileSvc: validate params, authorize
    alt validation fails
        FileSvc-->>FilesCtrl: error response
        FilesCtrl-->>User: 400 Bad Request
    else authorized
        FileSvc->>DB: INSERT file record (file.rb)
        DB-->>FileSvc: file_id
        FileSvc->>Storage: PUT object (binary payload)
        Storage-->>FileSvc: 200 OK
        FileSvc->>DB: CREATE attachment record (attachment.rb)
        DB-->>FileSvc: attachment_id
        FileSvc-->>FilesCtrl: success (file_id, attachment_id)
        FilesCtrl-->>User: 201 Created (JSON)
    end

    %% Download / preview file
    User->>Router: GET /files/:fid
    Router->>FilesCtrl: route to #show
    FilesCtrl->>FileSvc: find file, check permissions
    alt not authorized
        FileSvc-->>FilesCtrl: 403 Forbidden
        FilesCtrl-->>User: 403
    else authorized
        FileSvc->>Storage: GET object
        Storage-->>FileSvc: file bytes
        alt preview request (Accept: image/*, application/pdf)
            FileSvc->>Preview: generate thumbnail / PDF preview
            Preview-->>FileSvc: preview URL
            FileSvc-->>FilesCtrl: preview response
        else regular download
            FileSvc-->>FilesCtrl: file stream
        end
        FilesCtrl-->>User: 200 OK (file or preview)
    end

    %% Create folder
    User->>Router: POST /folders
    Router->>FoldersCtrl: route to #create
    FoldersCtrl->>FolderSvc: validate, authorize
    alt validation fails
        FolderSvc-->>FoldersCtrl: error
        FoldersCtrl-->>User: 400
    else authorized
        FolderSvc->>DB: INSERT folder record (folder.rb)
        DB-->>FolderSvc: folder_id
        FolderSvc-->>FoldersCtrl: success
        FoldersCtrl-->>User: 201 Created
    end

    %% Share / set permissions
    User->>Router: PATCH /files/:fid (permissions payload)
    Router->>FilesCtrl: route to #update
    FilesCtrl->>FileSvc: authorize, apply ACL
    FileSvc->>DB: UPDATE file.permissions
    DB-->>FileSvc: success
    FileSvc-->>FilesCtrl: updated file
    FilesCtrl-->>User: 200 OK
```

*The diagram reflects the typical request‑response flow for the main actions exposed by `files_controller.rb` and `folders_controller.rb`. Because the actual source code was not available, line numbers cannot be cited.*

## State / data touched
| Data store | Entity | Access pattern | Source reference |
|------------|--------|----------------|------------------|
| `files` table | `File` model (`file.rb`) | INSERT on upload, SELECT on download/preview, UPDATE on permission change, DELETE on removal | `file.rb:??` |
| `folders` table | `Folder` model (`folder.rb`) | INSERT on folder creation, SELECT on navigation, UPDATE on rename/move, DELETE on removal | `folder.rb:??` |
| `attachments` table | `Attachment` model (`attachment.rb`) | INSERT when a file is stored, SELECT for download, DELETE when file is removed | `attachment.rb:??` |
| Object storage (e.g., S3) | Binary payload of each file | PUT on upload, GET on download/preview, DELETE on file removal | `file.rb:??` |
| Optional preview cache (Redis or local) | Generated thumbnails/previews | SET on first preview generation, GET on subsequent preview requests | `preview_service.rb:??` (not provided) |

## External dependencies
- **Object storage service** (e.g., Amazon S3, Canvas Cloud) – used for persisting the binary file data. Call sites would be in `file.rb` when writing/reading the attachment.  
- **Preview generation service** (e.g., ImageMagick, PDF.js) – invoked when a preview request is made. Call site would be in the controller or a background worker handling preview creation.  
- **Background job queue** (Sidekiq/Resque) – may be used for asynchronous processing such as virus scanning or preview generation. Call site would be in a worker class referenced from `file.rb` or `attachment.rb`.  

*Specific line numbers cannot be provided because the source files were not available.*

## Edge cases & failure modes (observed in code)
- **Validation failures** – missing required parameters (e.g., file name, size) cause a 400 response before any storage operation.  
- **Authorization failures** – users without `read`/`write` rights on a course or folder receive a 403 response.  
- **Storage errors** – if the object storage service returns an error (network timeout, permission denied), the controller returns a 502/503 and rolls back the DB transaction.  
- **Concurrent uploads** – the model likely uses optimistic locking (`lock_version`) to prevent race conditions when updating file metadata.  
- **Versioning conflicts** – attempting to overwrite a file without providing the correct `if-match`/`etag` may be rejected to preserve version history.  

*These failure modes are inferred from typical Canvas file‑handling patterns; the exact implementation details could not be verified without source code.*

## Open questions
1. **Exact versioning implementation** – does Canvas store each upload as a new `Attachment` record, or does it use a separate `FileVersion` table?  
2. **Permission inheritance** – how are folder permissions propagated to contained files, and is there a separate ACL model?  
3. **Preview generation pipeline** – is preview creation synchronous (blocking the request) or delegated to a background job, and which library is used?  
4. **Quota enforcement** – where is per‑user or per‑course storage quota checked, and what error is returned when exceeded?  
5. **API surface** – are there additional REST endpoints (e.g., bulk download, zip export) that are not captured by the two controller entry points?  

*These questions remain because the actual controller and model source files were not provided.*