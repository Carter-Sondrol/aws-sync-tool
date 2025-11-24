from __future__ import annotations

import logging
from typing import Dict, Iterable, Optional, Set

from botocore.exceptions import ClientError
from boto3.session import Session

from graph.dependency_graph import DependencyGraph
from graph.registry import ResolverRegistry
from graph.link_resolver import resolve_graph_links
from graph.graph_utils import render_interactive_graph
from graph.resource_node import ResourceNode, NodeClassification
from utils.arn import ARN
from utils.seed_loader import SeedRecord  # your existing type

logger = logging.getLogger(__name__)

MAX_NODES = 500


class ResourceGraphBuilder:
    """
    Builds a full DependencyGraph for a given set of ARN roots.

    Performs:
      - Recursive discovery via registered resolvers (seed-based only)
      - ARN and property-based link resolution
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
        self.session = session or registry.session
        self.seed_set: Set[ARN] = set()
        self._seed_overrides: Dict[ARN, SeedRecord] = {}

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
        seed_metadata: Optional[Dict[ARN, SeedRecord]] = None,
        reference_seeds: Optional[Iterable[SeedRecord]] = None,
    ) -> DependencyGraph:
        """
        Construct a dependency graph starting from a set of ARNs.

        IMPORTANT: discovery is *strictly* seed-driven:
          - We only follow ARNs that resolvers explicitly return in
            node.referenced_arns.
          - No account-wide list/scan calls are allowed here.
        """
        graph = DependencyGraph()
        self._seed_overrides = seed_metadata or {}
        pending: list[ARN] = [ARN.parse(a) for a in arns]
        self.seed_set = set(pending)
        seen: set[ARN] = set()

        # Optional: add reference-only seeds as PARAMETER nodes up front
        if reference_seeds:
            for seed in reference_seeds:
                try:
                    node = self._make_reference_node(seed)
                except Exception as e:
                    logger.warning("Failed to materialize reference seed %s: %s", seed, e)
                else:
                    graph.add_node(node)

        while pending:
            arn = pending.pop(0)
            arn = ARN.parse(arn)

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
                    classification=NodeClassification.EXTERNAL,
                )
                graph.add_node(node)
                continue

            # Queue up newly discovered ARNs
            for ref in node.referenced_arns:
                ref = ARN.parse(ref)
                if ref not in seen and ref not in pending:
                    pending.append(ref)

        # Post-processing stages
        if resolve_links:
            resolve_graph_links(graph)
            graph.resolve_deferred_links()
        else:
            graph.resolve_deferred_links()

        if infer_orphans:
            graph.capture_wildcard_references()
            resolver_keys = self.registry.services()

            def _resolvable(arn: ARN) -> bool:
                full_key = f"{arn.service}:{arn.resource_type}"
                return full_key in resolver_keys or arn.service in resolver_keys

            graph.generate_orphans(resolvable=_resolvable)

        if freeze:
            graph.freeze_to_portable()
        else:
            graph.finalize()

        try:
            graph.topological_sort()
        except Exception as e:
            logger.error("[GraphBuilder] Cycle detected in graph: %s", e)
            raise

        if visualize:
            try:
                render_interactive_graph(graph)
            except Exception as e:
                logger.exception("[GraphBuilder] Visualization failed: %s", e)

        logger.info(graph.summary())
        self._seed_overrides = {}
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
                classification=NodeClassification.ARTIFACT,
            )
            graph.add_node(node)
            return node

        # ============================================================
        # 2. Find resolver
        # ============================================================
        full_key = f"{arn.service}:{arn.resource_type}"
        resolver = (
            self.registry.get(full_key)
            or self.registry.get(arn.service)  # service-level fallback
        )

        if not resolver:
            raise RuntimeError(f"No resolver registered for {full_key}")

        # attach session/region if needed
        if getattr(resolver, "session", None) is None:
            resolver.session = self.session  # type: ignore[attr-defined]
        if getattr(resolver, "session_region", None) is None:
            resolver.session_region = getattr(self.session, "region_name", None)  # type: ignore[attr-defined]

        # ============================================================
        # 3. Fetch + build node
        # ============================================================
        try:
            raw = resolver.fetch_resource(arn)  # type: ignore[arg-type]
        except ClientError:
            logger.exception("[GraphBuilder] AWS ClientError resolving %s", arn)
            raise
        except Exception:
            logger.exception("[GraphBuilder] Unknown error resolving %s", arn)
            raise

        node = resolver.to_node(arn, raw)  # type: ignore[arg-type]
        known_buckets = getattr(graph, "known_bucket_names", lambda: set())()
        node.referenced_arns = resolver.extract_references(arn, raw, known_buckets=known_buckets)  # type: ignore[attr-defined]

        # Seed overrides
        seed_meta = self._seed_overrides.get(arn)
        if seed_meta:
            self._apply_seed_override(node, seed_meta)

        # Basic classification tweaks
        if node.reference_only and node.classification == NodeClassification.RESOURCE:
            node.classification = NodeClassification.EXTERNAL

        # AWS-managed detection: simple heuristic
        if node.classification == NodeClassification.RESOURCE:
            primary = node.get_primary_arn()
            if primary and ":aws/" in primary.raw:
                node.classification = NodeClassification.AWS_MANAGED

        graph.add_node(node)
        return node

    def _apply_seed_override(self, node: ResourceNode, seed: SeedRecord) -> None:
        node.logical_id = seed.logical_id
        node.metadata["SeedARNs"] = seed.arn_metadata()
        node.metadata["SeedReference"] = seed.reference_only
        if seed.reference_only:
            node.reference_only = True
            if node.classification == NodeClassification.RESOURCE:
                node.classification = NodeClassification.PARAMETER

        for label, seed_arn in seed.arn_map.items():
            if seed_arn not in node.arns.values():
                node.arns[label] = seed_arn

    def _make_reference_node(self, seed: SeedRecord) -> ResourceNode:
        primary = seed.preferred_arn()
        if not primary:
            raise ValueError("Seed has no ARNs defined")

        metadata = {
            "SeedReference": True,
            "SeedARNs": seed.arn_metadata(),
        }
        return ResourceNode(
            logical_id=seed.logical_id,
            service=primary.service,
            cfn_type=f"AWS::{primary.service.title()}::Reference",
            properties={"ReferenceARN": str(primary)},
            reference_only=True,
            metadata=metadata,
            arns=dict(seed.arn_map),
            referenced_arns=set(),
            classification=NodeClassification.PARAMETER,
        )
