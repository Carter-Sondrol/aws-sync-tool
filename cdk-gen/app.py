#!/usr/bin/env python3
import aws_cdk as cdk
from stack import GraphStack

app = cdk.App()
GraphStack(app, "GraphStack")
app.synth()
