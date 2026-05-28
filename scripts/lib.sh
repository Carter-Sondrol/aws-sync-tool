#!/usr/bin/env bash
# scripts/lib.sh — shared logging + interactive helpers for awsync workflow scripts.
# Source this file after setting YES=0|1 in the parent script.

# ── Colors (disabled when stdout is not a terminal) ───────────────────────────
if [[ -t 1 ]]; then
  _RST='\033[0m'  _BLD='\033[1m'  _DIM='\033[2m'
  _CYN='\033[36m' _GRN='\033[32m' _YLW='\033[33m' _RED='\033[31m'
else
  _RST='' _BLD='' _DIM='' _CYN='' _GRN='' _YLW='' _RED=''
fi

_ts()       { date '+%H:%M:%S'; }
_elapsed()  { echo $(( $(date +%s) - $1 )); }

_SCRIPT_START=$(date +%s)
_STEP_START=0

step() {
  local now elapsed_msg=''
  now=$(date +%s)
  if [[ $_STEP_START -gt 0 ]]; then
    elapsed_msg="  (prev step: $(( now - _STEP_START ))s)"
  fi
  _STEP_START=$now
  local sep='═══════════════════════════════════════════════════════'
  printf '\n%b%s%b\n'       "${_BLD}${_CYN}" "$sep"               "${_RST}"
  printf '%b  [%s] %s%b%b%s%b\n' "${_BLD}${_CYN}" "$(_ts)" "$*" "${_RST}" "${_DIM}" "$elapsed_msg" "${_RST}"
  printf '%b%s%b\n'        "${_BLD}${_CYN}" "$sep"               "${_RST}"
}

info()    { printf '%b  [%s] %s%b\n'    "${_DIM}" "$(_ts)" "$*" "${_RST}"; }
success() { printf '%b  [%s] ✓ %s%b\n' "${_GRN}" "$(_ts)" "$*" "${_RST}"; }
warn()    { printf '%b  [%s] ⚠ %s%b\n' "${_YLW}" "$(_ts)" "$*" "${_RST}"; }
error()   { printf '%b  [%s] ✗ %s%b\n' "${_RED}" "$(_ts)" "$*" "${_RST}" >&2; }
run()     { printf '%b  [%s] ▶ %s%b\n' "${_DIM}" "$(_ts)" "$*" "${_RST}"; "$@"; }

# conf KEY VALUE — right-aligned key label for config display blocks
conf() { printf '%b  %-28s %b%s%b\n' "${_DIM}" "$1" "${_RST}" "$2" "${_RST}"; }

# ── Log file ──────────────────────────────────────────────────────────────────
LOG_FILE=''

init_log() {
  local name="$1" repo_root log_dir
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  log_dir="${repo_root}/logs"
  mkdir -p "$log_dir"
  LOG_FILE="${log_dir}/awsync-${name}-$(date '+%Y%m%d-%H%M%S').log"
  # Tee all output (stdout + stderr) to log file; strip ANSI codes so log is plain text
  exec > >(tee >(sed -u 's/\x1b\[[0-9;]*m//g' >> "$LOG_FILE")) 2>&1
  info "Logging to: ${LOG_FILE}"
  # Print context on any unhandled error (requires set -E in the calling script)
  trap '_e=$?; error "Script failed at line $LINENO (exit $_e) — see $LOG_FILE"; exit $_e' ERR
}

# ── Interactive confirm ────────────────────────────────────────────────────────
# confirm "Question?" — auto-approves when YES=1, otherwise prompts [y/N].
# Exits the script cleanly if the user declines.
confirm() {
  printf '\n%b  [%s] ⚡ %s%b\n' "${_YLW}" "$(_ts)" "$1" "${_RST}"
  if [[ "${YES:-0}" -eq 1 ]]; then
    printf '%b     (auto-confirmed via --yes)%b\n' "${_DIM}" "${_RST}"
    return 0
  fi
  printf '%b     Proceed? [y/N] › %b' "${_YLW}" "${_RST}"
  local reply
  read -r reply </dev/tty
  if [[ "$reply" =~ ^[Yy]$ ]]; then
    return 0
  fi
  warn "Skipped — exiting."
  exit 0
}

# ── AWS identity check ────────────────────────────────────────────────────────
# check_identity PROFILE LABEL — prints account/arn for the given profile.
# Fails fast (exits 1) if the profile is expired or misconfigured.
check_identity() {
  local profile="$1" label="$2"
  info "Checking credentials: $label ($profile)"
  local out
  if ! out=$(aws sts get-caller-identity --profile "$profile" --output text \
               --query '[Account, UserId, Arn]' 2>&1); then
    error "Credential check failed for profile '$profile':"
    error "$out"
    exit 1
  fi
  local account userId arn
  IFS=$'\t' read -r account userId arn <<< "$out"
  conf "  Account" "$account"
  conf "  UserID"  "$userId"
  conf "  ARN"     "$arn"
  success "$label — credentials OK"
}
