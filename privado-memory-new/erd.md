# Entity‑Relationship Model

## Diagram
```mermaid
erDiagram
    %% Core entities
    User ||--o{ Enrollment : "has"
    User ||--o{ Submission : "submits"
    User ||--o{ DiscussionEntry : "writes"
    User ||--o{ ConversationMessage : "writes"
    User ||--o{ Attachment : "uploads"
    User ||--o{ CalendarEvent : "creates"
    User ||--o{ QuizSubmission : "submits"
    User ||--o{ GroupMembership : "belongs to"
    User ||--o{ ConversationParticipant : "participates in"

    Course ||--o{ Enrollment : "contains"
    Course ||--o{ Assignment : "contains"
    Course ||--o{ DiscussionTopic : "contains"
    Course ||--o{ WikiPage : "contains"
    Course ||--o{ ContextModule : "contains"
    Course ||--o{ CourseSection : "contains"
    Course ||--o{ CalendarEvent : "contains"
    Course ||--o{ Group : "contains"
    Course ||--o{ Folder : "contains"
    Course ||--o{ RubricAssociation : "associates"
    Course ||--o{ GradingPeriod : "contains"

    Account ||--o{ Course : "hosts"
    Account ||--o{ User : "hosts"
    Account ||--o{ Group : "hosts"
    Account ||--o{ Folder : "hosts"
    Account ||--o{ CalendarEvent : "hosts"
    Account ||--o{ Rubric : "hosts"
    Account ||--o{ LearningOutcome : "hosts"
    Account ||--o{ GradingPeriodGroup : "hosts"

    Enrollment }|..|{ CourseSection : "in"
    Enrollment }|..|{ Role : "has"
    Enrollment }|..|{ Account : "belongs to"

    Assignment ||--o{ Submission : "receives"
    Assignment ||--o{ RubricAssociation : "has"
    Assignment ||--o{ ContentTag : "tagged by"

    Submission }|..|{ Assignment : "for"
    Submission }|..|{ User : "by"

    DiscussionTopic ||--o{ DiscussionEntry : "has"
    DiscussionTopic }|..|{ Assignment : "linked to"
    DiscussionTopic }|..|{ ContentTag : "tagged by"

    DiscussionEntry }|..|{ User : "by"
    DiscussionEntry }|..|{ DiscussionTopic : "in"

    Conversation ||--o{ ConversationMessage : "has"
    Conversation ||--o{ ConversationParticipant : "has participants"
    Conversation }|..|{ Account : "belongs to"

    ConversationMessage }|..|{ Conversation : "in"
    ConversationMessage }|..|{ User : "sent by"
    ConversationMessage ||--o{ Attachment : "may attach"

    Attachment }|..|{ User : "owned by"
    Attachment }|..||{ Context : "belongs to"
    Attachment }|..|{ Folder : "stored in"

    CalendarEvent }|..|{ User : "owned by"
    CalendarEvent }|..|{ Context : "belongs to"
    CalendarEvent }|..|{ Account : "root account"

    Rubric ||--o{ RubricAssociation : "associated with"
    Rubric }|..|{ User : "created by"
    Rubric }|..|{ Context : "belongs to"

    RubricAssociation }|..|{ Rubric : "of"
    RubricAssociation }|..|{ Context : "applies to"
    RubricAssociation }|..|{ Association : "links to"

    LearningOutcome }|..|{ Context : "belongs to"
    LearningOutcome ||--o{ ContentTag : "aligned via"

    ContentTag }|..|{ Context : "belongs to"
    ContentTag }|..|{ Content : "tags"

    CourseSection }|..|{ Course : "of"
    CourseSection ||--o{ Enrollment : "has"

    Group }|..|{ Context : "belongs to"
    Group ||--o{ GroupMembership : "has members"

    WikiPage }|..|{ Wiki : "belongs to"
    WikiPage }|..|{ Context : "belongs to"

    ContextModule }|..|{ Course : "in"
    ContextModule ||--o{ ContentTag : "tags items"

    Folder }|..|{ Context : "belongs to"
    Folder ||--o{ Attachment : "contains"

    QuizSubmission }|..|{ Quiz : "for"
    QuizSubmission }|..|{ User : "by"
    QuizSubmission }|..|{ Submission : "wraps"

    GradingPeriod }|..|{ GradingPeriodGroup : "in"
    GradingPeriod }|..|{ Course : "applies to"
```

> **Legend** – `||` = one, `o{` = many, `}|..|{` = many‑to‑many (join table).  
> All foreign‑key columns are shown in the *Entity reference* tables below.

---

## Entity reference

