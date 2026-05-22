---
title: F11 — ATS (Applicant Tracking System)
description: Module tuyển dụng end-to-end — Job posting, Candidate database, Application pipeline, Interview, Offer. Tích hợp đăng tin lên TopCV / ITviec / talent.vn qua adapter pattern.
tags: [ats, recruitment, plan, integration, topcv, itviec, talent]
---

# F11 — ATS (Applicant Tracking System)

> **Trạng thái**: 📋 planned. MVP scope: Phase 1 (~5–7 ngày). Phase 2 job-board push (~3–5 ngày/board).
>
> **Vị trí**: BE bounded context `apps/backend/src/apps/recruitment/` (mới). FE `apps/frontend/src/features/recruitment/`. Job-board adapters ở `apps/backend/src/apps/recruitment/integrations/<board>/`.
>
> **Routes**: `/recruitment/jobs` · `/recruitment/jobs/[slug]` · `/recruitment/candidates` · `/recruitment/candidates/[id]` · `/recruitment/applications` · `/settings/recruitment/integrations`.

## Vì sao cần

C-HR đã đóng vòng "đi làm hằng ngày" với F2 HRM + F3 Attendance + F8 Work + F9 Payroll + F10 Onboarding. Mảnh còn thiếu là **pre-hire** — pipeline trước khi 1 Employee được tạo.

Khoảng trống thị trường VN:
- **Base Hiring**: tốt nhưng đắt, UX 2020. Tích hợp TopCV tốt.
- **MISA AMIS Tuyển dụng**: enterprise feel, complex.
- **TopCV / ITviec dashboard**: job board kiêm ATS nhỏ, không có pipeline thực sự.
- **C-HR ATS**: pipeline gọn kiểu Linear/Lever + tích hợp HRM (candidate → employee cùng record) + push đa kênh ra TopCV/ITviec/talent.vn.

Tích hợp HRM là vũ khí chính: candidate `HIRED` → 1 click chuyển thành Employee + auto-trigger F10 Onboarding plan.

## Domain model

### Entity chính

| Model | Vai trò |
| --- | --- |
| `Job` | Job posting. Trạng thái DRAFT/PUBLISHED/PAUSED/CLOSED/FILLED. Có `departmentId` link sang HRM. `hiringManagerId` → User. `headcount`. Slug + code "JOB-15" (counter ở Organization). |
| `JobStage` | Pipeline column cho 1 Job. Default 5 stage: Sourced / Screening / Interview / Offer / Hired. Org cấu hình thêm/bớt được (giống TaskSection cho Task). `kind: SOURCED \| SCREENING \| INTERVIEW \| OFFER \| HIRED \| REJECTED` — kind cố định, name + order tuỳ biến. |
| `Candidate` | Người. Email + phone unique trong org. `source: MANUAL \| TOPCV \| ITVIEC \| TALENT_VN \| REFERRAL \| OTHER`. Soft-delete. Có `userId?` link User (sau khi `HIRED` → tạo User → fill). |
| `CandidateResume` | File CV của 1 candidate. 1 candidate có thể có nhiều resume (latest = active). MIME type, size, url, parsed metadata Json (nếu parse được). |
| `Application` | M:N giữa Candidate × Job. Trạng thái = current `stageId`. `appliedAt`. `rejectedAt? + rejectReason?`. `withdrawnAt?`. `externalId?` + `externalSource?` (TOPCV/ITVIEC/TALENT_VN) cho dedup khi inbound từ webhook. `stageHistory: Json` — array `[{ fromStageId, toStageId, userId, reason?, at }]` append-only, ghi mỗi lần đổi stage. Unique (`candidateId`, `jobId`). |
| `Interview` | Schedule phỏng vấn 1 application. `scheduledAt`, `durationMinutes`, `location?` hoặc `meetingUrl?`. `kind: PHONE \| ONSITE \| VIDEO \| TECHNICAL`. Reuse Calendar Event qua polymorphic ref (`objectType: 'Interview'`) để cùng UI lịch. |
| `InterviewParticipant` | Người tham gia (interviewer). M:N với User. |
| `Scorecard` | Đánh giá của 1 interviewer cho 1 application. `recommendation: STRONG_HIRE \| HIRE \| NO_HIRE \| STRONG_NO_HIRE`. `notes` (richtext). `scores: Json` (key-value: tech 4/5, communication 3/5...). |
| `Offer` | 1 application có thể có ≥ 0 offer (revise được). `salaryAmount`, `salaryCurrency`, `startDate`, `expiresAt`. `status: DRAFT \| SENT \| ACCEPTED \| DECLINED \| EXPIRED`. PDF attachment optional. |
| `TalentPool` | Tag generic cho Candidate (reuse F8 Tag system với `objectType: 'Candidate'`). KHÔNG cần entity mới — F8 Tag đủ. |
| `JobBoardIntegration` | 1 row per (org, board). `board: TOPCV \| ITVIEC \| TALENT_VN`. `credentialsEncrypted: Json`. `webhookSecret`. `isActive`. `lastSyncAt`. |
| `JobBoardPosting` | 1 Job × 1 JobBoardIntegration. `externalId` (id bên board). `externalUrl`. `lastSyncStatus`. `lastSyncError?`. Unique (`jobId`, `integrationId`). |

