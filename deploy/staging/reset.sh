#!/usr/bin/env bash
#
# Puts the staging stack back to nothing: containers, local volumes, and the
# testing database.
#
#   ./reset.sh          # asks first
#   ./reset.sh --yes    # no question
#
# It refuses to drop a database whose name does not contain "test". The one thing
# this script must never do is empty the live one, and pointing it at production
# is a one-character mistake in .env.

set -euo pipefail
cd "$(dirname "$0")"

if [ "${1:-}" != "--yes" ]; then
    read -r -p "Drop the staging database and every staging container? [y/N] " answer
    [ "$answer" = "y" ] || {
        echo "nothing done"
        exit 1
    }
fi

# The drop runs inside the API image with the API's own environment, so the URI is
# assembled from the same four variables the app itself reads instead of from a
# copy of the connection string that can drift away from it.
docker compose run --rm --no-deps -T api node -e '
    const mongoose = require("mongoose");
    const { DB_USER: user, DB_PASSWORD: password, DB_HOST: host, DB: database } = process.env;

    if (!/test/i.test(database || "")) {
        console.error("refusing to drop " + database + ": the name does not look like a staging database");
        process.exit(1);
    }

    const uri = "mongodb+srv://" + encodeURIComponent(user) + ":" + encodeURIComponent(password) +
        "@" + host + "/" + database + "?retryWrites=true&w=majority";

    mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
        .then(function () { return mongoose.connection.dropDatabase(); })
        .then(function () { console.log("dropped " + database + " on " + host); })
        .then(function () { return mongoose.connection.close(); })
        .catch(function (err) { console.error(String(err)); process.exit(1); });
'

# The volumes go with it, which means the CA does too: the next boot mints a new
# root and every device that trusted the old one warns again.
docker compose down -v

echo "staging is empty - docker compose up -d --pull always brings it back"
