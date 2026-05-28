#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# WORKFLOW: Cross-account copy
#
# Copy resources FROM a source account/instance TO a target account/instance.
# Resources that don't translate (e.g. queues, phone numbers) are excluded and
# referenced by their existing target ARNs via arns.ts.
#
# Usage:
#   ./scripts/workflow-cross-account.sh [--yes]
#
# Requirements:
#   - Two AWS profiles configured (SOURCE_PROFILE, TARGET_PROFILE)
#   - Both Connect instances already exist in their respective accounts
#   - Run from the repo root
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

YES=0; for _a in "$@"; do [[ "$_a" == "--yes" ]] && YES=1; done; unset _a
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

# ── Configuration ──────────────────────────────────────────────────────────
SOURCE_ENV_ID="cdtfaold"
SOURCE_PROFILE="CDTFAOld"
SOURCE_REGION="us-west-2"
SOURCE_INSTANCE_ARN="arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97"

TARGET_ENV_ID="cdtfaadmin-dev"
TARGET_PROFILE="CDTFAAdmin"
TARGET_REGION="us-west-2"
TARGET_INSTANCE_ARN="arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17"
TARGET_INSTANCE="${TARGET_INSTANCE_ARN##*/}"

OUTPUT_DIR="./cdtfa-cross-account-cdk"
STACK_NAME="AwsyncStack"

init_log "cross-account"

# ── Config summary ─────────────────────────────────────────────────────────
step "Configuration"
conf "Source env ID"      "$SOURCE_ENV_ID"
conf "Source profile"     "$SOURCE_PROFILE"
conf "Source region"      "$SOURCE_REGION"
conf "Source instance"    "$SOURCE_INSTANCE_ARN"
conf "Target env ID"      "$TARGET_ENV_ID"
conf "Target profile"     "$TARGET_PROFILE"
conf "Target region"      "$TARGET_REGION"
conf "Target instance"    "$TARGET_INSTANCE_ARN"
conf "Output dir"         "$OUTPUT_DIR"
conf "Stack name"         "$STACK_NAME"

# ── Step 1: Verify credentials ────────────────────────────────────────────
step "Step 1: Verify AWS credentials"
check_identity "$SOURCE_PROFILE" "Source (CDTFAOld)"
check_identity "$TARGET_PROFILE" "Target (CDTFAAdmin)"

# ── Step 2: Register environments ─────────────────────────────────────────
step "Step 2: Register environments"
run pnpm awsync env add \
  --id "$SOURCE_ENV_ID" \
  --label "CDTFA Old" \
  --profile "$SOURCE_PROFILE" \
  --region "$SOURCE_REGION"

run pnpm awsync env add \
  --id "$TARGET_ENV_ID" \
  --label "CDTFA Admin Dev" \
  --profile "$TARGET_PROFILE" \
  --region "$TARGET_REGION"

# ── Step 3: Discover source instance ──────────────────────────────────────
step "Step 3: Discover source"
run pnpm awsync discover start "$SOURCE_ENV_ID" \
  --seeds "$SOURCE_INSTANCE_ARN" \
  --concurrency 10 \
  --skip-if-exists

info "Source graph statistics:"
pnpm awsync graph stats "$SOURCE_ENV_ID"

# ── Step 4: Discover target instance (needed for auto-link) ───────────────
# Do NOT --skip-if-exists here: target may have resources created by prior
# partial deploys, and the export step relies on a fresh target graph to skip
# already-present resources.
step "Step 4: Discover target"
run pnpm awsync discover start "$TARGET_ENV_ID" \
  --seeds "$TARGET_INSTANCE_ARN" \
  --concurrency 10

info "Target graph statistics:"
pnpm awsync graph stats "$TARGET_ENV_ID"

