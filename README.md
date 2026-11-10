# Massage backend part

## Running it

```
npm install
cp .env.example .env   # then fill it in
npm run api:dev        # nodemon index.ts
```

`api:build` compiles to `build/`, `test` runs the whole suite through `node --test` (no database, no network).

## Environment

All of it is documented in `.env.example`. Two things are worth knowing before you set it up:

- **`INVITE_SECRET` is the registration gate.** Registration is closed to everyone without an invite code unless their address is in `ADMIN_EMAILS`, and with no secret set that is the *only* way in. Never leave it unset on a box you expect people to sign up to, and rotate it to retire outstanding codes.
- **`TRUST_PROXY=1` is opt-in.** Set it only when a proxy fronts the app; otherwise the auth limiter sees the proxy's address for every caller and one flood locks everyone out.

## Minting an invite

```
npm run invite -- someone@example.com
```

Needs no database and no running app, and it prints the code for that exact address.
