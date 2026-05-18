/**
 * api.ts
 *
 * Backend API bridge for the renderer process.
 * Uses Electron IPC for file system access (AWS config reading).
 * Replace other calls with real backend HTTP when available.
 */

import type { AccountConfig } from '../stores/app-store';

// ─── AWS Config Detection (uses Electron IPC) ─────────────────────────────

export async function detectAllSessions(): Promise<Array<{ source: string; profileName?: string; accountId?: string; arn?: string; userName?: string; region?: string; error?: string }>> {
  try {
    // Call the IPC handler in the main process
    const profiles = await window.api.aws.detectProfiles();
    return profiles.map((profile) => ({
      source: profile.profileName,
      profileName: profile.profileName,
      region: profile.region,
      error: undefined,
    }));
  } catch (err) {
    console.error('Failed to detect AWS profiles:', err);
    return [{ source: 'error', error: 'Failed to read AWS credentials' }];
  }
}

// ─── Account Management ────────────────────────────────────────────────────

export async function listAccounts(): Promise<AccountConfig[]> {
  // Mock: Return empty list or from localStorage
  const stored = localStorage.getItem('aws-sync-accounts');
  return stored ? JSON.parse(stored) : [];
}

export async function addAccount(account: AccountConfig): Promise<void> {
  const accounts = await listAccounts();
  accounts.push(account);
  localStorage.setItem('aws-sync-accounts', JSON.stringify(accounts));
}

export async function removeAccountApi(_id: string): Promise<void> {
  const accounts = await listAccounts();
  const filtered = accounts.filter((a) => a.id !== _id);
  localStorage.setItem('aws-sync-accounts', JSON.stringify(filtered));
}

export async function validateAccount(_accountId: string): Promise<{ valid: boolean; arn?: string; userName?: string; error?: string }> {
  // Mock: Simulate validation
  // In production, call backend API to validate with AWS STS
  await new Promise((r) => setTimeout(r, 500));
  return { valid: true, arn: 'arn:aws:iam::123456789012:user/test', userName: 'test-user' };
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export async function expandDiscovery(_options: {
  accountId: string;
  seedArns: string[];
  maxDepth?: number;
  excludeServices?: string[];
}): Promise<void> {
  // Mock: Simulate discovery
  // In production, call backend API or use AWS SDK directly
  await new Promise((r) => setTimeout(r, 1000));
}

export async function getDiscoveryStatus(): Promise<{ phase: string; discoveredCount: number; totalEstimate: number; currentResource?: string }> {
  // Mock: Simulate status
  return { phase: 'idle', discoveredCount: 0, totalEstimate: 0 };
}

export async function listServices(): Promise<string[]> {
  // Mock: Return common AWS services
  return ['lambda', 'dynamodb', 'connect', 'iam', 's3', 'apigateway', 'cloudwatch', 'ssm', 'secretsmanager'];
}

export async function listResourceArns(_service: string, _accountId: string): Promise<Array<{ arn: string; name: string }>> {
  // Mock: Return dummy resources
  await new Promise((r) => setTimeout(r, 300));
  return [
    { arn: `arn:aws:lambda:us-east-1:123456789012:function:my-lambda-1`, name: `My Lambda 1` },
    { arn: `arn:aws:lambda:us-east-1:123456789012:function:my-lambda-2`, name: `My Lambda 2` },
  ];
}

// ─── Resource Management ──────────────────────────────────────────────────────

export async function describeResource(_arn: string, _accountId: string): Promise<Record<string, unknown>> {
  // Mock: Simulate resource description
  await new Promise((r) => setTimeout(r, 500));
  return { arn: _arn, accountId: _accountId, label: _arn.split('/').pop() || _arn };
}

export async function createGraphNode(_options: {
  logicalId: string;
  service: string;
  cfnType?: string;
  classification: string;
}): Promise<void> {
  // Mock: Simulate node creation
  await new Promise((r) => setTimeout(r, 300));
}

// ─── Graph Management ─────────────────────────────────────────────────────────

export async function getGraph(): Promise<{ nodes: Record<string, unknown>; edges: unknown[] }> {
  // Mock: Return empty graph or from localStorage
  const stored = localStorage.getItem('aws-sync-graph');
  return stored ? JSON.parse(stored) : { nodes: {}, edges: [] };
}

export async function exportGraph(): Promise<string> {
  // Mock: Return JSON export
  const graph = await getGraph();
  return JSON.stringify(graph, null, 2);
}

export async function importGraph(data: string): Promise<{ nodes: Record<string, unknown>; edges: unknown[] }> {
  // Mock: Parse and store
  const graph = JSON.parse(data);
  localStorage.setItem('aws-sync-graph', JSON.stringify(graph));
  return graph;
}

export async function clearGraph(): Promise<void> {
  localStorage.removeItem('aws-sync-graph');
}

export async function expandNode(_arn: string, _accountId: string): Promise<void> {
  // Mock: Simulate node expansion
  await new Promise((r) => setTimeout(r, 500));
}