# ── Step 5: Exclude resource types that don't translate cross-account ─────
step "Step 5: Exclude non-portable types"
info "Queues and contact flows exist in the target already — referenced via existing ARNs."
info "Phone numbers are account/instance-specific."
info "Prompts require manual S3 audio file migration — cannot be deployed via CDK."
run pnpm awsync graph exclude-type "$SOURCE_ENV_ID" connect:instance
run pnpm awsync graph exclude-type "$SOURCE_ENV_ID" connect:queue
run pnpm awsync graph exclude-type "$SOURCE_ENV_ID" connect:contact-flow
run pnpm awsync graph exclude-type "$SOURCE_ENV_ID" connect:phone-number
run pnpm awsync graph exclude-type "$SOURCE_ENV_ID" connect:prompt
run pnpm awsync graph exclude-type "$SOURCE_ENV_ID" connect:user

info "Inclusion summary after exclusions:"
pnpm awsync graph type-summary "$SOURCE_ENV_ID"

# ── Step 6: Link Connect instances + auto-link resources ─────────────────
step "Step 6: Link instances and auto-link resources"
info "Manually linking source and target Connect instances so all instanceArn fields rewrite correctly."
run pnpm awsync link add \
  --source-arn "$SOURCE_INSTANCE_ARN" \
  --source-env "$SOURCE_ENV_ID" \
  --target-arn "$TARGET_INSTANCE_ARN" \
  --target-env "$TARGET_ENV_ID" \
  --unified-id "ConnectInstance" \
  --label "Connect Instance"

info "Auto-linking remaining matching resources by name between environments."
run pnpm awsync link auto-link "$SOURCE_ENV_ID" "$TARGET_ENV_ID"

info "Fuzzy-linking contact flows by normalized name (handles CDTFA prefix differences)."
run pnpm awsync link fuzzy-link "$SOURCE_ENV_ID" "$TARGET_ENV_ID" \
  --service connect --resource-type contact-flow --cutoff 60

info "Fuzzy-linking queues to resolve routing-profile queue configs cross-account."
run pnpm awsync link fuzzy-link "$SOURCE_ENV_ID" "$TARGET_ENV_ID" \
  --service connect --resource-type queue --cutoff 60

run pnpm awsync link stats --env "$SOURCE_ENV_ID"

# ── Step 7: Export CDK ────────────────────────────────────────────────────
step "Step 7: Export CDK"
run pnpm awsync export cdk "$SOURCE_ENV_ID" "$OUTPUT_DIR" \
  --stack-name "$STACK_NAME" \
  --use-env "$TARGET_ENV_ID"

# ── Step 8: Validate ─────────────────────────────────────────────────────
step "Step 8: Validate (cdk synth)"
run pnpm awsync export validate "$OUTPUT_DIR"

# ── Step 9: Deploy ────────────────────────────────────────────────────────
step "Step 9: Deploy to target account"
confirm "Deploy all CDK stacks to target instance ${TARGET_INSTANCE}?"
cd "$OUTPUT_DIR"
run npm install

# Deploy stacks individually with --no-rollback so partial progress is kept
# and a failure in one stack doesn't revert the others.
STACKS=$(cdk list --profile "$TARGET_PROFILE" 2>/dev/null | tr '\n' ' ' || echo "$STACK_NAME")
info "Stacks to deploy: ${STACKS}"
DEPLOY_FAILED=0
for stack in $STACKS; do
  info "Deploying stack: $stack"
  if run cdk deploy "$stack" --profile "$TARGET_PROFILE" \
       --require-approval never --no-rollback; then
    success "Stack $stack deployed"
  else
    warn "Stack $stack reported failures — resources that succeeded are retained (--no-rollback)"
    DEPLOY_FAILED=1
  fi
done
if [[ $DEPLOY_FAILED -eq 1 ]]; then
  warn "One or more stacks had failures. Run the workflow again to retry failed resources."
fi
cd -

step "Done"
success "Source: $SOURCE_INSTANCE_ARN"
success "Target: $TARGET_INSTANCE_ARN"
info    "CDK project: $OUTPUT_DIR"
info    "Total elapsed: $(_elapsed $_SCRIPT_START)s"
