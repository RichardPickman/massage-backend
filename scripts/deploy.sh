#!/usr/bin/env bash
#
# Runs on the deploy host, not on the runner: the workflows send it over ssh's
# stdin, because that host is the only place that knows where the stacks live.
#
#   ./deploy.sh <staging|production> <web|api> <full sha>
#
# This copy deploys the API container and refuses to do anything else. The web
# container has its own copy in massage, and the pair is what keeps an API commit
# from restarting the frontend: whichever repository is deploying, the other
# container is not touched.

set -euo pipefail

stack="${1:?usage: deploy.sh <staging|production> <web|api> <sha>}"
service="${2:?usage: deploy.sh <staging|production> <web|api> <sha>}"
sha="${3:?usage: deploy.sh <staging|production> <web|api> <sha>}"

if [ "$service" != api ]; then
    echo "this repository owns the api container, not $service" >&2
    exit 2
fi

case "$stack" in
    staging)
        # A second clone, tracking the integration branch. Production's checkout
        # stays on master, so the two never read each other's compose files.
        checkout="$HOME/Projects/massage-backend-staging"
        branch=testing
        stack_dir="$checkout/deploy/staging"
        port=8443
        ;;
    production)
        checkout="$HOME/Projects/massage-backend"
        branch=master
        stack_dir="$checkout/deploy"
        port=443
        ;;
    *)
        echo "unknown stack: $stack (expected staging or production)" >&2
        exit 2
        ;;
esac

tag="sha-$(printf '%s' "$sha" | cut -c1-7)"

# The compose definition comes from the branch this stack runs, so the host gets
# what was reviewed. --hard is safe here: the only untracked file that matters is
# .env, and a reset does not touch untracked files.
git -C "$checkout" fetch --quiet origin "$branch"
git -C "$checkout" reset --hard --quiet "origin/$branch"
cd "$stack_dir"

if [ ! -f .env ]; then
    echo "no .env in $stack_dir - copy the example beside it and fill it in" >&2
    exit 1
fi

# .env is the state of record: it names the commit each image is running, so a
# rollback is editing this line and letting the same script restart the container.
awk -v tag="$tag" '
    index($0, "API_TAG=") == 1 { print "API_TAG=" tag; found = 1; next }
    { print }
    END { if (!found) print "API_TAG=" tag }
' .env > .env.new
mv .env.new .env

# --no-deps is the point of the split: restart this container and nothing else,
# and web keeps serving from the old image while the API comes back.
docker compose pull --quiet "$service"
docker compose up -d --no-deps "$service"

# A container that starts is not an image that works. /api/health is deliberately
# shallow - it answers whether the process serves, not whether Atlas is reachable -
# so a green probe here means "this commit boots", which is what a deploy can know.
# -k only for staging: its certificate comes from Caddy's own CA, while
# production's is real and a certificate problem there must fail.
domain="$(sed -n 's/^DOMAIN=//p' .env | head -1)"
probe=(-s -f -o /dev/null --max-time 10)
if [ "$stack" = staging ]; then
    probe+=(-k)
fi

# `up -d` returns as soon as the container is created, and on the very first run
# Caddy still has to mint a certificate before it answers at all. A single probe
# therefore races the start and reports a failure that is only "not yet": the
# first two deploys here failed exactly that way while the api was healthy.
# Wait for the port instead of guessing - 20 attempts two seconds apart.
answered=0
for _ in $(seq 1 20); do
    if curl "${probe[@]}" --resolve "$domain:$port:127.0.0.1" "https://$domain:$port/api/health"; then
        answered=1
        break
    fi
    sleep 2
done

if [ "$answered" != 1 ]; then
    echo "api did not answer /api/health on $domain:$port after 40s" >&2
    docker compose logs --tail 40 api >&2
    exit 1
fi

echo "$stack: api is running $tag (https://$domain:$port/api/health)"
