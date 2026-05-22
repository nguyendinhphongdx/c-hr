import type { ID, ISODate, Nullable } from "@/lib/types";

export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "PAUSED"
  | "CLOSED"
  | "FILLED";

export type JobType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERN"
  | "FREELANCE";

export type WorkMode = "ONSITE" | "REMOTE" | "HYBRID";

export type JobStageKind =
  | "SOURCED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED";

export type CandidateSource =
  | "MANUAL"
  | "REFERRAL"
  | "TOPCV"
  | "ITVIEC"
  | "TALENT_VN"
  | "CAREER_PAGE"
  | "OTHER";

export interface WorkAddress {
  city: string;
  district?: string;
  address?: string;
}

export interface UserSummary {
  id: ID;
  name: Nullable<string>;
  email: string;
  avatar: Nullable<string>;
}

export interface DepartmentSummary {
  id: ID;
  name: string;
  code: Nullable<string>;
}

export interface JobStage {
  id: ID;
  jobId: ID;
  kind: JobStageKind;
  name: string;
  order: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface JobAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canClose: boolean;
}

export interface Job {
  id: ID;
  organizationId: ID;
  code: string;
  slug: string;
  title: string;
  description: string;
  requirements: string;
  benefits: Nullable<string>;
  departmentId: Nullable<ID>;
  hiringManagerId: Nullable<ID>;
  createdById: ID;
  status: JobStatus;
  jobType: JobType;
  workMode: WorkMode;
  workAddresses: WorkAddress[];
  experienceMin: Nullable<number>;
  experienceMax: Nullable<number>;
  salaryMin: Nullable<string>;
  salaryMax: Nullable<string>;
  salaryNegotiable: boolean;
  currency: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  headcount: number;
  isUrgent: boolean;
  expiresAt: Nullable<ISODate>;
  publishedAt: Nullable<ISODate>;
  closedAt: Nullable<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  hiringManager: Nullable<UserSummary>;
  createdBy: UserSummary;
  department: Nullable<DepartmentSummary>;
  stages: JobStage[];
  _count: { applications: number };
  view?: JobAclView;
}

export interface CreateJobInput {
  title: string;
  description: string;
  requirements: string;
  benefits?: string;
  departmentId?: ID;
  hiringManagerId?: ID;
  jobType: JobType;
  workMode: WorkMode;
  workAddresses: WorkAddress[];
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable?: boolean;
  currency?: string;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  headcount?: number;
  isUrgent?: boolean;
  expiresAt?: string;
}

export type UpdateJobInput = Partial<CreateJobInput>;

export interface ListJobsQuery {
  status?: JobStatus;
  departmentId?: ID;
  q?: string;
}

export interface CandidateAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CandidateResume {
  id: ID;
  candidateId: ID;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  createdAt: ISODate;
}

export interface Candidate {
  id: ID;
  organizationId: ID;
  fullName: string;
  email: string;
  phone: Nullable<string>;
  headline: Nullable<string>;
  location: Nullable<string>;
  linkedinUrl: Nullable<string>;
  source: CandidateSource;
  userId: Nullable<ID>;
  employeeId: Nullable<ID>;
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: UserSummary;
  user: Nullable<UserSummary>;
  employee: Nullable<{ id: ID; code: string }>;
  resumes: CandidateResume[];
  _count: { applications: number };
  view?: CandidateAclView;
}

export interface CreateCandidateInput {
  fullName: string;
  email: string;
  phone?: string;
  headline?: string;
  location?: string;
  linkedinUrl?: string;
  source?: CandidateSource;
}

export type UpdateCandidateInput = Partial<Omit<CreateCandidateInput, "email">>;

export interface ListCandidatesQuery {
  source?: CandidateSource;
  q?: string;
}

export interface ApplicationAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ApplicationCandidateSummary {
  id: ID;
  fullName: string;
  email: string;
  phone: Nullable<string>;
  headline: Nullable<string>;
  source: CandidateSource;
  employeeId: Nullable<ID>;
}

export interface ApplicationJobSummary {
  id: ID;
  code: string;
  slug: string;
  title: string;
  status: JobStatus;
}

export interface StageHistoryEntry {
  fromStageId: Nullable<ID>;
  toStageId: ID;
  userId: ID;
  reason?: string;
  at: ISODate;
}

export interface Application {
  id: ID;
  organizationId: ID;
  candidateId: ID;
  jobId: ID;
  stageId: ID;
  resumeId: Nullable<ID>;
  coverLetter: Nullable<string>;
  expectedSalary: Nullable<string>;
  appliedAt: ISODate;
  rejectedAt: Nullable<ISODate>;
  rejectReason: Nullable<string>;
  withdrawnAt: Nullable<ISODate>;
  externalId: Nullable<string>;
  externalSource: Nullable<CandidateSource>;
  stageHistory: StageHistoryEntry[];
  createdAt: ISODate;
  updatedAt: ISODate;
  candidate: ApplicationCandidateSummary;
  job: ApplicationJobSummary;
  stage: JobStage;
  resume: Nullable<{
    id: ID;
    filename: string;
    url: string;
    mimeType: string;
  }>;
  view?: ApplicationAclView;
}

export interface CreateApplicationInput {
  candidateId: ID;
  jobId: ID;
  resumeId?: ID;
  coverLetter?: string;
  expectedSalary?: number;
}

export interface ListApplicationsQuery {
  jobId?: ID;
  candidateId?: ID;
  stageId?: ID;
}

export interface MoveStageInput {
  stageId: ID;
  reason?: string;
}

export interface RejectApplicationInput {
  reason?: string;
}
