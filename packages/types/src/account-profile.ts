export interface AccountProfile {
  id: string;
  label: string;
  accountId: string;
  region: string;
  credentialMethod: 'sso' | 'profile' | 'accesskey';
  profileName?: string;
  ssoStartUrl?: string;
}
