from __future__ import annotations
from functools import lru_cache
import re
import fnmatch
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

_arn_regex = re.compile(
    r"^arn:(?P<partition>[^:]+):(?P<service>[^:]*):(?P<region>[^:]*):"
    r"(?P<account_id>[^:]*):(?P<resource>.+)$"
)


@dataclass(frozen=True, init=False)
class ARN:
    """
    A frozen, immutable representation of an AWS ARN (Amazon Resource Name).

    This class parses and stores all ARN components in a structured form,
    while still behaving like a string when used in boto3 calls, comparisons,
    dictionary keys, or CloudFormation templating.

    Normal usage:
        arn = ARN("arn:aws:lambda:us-west-2:123456789012:function:my-func")

    Key Features
    ------------
    - Fully immutable (frozen dataclass)
    - Fast cached parsing via .parse_cached()
    - Drop-in string behavior (str(arn) yields original ARN)
    - Safe comparison to both ARN objects and raw strings
    - Utilities for account/region remapping, CFN generation, and S3 splits

    Raises
    ------
    ValueError
        If the provided value does not match ARN format.
    TypeError
        If ARN is constructed from a non-string type.
    """

    raw: str
    partition: str
    service: str
    region: str
    account_id: str
    resource: str

    def __new__(cls, value: str):
        """
        Construct a new ARN from a raw ARN string.

        Parameters
        ----------
        value : str
            A raw AWS ARN string.

        Returns
        -------
        ARN
            An immutable ARN instance with parsed components.

        Raises
        ------
        ValueError
            If `value` is not a valid ARN.
        TypeError
            If `value` is not a string.
        """
        if not isinstance(value, str):
            raise TypeError("ARN must be constructed from a string")

        value = value.rstrip(":/")
        m = _arn_regex.match(value)
        if not m:
            raise ValueError(f"Invalid ARN: {value}")

        parts = m.groupdict()
        self = super().__new__(cls)

        # Set frozen dataclass fields
        object.__setattr__(self, "raw", value)
        for key, val in parts.items():
            object.__setattr__(self, key, val)

        return self

    # ------------------------------------------------------------------
    # Constructors / parsing
    # ------------------------------------------------------------------
    @classmethod
    @lru_cache(maxsize=4096)
    def parse_cached(cls, value: str) -> ARN:
        """
        Parse an ARN with caching to avoid duplicate work.

        Useful when scanning large dependency graphs or boto3 responses where
        the same ARN may appear repeatedly.

        Parameters
        ----------
        value : str
            A raw ARN string.

        Returns
        -------
        ARN
            Parsed, possibly cached ARN instance.
        """
        return cls(value)

    @classmethod
    def parse(cls, value: str) -> ARN:
        """
        Parse an ARN string into an ARN object.

        Equivalent to `ARN(value)`, provided for consistency in resolver code.

        Returns
        -------
        ARN
        """
        return cls(value)

    @classmethod
    def try_parse(cls, value: str) -> Optional[ARN]:
        """
        Parse an ARN and return None if invalid.

        Returns
        -------
        Optional[ARN]
            Parsed ARN or None if value is not a valid ARN.
        """
        try:
            return cls(value)
        except ValueError:
            return None

    # ------------------------------------------------------------------
    # Hierarchical helpers
    # ------------------------------------------------------------------
    def parent(self) -> Optional[ARN]:
        """
        Return the parent ARN one level up the resource hierarchy, if any.

        Examples
        --------
        ARN("arn:aws:lambda:us-west-2:123:function:my-func:1").parent()
        -> arn:aws:lambda:us-west-2:123:function:my-func

        Returns
        -------
        Optional[ARN]
            Parent ARN or None if no parent exists.
        """
        raw = self.resource
        for sep in (":", "/"):
            if sep in raw:
                parent_resource = raw.rsplit(sep, 1)[0]
                parent_raw = (
                    f"arn:{self.partition}:{self.service}:{self.region}:"
                    f"{self.account_id}:{parent_resource}"
                )
                return ARN.parse(parent_raw)
        return None

    # ------------------------------------------------------------------
    # String-like behavior
    # ------------------------------------------------------------------
    def __str__(self) -> str:
        """Return the original raw ARN string."""
        return self.raw

    def __repr__(self) -> str:
        return f"ARN({self.raw!r})"

    def __eq__(self, other: object) -> bool:
        """
        Compare ARNs by raw string value.

        Supports comparison to both strings and other ARN objects.
        """
        if isinstance(other, ARN):
            return self.raw == other.raw
        if isinstance(other, str):
            return self.raw == other
        return False

    def __hash__(self) -> int:
        """
        Hash by raw value to allow use as dictionary keys or set members.
        """
        return hash(self.raw)

    def __lt__(self, other) -> bool:
        """Enable deterministic sorting of ARN objects."""
        return str(self) < str(other)

    def __fspath__(self) -> str:
        """
        Path protocol support, so ARN can be passed where filesystem paths
        or path-like arguments are accepted.
        """
        return self.raw

    # ------------------------------------------------------------------
    # AWS-specific helpers
    # ------------------------------------------------------------------
    def is_aws_managed(self) -> bool:
        """
        Determine whether this ARN is an AWS-managed IAM resource.

        Returns
        -------
        bool
        """
        patterns = [
            "arn:aws:iam::aws:policy/*",
            "arn:aws:iam::aws:role/service-role/*",
            "*AWSServiceRoleFor*",
        ]
        return any(fnmatch.fnmatch(self.raw, p) for p in patterns)

    def to_boto(self) -> str:
        """
        Alias for convenience. Returns raw ARN string for boto3 parameters.
        """
        return self.raw

    def is_service_linked_role(self) -> bool:
        return self.service == "iam" and "AWSServiceRoleFor" in self.resource

    def is_aws_managed_like(self) -> bool:
        """Catch all for any AWS-managed or service-linked resource."""
        return self.is_aws_managed() or self.is_service_linked_role()

    @property
    def service_prefix(self) -> str:
        """
        Return the AWS service name portion of the ARN (e.g., "lambda", "s3").
        """
        return self.service

    def arn_for_account(self, account: str) -> ARN:
        """
        Create a new ARN with the same service/resource but a different account ID.
        Useful for cross-account replication and portability.

        Parameters
        ----------
        account : str
            Target AWS account ID.

        Returns
        -------
        ARN
        """
        new_raw = (
            f"arn:{self.partition}:{self.service}:{self.region}:"
            f"{account}:{self.resource}"
        )
        return ARN.parse(new_raw)

    def with_region(self, region: str) -> ARN:
        """
        Create a new ARN with the same service/resource but a different region.

        Parameters
        ----------
        region : str
            AWS region code (e.g. "us-east-1").

        Returns
        -------
        ARN
        """
        new_raw = (
            f"arn:{self.partition}:{self.service}:{region}:"
            f"{self.account_id}:{self.resource}"
        )
        return ARN.parse(new_raw)

    def as_s3_components(self) -> Optional[Tuple[str, Optional[str]]]:
        """
        If ARN represents an S3 object or bucket, return (bucket, key). Otherwise, None.

        Examples
        --------
        ARN("arn:aws:s3:::mybucket/file.txt").as_s3_components()
        -> ("mybucket", "file.txt")

        ARN("arn:aws:s3:::mybucket").as_s3_components()
        -> ("mybucket", None)

        Returns
        -------
        Optional[tuple[str, Optional[str]]]
        """
        if self.service != "s3":
            return None
        if "/" in self.resource:
            bucket, key = self.resource.split("/", 1)
            return bucket, key
        return self.resource, None

    # ------------------------------------------------------------------
    # CloudFormation helpers
    # ------------------------------------------------------------------
    def to_cfn_ref(self) -> Dict[str, str]:
        """
        Produce a CloudFormation `{ "Ref": <ARN> }` structure.

        Returns
        -------
        dict
        """
        return {"Ref": str(self)}

    def to_cfn_getatt(self, attribute: str = "ARN") -> Dict[str, list]:
        """
        Produce a CloudFormation `Fn::GetAtt` for retrieving an attribute of a resource.

        Parameters
        ----------
        attribute : str
            Attribute name, defaults to `"ARN"`.

        Returns
        -------
        dict
        """
        return {"Fn::GetAtt": [str(self), attribute]}

    # ------------------------------------------------------------------
    # Resource breakdown
    # ------------------------------------------------------------------
    @property
    def resource_parts(self) -> list[str]:
        """
        Return a normalized list of resource path components.

        Examples
        --------
        >>> ARN("arn:aws:connect:...:instance/abc/contact-flow/def").resource_parts
        ['instance', 'abc', 'contact-flow', 'def']

        >>> ARN("arn:aws:apigateway:us-west-2::restapis/xyz/resources/abc").resource_parts
        ['restapis', 'xyz', 'resources', 'abc']
        """
        # Split on both / and : (AWS sometimes uses colons, sometimes slashes)
        parts = re.split(r"[:/]", self.resource)
        return [p for p in parts if p]  # remove empty strings

    @property
    def resource_type(self) -> str:
        """
        Return the most specific AWS resource type from the ARN.

        Handles nested structures like Connect, API Gateway, ELB, etc.
        """
        parts = self.resource_parts

        # --- Service-specific heuristics ---
        if self.service == "connect":
            # instance/<id>/contact-flow/<id>
            # instance/<id>/view/<id>:$LATEST  (has trailing version token)
            if len(parts) >= 3 and parts[0] == "instance":
                # If last part is a Connect version token (e.g., $LATEST), skip it.
                if parts[-1].startswith("$") and len(parts) >= 4:
                    return parts[-3]  # e.g., .../view/<id>/$LATEST -> "view"
                return parts[-2]

        elif self.service == "apigateway":
            # restapis/<id>/resources/<id>
            if len(parts) >= 3 and parts[0] in ("restapis", "vpclinks"):
                return parts[-2]

        elif self.service == "elasticloadbalancing":
            # loadbalancer/app/<name>/id
            if len(parts) >= 2 and parts[0] in ("loadbalancer", "targetgroup"):
                return parts[0]

        elif self.service == "lambda" and parts[0] == "function":
            # function:Name:Qualifier
            return "function"

        elif self.service == "iam":
            # role/Name or policy/Name
            return parts[0]

        elif self.service == "s3":
            # bucket/key or just bucket
            return "object" if len(parts) > 1 else "bucket"
        elif self.service == "lex":
            parts = self.resource_parts

            # --- Most specific to least specific order ---

            # Slot (deepest)
            if (
                len(parts) >= 8
                and parts[0] == "bot"
                and parts[2] == "bot-locale"
                and parts[4] == "intent"
                and parts[6] == "slot"
            ):
                return "slot"

            # Intent
            if (
                len(parts) >= 6
                and parts[0] == "bot"
                and parts[2] == "bot-locale"
                and parts[4] == "intent"
            ):
                return "intent"

            # Slot type
            if (
                len(parts) >= 6
                and parts[0] == "bot"
                and parts[2] == "bot-locale"
                and parts[4] == "slot-type"
            ):
                return "slot-type"

            # Bot alias
            if (
                len(parts) >= 4
                and parts[0] == "bot"
                and parts[2] == "bot-alias"
            ):
                return "bot-alias"
            if len(parts) >= 3 and parts[0] == "bot-alias":
                return "bot-alias"

            # Bot locale (only after deeper checks)
            if len(parts) >= 4 and parts[0] == "bot" and parts[2] == "bot-locale":
                return "bot-locale"
            if len(parts) >= 3 and parts[0] == "bot-locale":
                return "bot-locale"

            # Base bot
            if len(parts) == 2 and parts[0] == "bot":
                return "bot"


        # --- Generic fallback ---
        # Try to detect "type/id/type/id" pattern
        if len(parts) >= 2:
            # if alternating names & IDs, last name before ID is type
            return parts[-2]
        elif parts:
            return parts[0]
        return "unknown"

    def resource_hierarchy(self) -> list[tuple[str, str]]:
        """
        Return [(type, id), ...] pairs for nested resources.

        Example:
        >>> arn.resource_hierarchy
        [('instance', 'abc'), ('contact-flow', 'def')]
        """
        parts = self.resource_parts
        if len(parts) % 2 != 0:
            # Odd count: drop the first (usually "instance")
            parts = parts[1:]
        return list(zip(parts[::2], parts[1::2]))

    def subresource_id(self) -> Optional[str]:
        """
        Return the most specific subresource ID in the ARN (last identifier).
        """
        parts = self.resource_parts
        if len(parts) >= 2:
            return parts[-1]
        return None

    def subresource_parent_id(self, parent_type: str) -> Optional[str]:
        """
        Return the parent resource ID for nested structures like Lex or Connect.

        Example:
            arn:aws:lex:us-west-2:123:bot/ABC/bot-alias/DEF
            -> subresource_parent_id("bot") == "ABC"
        """
        parts = self.resource_parts
        try:
            for i, part in enumerate(parts):
                if part == parent_type and i + 1 < len(parts):
                    return parts[i + 1]
        except Exception:
            pass
        return None

    @property
    def resource_id(self) -> str:
        """
        Return the terminal identifier of the resource.
        Example:
            lambda function: 'function:MyFunc' -> 'MyFunc'
            s3 object: 'bucket/key.txt' -> 'key.txt'
        """
        raw = self.resource
        for sep in (":", "/"):
            if sep in raw:
                return raw.split(sep)[-1]
        return raw

    def to_dict(self) -> Dict[str, str]:
        """
        Return all ARN components as a serializable dict.

        Useful for logging, DynamoDB, JSON, or debugging.

        Returns
        -------
        Dict[str, str]
        """
        return {
            "raw": self.raw,
            "partition": self.partition,
            "service": self.service,
            "region": self.region,
            "account_id": self.account_id,
            "resource": self.resource,
        }


