import { Hono } from "hono";
import type { DiscoveryNode } from "../discovery/discovery-node.js";
import type { NodeClassification } from "../discovery/discovery-node.js";
import type { DiscoveredNode, GraphEdge } from "@aws-sync-tool/types";
import { parseARN } from "../../../packages/types/src/arn.js";
import { freezeGraph, thawGraph } from "../graph/frozen-graph.js";
import { validateImportGraph } from "../graph/graph-schemas.js";
import type { GraphStore } from "../graph/store.js";
import { toDiscoveredNode } from "../discovery/node-serializer.js";

export function createGraphRouter(graphStore: GraphStore) {
	const router = new Hono();

	router.get("/", (c) => {
		const nodes = graphStore.getAllNodes();
		const edges = graphStore.getAllEdges();

		const nodeMap: Record<string, DiscoveredNode> = {};
		for (const [arn, node] of nodes) {
			nodeMap[arn] = toDiscoveredNode(node.primaryArn.raw ?? arn, node);
		}

		return c.json({
			data: {
				nodes: nodeMap,
				edges,
				nodeCount: nodes.size,
				edgeCount: edges.length,
			},
		});
	});

	router.post("/clear", (c) => {
		graphStore.clear();
		return c.json({ data: { cleared: true } });
	});

	router.get("/stats", (c) => {
		const nodes = graphStore.getAllNodes();
		const edges = graphStore.getAllEdges();

		const services: Record<string, number> = {};
		const classifications: Record<string, number> = {};

		for (const node of nodes.values()) {
			services[node.service] = (services[node.service] || 0) + 1;
			classifications[node.classification] =
				(classifications[node.classification] || 0) + 1;
		}

		return c.json({
			data: {
				nodeCount: nodes.size,
				edgeCount: edges.length,
				services,
				classifications,
			},
		});
	});

	router.get("/export", (c) => {
		const nodes = graphStore.getAllNodes();
		const edges = graphStore.getAllEdges();
		const isRaw = c.req.query("raw") === "true";

		if (isRaw) {
			const nodeData: Record<string, DiscoveredNode> = {};
			for (const [arn, node] of nodes) {
				nodeData[arn] = toDiscoveredNode(node.primaryArn.raw ?? arn, node);
			}

			const exportData = {
				version: 1,
				exportedAt: new Date().toISOString(),
				nodes: nodeData,
				edges,
			};

			c.header(
				"Content-Disposition",
				'attachment; filename="aws-sync-graph.json"',
			);
			c.header("Content-Type", "application/json");
			return c.body(JSON.stringify(exportData, null, 2));
		}

		const portable = freezeGraph(nodes, edges);
		c.header(
			"Content-Disposition",
			'attachment; filename="aws-sync-portable.json"',
		);
		c.header("Content-Type", "application/json");
		return c.body(JSON.stringify(portable, null, 2));
	});

	router.post("/import", async (c) => {
		try {
			const raw = await c.req.json();
			const validated = validateImportGraph(raw);

			if ("error" in validated) {
				return c.json({ error: validated.error });
			}

			graphStore.clear();

			if (validated.type === "portable") {
				const { nodes, edges } = thawGraph(validated.data);
				for (const node of nodes.values()) {
					graphStore.addNode(node);
				}
				for (const edge of edges) {
					graphStore.addEdge(edge);
				}
			} else {
				const { nodes, edges } = validated.data;
				for (const [arn, nodeData] of Object.entries(nodes)) {
					const parsed = parseARN(arn);
					if (!parsed) continue;
					const logicalId = nodeData.logicalId || arn;
					const discoveryState = (nodeData.discoveryState ||
						"resolved") as DiscoveryNode["discoveryState"];
					const classification = (nodeData.classification ||
						"resource") as DiscoveryNode["classification"];
					const node: DiscoveryNode = {
						logicalId,
						service: nodeData.service || parsed.service,
						cfnType: nodeData.cfnType || null,
						properties: nodeData.properties || {},
						primaryArn: parsed,
						referencedArns: new Set(nodeData.referencedArns || []),
						referencedArnPaths: new Map(),
						classification,
						referenceOnly: nodeData.referenceOnly || false,
						metadata: nodeData.metadata || {},
						discoveryState,
						discoveryError: nodeData.discoveryError,
					};
					graphStore.addNode(node);
				}

				if (edges && Array.isArray(edges)) {
					for (const edge of edges) {
						graphStore.addEdge(edge as GraphEdge);
					}
				}
			}

			return c.json({
				data: {
					imported: true,
					format: validated.type,
					nodeCount: graphStore.nodeCount,
					edgeCount: graphStore.edgeCount,
				},
			});
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	router.post("/node", async (c) => {
		try {
			const body = await c.req.json<{
				logicalId: string;
				service: string;
				cfnType?: string;
				classification?: string;
			}>();

			if (!body.logicalId || !body.service) {
				return c.json({ error: "logicalId and service are required" });
			}

			const fakeArn = `arn:aws:${body.service}:us-east-1:000000000000:${body.cfnType || body.service}:${body.logicalId}`;
			const parsed = parseARN(fakeArn);
			if (!parsed) {
				return c.json({ error: "Failed to parse generated ARN" });
			}

			const classification = (body.classification ||
				"resource") as NodeClassification;
			const node: DiscoveryNode = {
				logicalId: body.logicalId,
				service: body.service,
				cfnType: body.cfnType || null,
				properties: {},
				primaryArn: parsed,
				referencedArns: new Set(),
				referencedArnPaths: new Map(),
				classification,
				referenceOnly: false,
				metadata: { isEmpty: true, createdAt: new Date().toISOString() },
				discoveryState: "placeholder" as const,
			};

			graphStore.addNode(node);

			return c.json({
				data: {
					created: true,
					arn: fakeArn,
					logicalId: body.logicalId,
				},
			});
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	router.patch("/node/:arn", async (c) => {
		try {
			const arn = decodeURIComponent(c.req.param("arn"));
			const node = graphStore.getNode(arn);
			if (!node) {
				return c.json({ error: `Node not found: ${arn}` });
			}

			const body = await c.req.json<Partial<DiscoveryNode>>();

			if (body.classification !== undefined) {
				node.classification = body.classification;
			}
			if (body.referenceOnly !== undefined) {
				node.referenceOnly = body.referenceOnly;
			}
			if (body.properties !== undefined) {
				node.properties = body.properties;
			}
			if (body.metadata !== undefined) {
				node.metadata = body.metadata;
			}
			if (body.logicalId !== undefined) {
				node.logicalId = body.logicalId;
			}

			return c.json({
				data: {
					updated: true,
					arn: node.primaryArn.raw,
				},
			});
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	return router;
}