### Quyết định kiến trúc cứng

- **Candidate ≠ Employee**. Khi candidate `HIRED` → mở dialog "Tạo Employee" pre-fill từ Candidate + Offer. User confirm → tạo Employee record mới + link `Candidate.employeeId`. Không tự động chuyển — HR muốn cơ hội review payroll/dept trước.
- **JobStage giống TaskSection**: 5 kind cố định cho analytics (funnel, time-in-stage), nhưng tên + order tuỳ biến per-Org. `REJECTED` là kind đặc biệt — không xếp trong pipeline mà là "ngăn rác" bên cạnh; application bị reject có `stage.kind = REJECTED`.
- **Tag reuse F8**: TalentPool, skill tags, source tags đều dùng `TagAssignment` với `objectType: 'Candidate'`. Tránh nhân bản entity.
- **Comment + Activity reuse F6**: comment trên Candidate / Application / Interview đều qua `Comment` polymorphic. Activity log auto qua existing infra.
- **Calendar Event reuse F7**: Interview tạo qua Calendar service (Event polymorphic với `objectType: 'Interview'`) — share UI lịch, không bịa lịch riêng.
- **Job board push** dùng **adapter pattern**, không gom 1 service. Mỗi board 1 module riêng (`integrations/topcv/`, `integrations/itviec/`, `integrations/talent-vn/`). Cùng interface `JobBoardAdapter` (`publish`, `update`, `close`, `pullApplications`).
- **Inbound applications**: webhook endpoint riêng cho từng board ở `/webhooks/recruitment/<board>` (signature verify khác nhau). Convert → 1 internal `IncomingApplication` shape → service tạo Candidate (dedup theo email) + Application.

## Layout

