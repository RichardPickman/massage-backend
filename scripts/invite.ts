import { getInviteConfig } from "../config";
import { makeInviteCode, normalizeEmail } from "../helpers/invite";

const address = normalizeEmail(process.argv[2]);

if (!address.includes("@")) {
  console.error("usage: npm run invite -- someone@example.com");
  process.exit(1);
}

const { secret } = getInviteConfig();

if (!secret) {
  console.error(
    "INVITE_SECRET is not set: a code only works if it is minted with the secret the server checks against.",
  );
  process.exit(1);
}

// The address is printed alongside the code because the two are a pair: the code
// is worthless for any other address, so sending it alone is a way to confuse
// the person receiving it.
console.log(`${address} ${makeInviteCode(address, secret)}`);
