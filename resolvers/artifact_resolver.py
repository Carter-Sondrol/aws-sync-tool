# resolvers/artifacts_resolver.py
from __future__ import annotations

import hashlib
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, TypedDict, cast

from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_s3 import S3Client

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)


# ------------------------------
# Helpers to map between S3 <-> artifacts ARNs
# ------------------------------
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
        # s3://bucket/key...
        rest = source_arn_or_uri[5:]
        bucket, _, key = rest.partition("/")
        return ARN(f"arn:aws:artifacts:::{bucket}/{key}")
    # Fallback: sanitize to a path-ish single component
    safe = re.sub(r"[^A-Za-z0-9_.:/-]+", "-", source_arn_or_uri)
    return ARN(f"arn:aws:artifacts:::{safe}")

def artifact_to_s3_arn(art: ARN) -> ARN:
    """
    arn:aws:artifacts:::bucket/key -> arn:aws:s3:::bucket/key
    """
    s = str(art)
    if not s.startswith("arn:aws:artifacts:::"):
        raise ValueError(f"Not an artifact ARN: {art}")
    return ARN(s.replace("arn:aws:artifacts:::", "arn:aws:s3:::"))

def _split_artifact_arn(art: ARN) -> tuple[str, str]:
    """
    Returns (bucket, key) from arn:aws:artifacts:::bucket/key
    """
    m = _ART_OBJ_RE.match(str(art))
    if not m:
        raise ValueError(f"Invalid artifacts ARN: {art}")
    return m.group("bucket"), m.group("key")


# ------------------------------
# Resolver
# ------------------------------
class ArtifactResponse(TypedDict, total=False):
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
    Resolves pseudo-ARNs with service 'artifacts' by downloading the backing S3 object.
    Produces a single node that represents a deploy-time artifact (reference-only).
    """

    def __init__(self, session: Session, client: S3Client, *, base_dir: str = "artifacts") -> None:
        super().__init__(session, client)
        self.base_dir = base_dir

    # --------------------------
    # Fetch: download object
    # --------------------------
    def fetch(self, arn: ARN) -> ArtifactResponse:
        if arn.service != "artifacts":
            raise ValueError(f"ArtifactResolver expected 'artifacts' service, got '{arn.service}'")
        bucket, key = _split_artifact_arn(arn)

        s3_arn = artifact_to_s3_arn(arn)
        # store under artifacts/<bucket>/<key filename>
        filename = os.path.basename(key) or "object"
        local_dir = os.path.join(self.base_dir, bucket, os.path.dirname(key))
        os.makedirs(local_dir, exist_ok=True)
        dest_path = os.path.join(local_dir, filename)

        size = 0
        etag = ""
        ctype = ""
        try:
            # HEAD for metadata first (nice to have)
            head = self.client.head_object(Bucket=bucket, Key=key)
            size = int(head.get("ContentLength", 0))
            etag = cast(str, head.get("ETag", "")).strip('"')
            ctype = cast(str, head.get("ContentType", "") or "")

            logger.info("[ArtifactResolver] Downloading s3://%s/%s -> %s", bucket, key, dest_path)
            self.client.download_file(bucket, key, dest_path)
            if not size:  # if head failed to return length, resolve after download
                size = os.path.getsize(dest_path)
        except ClientError as e:
            logger.warning("[ArtifactResolver] Failed to download %s: %s", s3_arn, e)

        sha256 = ""
        try:
            if os.path.exists(dest_path):
                h = hashlib.sha256()
                with open(dest_path, "rb") as f:
                    for chunk in iter(lambda: f.read(1024 * 1024), b""):
                        h.update(chunk)
                sha256 = h.hexdigest()
        except Exception as e:
            logger.debug("[ArtifactResolver] SHA256 failed for %s: %s", dest_path, e)

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

    # --------------------------
    # Parse: create graph node
    # --------------------------
    def parse(self, arn: ARN, raw: ArtifactResponse) -> ResourceNode:
        props: Dict[str, Any] = {
            "Bucket": raw.get("Bucket"),
            "Key": raw.get("Key"),
            "LocalPath": raw.get("LocalPath"),
            "Size": raw.get("Size"),
            "ETag": raw.get("ETag"),
            "ContentType": raw.get("ContentType"),
            "SHA256": raw.get("SHA256"),
        }

        # Reference the original S3 object so graph edges show provenance.
        # (If you don’t resolve S3 buckets/objects into nodes, this edge will stay dangling safely.)
        referenced = set()
        source_s3 = raw.get("SourceS3Arn")
        if source_s3:
            try:
                referenced.add(ARN(source_s3))
            except Exception:
                pass

        return ResourceNode(
            logical_id=f"Artifact{raw.get('Bucket','')}_{os.path.basename(raw.get('Key',''))}",
            service="artifacts",
            cfn_type="Artifact::Object",
            properties=props,
            referenced_arns=referenced,
            arns={"Artifact": arn},
            metadata={"Downloaded": bool(raw.get("LocalPath")), "Source": "S3"},
            reference_only=True,  # not a CFN resource; deploy-time input
        )