```text
apps/backend/src/apps/recruitment/
├── recruitment.module.ts           # composition root cho bounded context
├── job/                            # CRUD Job + JobStage
│   ├── job.controller.ts
│   ├── job.service.ts
│   ├── job.repository.ts
│   ├── job.acl.ts                  # BaseAcl<Job>
│   └── dto/
├── candidate/                      # CRUD Candidate + Resume upload
│   ├── candidate.controller.ts
│   ├── candidate.service.ts
│   ├── candidate.repository.ts
│   └── dto/
├── application/                    # M:N Candidate × Job, stage transitions
│   ├── application.controller.ts
│   ├── application.service.ts      # moveStage, reject, withdraw, hire
│   ├── application.repository.ts
│   └── dto/
├── interview/                      # Schedule + scorecards
│   ├── interview.controller.ts
│   ├── interview.service.ts
│   ├── scorecard.controller.ts
│   ├── scorecard.service.ts
│   └── dto/
├── offer/
│   ├── offer.controller.ts
│   ├── offer.service.ts
│   └── dto/
├── lib/
│   ├── candidate-dedup.ts          # match by email/phone normalised
│   ├── hire-to-employee.ts         # convert candidate → employee + onboarding
│   └── slug.ts
└── integrations/                   # job board adapters
    ├── integrations.module.ts
    ├── job-board-integration.controller.ts  # CRUD JobBoardIntegration (per-org settings)
    ├── job-board-integration.service.ts
    ├── job-board-posting.service.ts         # call adapter.publish/update/close, log JobBoardPosting
    ├── adapter.interface.ts                 # JobBoardAdapter interface
    ├── webhook.controller.ts                # POST /webhooks/recruitment/:board
    ├── webhook-verifier.ts                  # board → secret signature verify
    ├── topcv/
    │   ├── topcv.adapter.ts
    │   └── topcv-webhook.handler.ts
    ├── itviec/
    │   ├── itviec.adapter.ts
    │   └── itviec-webhook.handler.ts
    └── talent-vn/
        ├── talent-vn.adapter.ts              # full Open API client (docs đầy đủ)
        └── talent-vn-webhook.handler.ts

apps/frontend/src/features/recruitment/
├── components/
│   ├── job/                        # JobList, JobCard, JobCreateDialog, JobDetailView
│   ├── candidate/                  # CandidateList, CandidateDetailDrawer, ResumeViewer
│   ├── application/                # PipelineBoard (Kanban kiểu BoardView), ApplicationRow
│   ├── interview/                  # ScheduleDialog, ScorecardForm
│   └── integrations/               # JobBoardConnectionCard (TopCV/ITviec/Talent)
├── hooks/
├── services/
├── views/
│   ├── JobListView.tsx
│   ├── JobDetailView.tsx           # tabs: Pipeline (Kanban), Applications (table), Settings
│   ├── CandidateListView.tsx
│   ├── CandidateDetailView.tsx
│   └── IntegrationsSettingsView.tsx
└── types/
```

## Adapter pattern cho job board

### Interface chung

```ts
// apps/backend/src/apps/recruitment/integrations/adapter.interface.ts
export interface PublishJobInput {
  internalJobId: string;
  title: string;
  description: string;
  requirements: string;
  benefits?: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'FREELANCE';
  workMode: 'ONSITE' | 'REMOTE' | 'HYBRID';
  workAddresses: Array<{ city: string; district?: string; address?: string }>;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable?: boolean;
  currency?: 'VND' | 'USD';
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  headcount: number;
  isUrgent?: boolean;
  expiresAt?: Date;
  // Mapping fields (board-specific category/profession slug)
  boardMapping?: Record<string, string>;
}

export interface PublishJobResult {
  externalId: string;
  externalUrl: string;
}

export interface JobBoardAdapter {
  readonly board: 'TOPCV' | 'ITVIEC' | 'TALENT_VN';
  publish(input: PublishJobInput, credentials: BoardCredentials): Promise<PublishJobResult>;
  update(externalId: string, input: Partial<PublishJobInput>, credentials: BoardCredentials): Promise<void>;
  close(externalId: string, credentials: BoardCredentials): Promise<void>;
  /** Optional — board hỗ trợ pull thì implement, không thì throw NotImplemented và rely vào webhook. */
  pullApplications?(externalJobId: string, since: Date, credentials: BoardCredentials): Promise<IncomingApplication[]>;
}

export interface IncomingApplication {
  externalApplicationId: string;
  externalJobId: string;
  candidate: {
    name: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    coverLetter?: string;
    expectedSalary?: number;
  };
  appliedAt: Date;
}
```

### Adapter cụ thể

#### talent.vn (docs đầy đủ — implement Phase 2 trước)

- **Endpoints**: `POST /api/v1/open-api/jobs`, `PUT /api/v1/open-api/jobs/:id`, `POST /api/v1/open-api/jobs/:id/close`, `DELETE /api/v1/open-api/jobs/:id`. Categories tra qua `GET /api/v1/open-api/categories`.
- **Auth**: `X-Api-Key: <token>` (raw, không hash).
- **Push**: chấp nhận field `externalId` + `externalUrl` — set = C-HR `Job.id` + URL.
- **Webhook inbound**: signature HMAC-SHA256 header `X-Talent-Signature`. Events: `application.created`, `application.withdrawn`, `job.expired`. Verify với `webhookSecret` đã setup.
- **Setup flow**: admin C-HR vào `/settings/recruitment/integrations` → "talent.vn" → paste token + webhookSecret (admin lấy từ trang "Kết nối API" trên talent.vn) → C-HR validate bằng cách gọi `GET /open-api/categories`.

