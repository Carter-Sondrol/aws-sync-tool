from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from importlib import metadata
from typing import Any, Generic, Optional, TypeVar
from boto3 import Session
from botocore.client import BaseClient
from utils.arn import ARN
from graph.dependency_graph import ResourceNode

C = TypeVar("C", bound=BaseClient)
R = TypeVar("R")

class BaseResolver(ABC, Generic[C, R]):
    def __init__(self, session: Session, client: C):
        self.session = session
        self.client = client
        
    @abstractmethod
    def fetch(self, arn: ARN) -> R:
        pass
    
    @abstractmethod
    def parse(self, arn: ARN, raw: R) -> ResourceNode:
        pass
    
    def resolve(self, arn: ARN) -> ResourceNode:
        raw = self.fetch(arn)
        return self.parse(arn, raw)