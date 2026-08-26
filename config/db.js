const mongoose = require('mongoose');

// Cached across invocations on a warm serverless instance (Vercel may reuse
// the same process for consecutive requests) — avoids reconnecting to
// MongoDB on every single request. This is the standard pattern recommended
// for using Mongoose inside serverless functions.
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // IMPORTANT: never call process.exit() here. In a traditional
    // long-running server that's a reasonable "fail fast" strategy; in a
    // serverless function (Vercel, etc.) it kills the whole function
    // invocation mid-request and the platform reports it to the client as
    // an opaque 500 with no useful message. Instead, clear the cached
    // promise (so the next request can retry) and rethrow — the middleware
    // in server.js turns this into a clear JSON 503 with the real error.
    cached.promise = null;
    console.error(`MongoDB Connection Error: ${err.message}`);
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