#### TopCV (không public docs)

- TopCV cung cấp "Access Token" + "Secret Key" trong trang "Kết nối API" — nhưng phải mua gói + liên hệ BD team mới có. **API spec không công khai** — phải hỏi TopCV team khi triển khai thực tế.
- Pattern giống Base Hiring tích hợp TopCV: ATS đăng ký webhook URL trên TopCV → TopCV push CV về khi candidate apply.
- **Triển khai**: stub adapter trước, `publish()` throw NotImplemented nếu C-HR chưa có API key. Khi user vào setup, hiển thị thông báo "Liên hệ TopCV để lấy API access" + link. Khi có access, fill spec adapter sau.
- **Fallback**: cho phép user dán XML job URL từ TopCV (đăng tin manual trên TopCV, copy URL vào C-HR để track) — đây là pattern "shadow tracking" khi không có push API.

#### ITviec (chưa có public API)

- Theo search 5/2026, ITviec dùng Recruitee (3rd-party ATS) cho hiring nội bộ — họ không expose API cho ATS bên ngoài push job vào.
- **Triển khai**: skip Phase 2. Phase 3 cân nhắc 2 options:
  - **(A)** Email-forwarding: ITviec gửi email "candidate apply" về địa chỉ `ats+<job-id>@<org>.c-hr.vn` → C-HR parse email → tạo Candidate + Application. Đây là pattern Lever/Greenhouse dùng cho board không có API.
  - **(B)** Browser extension: scrape candidate list từ ITviec dashboard khi HR đang xem. Phức tạp + dễ vỡ.
  - Lean về (A) — đơn giản, robust hơn.

### Job board posting flow

```
HR mở Job detail → tab "Đăng tin" → tick các board muốn đăng → "Publish"

Backend:
  for each selected board:
    integration = JobBoardIntegration.findByOrgAndBoard(orgId, board)
    if !integration.isActive: skip + warn
    adapter = adapterRegistry.get(board)
    try:
      result = adapter.publish(buildPublishInput(job), integration.credentials)
      JobBoardPosting.create({ jobId, integrationId, externalId, externalUrl, lastSyncStatus: 'SUCCESS' })
    catch err:
      JobBoardPosting.create({ jobId, integrationId, lastSyncStatus: 'FAILED', lastSyncError: err.message })
      toast user
```

Update + close tương tự — dùng `JobBoardPosting.externalId` để gọi adapter.

### Inbound webhook

```
POST /webhooks/recruitment/:board
Headers:
  X-<Board>-Signature: <hmac>     # talent.vn: X-Talent-Signature
  X-<Board>-Event: <event-name>
  X-<Board>-Delivery-Id: <uuid>   # idempotency key

WebhookController:
  1. Lookup JobBoardIntegration by URL path :board + tenant clue (subdomain hoặc query)
  2. WebhookVerifier.verify(rawBody, signature, integration.webhookSecret)
  3. WebhookHandler<board>.handle(parsedBody)
     ├── Idempotency check: WebhookLog where deliveryId = X (skip if seen)
     ├── Convert payload → IncomingApplication
     ├── findOrCreateCandidate by email (org-scoped)
     ├── Match Job: JobBoardPosting.findByExternalId → internalJobId
     ├── Create Application (or skip if exists, e.g., re-delivery)
     └── Emit application.created event
  4. Return 200 OK; record WebhookLog status=PROCESSED
```

Idempotency + retry-safe vì board sẽ retry 5 lần (theo talent.vn pattern).

## Database — Prisma sketch (chính)

