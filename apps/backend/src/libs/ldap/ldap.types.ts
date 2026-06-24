export interface LdapProfile {
  dn: string;
  username: string;
  email: string;
  name: string | null;
  groups: string[];
}
