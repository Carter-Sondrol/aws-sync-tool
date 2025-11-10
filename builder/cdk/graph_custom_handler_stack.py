# graph_custom_handler_stack.py
from aws_cdk import (
    Stack, Duration, aws_lambda as _lambda, aws_iam as iam, CfnOutput
)
from constructs import Construct
from pathlib import Path

class GraphCustomHandlerStack(Stack):
    """Deploys the custom Lambda handler for Connect/Lex and API resources."""

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Role with API access
        role = iam.Role(
            self, "GraphCustomHandlerRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonConnectFullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonLexFullAccess"),
            ],
        )

        handler_path = str(Path(__file__).parent / "lambda_custom_handler.py")

        fn = _lambda.Function(
            self, "GraphCustomHandler",
            runtime=_lambda.Runtime.PYTHON_3_13,
            handler="lambda_custom_handler.handler",
            code=_lambda.Code.from_asset(str(Path(handler_path).parent)),
            role=role,
            timeout=Duration.seconds(300),
        )

        # Output for downstream stacks
        CfnOutput(self, "HandlerArn", value=fn.function_arn)
        self.handler_arn = fn.function_arn
