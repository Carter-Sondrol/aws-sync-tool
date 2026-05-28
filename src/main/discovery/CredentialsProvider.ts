// ─── Credentials ──────────────────────────────────────────────────────────────

export interface Credentials {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
}
export type CredentialsProvider = () => Promise<Credentials>
