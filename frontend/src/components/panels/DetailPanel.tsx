import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, type DiscoveredNode } from "../../stores/app-store";
import { downloadLambdaCode } from "../../hooks/api";

const MIN_WIDTH = 240;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 340;

export function DetailPanel() {
	const {
		selectedNodeArns,
		graph,
		clearSelection,
		getSharedProperties,
		updateSelectedProperty,
		syncedNodeArns,
		toggleNodeSync,
		toggleSyncForSelected,
	} = useAppStore();
	const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
	const [isResizing, setIsResizing] = useState(false);
	const startRef = useRef({ x: 0, w: 0 });
	const isMulti = selectedNodeArns.length > 1;
	const nodes = selectedNodeArns
		.map((arn) => graph.nodes.get(arn))
		.filter((n): n is DiscoveredNode => n != null);
	const node = nodes[0] || null;
	if (!node) return null;

	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			startRef.current = { x: e.clientX, w: panelWidth };
			setIsResizing(true);
		},
		[panelWidth],
	);

	useEffect(() => {
		if (!isResizing) return;
		const onMove = (e: MouseEvent) => {
			const delta = e.clientX - startRef.current.x;
			const newW = Math.max(
				MIN_WIDTH,
				Math.min(MAX_WIDTH, startRef.current.w - delta),
			);
			setPanelWidth(newW);
		};
		const onUp = () => setIsResizing(false);
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [isResizing]);

	return (
		<>
			<div
				onMouseDown={onMouseDown}
				style={{
					width: 4,
					cursor: "col-resize",
					background: isResizing ? "#60a5fa" : "transparent",
					transition: "background 0.15s",
					zIndex: 10,
				}}
			/>
			<div
				style={{
					width: panelWidth,
					minWidth: MIN_WIDTH,
					maxWidth: MAX_WIDTH,
					borderLeft: "1px solid #2a2d37",
					background: "#16181f",
					display: "flex",
					flexDirection: "column",
					overflow: "auto",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "10px 12px",
						borderBottom: "1px solid #2a2d37",
					}}
				>
					<span style={{ fontSize: 13, fontWeight: 600 }}>
						{isMulti ? `${selectedNodeArns.length} Selected` : "Node Details"}
					</span>
					<button
						onClick={clearSelection}
						style={{
							background: "none",
							border: "none",
							color: "#6b7280",
							cursor: "pointer",
							fontSize: 18,
							lineHeight: 1,
						}}
					>
						×
					</button>
				</div>
				<div
					style={{
						flex: 1,
						overflow: "auto",
						padding: 12,
						display: "flex",
						flexDirection: "column",
						gap: 10,
					}}
				>
					{isMulti ? (
						<MultiSelectProperties />
					) : (
						<>
							<ResourceHeader node={node} />
							<ArnDisplay arn={node.arn} />
							<ClassificationBadge node={node} />
							<DiscoveryStateBadge node={node} />
							<SyncControls node={node} />
							{node.service === "lambda" && <LambdaCodeDownload node={node} />}
							<PropertiesViewer node={node} />
							<ReferencesViewer node={node} />
							<MetadataViewer node={node} />
						</>
					)}
				</div>
			</div>
		</>
	);
}

function MultiSelectProperties() {
	const {
		getSharedProperties,
		updateSelectedProperty,
		toggleSyncForSelected,
		selectedNodeArns,
		syncedNodeArns,
	} = useAppStore();
	const properties = getSharedProperties();
	const syncedCount = selectedNodeArns.filter((arn) =>
		syncedNodeArns.includes(arn),
	).length;

	return (
		<>
			<div
				style={{ background: "#1e2030", borderRadius: 4, padding: "8px 10px" }}
			>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						marginBottom: 6,
						color: "#9ca3af",
					}}
				>
					Sync Controls
				</div>
				<button
					onClick={toggleSyncForSelected}
					style={{
						width: "100%",
						padding: "4px 8px",
						background:
							syncedCount === selectedNodeArns.length ? "#ef4444" : "#2563eb",
						color: "#fff",
						border: "none",
						borderRadius: 4,
						fontSize: 11,
						cursor: "pointer",
					}}
				>
					{syncedCount === selectedNodeArns.length
						? `Remove All from Sync (${selectedNodeArns.length})`
						: syncedCount > 0
							? `Toggle Sync (${syncedCount}/${selectedNodeArns.length} synced)`
							: `Add All to Sync (${selectedNodeArns.length})`}
				</button>
			</div>
			<div
				style={{ background: "#1e2030", borderRadius: 4, overflow: "hidden" }}
			>
				<div
					style={{
						padding: "8px 10px",
						fontSize: 12,
						fontWeight: 600,
						color: "#e5e7eb",
					}}
				>
					Shared Properties
				</div>
				<div
					style={{
						padding: "0 10px 10px",
						display: "flex",
						flexDirection: "column",
						gap: 4,
					}}
				>
					{properties.map((prop) => (
						<div
							key={prop.key}
							style={{ display: "flex", alignItems: "center", gap: 6 }}
						>
							<span
								style={{
									fontSize: 10,
									color: "#6b7280",
									minWidth: 80,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{prop.key}
							</span>
							{prop.uniform ? (
								<input
									type="text"
									defaultValue={String(prop.value)}
									onBlur={(e) =>
										updateSelectedProperty(prop.key, e.target.value)
									}
									style={{
										flex: 1,
										padding: "2px 6px",
										background: "#16181f",
										border: "1px solid #2a2d37",
										borderRadius: 3,
										color: "#e5e7eb",
										fontSize: 10,
										fontFamily: "monospace",
									}}
								/>
							) : (
								<span
									style={{
										fontSize: 10,
										color: "#6b7280",
										fontStyle: "italic",
									}}
								>
									[Multiple Values]
								</span>
							)}
						</div>
					))}
				</div>
			</div>
		</>
	);
}

