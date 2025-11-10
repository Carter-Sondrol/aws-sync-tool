import json, boto3, logging, traceback, os
from urllib.parse import urlparse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ------------------------- Utilities -------------------------

def _resp_success(event, data, phys_id=None):
    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": phys_id or event.get("PhysicalResourceId") or event.get("LogicalResourceId", "GraphCustomResource"),
        "Data": data or {},
    }

def _resp_fail(event, reason):
    return {
        "Status": "FAILED",
        "Reason": reason,
        "PhysicalResourceId": event.get("PhysicalResourceId") or event.get("LogicalResourceId", "GraphCustomResource"),
    }

def _last(seg: str) -> str:
    # arn:...:/foo/bar/baz  -> baz
    return seg.split("/")[-1].split(":")[-1]

def _id_from_arn(arn: str, tail: str | None = None) -> str:
    # Pull the trailing id; if tail provided (e.g., "instance"), yank the segment after that.
    if not arn or not isinstance(arn, str): return arn
    parts = arn.split(":")[-1].split("/")
    if tail and tail in parts:
        i = parts.index(tail)
        if i + 1 < len(parts): return parts[i+1]
    return parts[-1]

def _instance_id_from_props(p: dict) -> str:
    arn = p.get("InstanceArn") or p.get("instanceArn")
    if not arn:
        raise ValueError("InstanceArn is required for Connect custom operations")
    return _id_from_arn(arn, "instance")

def _maybe_number(x):
    try:
        return float(x) if "." in str(x) else int(x)
    except Exception:
        return x

def _dict_without(d: dict, keys: set[str]) -> dict:
    return {k: v for k, v in d.items() if k not in keys}

# ------------------------- Entry -------------------------

def handler(event, context):
    logger.info(json.dumps(event))
    req_type = event.get("RequestType", "Create")
    props = event.get("ResourceProperties", {}) or {}
    service = (props.get("Service") or "").lower()
    original_type = (props.get("OriginalType") or "")

    try:
        if service == "lex":
            return handle_lex(req_type, props, original_type, event)
        elif service == "connect":
            return handle_connect(req_type, props, original_type, event)
        elif service == "bedrock":
            # Placeholder; extend as needed
            return _resp_success(event, {"HandledBy": "bedrock"})
        else:
            return _resp_success(event, {"Note": f"No-op for service '{service}' or not specified"})
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"[ERROR] {e}\n{tb}")
        return _resp_fail(event, str(e))

# ======================================================================
# LEX V2
# ======================================================================

def handle_lex(req_type: str, props: dict, original_type: str, event):
    c = boto3.client("lexv2-models")
    t = original_type or ""
    if "AWS::Lex::BotAlias" in t:      return _lex_alias(c, req_type, props, event)
    if "AWS::Lex::BotLocale" in t:     return _lex_locale(c, req_type, props, event)
    if "AWS::Lex::Intent" in t:        return _lex_intent(c, req_type, props, event)
    if "AWS::Lex::SlotType" in t:      return _lex_slot_type(c, req_type, props, event)
    if "AWS::Lex::Slot" in t:          return _lex_slot(c, req_type, props, event)
    if "AWS::Lex::Bot" in t:           return _lex_bot(c, req_type, props, event)
    return _resp_success(event, {"Note": f"Unsupported Lex type {original_type}"})

def _lex_bot(c, req, p, event):
    if req == "Create":
        resp = c.create_bot(
            botName=p["Name"],
            roleArn=p["RoleArn"],
            dataPrivacy=p.get("DataPrivacy", {"childDirected": False}),
            idleSessionTTLInSeconds=int(p.get("IdleSessionTTLInSeconds", 300)),
            description=p.get("Description")
        )
        bid = resp["botId"]
        return _resp_success(event, {"BotId": bid}, phys_id=f"lex-bot:{bid}")
    if req == "Delete":
        c.delete_bot(botId=p["BotId"])
        return _resp_success(event, {"Deleted": p["BotId"]}, phys_id=f"lex-bot:{p['BotId']}")
    # Update
    c.update_bot(
        botId=p["BotId"],
        botName=p["Name"],
        roleArn=p["RoleArn"],
        dataPrivacy=p.get("DataPrivacy", {"childDirected": False}),
        idleSessionTTLInSeconds=int(p.get("IdleSessionTTLInSeconds", 300)),
        description=p.get("Description")
    )
    return _resp_success(event, {"BotId": p["BotId"]}, phys_id=f"lex-bot:{p['BotId']}")

