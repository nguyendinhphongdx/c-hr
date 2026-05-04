/**
 * Hard-coded definitions for the 3 MVP RequestGroups (leave, checkin,
 * checkout). Loaded into DB by `prisma/seed.ts` and re-applied if missing
 * on app start (idempotent upsert).
 *
 * When the form-builder UI ships (F5.2), these become the *defaults* —
 * admin Org can override fields per group via the API. For MVP they are
 * the source of truth.
 *
 * See docs/decisions/0006-universal-request-engine.md.
 */
import { FieldsSchema } from './fields-schema.types';

export interface RequestGroupSeed {
  code: string;
  name: string;
  description: string;
  fieldsSchema: FieldsSchema;
}

export const DEFAULT_REQUEST_GROUPS: RequestGroupSeed[] = [
  {
    code: 'leave',
    name: 'Đơn xin nghỉ',
    description: 'Nghỉ phép, nghỉ ốm, nghỉ không lương, ...',
    fieldsSchema: {
      fields: [
        {
          key: 'type',
          label: 'Loại nghỉ',
          type: 'enum',
          required: true,
          options: [
            { value: 'ANNUAL', label: 'Phép năm' },
            { value: 'SICK', label: 'Ốm' },
            { value: 'UNPAID', label: 'Không lương' },
            { value: 'MATERNITY', label: 'Thai sản' },
            { value: 'OTHER', label: 'Khác' },
          ],
        },
        { key: 'startDate', label: 'Từ ngày', type: 'date', required: true },
        { key: 'endDate', label: 'Đến ngày', type: 'date', required: true },
        {
          key: 'reason',
          label: 'Lý do',
          type: 'textarea',
          required: false,
          maxLength: 500,
        },
      ],
    },
  },
  {
    code: 'checkin',
    name: 'Đơn quên chấm vào / đi muộn',
    description:
      'Khi quên chấm vào hoặc đi muộn — duyệt sẽ tạo/cập nhật check_in_at trên timesheet.',
    fieldsSchema: {
      fields: [
        { key: 'date', label: 'Ngày', type: 'date', required: true },
        {
          key: 'requestedCheckInAt',
          label: 'Giờ vào đề xuất',
          type: 'time',
          required: true,
        },
        {
          key: 'reason',
          label: 'Lý do',
          type: 'textarea',
          required: true,
          maxLength: 500,
        },
      ],
    },
  },
  {
    code: 'checkout',
    name: 'Đơn quên chấm ra / về sớm',
    description:
      'Khi quên chấm ra hoặc về sớm — duyệt sẽ tạo/cập nhật check_out_at trên timesheet.',
    fieldsSchema: {
      fields: [
        { key: 'date', label: 'Ngày', type: 'date', required: true },
        {
          key: 'requestedCheckOutAt',
          label: 'Giờ ra đề xuất',
          type: 'time',
          required: true,
        },
        {
          key: 'reason',
          label: 'Lý do',
          type: 'textarea',
          required: true,
          maxLength: 500,
        },
      ],
    },
  },
];
