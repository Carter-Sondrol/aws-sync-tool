# cdk_builder.py
import re
import json
import logging
from textwrap import indent
from aws_cdk import CfnParameter, custom_resources

logger = logging.getLogger(__name__)

SERVICE_MAP = {
    "connect": "aws_connect",
    "lex": "aws_lexv2",
    "logs": "aws_logs",
    "iam": "aws_iam",
    "lambda": "aws_lambda",
    "s3": "aws_s3",
    "dynamodb": "aws_dynamodb",
}

CFN_CLASS_OVERRIDES = {
    "AWS::IAM::ServiceLinkedRole": "aws_iam.CfnServiceLinkedRole",
    "AWS::IAM::Role": "aws_iam.CfnRole",
    "AWS::Logs::LogGroup": "aws_logs.CfnLogGroup",
    "AWS::S3::Bucket": "aws_s3.CfnBucket",
    "AWS::Lambda::Function": "aws_lambda.CfnFunction",
    "AWS::DynamoDB::Table": "aws_dynamodb.CfnTable",
    "AWS::Connect::Queue": "aws_connect.CfnQueue",
    "AWS::Connect::HoursOfOperation": "aws_connect.CfnHoursOfOperation",
    "AWS::Connect::ContactFlow": "aws_connect.CfnContactFlow",
    "AWS::Connect::Prompt": "aws_connect.CfnPrompt",
    "AWS::Lex::Bot": "aws_lexv2.CfnBot",
    "AWS::Lex::BotAlias": "aws_lexv2.CfnBotAlias",
    "AWS::Lex::BotLocale": "aws_lexv2.CfnBotLocale",
    "AWS::Lex::Intent": "aws_lexv2.CfnIntent",
}

REQUIRED_PROPS = {
    "AWS::Connect::ContactFlow": ["name", "instance_arn", "type", "content"],
    "AWS::Connect::Queue": ["name", "instance_arn"],
    "AWS::Connect::Prompt": ["name", "instance_arn"],
    "AWS::Connect::Instance": ["attributes", "identity_management_type"],
    "AWS::Lex::Bot": ["name", "role_arn"],
    "AWS::Lex::BotAlias": ["bot_alias_name", "bot_id"],
    "AWS::Lex::BotLocale": ["bot_id", "locale_id"],
    "AWS::Lex::Intent": ["bot_id", "locale_id", "intent_name"],
}


def sanitize_identifier(name: str) -> str:
    name = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not re.match(r"^[A-Za-z_]", name):
        name = f"r_{name}"
    return name[:100]


def camel_to_snake(name: str) -> str:
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\\1_\\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\\1_\\2", s1).lower()


def cfn_to_cdk_class(cfn_type: str) -> str:
    if not cfn_type:
        return "aws_cdk.CfnResource"
    if cfn_type in CFN_CLASS_OVERRIDES:
        return CFN_CLASS_OVERRIDES[cfn_type]
    parts = cfn_type.split("::")
    if len(parts) == 3:
        _, svc, res = parts
    else:
        svc, res = parts[-2], parts[-1] if len(parts) >= 2 else "Resource"
    module = SERVICE_MAP.get(svc.lower(), f"aws_{svc.lower()}")
    return f"{module}.Cfn{res}"


def generate_cdk_code(graph, stack_name="GraphStack") -> str:
    used_modules = sorted(set(SERVICE_MAP.values()))
    import_line = f"from aws_cdk import (Stack, {', '.join(used_modules)}, custom_resources)"
    lines = [
        import_line,
        "from constructs import Construct",
        "from aws_cdk import CfnParameter",
        "import json",
        "",
        f"class {stack_name}(Stack):",
        "    def __init__(self, scope: Construct, id: str, **kwargs):",
        "        super().__init__(scope, id, **kwargs)",
        "",
        '        self.custom_handler_arn = CfnParameter(self, "CustomHandlerArn", type="String")',
        "",
    ]

    # Parameters first
    for lid, node in graph._nodes.items():
        if node.metadata.get("Parameter") and not node.reference_only:
            var_name = sanitize_identifier(lid)
            lines.append(
                f'        self.{var_name} = CfnParameter(self, "{lid}", type="String")'
            )
    lines.append("")

    # Resources
    for lid, node in graph._nodes.items():
        if node.reference_only or node.metadata.get("Parameter"):
            continue

        cfn_type = node.cfn_type or "AWS::Unknown::Resource"
        cls = cfn_to_cdk_class(cfn_type)
        var_name = sanitize_identifier(lid)
        props = node.properties or {}

        normalized_props = {camel_to_snake(k): v for k, v in props.items()}
        for req in REQUIRED_PROPS.get(cfn_type, []):
            if req not in normalized_props:
                normalized_props[req] = f"__AUTO_{req}__"

        unsupported = (
            "Unknown" in cls
            or cls.endswith("Resource")
            or cls.startswith("aws_unknown")
        )

        if unsupported:
            prop_json = json.dumps(normalized_props, indent=2)
            lines.append(f"""\
        self.{var_name} = custom_resources.CfnCustomResource(
            self, "{lid}",
            service_token=self.custom_handler_arn.value_as_string,
            properties={{"Service": "{node.service}", "OriginalType": "{cfn_type}", **json.loads(r'''{prop_json}''')}}
        )
""")
            continue

        prop_lines = []
        for key, val in normalized_props.items():
            if key == "bot_alias_locale_settings" and isinstance(val, dict):
                val = [
                    {
                        "localeId": locale,
                        "botAliasLocaleSetting": {"enabled": cfg.get("enabled", True)},
                    }
                    for locale, cfg in val.items()
                ]

            if isinstance(val, str) and val.startswith("__REF_") and val.endswith("__"):
                ref_target = val.strip("_").replace("REF_", "")
                ref_target_sanitized = sanitize_identifier(ref_target)
                if (
                    ref_target in graph._nodes
                    and graph._nodes[ref_target].metadata.get("Parameter")
                ):
                    vstr = f"self.{ref_target_sanitized}.value_as_string"
                else:
                    vstr = f"self.{ref_target_sanitized}.ref"
            elif isinstance(val, dict) and key == "tags":
                vstr = repr([{"key": k, "value": v} for k, v in val.items()])
            elif isinstance(val, str):
                vstr = json.dumps(val)
            else:
                vstr = repr(val)

            prop_lines.append(f"{key}={vstr}")

        joined_props = ",\n".join(indent(p, " " * 12) for p in prop_lines)
        lines.append(f"""\
        self.{var_name} = {cls}(
            self, "{lid}",
{joined_props}
        )
""")

    return "\n".join(lines)