```prisma
model Job {
  id              String      @id @default(uuid())
  organizationId  String      @map("organization_id")
  code            String      // "JOB-15"
  slug            String      @unique
  title           String
  description     String      @db.Text
  requirements    String      @db.Text
  benefits        String?     @db.Text
  departmentId    String?     @map("department_id")
  hiringManagerId String?     @map("hiring_manager_id")
  status          JobStatus   @default(DRAFT)
  jobType         JobType
  workMode        WorkMode
  workAddresses   Json        // [{ city, district?, address? }]
  experienceMin   Int?
  experienceMax   Int?
  salaryMin       Decimal?    @db.Decimal(15, 2)
  salaryMax       Decimal?    @db.Decimal(15, 2)
  salaryNegotiable Boolean    @default(false)
  currency        String      @default("VND")
  requiredSkills  String[]
  niceToHaveSkills String[]
  headcount       Int         @default(1)
  isUrgent        Boolean     @default(false)
  expiresAt       DateTime?   @map("expires_at")
  publishedAt     DateTime?   @map("published_at")
  closedAt        DateTime?   @map("closed_at")
  createdById     String      @map("created_by_id")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  deletedAt       DateTime?   @map("deleted_at")

  organization    Organization @relation(...)
  department      Department?  @relation(...)
  hiringManager   User?        @relation("HiringManager", ...)
  createdBy       User         @relation("JobCreator", ...)
  stages          JobStage[]
  applications    Application[]
  postings        JobBoardPosting[]

  @@unique([organizationId, code])
  @@index([organizationId, status])
  @@map("jobs")
}

model JobStage {
  id        String       @id @default(uuid())
  jobId     String       @map("job_id")
  kind      JobStageKind
  name      String       // "Sàng lọc CV" / "Phỏng vấn vòng 1"
  order     Float
  createdAt DateTime     @default(now()) @map("created_at")
  updatedAt DateTime     @updatedAt @map("updated_at")

  job          Job           @relation(fields: [jobId], references: [id], onDelete: Cascade)
  applications Application[]

  @@index([jobId, order])
  @@map("job_stages")
}

enum JobStageKind {
  SOURCED
  SCREENING
  INTERVIEW
  OFFER
  HIRED
  REJECTED
}

model Candidate {
  id              String           @id @default(uuid())
  organizationId  String           @map("organization_id")
  fullName        String           @map("full_name")
  email           String
  phone           String?
  headline        String?          // "Senior Backend at FPT"
  location        String?
  linkedinUrl     String?          @map("linkedin_url")
  source          CandidateSource  @default(MANUAL)
  sourceMeta      Json?            @map("source_meta")  // externalApplicationId, board-specific
  userId          String?          @unique @map("user_id")        // set khi HIRED → tạo User
  employeeId      String?          @unique @map("employee_id")    // set khi HIRED → tạo Employee
  createdById     String           @map("created_by_id")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")

  organization  Organization      @relation(...)
  user          User?             @relation("CandidateUser", ...)
  employee      Employee?         @relation("CandidateEmployee", ...)
  resumes       CandidateResume[]
  applications  Application[]

  @@unique([organizationId, email])
  @@index([organizationId, source])
  @@map("candidates")
}

enum CandidateSource {
  MANUAL
  REFERRAL
  TOPCV
  ITVIEC
  TALENT_VN
  CAREER_PAGE     // C-HR-hosted job page (Phase 3)
  OTHER
}

model CandidateResume {
  id          String   @id @default(uuid())
  candidateId String   @map("candidate_id")
  filename    String
  url         String
  mimeType    String   @map("mime_type")
  sizeBytes   Int      @map("size_bytes")
  isActive    Boolean  @default(true) @map("is_active")
  parsedMeta  Json?    @map("parsed_meta")   // optional resume-parser output
  uploadedBy  String   @map("uploaded_by")
  createdAt   DateTime @default(now()) @map("created_at")

  candidate Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@index([candidateId, isActive])
  @@map("candidate_resumes")
}

model Application {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  candidateId     String   @map("candidate_id")
  jobId           String   @map("job_id")
  stageId         String   @map("stage_id")
  coverLetter     String?  @db.Text
  expectedSalary  Decimal? @map("expected_salary") @db.Decimal(15, 2)
  resumeId        String?  @map("resume_id")             // CandidateResume snapshot khi apply
  appliedAt       DateTime @default(now()) @map("applied_at")
  rejectedAt      DateTime? @map("rejected_at")
  rejectReason    String?  @map("reject_reason")
  withdrawnAt     DateTime? @map("withdrawn_at")
  externalId      String?  @map("external_id")           // board's appId
  externalSource  CandidateSource? @map("external_source")
  stageHistory    Json     @default("[]") @map("stage_history")
  // stageHistory shape: [{ fromStageId: string | null, toStageId: string,
  //                       userId: string, reason?: string, at: ISO }]
  // Append-only; service push entry mỗi lần đổi stage.
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)
  candidate    Candidate    @relation(fields: [candidateId], references: [id])
  job          Job          @relation(fields: [jobId], references: [id])
  stage        JobStage     @relation(fields: [stageId], references: [id])
  interviews   Interview[]
  scorecards   Scorecard[]
  offers       Offer[]

  @@unique([candidateId, jobId])
  @@index([organizationId, stageId])
  @@map("applications")
}

model Interview {
  id              String        @id @default(uuid())
  applicationId   String        @map("application_id")
  kind            InterviewKind
  scheduledAt     DateTime      @map("scheduled_at")
  durationMinutes Int           @default(60) @map("duration_minutes")
  location        String?
  meetingUrl      String?       @map("meeting_url")
  calendarEventId String?       @unique @map("calendar_event_id")    // link Event polymorphic
  notes           String?
  createdById     String        @map("created_by_id")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  cancelledAt     DateTime?     @map("cancelled_at")

  application  Application            @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  participants InterviewParticipant[]
  scorecards   Scorecard[]

  @@index([applicationId])
  @@map("interviews")
}

enum InterviewKind {
  PHONE
  ONSITE
  VIDEO
  TECHNICAL
}

model InterviewParticipant {
  interviewId  String  @map("interview_id")
  userId       String  @map("user_id")
  isInterviewer Boolean @default(true) @map("is_interviewer")

  interview Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id])

  @@id([interviewId, userId])
  @@map("interview_participants")
}

model Scorecard {
  id            String   @id @default(uuid())
  applicationId String   @map("application_id")
  interviewId   String?  @map("interview_id")            // null = ungrouped feedback
  userId        String   @map("user_id")                 // who scored
  recommendation Recommendation
  scores        Json                                       // { tech: 4, communication: 3, ... }
  notes         String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  interview   Interview?  @relation(fields: [interviewId], references: [id], onDelete: SetNull)
  user        User        @relation(fields: [userId], references: [id])

  @@unique([applicationId, interviewId, userId])
  @@map("scorecards")
}

enum Recommendation {
  STRONG_HIRE
  HIRE
  NO_HIRE
  STRONG_NO_HIRE
}

model Offer {
  id              String      @id @default(uuid())
  applicationId   String      @map("application_id")
  salaryAmount    Decimal     @map("salary_amount") @db.Decimal(15, 2)
  salaryCurrency  String      @default("VND") @map("salary_currency")
  startDate       DateTime    @map("start_date")
  expiresAt       DateTime    @map("expires_at")
  status          OfferStatus @default(DRAFT)
  notes           String?
  pdfUrl          String?     @map("pdf_url")
  sentAt          DateTime?   @map("sent_at")
  acceptedAt      DateTime?   @map("accepted_at")
  declinedAt      DateTime?   @map("declined_at")
  createdById     String      @map("created_by_id")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@map("offers")
}

enum OfferStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
  EXPIRED
}

model JobBoardIntegration {
  id                    String           @id @default(uuid())
  organizationId        String           @map("organization_id")
  board                 JobBoard
  credentialsEncrypted  String           @map("credentials_encrypted")  // AES-encrypted Json
  webhookSecret         String?          @map("webhook_secret")
  isActive              Boolean          @default(false)
  lastSyncAt            DateTime?        @map("last_sync_at")
  lastError             String?          @map("last_error")
  createdById           String           @map("created_by_id")
  createdAt             DateTime         @default(now()) @map("created_at")
  updatedAt             DateTime         @updatedAt @map("updated_at")

  organization Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  postings     JobBoardPosting[]

  @@unique([organizationId, board])
  @@map("job_board_integrations")
}

enum JobBoard {
  TOPCV
  ITVIEC
  TALENT_VN
}

model JobBoardPosting {
  id              String              @id @default(uuid())
  jobId           String              @map("job_id")
  integrationId   String              @map("integration_id")
  externalId      String              @map("external_id")
  externalUrl     String?             @map("external_url")
  lastSyncStatus  PostingSyncStatus   @default(PENDING) @map("last_sync_status")
  lastSyncError   String?             @map("last_sync_error")
  publishedAt     DateTime?           @map("published_at")
  closedAt        DateTime?           @map("closed_at")
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  job         Job                 @relation(fields: [jobId], references: [id], onDelete: Cascade)
  integration JobBoardIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@unique([jobId, integrationId])
  @@unique([integrationId, externalId])
  @@map("job_board_postings")
}

enum PostingSyncStatus {
  PENDING
  SUCCESS
  FAILED
  CLOSED
}
```