function ResourceHeader({ node }: { node: DiscoveredNode }) {
	return (
		<div>
			<div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
				{node.logicalId}
			</div>
			<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
				<span
					style={{
						fontSize: 10,
						padding: "1px 6px",
						background: "#2563eb33",
						color: "#60a5fa",
						borderRadius: 3,
						fontWeight: 500,
					}}
				>
					{node.service}
				</span>
				{node.cfnType && (
					<span
						style={{
							fontSize: 10,
							padding: "1px 6px",
							background: "#374151",
							color: "#9ca3af",
							borderRadius: 3,
						}}
					>
						{node.cfnType}
					</span>
				)}
			</div>
		</div>
	);
}

function ArnDisplay({ arn }: { arn: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(arn).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	return (
		<div style={{ background: "#1e2030", borderRadius: 4, padding: "6px 8px" }}>
			<div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>ARN</div>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<span
					style={{
						fontSize: 11,
						fontFamily: "monospace",
						color: "#e5e7eb",
						wordBreak: "break-all",
						flex: 1,
					}}
				>
					{arn}
				</span>
				<button
					onClick={handleCopy}
					style={{
						padding: "2px 6px",
						background: copied ? "#10b981" : "#374151",
						color: "#fff",
						border: "none",
						borderRadius: 3,
						fontSize: 10,
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
}

function ClassificationBadge({ node }: { node: DiscoveredNode }) {
	const colors: Record<string, { bg: string; fg: string }> = {
		resource: { bg: "#10b98122", fg: "#34d399" },
		"aws-managed": { bg: "#f59e0b22", fg: "#fbbf24" },
		parameter: { bg: "#8b5cf622", fg: "#a78bfa" },
		external: { bg: "#6b728022", fg: "#9ca3af" },
		artifact: { bg: "#ec489922", fg: "#f472b6" },
	};
	const c = colors[node.classification] || colors["resource"];

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
			<span style={{ fontSize: 11, color: "#6b7280" }}>Classification:</span>
			<span
				style={{
					fontSize: 11,
					padding: "2px 8px",
					background: c.bg,
					color: c.fg,
					borderRadius: 3,
					fontWeight: 500,
				}}
			>
				{node.classification}
			</span>
		</div>
	);
}

function DiscoveryStateBadge({ node }: { node: DiscoveredNode }) {
	if (node.discoveryState === "resolved" || !node.discoveryState) return null;

	const states: Record<string, { bg: string; fg: string; label: string }> = {
		placeholder: { bg: "#6b728022", fg: "#9ca3af", label: "⏱ Placeholder" },
		resolving: { bg: "#2563eb22", fg: "#60a5fa", label: "⟳ Resolving..." },
		failed: { bg: "#ef444422", fg: "#f87171", label: "✕ Failed" },
	};

	const s = states[node.discoveryState] || states["placeholder"];

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
			<span
				style={{
					fontSize: 11,
					padding: "2px 8px",
					background: s.bg,
					color: s.fg,
					borderRadius: 3,
					fontWeight: 500,
				}}
			>
				{s.label}
			</span>
			{node.discoveryError && (
				<span style={{ fontSize: 10, color: "#f87171", fontStyle: "italic" }}>
					{node.discoveryError}
				</span>
			)}
		</div>
	);
}

function SyncControls({ node }: { node: DiscoveredNode }) {
	const { syncedNodeArns, toggleNodeSync } = useAppStore();
	const isExcluded = node.classification === "aws-managed";
	const isSynced = syncedNodeArns.includes(node.arn);

	const toggleIncluded = () => {
		toggleNodeSync(node.arn);
	};

	return (
		<div
			style={{ background: "#1e2030", borderRadius: 4, padding: "8px 10px" }}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					marginBottom: 6,
					color: "#9ca3af",
				}}
			>
				Sync Controls
			</div>
			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					cursor: "pointer",
				}}
			>
				<input
					type="checkbox"
					checked={!isExcluded && isSynced}
					onChange={toggleIncluded}
					disabled={isExcluded}
					style={{ accentColor: "#2563eb" }}
				/>
				<span
					style={{ fontSize: 12, color: isExcluded ? "#6b7280" : "#e5e7eb" }}
				>
					Include in sync
					{isExcluded && " (AWS-managed, read-only)"}
				</span>
			</label>
		</div>
	);
}

