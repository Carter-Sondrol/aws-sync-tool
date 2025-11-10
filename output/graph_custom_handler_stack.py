from aws_cdk import (
    Stack, Duration, aws_lambda as _lambda, aws_iam as iam, CfnOutput
)
from constructs import Construct
from pathlib import Path

class GraphCustomHandlerStack(Stack):
    """Deploys the Lambda handler for Connect/Lex/Bedrock/S3/IAM-backed custom resources."""

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Role with full API access to supported services
        role = iam.Role(
            self, "GraphCustomHandlerRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonConnectFullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonLexFullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonBedrockFullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonS3FullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonDynamoDBFullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("IAMFullAccess"),
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

        CfnOutput(self, "HandlerArn", value=fn.function_arn)
        self.handler_arn = fn.function_arn
