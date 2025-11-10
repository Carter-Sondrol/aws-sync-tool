from __future__ import annotations
import re
import fnmatch
from dataclasses import dataclass
from functools import lru_cache, cached_property
from typing import Dict, Optional, Tuple, Iterable
from collections.abc import Mapping, Iterable

_arn_regex = re.compile(
    r"^arn:(?P<partition>[^:]+):(?P<service>[^:]*):(?P<region>[^:]*):"
    r"(?P<account_id>[^:]*):(?P<resource>.+)$"
)


@dataclass(frozen=True, init=False)
class ARN:
    """Immutable AWS ARN representation with ergonomic helpers."""

    raw: str
    partition: str
    service: str
    region: str
    account_id: str
    resource: str

    # ------------------------------------------------------------------
    # Constructors
    # ------------------------------------------------------------------
    def __new__(cls, value: str):
        if not isinstance(value, str):
            raise TypeError("ARN must be constructed from a string")

        value = value.rstrip(":/")
        m = _arn_regex.match(value)
        if not m:
            raise ValueError(f"Invalid ARN: {value}")

        parts = m.groupdict()
        self = super().__new__(cls)
        object.__setattr__(self, "raw", value)
        for key, val in parts.items():
            object.__setattr__(self, key, val)
        return self

    # ------------------------------------------------------------------
    # Robust parsing
    # ------------------------------------------------------------------
    @classmethod
    @lru_cache(maxsize=4096)
    def parse_cached(cls, value: object) -> ARN:
        """
        Cached parser that tolerates ARN strings, dicts, and ARN instances.
        """
        if isinstance(value, ARN):
            return value

        if isinstance(value, dict):
            # Common boto3/Connect patterns
            for key in (
                "Arn",
                "ResourceArn",
                "QueueArn",
                "InstanceArn",
                "ContactFlowArn",
            ):
                if key in value and isinstance(value[key], str):
                    return cls.parse_cached(value[key])
            raise ValueError(f"Unrecognized ARN dict: {value}")

        if not isinstance(value, str):
            raise TypeError(
                f"Expected str or dict for ARN.parse_cached, got {type(value).__name__}"
            )

        if not value.startswith("arn:"):
            raise ValueError(f"Not a valid ARN string: {value}")

        return cls(value)

    @classmethod
    def parse(cls, value: object) -> ARN:
        """
        Non-cached version of parse_cached — same tolerant behavior.
        """
        if isinstance(value, ARN):
            return value

        if isinstance(value, dict):
            for key in (
                "Arn",
                "ResourceArn",
                "QueueArn",
                "InstanceArn",
                "ContactFlowArn",
            ):
                if key in value and isinstance(value[key], str):
                    return cls(value[key])
            raise ValueError(f"Invalid ARN dict: {value}")

        if not isinstance(value, str):
            raise TypeError(
                f"Expected str or dict for ARN.parse, got {type(value).__name__}"
            )

        if not value.startswith("arn:"):
            raise ValueError(f"Not a valid ARN string: {value}")

        return cls(value)

    @classmethod
    def try_parse(cls, value: str) -> Optional[ARN]:
        try:
            return cls.parse(value)
        except Exception:
            return None

    @staticmethod
    def is_valid(value: str) -> bool:
        return bool(_arn_regex.match(value))

    @classmethod
    def from_parts(
        cls,
        service: str,
        resource: str,
        region: str = "",
        account_id: str = "",
        partition: str = "aws",
    ) -> ARN:
        return cls(f"arn:{partition}:{service}:{region}:{account_id}:{resource}")

    # ------------------------------------------------------------------
    # String-like behavior
    # ------------------------------------------------------------------
    def __str__(self) -> str:
        return self.raw

    def __repr__(self) -> str:
        return f"ARN({self.raw!r})"

    def __eq__(self, other: object) -> bool:
        return self.raw == (other.raw if isinstance(other, ARN) else other)

    def __hash__(self) -> int:
        return hash(self.raw)

    def __lt__(self, other) -> bool:
        if not isinstance(other, ARN):
            return NotImplemented
        return (self.service, self.resource_type, self.raw) < (
            other.service,
            other.resource_type,
            other.raw,
        )

    def __contains__(self, item: str) -> bool:
        return item in self.raw

    def __format__(self, spec: str) -> str:
        return format(self.raw, spec)

    def __getattr__(self, name: str):
        """Delegate missing attributes to the underlying string for convenience."""
        return getattr(self.raw, name)

    def __json__(self) -> str:
        return self.raw

    def __iter__(self) -> Iterable[tuple[str, str]]:
        """Allow dict(self) to yield fields."""
        yield from self.to_dict().items()

    def __fspath__(self) -> str:
        return self.raw

    # ------------------------------------------------------------------
    # AWS semantics
    # ------------------------------------------------------------------
    def is_aws_managed(self) -> bool:
        patterns = [
            "arn:aws:iam::aws:policy/*",
            "arn:aws:iam::aws:role/service-role/*",
            "*AWSServiceRoleFor*",
        ]
        return any(fnmatch.fnmatch(self.raw, p) for p in patterns)

    def is_service_linked_role(self) -> bool:
        return self.service == "iam" and "AWSServiceRoleFor" in self.resource

    def is_aws_managed_like(self) -> bool:
        return self.is_aws_managed() or self.is_service_linked_role()

    def matches(self, pattern: str) -> bool:
        """fnmatch convenience (supports wildcards)."""
        return fnmatch.fnmatch(self.raw, pattern)

    def same_resource(self, other: ARN | str) -> bool:
        """True if same service + resource path, ignoring region/account."""
        if not isinstance(other, ARN):
            other = ARN.parse(other)
        return (self.service, self.resource) == (other.service, other.resource)

    # ------------------------------------------------------------------
    # Hierarchy helpers
    # ------------------------------------------------------------------
    def parent(self) -> Optional[ARN]:
        for sep in (":", "/"):
            if sep in self.resource:
                parent_resource = self.resource.rsplit(sep, 1)[0]
                return ARN.from_parts(
                    self.service,
                    parent_resource,
                    self.region,
                    self.account_id,
                    self.partition,
                )
        return None

    @cached_property
    def resource_parts(self) -> list[str]:
        return [p for p in re.split(r"[:/]", self.resource) if p]

    @cached_property
    def resource_type(self) -> str:
        parts = self.resource_parts

        if self.service == "connect":
            if len(parts) >= 3 and parts[0] == "instance":
                if parts[-1].startswith("$") and len(parts) >= 4:
                    return parts[-3]
                return parts[-2]
        elif self.service == "apigateway":
            if len(parts) >= 3 and parts[0] in ("restapis", "vpclinks"):
                return parts[-2]
        elif self.service == "elasticloadbalancing":
            if len(parts) >= 2 and parts[0] in ("loadbalancer", "targetgroup"):
                return parts[0]
        elif self.service == "lambda" and parts and parts[0] == "function":
            return "function"
        elif self.service == "iam" and parts:
            return parts[0]
        elif self.service == "s3":
            return "object" if len(parts) > 1 else "bucket"
        elif self.service == "lex":
            if len(parts) >= 8 and parts[0:7:2] == ["bot", "bot-locale", "intent"]:
                return "slot"
            if len(parts) >= 6 and parts[0:5:2] == ["bot", "bot-locale", "intent"]:
                return "intent"
            if len(parts) >= 6 and parts[0:5:2] == ["bot", "bot-locale", "slot-type"]:
                return "slot-type"
            if "bot-alias" in parts:
                return "bot-alias"
            if "bot-locale" in parts:
                return "bot-locale"
            if parts[:1] == ["bot"]:
                return "bot"

        if len(parts) >= 2:
            return parts[-2]
        return parts[0] if parts else "unknown"

    @cached_property
    def resource_id(self) -> str:
        for sep in (":", "/"):
            if sep in self.resource:
                return self.resource.split(sep)[-1]
        return self.resource

    def resource_hierarchy(self) -> list[tuple[str, str]]:
        parts = self.resource_parts
        if len(parts) % 2 != 0:
            parts = parts[1:]
        return list(zip(parts[::2], parts[1::2]))

    def subresource_id(self) -> Optional[str]:
        return self.resource_parts[-1] if len(self.resource_parts) >= 2 else None

    def subresource_parent_id(self, parent_type: str) -> Optional[str]:
        parts = self.resource_parts
        for i, p in enumerate(parts):
            if p == parent_type and i + 1 < len(parts):
                return parts[i + 1]
        return None

    def resource_path(self, sep="/") -> str:
        return sep.join(self.resource_parts)

    def resource_name(self) -> str:
        return self.resource_parts[-1] if self.resource_parts else self.resource

    def short(self) -> str:
        """Compact log form like 'lambda:function/MyFunc'."""
        return f"{self.service}:{self.resource_type}/{self.resource_id}"

    # ------------------------------------------------------------------
    # Transformations
    # ------------------------------------------------------------------
    def arn_for_account(self, account: str) -> ARN:
        return ARN.from_parts(
            self.service, self.resource, self.region, account, self.partition
        )

    def with_region(self, region: str) -> ARN:
        return ARN.from_parts(
            self.service, self.resource, region, self.account_id, self.partition
        )

    # ------------------------------------------------------------------
    # CloudFormation / boto helpers
    # ------------------------------------------------------------------
    def to_boto(self) -> str:
        return self.raw

    def to_cfn_ref(self) -> Dict[str, str]:
        return {"Ref": str(self)}

    def to_cfn_getatt(self, attribute: str = "Arn") -> Dict[str, list]:
        return {"Fn::GetAtt": [str(self), attribute]}

    # ------------------------------------------------------------------
    # S3 / artifact support
    # ------------------------------------------------------------------
    def as_s3_components(self) -> Optional[Tuple[str, Optional[str]]]:
        if self.service != "s3":
            return None
        if "/" in self.resource:
            b, k = self.resource.split("/", 1)
            return b, k
        return self.resource, None

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def to_dict(self) -> Dict[str, str]:
        return {
            "raw": self.raw,
            "partition": self.partition,
            "service": self.service,
            "region": self.region,
            "account_id": self.account_id,
            "resource": self.resource,
        }

    def as_tuple(self) -> tuple[str, str, str, str, str, str]:
        return (
            self.partition,
            self.service,
            self.region,
            self.account_id,
            self.resource,
            self.raw,
        )