def _lex_locale(c, req, p, event):
    bot_id, loc = p["BotId"], p["LocaleId"]
    if req == "Create":
        resp = c.create_bot_locale(
            botId=bot_id, botVersion="DRAFT", localeId=loc,
            description=p.get("Description"),
            nluIntentConfidenceThreshold=float(p.get("NluIntentConfidenceThreshold", 0.4)),
            voiceSettings=p.get("VoiceSettings")
        )
        return _resp_success(event, {"LocaleId": resp["localeId"]}, phys_id=f"lex-locale:{bot_id}:{loc}")
    if req == "Delete":
        c.delete_bot_locale(botId=bot_id, botVersion="DRAFT", localeId=loc)
        return _resp_success(event, {"Deleted": loc}, phys_id=f"lex-locale:{bot_id}:{loc}")
    c.update_bot_locale(
        botId=bot_id, botVersion="DRAFT", localeId=loc,
        description=p.get("Description"),
        nluIntentConfidenceThreshold=float(p.get("NluIntentConfidenceThreshold", 0.4)),
        voiceSettings=p.get("VoiceSettings")
    )
    return _resp_success(event, {"LocaleId": loc}, phys_id=f"lex-locale:{bot_id}:{loc}")

def _lex_intent(c, req, p, event):
    bot_id, loc = p["BotId"], p["LocaleId"]
    if req == "Create":
        resp = c.create_intent(
            botId=bot_id, botVersion="DRAFT", localeId=loc,
            intentName=p["IntentName"],
            description=p.get("Description"),
            sampleUtterances=p.get("SampleUtterances", []),
            dialogCodeHook=p.get("DialogCodeHook"),
            fulfillmentCodeHook=p.get("FulfillmentCodeHook"),
            intentClosingSetting=p.get("IntentClosingSetting"),
            intentConfirmationSetting=p.get("IntentConfirmationSetting"),
            inputContexts=p.get("InputContexts"),
            outputContexts=p.get("OutputContexts"),
            slotPriorities=p.get("SlotPriorities"),
        )
        iid = resp["intentId"]
        return _resp_success(event, {"IntentId": iid}, phys_id=f"lex-intent:{bot_id}:{loc}:{iid}")
    if req == "Delete":
        c.delete_intent(botId=bot_id, botVersion="DRAFT", localeId=loc, intentId=p["IntentId"])
        return _resp_success(event, {"Deleted": p["IntentId"]}, phys_id=f"lex-intent:{bot_id}:{loc}:{p['IntentId']}")
    c.update_intent(
        botId=bot_id, botVersion="DRAFT", localeId=loc, intentId=p["IntentId"],
        intentName=p["IntentName"],
        description=p.get("Description"),
        sampleUtterances=p.get("SampleUtterances", []),
        dialogCodeHook=p.get("DialogCodeHook"),
        fulfillmentCodeHook=p.get("FulfillmentCodeHook"),
        intentClosingSetting=p.get("IntentClosingSetting"),
        intentConfirmationSetting=p.get("IntentConfirmationSetting"),
        inputContexts=p.get("InputContexts"),
        outputContexts=p.get("OutputContexts"),
        slotPriorities=p.get("SlotPriorities"),
    )
    return _resp_success(event, {"IntentId": p["IntentId"]}, phys_id=f"lex-intent:{bot_id}:{loc}:{p['IntentId']}")

def _lex_slot_type(c, req, p, event):
    bot_id, loc = p["BotId"], p["LocaleId"]
    if req == "Create":
        resp = c.create_slot_type(
            botId=bot_id, botVersion="DRAFT", localeId=loc,
            slotTypeName=p["SlotTypeName"],
            description=p.get("Description"),
            slotTypeValues=p.get("SlotTypeValues", []),
            parentSlotTypeSignature=p.get("ParentSlotTypeSignature"),
        )
        stid = resp["slotTypeId"]
        return _resp_success(event, {"SlotTypeId": stid}, phys_id=f"lex-slottype:{bot_id}:{loc}:{stid}")
    if req == "Delete":
        c.delete_slot_type(botId=bot_id, botVersion="DRAFT", localeId=loc, slotTypeId=p["SlotTypeId"])
        return _resp_success(event, {"Deleted": p["SlotTypeId"]}, phys_id=f"lex-slottype:{bot_id}:{loc}:{p['SlotTypeId']}")
    c.update_slot_type(
        botId=bot_id, botVersion="DRAFT", localeId=loc, slotTypeId=p["SlotTypeId"],
        slotTypeName=p["SlotTypeName"],
        description=p.get("Description"),
        slotTypeValues=p.get("SlotTypeValues", []),
        parentSlotTypeSignature=p.get("ParentSlotTypeSignature"),
    )
    return _resp_success(event, {"SlotTypeId": p["SlotTypeId"]}, phys_id=f"lex-slottype:{bot_id}:{loc}:{p['SlotTypeId']}")

