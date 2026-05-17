import { useCallback, useMemo, useState } from "react";
import { useAppStore, type DiscoveredNode } from "../../stores/app-store";
import { getGraph } from "../../hooks/api";

const SERVICE_COLORS: Record<string, string> = {
	connect: "#3b82f6",
	lambda: "#f97316",
	dynamodb: "#22c55e",
	iam: "#a855f7",
	s3: "#eab308",
	apigateway: "#06b6d4",
	cloudwatch: "#78716c",
	ssm: "#64748b",
	secretsmanager: "#ec4899",
};

function serviceColor(service: string): string {
	return SERVICE_COLORS[service] || "#6b7280";
}

const miniBtnStyle: React.CSSProperties = {
	padding: "2px 8px",
	color: "#fff",
	border: "none",
	borderRadius: 4,
	fontSize: 10,
	cursor: "pointer",
	fontWeight: 500,
};

export function ResourceList() {
	const {
		graph,
		selectedNodeArns,
		setSelectedNodeArns,
		toggleNodeSelection,
		setGraph,
	} = useAppStore();
	const [expandedServices, setExpandedServices] = useState<Set<string>>(
		new Set(),
	);

	const handleRefresh = async () => {
		try {
			const data = await getGraph();
			if (data && typeof data === "object") {
				const d = data as {
					nodes?: Record<string, unknown>;
					edges?: unknown[];
				};
				const nodes = new Map<string, any>();
				if (d.nodes) {
					for (const [arn, node] of Object.entries(d.nodes)) {
						nodes.set(arn, node);
					}
				}
				setGraph({ nodes, edges: (d.edges || []) as any[] });
			}
		} catch {
			// ignore
		}
	};

	// Group nodes by service
	const grouped = useMemo(() => {
		const groups = new Map<string, DiscoveredNode[]>();
		for (const node of graph.nodes.values()) {
			const svc = node.service;
			if (!groups.has(svc)) groups.set(svc, []);
			groups.get(svc)!.push(node);
		}
		// Sort groups alphabetically
		return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
	}, [graph.nodes]);

	const toggleService = useCallback((svc: string) => {
		setExpandedServices((prev) => {
			const next = new Set(prev);
			if (next.has(svc)) next.delete(svc);
			else next.add(svc);
			return next;
		});
	}, []);

	const expandAll = useCallback(() => {
		setExpandedServices(new Set(grouped.map(([svc]) => svc)));
	}, [grouped]);

	const collapseAll = useCallback(() => {
		setExpandedServices(new Set());
	}, []);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span style={{ fontSize: 12, fontWeight: 600 }}>
					Resources ({graph.nodes.size} nodes, {graph.edges.length} edges)
				</span>
				<div style={{ display: "flex", gap: 4 }}>
					<button
						onClick={expandAll}
						style={{ ...miniBtnStyle, background: "#374151" }}
					>
						All
					</button>
					<button
						onClick={collapseAll}
						style={{ ...miniBtnStyle, background: "#374151" }}
					>
						None
					</button>
					<button
						onClick={handleRefresh}
						style={{ ...miniBtnStyle, background: "#2563eb" }}
					>
						Refresh
					</button>
				</div>
			</div>

			<div style={{ flex: 1, overflow: "auto" }}>
				{graph.nodes.size === 0 ? (
					<div
						style={{
							color: "#6b7280",
							fontSize: 12,
							textAlign: "center",
							padding: 20,
						}}
					>
						No resources discovered yet.
						<br />
						Add seed ARNs and run discovery.
					</div>
				) : (
					grouped.map(([service, nodes]) => {
						const isExpanded = expandedServices.has(service);
						const color = serviceColor(service);
						return (
							<div key={service} style={{ marginBottom: 4 }}>
								<button
									onClick={() => toggleService(service)}
									style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										gap: 6,
										padding: "4px 8px",
										background: "none",
										border: "none",
										cursor: "pointer",
										borderRadius: 4,
									}}
								>
									<span style={{ color: "#6b7280", fontSize: 9 }}>
										{isExpanded ? "▼" : "▶"}
									</span>
									<span
										style={{
											width: 8,
											height: 8,
											borderRadius: 2,
											background: color,
											flexShrink: 0,
										}}
									/>
									<span
										style={{
											fontSize: 11,
											fontWeight: 600,
											color: "#d1d5db",
											fontFamily: "monospace",
										}}
									>
										{service}
									</span>
									<span
										style={{
											fontSize: 10,
											color: "#6b7280",
											marginLeft: "auto",
										}}
									>
										{nodes.length}
									</span>
								</button>
								{isExpanded && (
									<div style={{ paddingLeft: 8 }}>
										{nodes.map((node) => (
											<ResourceItem
												key={node.arn}
												node={node}
												isSelected={selectedNodeArns.includes(node.arn)}
												onClick={() => setSelectedNodeArns([node.arn])}
												onShiftClick={() => toggleNodeSelection(node.arn)}
											/>
										))}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			{selectedNodeArns.length > 0 && (
				<NodeDetail
					arn={selectedNodeArns[0]}
					node={graph.nodes.get(selectedNodeArns[0])}
				/>
			)}
		</div>
	);
}

function ResourceItem({
	node,
	isSelected,
	onClick,
	onShiftClick,
}: {
	node: DiscoveredNode;
	isSelected: boolean;
	onClick: () => void;
	onShiftClick: () => void;
}) {
	return (
		<div
			onClick={(e) => {
				if (e.shiftKey) {
					onShiftClick();
				} else {
					onClick();
				}
			}}
			style={{
				padding: "4px 8px",
				borderRadius: 4,
				cursor: "pointer",
				background: isSelected ? "#1e3a5f" : "transparent",
				border: isSelected ? "1px solid #3b82f6" : "1px solid transparent",
				transition: "background 0.1s",
			}}
		>
			<div style={{ fontSize: 11, fontWeight: 500, color: "#d1d5db" }}>
				{node.logicalId || node.arn.slice(-20)}
			</div>
			<div style={{ display: "flex", gap: 4, marginTop: 2 }}>
				<span
					style={{
						fontSize: 9,
						padding: "1px 4px",
						background:
							node.classification === "aws-managed" ? "#f59e0b22" : "#10b98122",
						color:
							node.classification === "aws-managed" ? "#fbbf24" : "#34d399",
						borderRadius: 2,
					}}
				>
					{node.classification}
				</span>
				{node.referenceOnly && (
					<span
						style={{
							fontSize: 9,
							padding: "1px 4px",
							background: "#374151",
							color: "#9ca3af",
							borderRadius: 2,
						}}
					>
						ref-only
					</span>
				)}
			</div>
		</div>
	);
}

function NodeDetail({ arn, node }: { arn: string; node: any }) {
	if (!node) return null;
	return (
		<div
			style={{
				marginTop: 8,
				padding: 8,
				background: "#0c1929",
				borderRadius: 4,
				fontSize: 11,
			}}
		>
			<div style={{ fontWeight: 600, marginBottom: 4 }}>Details</div>
			<div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
				<div>
					<strong>Name:</strong> {node.logicalId}
				</div>
				<div>
					<strong>ARN:</strong> {node.arn}
				</div>
				<div>
					<strong>Type:</strong> {node.cfnType || node.service}
				</div>
				<div>
					<strong>Refs:</strong> {node.referencedArns?.length || 0}
				</div>
			</div>
		</div>
	);
}