def extract_dependencies(
    obj: object,
    *,
    allow_partial: bool = False,
    service_filter: tuple[str, ...] | None = None,
) -> set[ARN]:
    """
    Recursively extract valid ARN references from arbitrary Python objects.

    Designed for high-performance graph building — avoids redundant regex
    matches and ignores large binary-like blobs.

    Parameters
    ----------
    obj : Any
        Arbitrary Python structure: dict, list, tuple, set, or scalar.
    allow_partial : bool, default False
        If True, tolerate slightly malformed ARNs (e.g. missing region/account).
    service_filter : tuple[str, ...], optional
        Only include ARNs from these AWS services (e.g. ("lambda", "connect")).

    Returns
    -------
    set[ARN]
        Unique ARN objects discovered recursively.
    """
    found_arns: set[str] = set()

    def _walk(value: object):
        if value is None:
            return

        if isinstance(value, str):
            # Cheap fast-path checks
            if not value.startswith("arn:"):
                return
            if len(value) > 512 or " " in value:
                # skip very long or invalid-looking strings
                return

            # Use regex match once
            m = _arn_regex.match(value)
            if not m:
                if not allow_partial:
                    return
                # try partial pattern (e.g. missing region)
                if not value.startswith("arn:"):
                    return

            service = (
                m.group("service") if m else value.split(":")[2] if ":" in value else ""
            )
            if service_filter and service not in service_filter:
                return

            found_arns.add(value.rstrip(":/"))
            return

        if isinstance(value, Mapping):
            for v in value.values():
                _walk(v)
        elif isinstance(value, (list, tuple, set, frozenset)):
            for v in value:
                _walk(v)
        # scalars (int, float, bool, etc.) ignored

    _walk(obj)

    # Convert once to ARN objects with caching
    return {ARN.parse_cached(v) for v in found_arns}