def to_artifact_arn(source_arn_or_uri: str) -> ARN:
    """
    Converts an S3 ARN or URI into a pseudo artifact ARN.

    Examples:
        s3://bucket/key.txt → arn:aws:artifacts:::bucket/key.txt
        arn:aws:s3:::bucket/key.txt → arn:aws:artifacts:::bucket/key.txt
    """
    import re
    from urllib.parse import urlparse

    # S3 ARN case
    if source_arn_or_uri.startswith("arn:aws:s3:::"):
        return ARN(source_arn_or_uri.replace("arn:aws:s3:::", "arn:aws:artifacts:::"))

    # S3 URI case
    if source_arn_or_uri.startswith("s3://"):
        parsed = urlparse(source_arn_or_uri)
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        return ARN(f"arn:aws:artifacts:::{bucket}/{key}")

    # Fallback to treat as URL or relative path
    safe = re.sub(r"[^A-Za-z0-9_.:/-]+", "-", source_arn_or_uri)
    return ARN(f"arn:aws:artifacts:::{safe}")



# ------------------------------------------------------------------
# Recursive ARN extraction utility
# ------------------------------------------------------------------
def extract_dependencies(obj: object) -> set[ARN]:
    """
    Recursively search through any Python object (dict, list, string)
    for values that look like valid ARNs and return them as a set of ARN objects.

    Parameters
    ----------
    obj : object
        Any Python structure: dict, list, str, etc.

    Returns
    -------
    set[ARN]
        Set of parsed ARN objects found in the structure.
    """
    found: set[ARN] = set()

    def _recurse(value: object):
        if value is None:
            return
        if isinstance(value, str):
            # Quick pre-check to avoid regex overhead
            if value.startswith("arn:"):
                arn_obj = ARN.try_parse(value)
                if arn_obj:
                    found.add(arn_obj)
        elif isinstance(value, dict):
            for v in value.values():
                _recurse(v)
        elif isinstance(value, (list, tuple, set)):
            for v in value:
                _recurse(v)
        # Anything else (int, float, bool, etc.) ignored

    _recurse(obj)
    return found