## FE routes + UX

| Route | Mục đích |
| --- | --- |
| `/recruitment/jobs` | List jobs, filter status/department. Counter open positions. |
| `/recruitment/jobs/new` | Create job (multi-step wizard hoặc 1 form dài). |
| `/recruitment/jobs/[slug]` | Job detail. Tab Pipeline (Kanban application theo stage), Applications (table), Postings (job board), Settings. |
| `/recruitment/candidates` | Global candidate database (cross-job). Filter source / tag / skill. |
| `/recruitment/candidates/[id]` | Candidate detail drawer hoặc page. Tabs: Profile, Applications, Resumes, Activity, Notes. |
| `/recruitment/applications` | Global application list (cross-job) — chủ yếu HR mở để duyệt batch. |
| `/recruitment/interviews` | Lịch phỏng vấn — embed CalendarView nhưng filter `objectType: 'Interview'`. |
| `/settings/recruitment/integrations` | Setup TopCV / ITviec / Talent.vn credentials. Admin org only. |

Pipeline Kanban giống `BoardView` của F8 Work (drag-drop, optimistic update). Reuse `@dnd-kit` đã cài.

## Phase rollout

### Phase 1 — Core ATS (5–7 ngày)

| # | Việc | Mô tả |
|---|------|-------|
| 1 | Prisma schema | Job + JobStage + Candidate + CandidateResume + Application + ApplicationStageHistory. Migration. |
| 2 | BE module skeleton | `apps/recruitment/{job,candidate,application}` — CRUD + ACL pattern theo F8. |
| 3 | FE list + detail | JobListView + JobDetailView (chỉ tab Pipeline) + CandidateListView. |
| 4 | Pipeline Kanban | Reuse `BoardView` shell, mỗi cột = JobStage. Drag-drop di chuyển Application. Optimistic + history log. |
| 5 | Resume upload | Reuse `/uploads/inline-image` pattern → tạo endpoint `/uploads/resume` (PDF/DOC limit 10MB). |
| 6 | Candidate → Employee | "Hire" action: dialog confirm → tạo Employee từ Candidate + Offer. Trigger F10 Onboarding plan (event `candidate.hired`). |
| 7 | Sidebar nav | Thêm group "Tuyển dụng" với 3 mục: Jobs / Candidates / Interviews. Gate by `requireAppAdmin('HRM', orgId)`. |

