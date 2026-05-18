#!/usr/bin/env python3
import aws_cdk as cdk
from graph_custom_handler_stack import GraphCustomHandlerStack
from GraphStack import GraphStack

app = cdk.App()
handler_stack = GraphCustomHandlerStack(app, "GraphCustomHandlerStack")
stack_GraphStack = GraphStack(app, "GraphStack", env=cdk.Environment(region="us-west-2"))
stack_GraphStack.node.default_child.add_override(
    "Parameters.CustomHandlerArn.Default", handler_stack.handler_arn
)
app.synth()
