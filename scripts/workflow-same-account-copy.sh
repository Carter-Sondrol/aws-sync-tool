#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# WORKFLOW: Same-account instance copy
#
# Copy ALL resources from one Connect instance to another instance in the
# same AWS account. The target instance ARN is a CfnParameter, so you can
# point the same CDK project at any instance without regenerating.
#
# Usage:
#   ./scripts/workflow-same-account-copy.sh [--yes]
#
# Requirements:
#   - One AWS profile with access to both instances
#   - Both instances must already exist in Connect
#   - Run from the repo root
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

YES=0; for _a in "$@"; do [[ "$_a" == "--yes" ]] && YES=1; done; unset _a
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

# ── Configuration ──────────────────────────────────────────────────────────
ENV_ID="cdtfaadmin"
PROFILE="CDTFAAdmin"
REGION="us-west-2"
ACCOUNT="797776209609"

SOURCE_INSTANCE="bd754747-7bce-46be-890e-cd37bd7e0f17"
TARGET_INSTANCE="d3840ec2-d5a5-45d2-86ab-0b3d2ba0013a"

SOURCE_ARN="arn:aws:connect:${REGION}:${ACCOUNT}:instance/${SOURCE_INSTANCE}"
TARGET_ARN="arn:aws:connect:${REGION}:${ACCOUNT}:instance/${TARGET_INSTANCE}"

OUTPUT_DIR="./cdtfa-copy-cdk"
STACK_NAME="AwsyncPipelineStack"

init_log "same-account"

# ── Config summary ─────────────────────────────────────────────────────────
step "Configuration"
conf "Env ID"             "$ENV_ID"
conf "Profile"            "$PROFILE"
conf "Region"             "$REGION"
conf "Account"            "$ACCOUNT"
conf "Source instance"    "$SOURCE_INSTANCE"
conf "Target instance"    "$TARGET_INSTANCE"
conf "Source ARN"         "$SOURCE_ARN"
conf "Target ARN"         "$TARGET_ARN"
conf "Output dir"         "$OUTPUT_DIR"
conf "Stack name"         "$STACK_NAME"

# ── Step 1: Verify credentials ────────────────────────────────────────────
step "Step 1: Verify AWS credentials"
check_identity "$PROFILE" "CDTFAAdmin"

# ── Step 2: Register source environment ───────────────────────────────────
step "Step 2: Environment setup"
run pnpm awsync env add \
  --id "$ENV_ID" \
  --label "CDTFA Admin" \
  --profile "$PROFILE" \
  --region "$REGION"

# ── Step 3: Discover source instance ──────────────────────────────────────
step "Step 3: Discovery (seed: ${SOURCE_INSTANCE})"
run pnpm awsync discover start "$ENV_ID" \
  --seeds "$SOURCE_ARN" \
  --concurrency 10 \
  --skip-if-exists

info "Graph statistics:"
pnpm awsync graph stats "$ENV_ID"

# ── Step 4: Exclude resources that shouldn't be CDK-created ───────────────
step "Step 4: Exclude non-deployable resource types"
info "CloudFormation has a 500-resource-per-stack limit — excluding large/unneeded types."

info "Excluding connect:instance (will use CfnParameter instead)"
run pnpm awsync graph exclude-type "$ENV_ID" connect:instance

info "Excluding connect:phone-number (account-specific, can't be moved)"
run pnpm awsync graph exclude-type "$ENV_ID" connect:phone-number

info "Excluding iam:role (AWS-managed service roles already exist)"
run pnpm awsync graph exclude-type "$ENV_ID" iam:role

info "Excluding iam:policy (AWS-managed policies already exist)"
run pnpm awsync graph exclude-type "$ENV_ID" iam:policy

info "Excluding connect:agent-hierarchy (reduce main stack size below 500 CFN limit)"
run pnpm awsync graph exclude-type "$ENV_ID" connect:agent-hierarchy

info "Inclusion summary:"
pnpm awsync graph type-summary "$ENV_ID"

# ── Step 5: Populate mapping table for referenced resources ───────────────
step "Step 5: Populate mapping table for excluded (referenced) nodes"
info "Remapping source instance → target instance in Connect ARNs..."
run pnpm awsync mapping populate-referenced \
  --env-id "$ENV_ID" \
  --source-instance "$SOURCE_INSTANCE" \
  --target-instance "$TARGET_INSTANCE"

# ── Step 6: Export CDK project ────────────────────────────────────────────
step "Step 6: Generate CDK project"
run pnpm awsync export cdk "$ENV_ID" "$OUTPUT_DIR" \
  --stack-name "$STACK_NAME" \
  --split-by flows

# ── Step 7: Validate CDK synthesis ────────────────────────────────────────
step "Step 7: Validate (cdk synth)"
run pnpm awsync export validate "$OUTPUT_DIR"

# ── Step 8: Deploy ────────────────────────────────────────────────────────
step "Step 8: Deploy to target instance"
confirm "Deploy all CDK stacks to target instance ${TARGET_INSTANCE}?"
cd "$OUTPUT_DIR"
run npm install

# Extract the CfnParameter name for the Connect instance ARN from generated code.
# The parameter name is derived from the instance node's logical ID (e.g., "Mycdtfa2DevArn").
# Search all stack files since --split-by flows creates multiple stacks, each with its own parameter.
# -h suppresses the filename prefix that -r adds; otherwise we'd get "lib/stack.ts:Name".
INST_PARAM=$(grep -rhoP 'new cdk\.CfnParameter\(this,\s*"\K[^"]+' lib/ 2>/dev/null | head -1 || true)
if [[ -n "$INST_PARAM" ]]; then
  info "Passing target instance ARN via parameter: ${INST_PARAM}=${TARGET_ARN}"
  # CDK requires --parameters (plural) with KEY=VALUE (or STACK:KEY=VALUE) form.
  # Apply to all stacks so each --split-by stack receives the same instance ARN.
  run cdk deploy --all --profile "$PROFILE" \
    --parameters "*:${INST_PARAM}=${TARGET_ARN}" \
    --require-approval never
else
  warn "No CfnParameter found in stack.ts — deploying without instance override"
  run cdk deploy --all --profile "$PROFILE" --require-approval never
fi
cd -

# ── Step 10: Fix contact flow ARN references ───────────────────────────────
step "Step 10: Fix contact flow ARN references"
confirm "Patch contact flow ARN references in target instance ${TARGET_INSTANCE}?"
run pnpm awsync export fix-flows \
  --source-instance-id "$SOURCE_INSTANCE" \
  --target-instance-id "$TARGET_INSTANCE" \
  --region "$REGION" \
  --profile "$PROFILE"

step "Done"
success "Source: $SOURCE_ARN"
success "Target: $TARGET_ARN"
info    "CDK project: $OUTPUT_DIR"
info    "Total elapsed: $(_elapsed $_SCRIPT_START)s"
