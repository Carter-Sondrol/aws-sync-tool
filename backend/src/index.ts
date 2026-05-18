import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { GraphStore } from './graph/store.js';
import { DiscoveryEngine } from './graph/discovery-engine.js';
import { createDiscoveryRouter } from './routes/discovery.js';
import { createGraphRouter } from './routes/graph.js';
import { createExportRouter } from './export/export.js';
import { accountsRouter } from './routes/accounts.js';

// Create shared instances
const graphStore = new GraphStore();
const discoveryEngine = new DiscoveryEngine(graphStore);

// Import resolvers to trigger registration
import './discovery/lambda/function-resolver.js';
import './discovery/lambda/layer-resolver.js';
import './discovery/iam/role-resolver.js';
import './discovery/iam/policy-resolver.js';
import './discovery/dynamodb/table-resolver.js';
import './discovery/s3/bucket-resolver.js';

// Connect resolvers
import './discovery/connect/instance-resolver.js';
import './discovery/connect/contact-flow-resolver.js';
import './discovery/connect/contact-flow-module-resolver.js';
import './discovery/connect/queue-resolver.js';
import './discovery/connect/routing-profile-resolver.js';
import './discovery/connect/hours-of-operation-resolver.js';
import './discovery/connect/user-resolver.js';
import './discovery/connect/security-profile-resolver.js';
import './discovery/connect/quick-connect-resolver.js';
import './discovery/connect/agent-status-resolver.js';
import './discovery/connect/user-hierarchy-group-resolver.js';
import './discovery/connect/user-hierarchy-structure-resolver.js';
import './discovery/connect/task-template-resolver.js';
import './discovery/connect/rule-resolver.js';
import './discovery/connect/evaluation-form-resolver.js';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/accounts', accountsRouter);
app.route('/api/discovery', createDiscoveryRouter(discoveryEngine));
app.route('/api/graph', createGraphRouter(graphStore));
app.route('/api/export', createExportRouter(graphStore));

const port = 8080;
console.log(`AWS Sync Tool backend listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export default app;
