import mongoose from "mongoose";
import "../model/db";
import { normalizeEmail } from "../helpers/invite";
import userModel from "../model/schemes/User";

// The role a person gets is decided once, when the account is created, so
// editing ADMIN_EMAILS afterwards changes nothing for an account that already
// exists. This is the lever for that case, and for taking the role away again.
const address = normalizeEmail(process.argv[2]);
const requestedRole = process.argv.includes("--user") ? "user" : "admin";

if (!address.includes("@")) {
  console.error("usage: npm run promote -- someone@example.com [--user]");
  process.exit(1);
}

userModel
  .findOne({ email: address })
  .then((document) => {
    if (!document) {
      console.error(
        `${address} has no account. Register it first: while the address is in ADMIN_EMAILS it needs no invite code.`,
      );
      process.exitCode = 1;

      return;
    }

    if (document.role === requestedRole) {
      console.log(`${address} is already ${requestedRole}.`);

      return;
    }

    return userModel
      .updateOne({ email: address }, { $set: { role: requestedRole } })
      .then(() => {
        console.log(`${address} ${document.role || "(no role)"} -> ${requestedRole}`);
        // The role travels in the token, so the person has to sign in again for
        // the new one to be minted. A page reload only refreshes the old claims.
        console.log("They have to sign out and sign in again for it to take.");
      });
  })
  .catch((error: Error) => {
    console.error(`Could not change the role: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
