from __future__ import annotations

import logging
from typing import Iterable, Optional, Set

from botocore.exceptions import ClientError
from boto3.session import Session

from graph.dependency_graph import DependencyGraph
from graph.registry import ResolverRegistry
from graph.link_resolver import resolve_graph_links
from graph.resource_node import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)

MAX_NODES = 500


class ResourceGraphBuilder:
    """
    Builds a full DependencyGraph for a given set of ARN roots.
    Performs:
      - Recursive discovery via registered resolvers
      - ARN and name-based link resolution
      - Orphan placeholder generation
      - Graph freezing for portable logical-ID references
    """

    def __init__(
        self,
        registry: ResolverRegistry,
        *,
        session: Optional[Session] = None,
    ) -> None:
        self.registry = registry
        self.session = session or registry._session
        self.seed_set: Set[ARN] = set()

    # ------------------------------------------------------------------
    # Main build flow
    # ------------------------------------------------------------------
    def build(
        self,
        arns: Iterable[ARN],
        *,
        resolve_links: bool = True,
        freeze: bool = True,
        infer_orphans: bool = True,
        visualize: bool = False,
    ) -> DependencyGraph:
        """
        Construct a dependency graph starting from a set of ARNs.

        IMPORTANT: discovery is *strictly* seed-driven:
          - We only follow ARNs that resolvers explicitly return in
            node.referenced_arns.
          - No account-wide list/scan calls are allowed here.
        """
        graph = DependencyGraph()
        pending: list[ARN] = list(arns)
        self.seed_set = set(arns)
        seen: set[ARN] = set()

        logger.info(
            "[GraphBuilder] Starting graph build with %d seed ARNs", len(pending)
        )

        while pending:
            arn = pending.pop()
            if arn in seen:
                continue
            seen.add(arn)

            if len(seen) > MAX_NODES:
                logger.warning(
                    "[GraphBuilder] Exceeded node limit (%d), stopping early",
                    MAX_NODES,
                )
                break

            try:
                node = self._resolve_and_add(graph, arn)
            except Exception as e:
                logger.warning("[GraphBuilder] Failed to resolve %s: %s", arn, e)
                node = ResourceNode(
                    logical_id=f"Unresolved_{arn.resource_id}",
                    service=arn.service or "unknown",
                    cfn_type="Unresolved::Resource",
                    properties={},
                    reference_only=True,
                    arns={"Primary": arn},
                    metadata={
                        "Error": str(e),
                        "Unresolved": True,
                        "SourceARN": arn.raw,
                        "Seed": arn in self.seed_set,
                    },
                )
                graph.add_node(node)
                graph.metadata.setdefault("UnresolvedNodes", []).append(str(arn))
                continue

            # Schedule referenced ARNs for resolution; graph handles the edges.
            for ref in node.referenced_arns:
                if ref not in seen and not graph.get_node_by_arn(ref):
                    pending.append(ref)

        # ------------------------------------------------------------------
        # Link and orphan resolution
        # ------------------------------------------------------------------
        # Resolve any deferred ARN-based links first
        graph.resolve_links()

        # Optionally synthesize orphans for unresolved references
        if infer_orphans:
            graph.resolve_orphans()

        # ------------------------------------------------------------------
        # Cross-service link inference (Lambda env, Connect JSON, etc.)
        # ------------------------------------------------------------------
        if resolve_links:
            try:
                resolve_graph_links(graph)
            except Exception as e:
                logger.exception("[GraphBuilder] Link resolver phase failed: %s", e)

        # ------------------------------------------------------------------
        # Freeze graph for portability
        # ------------------------------------------------------------------
        if freeze:
            try:
                graph.freeze_to_portable()
            except Exception as e:
                logger.exception("[GraphBuilder] Graph freeze failed: %s", e)

        # ------------------------------------------------------------------
        # Visualization (optional)
        # ------------------------------------------------------------------
        if visualize:
            try:
                from graph.visualizer import render_interactive_graph

                render_interactive_graph(graph)
            except Exception as e:
                logger.exception("[GraphBuilder] Visualization failed: %s", e)

        logger.info(graph.summary())
        return graph

    # ------------------------------------------------------------------
    # Internal resolver logic
    # ------------------------------------------------------------------
    def _resolve_and_add(self, graph: DependencyGraph, arn: ARN) -> ResourceNode:
        """Fetch and parse a resource into a ResourceNode."""
        logger.info("[GraphBuilder] Resolving %s", arn)

        # ============================================================
        # 1. Wildcard ARNs → Pattern nodes (BEFORE resolver use)
        # ============================================================
        if "*" in arn.resource:
            lid = f"Pattern_{arn.resource.replace('*', 'Star')[:40]}"
            node = ResourceNode(
                logical_id=lid,
                service=arn.service or "unknown",
                cfn_type="Pattern::WildcardReference",
                properties={"Pattern": arn.raw},
                reference_only=True,
                arns={"Primary": arn},
                metadata={"Wildcard": True, "Seed": arn in self.seed_set},
            )
            graph.add_node(node)
            return node

        # ============================================================
        # 2. Resolve using resource-specific resolver
        # ============================================================
        full_key = f"{arn.service}:{arn.resource_type}"
        logger.info("[GraphBuilder] Resolver: %s", full_key)

        resolver = self.registry.get(full_key) or self.registry.get(arn.service)
        if not resolver:
            raise ValueError(
                f"No resolver registered for service '{arn.service}' "
                f"resource '{arn.resource_type}'"
            )

        # ============================================================
        # 3. Fetch raw resource + convert to node
        # ============================================================
        try:
            raw = resolver.fetch_resource(arn)
            node = resolver.to_node(arn, raw)

        except ClientError as e:
            raise RuntimeError(f"AWS API error for {arn}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Parse failure for {arn}: {e}") from e

        # ============================================================
        # 4. Mark seed node
        # ============================================================
        if arn in self.seed_set:
            node.metadata["Seed"] = True

        graph.add_node(node)
        return node
