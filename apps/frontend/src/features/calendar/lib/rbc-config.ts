import { format, getDay, parse, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { dateFnsLocalizer } from "react-big-calendar";

/** Shared date-fns localizer — always Monday-as-week-start, vi-VN names. */
export const rbcLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { vi },
});

/** Vietnamese button + accessibility labels. */
export const rbcMessages = {
  date: "Ngày",
  time: "Giờ",
  event: "Sự kiện",
  allDay: "Cả ngày",
  week: "Tuần",
  work_week: "Tuần làm việc",
  day: "Ngày",
  month: "Tháng",
  previous: "Trước",
  next: "Sau",
  yesterday: "Hôm qua",
  tomorrow: "Ngày mai",
  today: "Hôm nay",
  agenda: "Danh sách",
  noEventsInRange: "Không có sự kiện trong khoảng thời gian này.",
  showMore: (n: number) => `+${n} sự kiện`,
};

/** Vietnamese cell + header date format strings for RBC. */
export const rbcFormats = {
  dayFormat: (date: Date) => format(date, "EEE dd", { locale: vi }),
  weekdayFormat: (date: Date) => format(date, "EEE", { locale: vi }),
  monthHeaderFormat: (date: Date) =>
    format(date, "'Tháng' M, yyyy", { locale: vi }),
  dayHeaderFormat: (date: Date) =>
    format(date, "EEEE, dd 'Tháng' M, yyyy", { locale: vi }),
  timeGutterFormat: (date: Date) => format(date, "HH:mm"),
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
  agendaDateFormat: (date: Date) =>
    format(date, "EEEE, dd 'Tháng' M, yyyy", { locale: vi }),
  agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
};
