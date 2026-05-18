import { ElectronAPI } from '@electron-toolkit/preload'

interface AWSProfile {
  source: string
  profileName: string
  region?: string
  roleArn?: string
  sourceProfile?: string
  ssoStartUrl?: string
  error?: string
}

interface API {
  aws: {
    detectProfiles: () => Promise<AWSProfile[]>
    validateProfile: (profileName: string) => Promise<{ valid: boolean; accountId?: string; userName?: string; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
