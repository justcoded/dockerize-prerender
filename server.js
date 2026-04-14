import prerender from 'prerender';
import memoryCache from 'prerender-memory-cache';

const server = prerender({
    chromeLocation: '/usr/bin/chromium',
    chromeFlags: [
        '--no-sandbox', 
        '--headless=new', 
        '--disable-gpu', 
        '--remote-debugging-port=9222', 
        '--hide-scrollbars',
        '--disable-dev-shm-usage' 
    ]
});

process.env.CACHE_MAXSIZE = process.env.CACHE_MAXSIZE || 1000;
process.env.CACHE_TTL = process.env.CACHE_TTL || 43200;

server.use(memoryCache);

console.log('Prerender on Node 24 is starting...');
server.start();