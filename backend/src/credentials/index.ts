import {
  fromIni,
} from '@aws-sdk/credential-provider-ini';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AwsCredentials } from '@aws-sync-tool/types';
import type { STSClient } from '@aws-sdk/client-sts';

/**
 * Resolve credentials for an account using SDK-native profile resolution.
 * Delegates to `fromIni` (handles SSO, assume-role, credential_process) or
 * falls back to the default credential chain.
 */
export async function resolveCredentials({
  profileName,
  region,
}: {
  profileName?: string;
  region: string;
}): Promise<AwsCredentials> {
  let creds: Awaited<ReturnType<ReturnType<typeof fromIni>>>;

  if (profileName) {
    const provider = fromIni({ profile: profileName });
    creds = await provider();
  } else {
    const { defaultProvider } = await import('@aws-sdk/credential-provider-node');
    const provider = defaultProvider();
    creds = await provider();
  }

  if (creds.expiration) {
    const now = new Date();
    if (creds.expiration.getTime() <= now.getTime()) {
      throw new Error('Credentials have expired. Please refresh them (e.g. `aws sso login`).');
    }
  }

  return {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
    region,
  };
}

export async function validateCredentials({
  profileName,
  region,
}: {
  profileName?: string;
  region: string;
}): Promise<{ valid: boolean; accountId?: string; arn?: string; userName?: string; error?: string }> {
  try {
    const creds = await resolveCredentials({ profileName, region });

    const { STSClient } = await import('@aws-sdk/client-sts');
    const { GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');

    const client = new STSClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
    });

    const response = await client.send(new GetCallerIdentityCommand({}));

    const arn = response.Arn || '';
    const userNameMatch = arn.match(/user\/([^/]+)/);
    const roleMatch = arn.match(/role\/([^/]+)/);

    return {
      valid: true,
      accountId: response.Account,
      arn,
      userName: userNameMatch ? userNameMatch[1] : roleMatch ? roleMatch[1] : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error validating credentials',
    };
  }
}

export async function getDefaultCredentials(): Promise<AwsCredentials> {
  return resolveCredentials({ region: process.env.AWS_REGION ?? 'us-east-1' });
}

export async function detectDefaultSession(): Promise<{
  valid: boolean;
  accountId?: string;
  arn?: string;
  userName?: string;
  region?: string;
  error?: string;
}> {
  try {
    const { defaultProvider } = await import('@aws-sdk/credential-provider-node');

    const provider = defaultProvider();
    const creds = await provider();

    const region = process.env.AWS_REGION
      ?? process.env.AWS_DEFAULT_REGION
      ?? 'us-east-1';

    const { STSClient } = await import('@aws-sdk/client-sts');
    const { GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');

    const client = new STSClient({
      region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
    });

    const response = await client.send(new GetCallerIdentityCommand({}));

    const arn = response.Arn || '';
    const userNameMatch = arn.match(/user\/([^/]+)/);
    const roleMatch = arn.match(/role\/([^/]+)/);

    return {
      valid: true,
      accountId: response.Account,
      arn,
      userName: userNameMatch ? userNameMatch[1] : roleMatch ? roleMatch[1] : undefined,
      region,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to detect default AWS session',
    };
  }
}

export interface DetectedSession {
  source: string;
  accountId?: string;
  arn?: string;
  userName?: string;
  region?: string;
  error?: string;
}

export async function detectAllSessions(): Promise<DetectedSession[]> {
  const results: DetectedSession[] = [];

  const defaultResult = await detectDefaultSession();
  results.push({
    source: 'default-chain',
    ...defaultResult,
  });

  const profileNames = parseAwsConfigProfiles();

  const envProfiles = parseEnvProfiles();
  for (const name of envProfiles) {
    if (!profileNames.includes(name)) {
      profileNames.push(name);
    }
  }

  const { STSClient } = await import('@aws-sdk/client-sts');
  const { GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');

  for (const profileName of profileNames.slice(0, 20)) {
    try {
      const provider = fromIni({ profile: profileName });
      const creds = await provider();

      const profileRegion = getProfileRegion(profileName)
        ?? process.env.AWS_DEFAULT_REGION
        ?? 'us-east-1';

      const client = new STSClient({
        region: String(profileRegion),
        credentials: {
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
          sessionToken: creds.sessionToken,
        },
      });

      const response = await client.send(new GetCallerIdentityCommand({}));

      const arn = response.Arn || '';
      const userNameMatch = arn.match(/user\/([^/]+)/);
      const roleMatch = arn.match(/role\/([^/]+)/);

      results.push({
        source: `profile:${profileName}`,
        accountId: response.Account,
        arn,
        userName: userNameMatch ? userNameMatch[1] : roleMatch ? roleMatch[1] : undefined,
        region: String(profileRegion),
      });
    } catch (err) {
      results.push({
        source: `profile:${profileName}`,
        error: err instanceof Error ? err.message : 'Failed to resolve profile',
      });
    }
  }

  return results;
}

function parseAwsConfigProfiles(): string[] {
  const profiles: string[] = [];
  const home = process.env.HOME;
  if (!home) return profiles;

  const configPath = path.join(home, '.aws', 'config');
  const credsPath = path.join(home, '.aws', 'credentials');

  for (const filePath of [configPath, credsPath]) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const regex = /^\[(?:profile\s+)?(.+?)\]/gm;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const name = match[1].trim();
        if (name && !profiles.includes(name)) {
          profiles.push(name);
        }
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }

  return profiles;
}

function getProfileRegion(profileName: string): string | undefined {
  const home = process.env.HOME;
  if (!home) return undefined;

  const configPath = path.join(home, '.aws', 'config');
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const sectionRegex = new RegExp(`^\\[(?:profile\\s+)?${escapeRegex(profileName)}\\][\\s\\S]*?(?=^\\[|$)`, 'gm');
    const sectionMatch = sectionRegex.exec(content);
    if (sectionMatch) {
      const regionMatch = /region\s*=\s*(.+)/m.exec(sectionMatch[0]);
      if (regionMatch) return regionMatch[1].trim();
    }
  } catch {
    // File doesn't exist
  }
  return undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseEnvProfiles(): string[] {
  const profiles: string[] = [];
  if (process.env.AWS_PROFILE) {
    profiles.push(process.env.AWS_PROFILE);
  }
  if (process.env.AWS_DEFAULT_PROFILE) {
    profiles.push(process.env.AWS_DEFAULT_PROFILE);
  }
  return profiles;
}
