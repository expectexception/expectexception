#!/usr/bin/env bash
#
# Rebuild the deployment branches from main.
#
#   main            source of truth, full monorepo
#   frontend-only   mirror of main; Vercel builds frontendExpExc/
#   server          mirror of main; the local GPU server runs the whole thing
#   backend-only    contents of expectexception/ promoted to the repo root,
#                   because Render's service root is the repo root
#
# backend-only is the branch that needs real work. It used to be updated by
# copying expectexception/** onto it verbatim, which layered a complete second
# copy of the project *inside* the settings package directory — 417 duplicate
# files, including a nested expectexception/expectexception/. This script
# rebuilds its tree from main instead of adding to it, so the duplicates cannot
# accumulate again.
#
# Usage:
#   scripts/sync-deploy-branches.sh            # show what would change
#   scripts/sync-deploy-branches.sh --push     # rebuild and push
#
set -euo pipefail

SOURCE_BRANCH="main"
MIRROR_BRANCHES=("frontend-only" "server")
SUBTREE_BRANCH="backend-only"
SUBTREE_DIR="expectexception"
# Lives only on backend-only (it is not inside expectexception/ on main), so a
# wholesale tree rebuild would drop it.
PRESERVE_FROM_TARGET=(".github")

PUSH=false
[[ "${1:-}" == "--push" ]] && PUSH=true

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain)" ]]; then
    echo "error: working tree is dirty; commit or stash first." >&2
    exit 1
fi

echo "Fetching origin..."
git fetch --quiet origin

SOURCE_SHA=$(git rev-parse "origin/${SOURCE_BRANCH}")
echo "Source: origin/${SOURCE_BRANCH} @ ${SOURCE_SHA:0:9}"
echo

# --- backend-only: rebuild the tree as main's expectexception/ at root -------
sync_subtree_branch() {
    local target="$1"
    local new_tree parent new_commit tmp_index
    parent=$(git rev-parse "origin/${target}")

    tmp_index=$(mktemp -u)
    export GIT_INDEX_FILE="$tmp_index"

    # Replaces the index wholesale — this is what stops duplicates accruing.
    git read-tree "${SOURCE_SHA}:${SUBTREE_DIR}"

    for path in "${PRESERVE_FROM_TARGET[@]}"; do
        if git rev-parse -q --verify "${parent}:${path}" >/dev/null 2>&1; then
            git read-tree --prefix="${path}/" "${parent}:${path}"
        fi
    done

    new_tree=$(git write-tree)
    unset GIT_INDEX_FILE
    rm -f "$tmp_index"

    if [[ "$new_tree" == "$(git rev-parse "${parent}^{tree}")" ]]; then
        echo "${target}: already identical to ${SOURCE_BRANCH}:${SUBTREE_DIR}/, nothing to do."
        return
    fi

    echo "${target}: changes vs current branch tip"
    git diff --stat "${parent}^{tree}" "${new_tree}" | tail -20

    if [[ "$PUSH" != true ]]; then
        echo "${target}: dry run, not pushing."
        return
    fi

    new_commit=$(git commit-tree "$new_tree" -p "$parent" \
        -m "sync: rebuild ${target} from ${SOURCE_BRANCH}:${SUBTREE_DIR}/ @ ${SOURCE_SHA:0:9}")
    git push origin "${new_commit}:refs/heads/${target}"
    echo "${target}: pushed ${new_commit:0:9}"
}

# --- frontend-only / server: plain mirrors of main --------------------------
sync_mirror_branch() {
    local target="$1"
    local parent
    parent=$(git rev-parse "origin/${target}")

    if git merge-base --is-ancestor "$SOURCE_SHA" "$parent"; then
        echo "${target}: already contains ${SOURCE_BRANCH}, nothing to do."
        return
    fi

    echo "${target}: commits to bring over from ${SOURCE_BRANCH}"
    git log --oneline "${parent}..${SOURCE_SHA}" | head -20

    if [[ "$PUSH" != true ]]; then
        echo "${target}: dry run, not pushing."
        return
    fi

    # Fast-forward when possible; these branches are meant to track main and
    # carry no unique work of their own.
    if git merge-base --is-ancestor "$parent" "$SOURCE_SHA"; then
        git push origin "${SOURCE_SHA}:refs/heads/${target}"
        echo "${target}: fast-forwarded to ${SOURCE_SHA:0:9}"
    else
        echo "${target}: has diverged from ${SOURCE_BRANCH} and cannot fast-forward." >&2
        echo "${target}: resolve by hand, e.g. git checkout ${target} && git merge ${SOURCE_BRANCH}" >&2
        return 1
    fi
}

for branch in "${MIRROR_BRANCHES[@]}"; do
    sync_mirror_branch "$branch" || true
    echo
done

sync_subtree_branch "$SUBTREE_BRANCH"
echo

if [[ "$PUSH" != true ]]; then
    echo "Dry run complete. Re-run with --push to apply."
fi
