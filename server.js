const prerender = require('prerender');
process.env.CACHE_MAXSIZE = process.env.CACHE_MAXSIZE || 1000;
process.env.CACHE_TTL = process.env.CACHE_TTL || 86400;

const server = prerender({
    chromeLocation: '/usr/bin/chromium',
    chromeFlags: ['--no-sandbox', '--headless', '--disable-gpu', '--remote-debugging-port=9222', '--hide-scrollbars']
});

server.use(require('prerender-memory-cache'))

console.log(`Prerender start`);

server.start();
