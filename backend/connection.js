const dns = require('dns');
const mongoose = require('mongoose');

async function connectDatabase(url) {
  // Some networks block SRV lookups for mongodb+srv:// URIs; allow overriding the resolvers.
  const servers = (process.env.MONGODB_DNS_SERVERS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
  mongoose.set('strictQuery', true);
  return mongoose.connect(url, { serverSelectionTimeoutMS: 15000 });
}

module.exports = connectDatabase;
