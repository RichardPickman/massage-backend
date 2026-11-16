import mongoose from 'mongoose';
import { getConfig } from '../config';

const { username, password, hostname, database } = getConfig();
// Encoded, because a generated password containing @ or : silently turns into a
// different URI and the failure looks like a network problem, not a typo.
const dbURI = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostname}/${database}?retryWrites=true&w=majority`;
 
// The promise is handled: an initial connect can fail without being a bug - an
// Atlas IP allowlist miss, an outage, a typo in the host - and an unhandled
// rejection is fatal on Node 15+, which would exit the process and put a
// container into a restart loop. The driver keeps retrying in the background, so
// staying up and logging is both more honest and more useful than dying.
mongoose.connect(dbURI).catch(function (err) {
  console.log('Mongoose initial connection failed: ' + err);
});

// Prints where it connected, never the credentials it connected with: this
// line used to include the whole URI, so every boot put the database password
// in the logs.
mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open to ' + hostname + '/' + database);
}); 
  
mongoose.connection.on('error',function (err) { 
  console.log('Mongoose default connection error: ' + err);
}); 

mongoose.connection.on('disconnected', function () { 
  console.log('Mongoose default connection disconnected'); 
});

process.on('SIGINT', function() {   
  mongoose.connection.close(function () { 
    console.log('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 
