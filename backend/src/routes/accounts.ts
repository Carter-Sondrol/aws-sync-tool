import { Hono } from 'hono';
import { resolveCredentials, validateCredentials, detectDefaultSession, detectAllSessions } from '../credentials/index.js';
import { accountStore } from '../credentials/account-store.js';

export const accountsRouter = new Hono();

// GET /api/accounts - list configured account profiles
accountsRouter.get('/', (c) => {
  const accounts = accountStore.getAll();
  return c.json({ data: accounts });
});

// POST /api/accounts - add a new account profile
accountsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const account = { ...body, id };
  accountStore.set(id, account);
  return c.json({ data: account });
});

// DELETE /api/accounts/:id - remove an account profile
accountsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  accountStore.delete(id);
  return c.json({ data: { deleted: id } });
});

// POST /api/accounts/:id/validate - validate credentials for an account
accountsRouter.post('/:id/validate', async (c) => {
  const id = c.req.param('id');
  const account = accountStore.get(id);
  if (!account) {
    return c.json({ data: { valid: false, error: 'Account not found' } });
  }

  const result = await validateCredentials({
    profileName: account.profileName as string,
    region: (account.region as string) || 'us-east-1',
  });
  return c.json({ data: result });
});

// POST /api/accounts/detect-default - detect current AWS session from default chain
accountsRouter.post('/detect-default', async (_c) => {
  const result = await detectDefaultSession();
  return _c.json({ data: result });
});

// POST /api/accounts/detect-all-sessions - detect all available AWS sessions/profiles
accountsRouter.post('/detect-all-sessions', async (_c) => {
  const results = await detectAllSessions();
  return _c.json({ data: results });
});

// POST /api/accounts/:id/credentials - resolve credentials (returns no secrets, just confirms they work)
accountsRouter.post('/:id/credentials', async (c) => {
  const id = c.req.param('id');
  const account = accountStore.get(id);
  if (!account) {
    return c.json({ data: { valid: false, error: 'Account not found' } });
  }

  try {
    const creds = await resolveCredentials({
      profileName: account.profileName as string,
      region: (account.region as string) || 'us-east-1',
    });
    return c.json({ data: { valid: true, accountId: creds.accessKeyId.slice(0, 5) + '***', region: creds.region } });
  } catch (err) {
    return c.json({
      data: { valid: false, error: err instanceof Error ? err.message : String(err) },
    });
  }
});