### Phase 2 — Job-board push: talent.vn (3–5 ngày)

| # | Việc | Mô tả |
|---|------|-------|
| 1 | Schema | JobBoardIntegration + JobBoardPosting. |
| 2 | Adapter interface + registry | `adapter.interface.ts` + `adapterRegistry.get(board)`. |
| 3 | Talent.vn adapter | Full client: publish/update/close/categories. `/api/v1/open-api/jobs` với X-Api-Key. |
| 4 | Setup page | `/settings/recruitment/integrations` — admin paste token + webhookSecret + webhookUrl callback. Validate qua `GET /open-api/categories`. |
| 5 | Push UI | Tab "Đăng tin" trong JobDetailView — list các integration active, tick + Publish. JobBoardPosting row tracking. |
| 6 | Inbound webhook | `POST /webhooks/recruitment/talent-vn` — verify signature, idempotency theo deliveryId, convert → Candidate + Application. |
| 7 | Webhook log UI | Admin xem trang `/settings/recruitment/integrations/talent-vn/logs` — last 100 events, status SUCCESS/FAILED. |

### Phase 3 — Interview + Scorecard + Offer (3–5 ngày)

| # | Việc | Mô tả |
|---|------|-------|
| 1 | Interview schema + service | Reuse Calendar Event qua polymorphic ref. ScheduleDialog từ application detail. |
| 2 | Scorecard form | Submit per-interviewer per-interview. Recommendation + scores Json + notes. |
| 3 | Offer | Đơn giản: form salary + start date + expires. Status DRAFT/SENT/ACCEPTED/DECLINED. PDF Phase 4. |
| 4 | InterviewCalendarView | Tab "Lịch phỏng vấn" — filter event nơi `objectType='Interview'`. |

