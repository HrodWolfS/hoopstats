#!/usr/bin/env bash
#
# Ré-essaie une commande plusieurs fois avant d'abandonner.
#
# Motivation : le compute Neon (free tier) se met en veille (scale-to-zero)
# après quelques minutes d'inactivité. Le premier accès depuis un runner
# GitHub peut alors échouer avec « Can't reach database server » si le réveil
# dépasse le connect_timeout de Prisma. Un simple ré-essai suffit : la première
# tentative réveille la base, les suivantes se connectent normalement.
#
# Usage : retry.sh <commande> [args...]

set -uo pipefail

MAX_ATTEMPTS="${RETRY_MAX_ATTEMPTS:-3}"
DELAY="${RETRY_DELAY_SECONDS:-10}"

attempt=1
while true; do
  echo "::group::Tentative ${attempt}/${MAX_ATTEMPTS} : $*"
  "$@"
  status=$?
  echo "::endgroup::"

  if [ "$status" -eq 0 ]; then
    exit 0
  fi

  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "::error::Échec après ${MAX_ATTEMPTS} tentatives (code ${status}) : $*"
    exit "$status"
  fi

  echo "Échec (code ${status}). Nouvelle tentative dans ${DELAY}s…"
  sleep "$DELAY"
  attempt=$((attempt + 1))
done
