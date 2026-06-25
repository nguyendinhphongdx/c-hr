export interface LdapProfile {
  dn: string;
  username: string;
  email: string;
  name: string | null;
  title: string | null;
  phone: string | null;
  groups: string[];
  employeeId?: string | null;
  attendanceCode?: string | null;
}
