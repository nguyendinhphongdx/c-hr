import {
  ClipboardCheck,
  Clock,
  Network,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ModuleItem {
  name: string;
  tag: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Step {
  number: string;
  title: string;
  description: string;
}

export interface ComparisonRow {
  label: string;
  ours: string;
  diy: string;
}

export const HERO_STATS: Stat[] = [
  { value: "All-in-1", label: "HRM + Chấm công + Lương" },
  { value: "Realtime", label: "Đồng bộ máy chấm công" },
  { value: "Multi-Org", label: "Tách dữ liệu tuyệt đối" },
  { value: "Cloud", label: "Mọi nơi, mọi thiết bị" },
];

export const FEATURES: Feature[] = [
  {
    id: "employees",
    icon: Users,
    title: "Hồ sơ nhân viên",
    description:
      "Tập trung thông tin cá nhân, hợp đồng, chức danh, lịch sử công tác — tìm theo phòng ban, vị trí, trạng thái.",
  },
  {
    id: "departments",
    icon: Network,
    title: "Phòng ban & Cây tổ chức",
    description:
      "Cây phòng ban lồng nhau, chỉ định manager. OrgChart tự sinh từ Department tree — luôn đồng bộ với thực tế.",
  },
  {
    id: "attendance",
    icon: Clock,
    title: "Chấm công thời gian thực",
    description:
      "Tích hợp máy ZKTeco / Hikvision qua bridge cục bộ. Bảng giờ làm theo tháng tự đối chiếu với ca làm chuẩn.",
  },
  {
    id: "requests",
    icon: ClipboardCheck,
    title: "Đơn từ thống nhất",
    description:
      "Xin nghỉ, quên chấm vào / ra — cùng một engine. Phê duyệt theo phòng ban, có audit trail đầy đủ.",
  },
  {
    id: "payroll",
    icon: Wallet,
    title: "Bảng lương đa kỳ",
    description:
      "Tính lương từ chấm công + công thức cấu hình theo Org. Tiền tệ và timezone tuân theo cấu hình doanh nghiệp.",
  },
  {
    id: "rbac",
    icon: ShieldCheck,
    title: "Phân quyền theo vai trò",
    description:
      "Org Admin, HR, Manager, Employee — mỗi vai trò chỉ thấy phần dữ liệu của mình. Không lo lộ lương chéo.",
  },
];

export const HOW_IT_WORKS: Step[] = [
  {
    number: "01",
    title: "Tạo Org cho doanh nghiệp",
    description:
      "Đăng ký tài khoản, nhập thông tin doanh nghiệp, chọn timezone và đơn vị tiền tệ. Mất chưa đầy 2 phút.",
  },
  {
    number: "02",
    title: "Nhập nhân viên & phòng ban",
    description:
      "Nhập danh sách nhân viên, dựng cây phòng ban, chỉ định manager. Có thể vừa làm vừa chạy — không cần migrate một lần.",
  },
  {
    number: "03",
    title: "Vận hành ngay",
    description:
      "Kết nối máy chấm công, mở quy trình đơn từ, chạy bảng lương kỳ đầu tiên. Tuần đầu đã có dữ liệu sống.",
  },
];

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Hồ sơ nhân viên",
    ours: "Một nguồn duy nhất, có lịch sử thay đổi, tìm kiếm đa tiêu chí",
    diy: "Mỗi phòng giữ một file, dễ lệch và mất dấu",
  },
  {
    label: "Chấm công",
    ours: "Pull tự động từ máy ZKTeco / Hikvision, đối chiếu real-time",
    diy: "In bảng giấy, cuối tháng nhập tay vào Excel",
  },
  {
    label: "Đơn từ",
    ours: "Quy trình duyệt rõ ràng, audit trail đầy đủ, thông báo đến đúng người",
    diy: "Email rời, chat trôi, không ai biết đơn đang ở đâu",
  },
  {
    label: "Bảng lương",
    ours: "Tính từ chấm công và công thức cấu hình, xuất file một click",
    diy: "Công thức Excel cộng dồn mỗi kỳ, sai số phát hiện sau khi đã chuyển khoản",
  },
  {
    label: "Phân quyền",
    ours: "Manager chỉ thấy team, HR thấy toàn Org, Employee chỉ thấy mình",
    diy: "File Excel chia sẻ — mở ra là thấy lương cả công ty",
  },
  {
    label: "Tổ chức thay đổi",
    ours: "Đổi parent department, đổi manager — OrgChart cập nhật tức thì",
    diy: "Vẽ lại sơ đồ tổ chức trên PowerPoint mỗi quý",
  },
];

export const MODULES: ModuleItem[] = [
  { name: "Nhân viên", tag: "Hồ sơ" },
  { name: "Phòng ban", tag: "OrgChart" },
  { name: "Vị trí", tag: "Position" },
  { name: "Chấm công", tag: "ZKTeco · Hikvision" },
  { name: "Bảng giờ làm", tag: "Timesheet" },
  { name: "Đơn từ", tag: "Approval flow" },
  { name: "Bảng lương", tag: "Đa kỳ" },
  { name: "Phân quyền", tag: "RBAC" },
  { name: "Audit log", tag: "Truy vết" },
  { name: "Cấu hình Org", tag: "Timezone · Currency" },
];