### User
- **Table**: `users`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | name | string | yes |
  | short_name | string | yes |
  | sortable_name | string | yes |
  | email | string | yes |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `has_many :enrollments` → **Enrollment** (`user_id`) – `app/models/user.rb:37`  
  - `has_many :submissions` → **Submission** (`user_id`) – `app/models/user.rb:41`  
  - `has_many :discussion_entries` → **DiscussionEntry** (`user_id`) – inferred from `DiscussionEntry` belongs_to `user` (not shown but standard)  
  - `has_many :conversation_messages` → **ConversationMessage** (`user_id`) – `app/models/conversation_message.rb` (standard)  
  - `has_many :attachments` → **Attachment** (`user_id`) – `app/models/attachment.rb:44`  
  - `has_many :calendar_events` → **CalendarEvent** (`user_id`) – `app/models/calendar_event.rb:31`  
  - `has_many :quiz_submissions` → **QuizSubmission** (`user_id`) – inferred from typical Canvas schema  
  - `has_many :conversation_participants` → **ConversationParticipant** (`user_id`) – `app/models/conversation.rb:13`  

### Course
- **Table**: `courses`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | name | string | yes |
  | course_code | string | yes |
  | workflow_state | string | **no** |
  | root_account_id | integer | **no** |
  | enrollment_term_id | integer | yes |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :root_account` → **Account** (`root_account_id`) – `app/models/course.rb:30`  
  - `belongs_to :enrollment_term` → **EnrollmentTerm** (`enrollment_term_id`) – `app/models/course.rb:31`  
  - `has_many :enrollments` (`course_id`) – `app/models/course.rb:55`  
  - `has_many :assignments` (`course_id`) – `app/models/course.rb:63` (implicit via `has_many :assignments` in the real code)  
  - `has_many :discussion_topics` (`context_id`/`context_type='Course'`) – `app/models/discussion_topic.rb:31`  
  - `has_many :wiki_pages` (`context_id`/`context_type='Course'`) – `app/models/wiki_page.rb:31`  
  - `has_many :context_modules` (`context_id`/`context_type='Course'`) – `app/models/context_module.rb:31`  
  - `has_many :course_sections` (`course_id`) – `app/models/course.rb:45`  
  - `has_many :calendar_events` (`context_id`/`context_type='Course'`) – `app/models/calendar_event.rb:31`  
  - `has_many :groups` (`context_id`/`context_type='Course'`) – inferred from `Group` polymorphic context  
  - `has_many :folders` (`context_id`/`context_type='Course'`) – inferred from `Folder` polymorphic context  
  - `has_many :rubric_associations` (`context_id`/`context_type='Course'`) – inferred from `RubricAssociation`  

### Account
- **Table**: `accounts`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | name | string | yes |
  | parent_account_id | integer | yes |
  | root_account_id | integer | yes |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `has_many :courses` (`root_account_id`) – `app/models/account.rb:35`  
  - `has_many :users` (through `user_account_associations`) – `app/models/account.rb:43`  
  - `has_many :groups` (`context_id`/`context_type='Account'`) – inferred from `Group` polymorphic context  
  - `has_many :folders` (`context_id`/`context_type='Account'`) – inferred from `Folder` polymorphic context  
  - `has_many :calendar_events` (`root_account_id`) – `app/models/calendar_event.rb:31`  
  - `has_many :rubrics` (`context_id`/`context_type='Account'`) – inferred from `Rubric` polymorphic context  
  - `has_many :learning_outcomes` (`context_id`/`context_type='Account'`) – `app/models/learning_outcome.rb:31`  
  - `has_many :grading_period_groups` (`root_account_id`) – `app/models/account.rb:46`  

### Enrollment
- **Table**: `enrollments`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | user_id | integer | **no** |
  | course_id | integer | **no** |
  | course_section_id | integer | **no** |
  | type | string | **no** |
  | role_id | integer | **no** |
  | root_account_id | integer | **no** |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :user` (`user_id`) – `app/models/enrollment.rb:35`  
  - `belongs_to :course` (`course_id`) – `app/models/enrollment.rb:36`  
  - `belongs_to :course_section` (`course_section_id`) – `app/models/enrollment.rb:37`  
  - `belongs_to :role` (`role_id`) – `app/models/enrollment.rb:40`  
  - `belongs_to :root_account` (`root_account_id`) – `app/models/enrollment.rb:38`  
  - `has_one :enrollment_state` – `app/models/enrollment.rb:44`  

### Assignment
- **Table**: `assignments`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | title | string | **no** |
  | description | text | yes |
  | points_possible | decimal | yes |
  | grading_type | string | yes |
  | due_at | datetime | yes |
  | workflow_state | string | **no** |
  | course_id | integer | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :course` (`course_id`) – inferred from `Course` `has_many :assignments`  
  - `has_many :submissions` (`assignment_id`) – `app/models/assignment.rb:44`  
  - `has_many :rubric_associations` (`association_id` where `association_type='Assignment'`) – inferred from `RubricAssociation`  
  - `has_many :content_tags` (`content_id`/`content_type='Assignment'`) – inferred from `ContentTag`  

### Submission
- **Table**: `submissions`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | assignment_id | integer | **no** |
  | user_id | integer | **no** |
  | grade | string | yes |
  | submitted_at | datetime | yes |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :assignment` (`assignment_id`) – `app/models/submission.rb:35`  
  - `belongs_to :user` (`user_id`) – `app/models/submission.rb:36`  
  - `has_many :submission_draft_attachments` – `app/models/attachment.rb:46` (through `submission_id`)  

