from __future__ import annotations

import hashlib
import logging
import os
import re
from typing import Any, Dict, Iterable, Set, cast

from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_s3 import S3Client

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers to map between S3 <-> artifacts ARNs
# ---------------------------------------------------------------------------

_S3_OBJ_RE = re.compile(r"^arn:aws:s3:::(?P<bucket>[^/]+)/(?P<key>.+)$")
_ART_OBJ_RE = re.compile(r"^arn:aws:artifacts:::(?P<bucket>[^/]+)/(?P<key>.+)$")


def to_artifact_arn(source_arn_or_uri: str) -> ARN:
    """
    s3://bucket/key          -> arn:aws:artifacts:::bucket/key
    arn:aws:s3:::bucket/key  -> arn:aws:artifacts:::bucket/key
    """
    if source_arn_or_uri.startswith("arn:aws:s3:::"):
        return ARN(source_arn_or_uri.replace("arn:aws:s3:::", "arn:aws:artifacts:::"))
    if source_arn_or_uri.startswith("s3://"):
        rest = source_arn_or_uri[5:]
        bucket, _, key = rest.partition("/")
        return ARN(f"arn:aws:artifacts:::{bucket}/{key}")
    # Fallback: sanitize arbitrary strings
    safe = re.sub(r"[^A-Za-z0-9_.:/-]+", "-", source_arn_or_uri)
    return ARN(f"arn:aws:artifacts:::{safe}")


def artifact_to_s3_arn(art: ARN) -> ARN:
    """arn:aws:artifacts:::bucket/key -> arn:aws:s3:::bucket/key"""
    s = str(art)
    if not s.startswith("arn:aws:artifacts:::"):
        raise ValueError(f"Not an artifact ARN: {art}")
    return ARN(s.replace("arn:aws:artifacts:::", "arn:aws:s3:::"))


def _split_artifact_arn(art: ARN) -> tuple[str, str]:
    """Returns (bucket, key) from arn:aws:artifacts:::bucket/key"""
    m = _ART_OBJ_RE.match(str(art))
    if not m:
        raise ValueError(f"Invalid artifacts ARN: {art}")
    return m.group("bucket"), m.group("key")


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class ArtifactResponse(Dict[str, Any]):
    """Lightweight structure for artifact metadata."""
    ArtifactArn: str
    SourceS3Arn: str
    Bucket: str
    Key: str
    LocalPath: str
    Size: int
    ETag: str
    ContentType: str
    SHA256: str


class ArtifactResolver(BaseResolver[S3Client, ArtifactResponse]):
    """
    Resolves pseudo-ARNs with service 'artifacts' by downloading
    the backing S3 object and exposing it as a reference-only graph node.
    """

    service = "artifacts"
    cfn_type = "Artifact::Object"

    def __init__(self, session: Session, client: S3Client | None = None, *, base_dir: str = "artifacts") -> None:
        super().__init__(session, client=client or session.client("s3"))
        self.base_dir = base_dir

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """Artifacts are not discoverable; this resolver only handles explicit ARNs."""
        return []

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> ArtifactResponse:
        """Download or retrieve metadata for an artifact-backed S3 object."""
        if arn.service != "artifacts":
            raise ValueError(f"Expected service 'artifacts', got '{arn.service}'")

        bucket, key = _split_artifact_arn(arn)
        s3_arn = artifact_to_s3_arn(arn)

        filename = os.path.basename(key) or "object"
        local_dir = os.path.join(self.base_dir, bucket, os.path.dirname(key))
        os.makedirs(local_dir, exist_ok=True)
        dest_path = os.path.join(local_dir, filename)

        size = 0
        etag = ""
        ctype = ""

        try:
            # Head for metadata
            head = self.client.head_object(Bucket=bucket, Key=key)
            size = int(head.get("ContentLength", 0))
            etag = cast(str, head.get("ETag", "")).strip('"')
            ctype = cast(str, head.get("ContentType", "") or "")

            self.log.info("[ArtifactResolver] Downloading s3://%s/%s -> %s", bucket, key, dest_path)
            self.client.download_file(bucket, key, dest_path)
            if not size and os.path.exists(dest_path):
                size = os.path.getsize(dest_path)
        except ClientError as e:
            self.log.warning("[ArtifactResolver] Failed to download %s: %s", s3_arn, e)

        # Compute SHA256 if file exists
        sha256 = ""
        try:
            if os.path.exists(dest_path):
                h = hashlib.sha256()
                with open(dest_path, "rb") as f:
                    for chunk in iter(lambda: f.read(1024 * 1024), b""):
                        h.update(chunk)
                sha256 = h.hexdigest()
        except Exception as e:
            self.log.debug("[ArtifactResolver] SHA256 failed for %s: %s", dest_path, e)

        return ArtifactResponse(
            ArtifactArn=str(arn),
            SourceS3Arn=str(s3_arn),
            Bucket=bucket,
            Key=key,
            LocalPath=dest_path,
            Size=size,
            ETag=etag,
            ContentType=ctype,
            SHA256=sha256,
        )

    # ------------------------------------------------------------------
    # Convert to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: ArtifactResponse) -> ResourceNode:
        """Represent the artifact as a portable, reference-only node."""
        props: Dict[str, Any] = {
            "Bucket": raw.get("Bucket"),
            "Key": raw.get("Key"),
            "LocalPath": raw.get("LocalPath"),
            "Size": raw.get("Size"),
            "ETag": raw.get("ETag"),
            "ContentType": raw.get("ContentType"),
            "SHA256": raw.get("SHA256"),
        }

        referenced: Set[ARN] = set()
        source_s3 = raw.get("SourceS3Arn")
        if source_s3:
            try:
                referenced.add(ARN(source_s3))
            except Exception:
                pass

        metadata = {
            "Downloaded": bool(raw.get("LocalPath")),
            "Source": "S3",
            "ReferenceOnly": True,
        }

        return self.make_node(
            arn,
            logical_id=f"Artifact{raw.get('Bucket','')}_{os.path.basename(raw.get('Key',''))}",
            properties=props,
            metadata=metadata,
            reference_only=True,  # not a deployable resource
        )