### Phase 4 — TopCV + ITviec (each 3 ngày khi có access)

- TopCV: liên hệ BD lấy spec → fill adapter. Pattern giống talent.vn.
- ITviec: email-forwarding pattern (mailbox parser) — đòi hỏi infra mail receive (SES inbound / Postmark inbound). Cân nhắc khi có user yêu cầu thực tế.

### Phase 5 — Polish (ad-hoc)

- Resume parser (PDF → structured Json) — gọi 3rd party như Affinda / hoặc OpenAI structured output.
- Career page public (C-HR-hosted): `https://<org-slug>.c-hr.vn/careers` — list job + form apply. `Candidate.source = CAREER_PAGE`.
- GDPR / privacy: candidate data retention (auto-delete sau N năm nếu không hire), candidate có thể request xóa.
- Analytics: time-to-hire, source effectiveness, drop-off per stage.

## Open questions / chốt trước khi build

1. **JobStage cấu hình per-org hay per-job?** Per-org template (5 default stages, admin edit ở `/settings/recruitment/stages`), job mới clone template. **Đề xuất**: per-org template, job clone tại create — đơn giản, đa số org không cần stage khác nhau per-job.
2. **Candidate duplicate**: dedup theo email org-scoped. Nếu candidate apply 2 job khác nhau cùng org → 1 Candidate record, 2 Application. Phone secondary dedup không bắt buộc.
3. **External duplicate qua webhook**: nếu TopCV và talent.vn cùng có candidate "a@b.com" apply cùng 1 job (qua 2 board khác nhau) → 1 Candidate, 2 Application với khác `externalSource`. Acceptable.
4. **Permission**: ATS gate qua app `RECRUITMENT` mới hoặc reuse `HRM` appadmin? **Đề xuất**: app `RECRUITMENT` mới — HR và Hiring Manager là 2 role khác nhau, không phải ai HRM cũng đụng recruitment.
5. **Webhook URL multi-tenant**: dùng path `/webhooks/recruitment/talent-vn/:integrationId` để biết tenant, hay subdomain `<org>.c-hr.vn/webhooks/...`? **Đề xuất**: path param với `integrationId` — đơn giản, không đụng DNS.
6. **TopCV/ITviec không có docs**: ship Phase 2 chỉ với talent.vn. Phase 4 khi có user/customer cần TopCV thì liên hệ TopCV BD lấy spec rồi fill adapter — đừng build trên giả định.

## Lý do chọn từng quyết định

- **Bounded context `recruitment/` riêng** (không gộp vào `hrm/`): lifecycle khác nhau, persona khác nhau (recruiter ≠ HR ops), entity không share trừ Department + User. Tách rõ giúp permission gating sạch.
- **Candidate ≠ Employee dù có thể là cùng người**: candidate phase có data nhạy cảm (expectedSalary, scorecard NO_HIRE) không muốn lẫn vào employee record. Convert là 1 hành động chủ động.
- **Adapter pattern thay vì 1 service to**: mỗi board có quirk riêng (TopCV no docs, ITviec không API, talent.vn có docs). Interface chung + module riêng dễ test, dễ thay thế, dễ disable.
- **Inbound webhook idempotent**: board sẽ retry → cần dedup theo deliveryId. WebhookLog có cả status để debug khi miss event.
- **Reuse F6 Comment + F7 Calendar + F8 Tag**: tránh đẻ entity duplicate. ATS là consumer của infra polymorphic đã build.