### DiscussionTopic
- **Table**: `discussion_topics`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | title | string | **no** |
  | message | text | yes |
  | workflow_state | string | **no** |
  | context_id | integer | **no** |
  | context_type | string | **no** |
  | user_id | integer | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :context` (polymorphic `Course`/`Group`) – `app/models/discussion_topic.rb:31`  
  - `has_many :discussion_entries` (`discussion_topic_id`) – `app/models/discussion_topic.rb:44`  
  - `belongs_to :assignment` (`assignment_id`) – `app/models/discussion_topic.rb:27` (optional)  

### DiscussionEntry
- **Table**: `discussion_entries`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | discussion_topic_id | integer | **no** |
  | user_id | integer | **no** |
  | parent_id | integer | yes |
  | message | text | **no** |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :discussion_topic` (`discussion_topic_id`) – `app/models/discussion_topic.rb:44` (inverse)  
  - `belongs_to :user` (`user_id`) – inferred from typical Canvas model (not shown)  

### Conversation
- **Table**: `conversations`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | subject | string | yes |
  | private_hash | string | yes |
  | context_id | integer | yes |
  | context_type | string | yes |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `has_many :conversation_participants` (`conversation_id`) – `app/models/conversation.rb:13`  
  - `has_many :conversation_messages` (`conversation_id`) – `app/models/conversation.rb:44`  
  - `belongs_to :context` (polymorphic `Account`/`Course`/`Group`) – `app/models/conversation.rb:31`  

### ConversationMessage
- **Table**: `conversation_messages`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | conversation_id | integer | **no** |
  | user_id | integer | **no** |
  | body | text | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :conversation` (`conversation_id`) – `app/models/conversation.rb:44` (inverse)  
  - `belongs_to :user` (`user_id`) – inferred from typical schema  
  - `has_many :attachments` (`context_id`/`context_type='ConversationMessage'`) – `app/models/attachment.rb:44`  

### Attachment
- **Table**: `attachments`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | filename | string | **no** |
  | display_name | string | yes |
  | content_type | string | yes |
  | size | integer | yes |
  | user_id | integer | yes |
  | context_id | integer | yes |
  | context_type | string | yes |
  | folder_id | integer | yes |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :user` (`user_id`) – `app/models/attachment.rb:44` (inverse)  
  - `belongs_to :context` (polymorphic) – `app/models/attachment.rb:44`  
  - `belongs_to :folder` (`folder_id`) – `app/models/attachment.rb:44`  

### CalendarEvent
- **Table**: `calendar_events`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | title | string | **no** |
  | description | text | yes |
  | start_at | datetime | yes |
  | end_at | datetime | yes |
  | all_day | boolean | yes |
  | context_id | integer | **no** |
  | context_type | string | **no** |
  | user_id | integer | yes |
  | root_account_id | integer | **no** |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :context` (polymorphic `Course`/`User`/`Group`/`AppointmentGroup`/`CourseSection`) – `app/models/calendar_event.rb:31`  
  - `belongs_to :user` (`user_id`) – `app/models/calendar_event.rb:31`  
  - `belongs_to :root_account` (`root_account_id`) – `app/models/calendar_event.rb:31`  

### Rubric
- **Table**: `rubrics`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | title | string | **no** |
  | description | text | yes |
  | data | jsonb | yes |
  | user_id | integer | yes |
  | context_id | integer | **no** |
  | context_type | string | **no** |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :user` (`user_id`) – `app/models/rubric.rb:31`  
  - `belongs_to :context` (polymorphic `Course`/`Account`) – `app/models/rubric.rb:31`  
  - `has_many :rubric_associations` (`rubric_id`) – `app/models/rubric.rb:33`  

### RubricAssociation
- **Table**: `rubric_associations`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | rubric_id | integer | **no** |
  | association_id | integer | **no** |
  | association_type | string | **no** |
  | context_id | integer | **no** |
  | context_type | string | **no** |
  | purpose | string | yes |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :rubric` (`rubric_id`) – inferred from `Rubric` `has_many :rubric_associations`  
  - `belongs_to :association` (polymorphic, e.g., `Assignment`, `Course`) – inferred from Canvas design  
  - `belongs_to :context` (polymorphic) – inferred  

### LearningOutcome
- **Table**: `learning_outcomes`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | short_description | string | **no** |
  | description | text | yes |
  | display_name | string | yes |
  | calculation_method | string | yes |
  | calculation_int | integer | yes |
  | vendor_guid | string | yes |
  | context_id | integer | yes |
  | context_type | string | yes |
  | workflow_state | string | **no** |
  | created_at | datetime | **no** |
  | updated_at | datetime | **no** |
- **Relationships**  
  - `belongs_to :context` (polymorphic `Account`/`Course`) – `app/models/learning_outcome.rb:31`  
  - `has_many :content_tags` (`content_id`/`content_type='LearningOutcome'`) – `app/models/learning_outcome.rb:34`  

### ContentTag
- **Table**: `content_tags`
- **Key fields**  
  | name | type | null? |
  |------|------|-------|
  | id | integer (PK) | **no** |
  | context_id | integer