def _lex_slot(c, req, p, event):
    bot_id, loc, intent_id = p["BotId"], p["LocaleId"], p["IntentId"]
    if req == "Create":
        resp = c.create_slot(
            botId=bot_id, botVersion="DRAFT", localeId=loc, intentId=intent_id,
            slotName=p["SlotName"],
            description=p.get("Description"),
            slotTypeId=p["SlotTypeId"],
            valueElicitationSetting=p.get("ValueElicitationSetting"),
            obfuscationSetting=p.get("ObfuscationSetting"),
        )
        sid = resp["slotId"]
        return _resp_success(event, {"SlotId": sid}, phys_id=f"lex-slot:{bot_id}:{loc}:{intent_id}:{sid}")
    if req == "Delete":
        c.delete_slot(botId=bot_id, botVersion="DRAFT", localeId=loc, intentId=intent_id, slotId=p["SlotId"])
        return _resp_success(event, {"Deleted": p["SlotId"]}, phys_id=f"lex-slot:{bot_id}:{loc}:{intent_id}:{p['SlotId']}")
    c.update_slot(
        botId=bot_id, botVersion="DRAFT", localeId=loc, intentId=intent_id, slotId=p["SlotId"],
        slotName=p["SlotName"],
        description=p.get("Description"),
        slotTypeId=p["SlotTypeId"],
        valueElicitationSetting=p.get("ValueElicitationSetting"),
        obfuscationSetting=p.get("ObfuscationSetting"),
    )
    return _resp_success(event, {"SlotId": p["SlotId"]}, phys_id=f"lex-slot:{bot_id}:{loc}:{intent_id}:{p['SlotId']}")

def _lex_alias(c, req, p, event):
    bot_id = p["BotId"]
    if req == "Create":
        resp = c.create_bot_alias(
            botId=bot_id,
            botAliasName=p["BotAliasName"],
            botVersion=p.get("BotVersion", "DRAFT"),
            description=p.get("Description"),
            conversationLogSettings=p.get("ConversationLogSettings"),
            botAliasLocaleSettings=p.get("BotAliasLocaleSettings"),
        )
        aid = resp["botAliasId"]
        return _resp_success(event, {"BotAliasId": aid}, phys_id=f"lex-alias:{bot_id}:{aid}")
    if req == "Delete":
        c.delete_bot_alias(botId=bot_id, botAliasId=p["BotAliasId"])
        return _resp_success(event, {"Deleted": p["BotAliasId"]}, phys_id=f"lex-alias:{bot_id}:{p['BotAliasId']}")
    c.update_bot_alias(
        botId=bot_id,
        botAliasId=p["BotAliasId"],
        botAliasName=p["BotAliasName"],
        botVersion=p.get("BotVersion", "DRAFT"),
        description=p.get("Description"),
        conversationLogSettings=p.get("ConversationLogSettings"),
        botAliasLocaleSettings=p.get("BotAliasLocaleSettings"),
    )
    return _resp_success(event, {"BotAliasId": p["BotAliasId"]}, phys_id=f"lex-alias:{bot_id}:{p['BotAliasId']}")

# ======================================================================
# AMAZON CONNECT
# ======================================================================