function PropertiesViewer({ node }: { node: DiscoveredNode }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div style={{ background: "#1e2030", borderRadius: 4, overflow: "hidden" }}>
			<button
				onClick={() => setExpanded(!expanded)}
				style={{
					width: "100%",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "8px 10px",
					background: "none",
					border: "none",
					color: "#e5e7eb",
					cursor: "pointer",
					fontSize: 12,
					fontWeight: 600,
				}}
			>
				<span>Properties ({Object.keys(node.properties || {}).length})</span>
				<span style={{ color: "#6b7280", fontSize: 10 }}>
					{expanded ? "▼" : "▶"}
				</span>
			</button>
			{expanded && (
				<div
					style={{
						padding: "0 10px 10px",
						fontSize: 11,
						fontFamily: "monospace",
						color: "#9ca3af",
						maxHeight: 300,
						overflow: "auto",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
					}}
				>
					{JSON.stringify(node.properties, null, 2)}
				</div>
			)}
		</div>
	);
}

function ReferencesViewer({ node }: { node: DiscoveredNode }) {
	const { setSelectedNodeArns } = useAppStore();
	const refs = node.referencedArns || [];

	if (refs.length === 0) return null;

	return (
		<div
			style={{ background: "#1e2030", borderRadius: 4, padding: "8px 10px" }}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					marginBottom: 6,
					color: "#9ca3af",
				}}
			>
				Referenced ARNs ({refs.length})
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
				{refs.map((refArn, i) => (
					<button
						key={i}
						onClick={() => setSelectedNodeArns([refArn])}
						style={{
							padding: "3px 6px",
							background: "#16181f",
							border: "1px solid #2a2d37",
							borderRadius: 3,
							color: "#60a5fa",
							cursor: "pointer",
							fontSize: 10,
							fontFamily: "monospace",
							textAlign: "left",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{refArn}
					</button>
				))}
			</div>
		</div>
	);
}

function LambdaCodeDownload({ node }: { node: DiscoveredNode }) {
	const { activeAccount } = useAppStore();
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDownload = async () => {
		if (!activeAccount?.id) return;
		setDownloading(true);
		setError(null);
		try {
			const functionName =
				((node.properties as Record<string, unknown>)
					?.FunctionName as string) ||
				node.logicalId ||
				"lambda-function";
			await downloadLambdaCode(node.arn, activeAccount.id, functionName);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Download failed");
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div
			style={{ background: "#1e2030", borderRadius: 4, padding: "8px 10px" }}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					marginBottom: 6,
					color: "#9ca3af",
				}}
			>
				Artifact
			</div>
			<button
				onClick={handleDownload}
				disabled={downloading}
				style={{
					width: "100%",
					padding: "5px 10px",
					background: downloading ? "#374151" : "#7c3aed",
					color: "#fff",
					border: "none",
					borderRadius: 4,
					fontSize: 11,
					fontWeight: 600,
					cursor: downloading ? "not-allowed" : "pointer",
				}}
			>
				{downloading ? "Downloading…" : "⬇ Download Lambda Code (.zip)"}
			</button>
			{error && (
				<div style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>
					{error}
				</div>
			)}
		</div>
	);
}

function MetadataViewer({ node }: { node: DiscoveredNode }) {
	const [expanded, setExpanded] = useState(false);
	const keys = Object.keys(node.metadata || {});

	if (keys.length === 0) return null;

	return (
		<div style={{ background: "#1e2030", borderRadius: 4, overflow: "hidden" }}>
			<button
				onClick={() => setExpanded(!expanded)}
				style={{
					width: "100%",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "8px 10px",
					background: "none",
					border: "none",
					color: "#e5e7eb",
					cursor: "pointer",
					fontSize: 12,
					fontWeight: 600,
				}}
			>
				<span>Metadata ({keys.length})</span>
				<span style={{ color: "#6b7280", fontSize: 10 }}>
					{expanded ? "▼" : "▶"}
				</span>
			</button>
			{expanded && (
				<div
					style={{
						padding: "0 10px 10px",
						fontSize: 11,
						fontFamily: "monospace",
						color: "#9ca3af",
						maxHeight: 200,
						overflow: "auto",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
					}}
				>
					{JSON.stringify(node.metadata, null, 2)}
				</div>
			)}
		</div>
	);
}
