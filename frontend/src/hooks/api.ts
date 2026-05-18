const API_BASE = 'http://localhost:8080/api';

export async function addAccount(account: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function listAccounts(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/accounts`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function removeAccountApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
}

export async function validateAccount(id: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/accounts/${id}/validate`, {
    method: 'POST',
  });
  const json = await res.json();
  return json.data;
}

export async function detectDefaultAccount(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/accounts/detect-default`, {
    method: 'POST',
  });
  const json = await res.json();
  return json.data;
}

export async function detectAllSessions(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/accounts/detect-all-sessions`, {
    method: 'POST',
  });
  const json = await res.json();
  return json.data;
}

export async function describeResource(arn: string, accountId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/describe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arn, accountId }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function expandDiscovery(seedArns: string[], accountId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seedArns, accountId }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function expandNode(arn: string, accountId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/expand-node`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arn, accountId }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function getDiscoveryStatus(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/status`);
  const json = await res.json();
  return json.data;
}

export async function getGraph(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/graph`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function clearGraph(): Promise<void> {
  await fetch(`${API_BASE}/graph/clear`, { method: 'POST' });
}

// Service-wide discovery
export async function listServices(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/services`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function listResourceArns(resourceType: string, accountId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType, accountId }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// Graph save/load
export async function exportGraph(portable: boolean = true): Promise<void> {
  const res = await fetch(`${API_BASE}/graph/export${portable ? '' : '?raw=true'}`);
  if (!res.ok) throw new Error('Failed to export graph');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = portable ? 'aws-sync-portable.json' : 'aws-sync-graph.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Load a graph file from the user's filesystem and import it.
 */
export async function importGraphFromFile(file: File): Promise<unknown> {
  const text = await file.text();
  const data = JSON.parse(text);
  return importGraph(data);
}

export async function importGraph(data: Record<string, any>): Promise<unknown> {
  const res = await fetch(`${API_BASE}/graph/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function createGraphNode(data: {
  logicalId: string;
  service: string;
  cfnType?: string;
  classification?: string;
}): Promise<unknown> {
  const res = await fetch(`${API_BASE}/graph/node`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function updateNode(arn: string, updates: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_BASE}/graph/node/${encodeURIComponent(arn)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function resolvePlaceholder(arn: string, accountId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/discovery/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arn, accountId }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function downloadLambdaCode(arn: string, accountId: string, functionName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/discovery/download-lambda-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arn, accountId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Download failed: ${res.statusText}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${functionName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
