// const redis = require('redis');

// const client = redis.createClient(); // Default: localhost:6379

// client.on('error', err => {
//   console.error('Redis error:', err);
// });

// client.connect(); // for Redis v4 (async)

// module.exports = client;



const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL // Redis Cloud URL
});

client.on('error', (err) => console.error('Redis Error:', err));
client.connect();

module.exports = client;