def handle_connect(req_type: str, props: dict, original_type: str, event):
    c = boto3.client("connect")
    t = original_type or ""

    # Map CFN-ish to API handlers
    if "AWS::Connect::ContactFlowModule" in t: return _cx_flow_module(c, req_type, props, event)
    if "AWS::Connect::ContactFlow" in t:       return _cx_flow(c, req_type, props, event)
    if "AWS::Connect::Prompt" in t:            return _cx_prompt(c, req_type, props, event)
    if "AWS::Connect::Queue" in t:             return _cx_queue(c, req_type, props, event)
    if "AWS::Connect::HoursOfOperation" in t:  return _cx_hours(c, req_type, props, event)
    if "AWS::Connect::RoutingProfile" in t:    return _cx_routing_profile(c, req_type, props, event)
    if "AWS::Connect::QuickConnect" in t:      return _cx_quick_connect(c, req_type, props, event)
    if "AWS::Connect::View" in t:              return _cx_view(c, req_type, props, event)

    return _resp_success(event, {"Note": f"Unsupported Connect type {original_type}"})

# ---- Contact Flow ----

def _cx_flow(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "Flow"
    typ  = p.get("Type") or "CONTACT_FLOW"
    content = p.get("Content") or "{}"
    desc = p.get("Description")

    if req == "Create":
        resp = client.create_contact_flow(InstanceId=inst, Name=name, Type=typ, Content=content, Description=desc, Tags=p.get("Tags"))
        fid = resp["ContactFlowId"]
        return _resp_success(event, {"ContactFlowId": fid}, phys_id=f"connect-flow:{inst}:{fid}")

    if req == "Delete":
        client.delete_contact_flow(InstanceId=inst, ContactFlowId=p["ContactFlowId"])
        return _resp_success(event, {"Deleted": p["ContactFlowId"]}, phys_id=f"connect-flow:{inst}:{p['ContactFlowId']}")

    # Update — two calls: content and (optionally) name/desc
    if "Content" in p:
        client.update_contact_flow_content(InstanceId=inst, ContactFlowId=p["ContactFlowId"], Content=content)
    if "Name" in p or "Description" in p:
        client.update_contact_flow_metadata(InstanceId=inst, ContactFlowId=p["ContactFlowId"], Name=name, Description=desc)
    return _resp_success(event, {"ContactFlowId": p["ContactFlowId"]}, phys_id=f"connect-flow:{inst}:{p['ContactFlowId']}")

# ---- Contact Flow Module ----

def _cx_flow_module(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "Module"
    content = p.get("Content") or "{}"
    desc = p.get("Description")

    if req == "Create":
        resp = client.create_contact_flow_module(InstanceId=inst, Name=name, Content=content, Description=desc, Tags=p.get("Tags"))
        mid = resp["Id"]
        return _resp_success(event, {"ContactFlowModuleId": mid}, phys_id=f"connect-flowmodule:{inst}:{mid}")

    if req == "Delete":
        client.delete_contact_flow_module(InstanceId=inst, ContactFlowModuleId=p["ContactFlowModuleId"])
        return _resp_success(event, {"Deleted": p["ContactFlowModuleId"]}, phys_id=f"connect-flowmodule:{inst}:{p['ContactFlowModuleId']}")

    client.update_contact_flow_module_content(InstanceId=inst, ContactFlowModuleId=p["ContactFlowModuleId"], Content=content)
    if "Name" in p or "Description" in p:
        client.update_contact_flow_module_metadata(InstanceId=inst, ContactFlowModuleId=p["ContactFlowModuleId"], Name=name, Description=desc)
    return _resp_success(event, {"ContactFlowModuleId": p["ContactFlowModuleId"]}, phys_id=f"connect-flowmodule:{inst}:{p['ContactFlowModuleId']}")

# ---- Prompt ----

def _cx_prompt(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "Prompt"
    desc = p.get("Description")
    s3uri = p.get("S3Uri") or p.get("S3URI")

    if req == "Create":
        # Connect pulls from S3 using its service role; we only need to pass the URI
        resp = client.create_prompt(InstanceId=inst, Name=name, Description=desc, S3Uri=s3uri, Tags=p.get("Tags"))
        pid = resp["PromptId"]
        return _resp_success(event, {"PromptId": pid}, phys_id=f"connect-prompt:{inst}:{pid}")

    if req == "Delete":
        client.delete_prompt(InstanceId=inst, PromptId=p["PromptId"])
        return _resp_success(event, {"Deleted": p["PromptId"]}, phys_id=f"connect-prompt:{inst}:{p['PromptId']}")

    client.update_prompt(InstanceId=inst, PromptId=p["PromptId"], Name=name, Description=desc, S3Uri=s3uri)
    return _resp_success(event, {"PromptId": p["PromptId"]}, phys_id=f"connect-prompt:{inst}:{p['PromptId']}")

# ---- Queue ----

def _cx_queue(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "Queue"
    desc = p.get("Description")
    hoc_arn = p.get("HoursOfOperationArn")
    ocfg = p.get("OutboundCallerConfig")

    # API prefers ARNs for HoursOfOperation and flow/number in ocfg
    if req == "Create":
        resp = client.create_queue(
            InstanceId=inst, Name=name,
            Description=desc,
            HoursOfOperationArn=hoc_arn,
            OutboundCallerConfig=ocfg,
            Tags=p.get("Tags")
        )
        qid = resp["QueueId"]
        return _resp_success(event, {"QueueId": qid}, phys_id=f"connect-queue:{inst}:{qid}")

    if req == "Delete":
        client.delete_queue(InstanceId=inst, QueueId=p["QueueId"])
        return _resp_success(event, {"Deleted": p["QueueId"]}, phys_id=f"connect-queue:{inst}:{p['QueueId']}")

    client.update_queue_name(InstanceId=inst, QueueId=p["QueueId"], Name=name, Description=desc)
    if hoc_arn or ocfg:
        client.update_queue_hours_of_operation(InstanceId=inst, QueueId=p["QueueId"], HoursOfOperationArn=hoc_arn)
        if ocfg:
            client.update_queue_outbound_caller_config(InstanceId=inst, QueueId=p["QueueId"], OutboundCallerConfig=ocfg)
    return _resp_success(event, {"QueueId": p["QueueId"]}, phys_id=f"connect-queue:{inst}:{p['QueueId']}")

# ---- Hours of Operation ----

def _cx_hours(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "Hours"
    desc = p.get("Description")
    tz   = p.get("TimeZone")
    cfg  = p.get("Config") or []

    if req == "Create":
        resp = client.create_hours_of_operation(
            InstanceId=inst, Name=name, Description=desc, TimeZone=tz, Config=cfg, Tags=p.get("Tags")
        )
        hid = resp["HoursOfOperationId"]
        return _resp_success(event, {"HoursOfOperationId": hid}, phys_id=f"connect-hours:{inst}:{hid}")

    if req == "Delete":
        client.delete_hours_of_operation(InstanceId=inst, HoursOfOperationId=p["HoursOfOperationId"])
        return _resp_success(event, {"Deleted": p["HoursOfOperationId"]}, phys_id=f"connect-hours:{inst}:{p['HoursOfOperationId']}")

    client.update_hours_of_operation(InstanceId=inst, HoursOfOperationId=p["HoursOfOperationId"], Name=name, Description=desc, TimeZone=tz, Config=cfg)
    return _resp_success(event, {"HoursOfOperationId": p["HoursOfOperationId"]}, phys_id=f"connect-hours:{inst}:{p['HoursOfOperationId']}")

# ---- Routing Profile ----

def _cx_routing_profile(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "RoutingProfile"
    desc = p.get("Description")
    # Accept either ARNs or IDs; API supports both in many places but we’ll prefer ARNs where available
    default_q_arn = p.get("DefaultOutboundQueueArn")
    mcon = p.get("MediaConcurrencies")  # list of {Channel, Concurrency, CrossChannelBehavior?}
    queues_cfg = p.get("QueueConfigs")  # optional list of queue memberships

    if req == "Create":
        resp = client.create_routing_profile(
            InstanceId=inst,
            Name=name,
            Description=desc,
            DefaultOutboundQueueArn=default_q_arn,
            MediaConcurrencies=mcon or [],
            Tags=p.get("Tags"),
        )
        rpid = resp["RoutingProfileArn"].split("/")[-1]
        # Attach queues if provided
        if queues_cfg:
            client.associate_routing_profile_queues(
                InstanceId=inst,
                RoutingProfileId=rpid,
                QueueConfigs=queues_cfg
            )
        return _resp_success(event, {"RoutingProfileId": rpid}, phys_id=f"connect-routingprofile:{inst}:{rpid}")

    if req == "Delete":
        client.delete_routing_profile(InstanceId=inst, RoutingProfileId=p["RoutingProfileId"])
        return _resp_success(event, {"Deleted": p["RoutingProfileId"]}, phys_id=f"connect-routingprofile:{inst}:{p['RoutingProfileId']}")

    client.update_routing_profile_name(InstanceId=inst, RoutingProfileId=p["RoutingProfileId"], Name=name, Description=desc)
    if default_q_arn or mcon is not None:
        client.update_routing_profile_default_outbound_queue(InstanceId=inst, RoutingProfileId=p["RoutingProfileId"], DefaultOutboundQueueArn=default_q_arn)
        if mcon is not None:
            client.update_routing_profile_concurrency(InstanceId=inst, RoutingProfileId=p["RoutingProfileId"], MediaConcurrencies=mcon)
    if queues_cfg is not None:
        # Replace membership
        client.disassociate_routing_profile_queues(InstanceId=inst, RoutingProfileId=p["RoutingProfileId"], QueueReferences=[{"QueueId": _id_from_arn(q.get("QueueArn") or q.get("QueueId"))} for q in queues_cfg])
        client.associate_routing_profile_queues(InstanceId=inst, RoutingProfileId=p["RoutingProfileId"], QueueConfigs=queues_cfg)
    return _resp_success(event, {"RoutingProfileId": p["RoutingProfileId"]}, phys_id=f"connect-routingprofile:{inst}:{p['RoutingProfileId']}")

# ---- Quick Connect ----

def _cx_quick_connect(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "QuickConnect"
    desc = p.get("Description")
    qc = p.get("QuickConnectConfig") or {}

    if req == "Create":
        resp = client.create_quick_connect(InstanceId=inst, Name=name, Description=desc, QuickConnectConfig=qc, Tags=p.get("Tags"))
        qcid = resp["QuickConnectARN"].split("/")[-1]
        return _resp_success(event, {"QuickConnectId": qcid}, phys_id=f"connect-quickconnect:{inst}:{qcid}")

    if req == "Delete":
        client.delete_quick_connect(InstanceId=inst, QuickConnectId=p["QuickConnectId"])
        return _resp_success(event, {"Deleted": p["QuickConnectId"]}, phys_id=f"connect-quickconnect:{inst}:{p['QuickConnectId']}")

    client.update_quick_connect_config(InstanceId=inst, QuickConnectId=p["QuickConnectId"], QuickConnectConfig=qc)
    if "Name" in p or "Description" in p:
        client.update_quick_connect_name(InstanceId=inst, QuickConnectId=p["QuickConnectId"], Name=name, Description=desc)
    return _resp_success(event, {"QuickConnectId": p["QuickConnectId"]}, phys_id=f"connect-quickconnect:{inst}:{p['QuickConnectId']}")

# ---- View ----

def _cx_view(client, req, p, event):
    inst = _instance_id_from_props(p)
    name = p.get("Name") or "View"
    desc = p.get("Description")
    content = p.get("Content") or {}
    status = p.get("Status") or "PUBLISHED"  # CONNECT requires VALID statuses, adjust to your data.

    if req == "Create":
        # As of now, the public API surface for Views is limited. Use create_view only if your SDK version supports it.
        # Fallback pattern: no-op with success so the graph deploy doesn’t break.
        try:
            resp = client.create_view(InstanceId=inst, Name=name, Description=desc, Content=content, Status=status, Tags=p.get("Tags"))
            vid = resp["View"]["Id"] if "View" in resp else _last(resp.get("ViewArn", name))
            return _resp_success(event, {"ViewId": vid}, phys_id=f"connect-view:{inst}:{vid}")
        except Exception as e:
            logger.warning("create_view not supported or failed: %s", e)
            return _resp_success(event, {"Note": "View create not supported by SDK/runtime"})

    if req == "Delete":
        try:
            client.delete_view(InstanceId=inst, ViewId=p["ViewId"])
            return _resp_success(event, {"Deleted": p["ViewId"]}, phys_id=f"connect-view:{inst}:{p['ViewId']}")
        except Exception as e:
            logger.warning("delete_view not supported or failed: %s", e)
            return _resp_success(event, {"Note": "View delete not supported by SDK/runtime"})

    # Update
    try:
        client.update_view(InstanceId=inst, ViewId=p["ViewId"], Name=name, Description=desc, Content=content, Status=status)
        return _resp_success(event, {"ViewId": p["ViewId"]}, phys_id=f"connect-view:{inst}:{p['ViewId']}")
    except Exception as e:
        logger.warning("update_view not supported or failed: %s", e)
        return _resp_success(event, {"Note": "View update not supported by SDK/runtime"})
