// jsonwebtoken@8 -> jwa -> buffer-equal-constant-time reads
// require("buffer").SlowBuffer as soon as it is loaded. Node 26 dropped that
// export, so the require throws before any route exists and the server never
// listens. SlowBuffer is only an uninitialised Buffer, so aliasing it back is
// enough - and it has to happen before jsonwebtoken is first required.
const bufferModule = require("node:buffer") as { SlowBuffer?: typeof Buffer };

if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = Buffer;
}

export {};
