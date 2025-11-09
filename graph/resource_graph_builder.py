from __future__ import annotations

import logging
from typing import Iterable, Optional
from aws_cdk import Resource
from botocore.exceptions import ClientError

from graph.dependency_graph import DependencyGraph, ResourceNode
from graph.registry import ResolverRegistry
from utils.arn import ARN

logger = logging.getLogger(__name__)

MAX_NODES = 500


class ResourceGraphBuilder:
    """Builds a DependencyGraph by resolving ARNs via registered resolvers."""

    def __init__(self, registry: ResolverRegistry):
        self.registry = registry
        self.seed_set = {}
    
    def build(self, arns: Iterable[ARN]) -> DependencyGraph:
        graph = DependencyGraph()
        pending: list[ARN] = list(arns)
        self.seed_set = {a for a in arns}
        seen: set[ARN] = set()
        
        logger.debug("Building resource graph")
        
        while pending:
            arn = pending.pop()
            if arn in seen:
                continue
            seen.add(arn)
            
            if len(seen) > MAX_NODES:
                logger.warning(f"Exceeded node count of ${MAX_NODES}. Ending build.")
                break
            
            try:
                node = self._resolve_and_add(graph, arn)
            except Exception as e:
                logger.warning("Failed to resolve %s: %s", arn, e)
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
                        "SourceARN": arn,
                        "Seed": arn in self.seed_set
                    },
                )
                graph.add_node(node)
                
                graph.metadata.setdefault("UnresolvedNodes", []).append(str(arn))
                continue
            
            for ref in node.referenced_arns:
                graph.defer_link(node.logical_id, ref)
                if ref not in seen and not graph.get_node_by_arn(ref):
                    logger.debug(f"Adding 4{ref} to pending")
                    pending.append(ref)
        
        graph.resolve_links()
        graph.print_summary()
        return graph
        
    
    def _resolve_and_add(self, graph: DependencyGraph, arn: ARN) -> ResourceNode:
        logger.debug(f"Resolving ${arn}")
        resolver = self.registry.get(arn.service)
        if not resolver:
            raise ValueError(f"No resolver registered for service '{arn.service}'")
        
        raw = resolver.fetch(arn)
        node: ResourceNode = resolver.parse(arn, raw)
        
        is_seed = arn in self.seed_set

        if is_seed:
            node.metadata["Seed"] = True
            logger.debug("Marked %s as seed node", node.logical_id)

        logger.debug(f"Adding ${node.logical_id}")
        graph.add_node(node)
        return node
        