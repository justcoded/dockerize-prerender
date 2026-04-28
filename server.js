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
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
        '--allow-insecure-localhost',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--disable-software-rasterizer',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--blink-settings=imagesEnabled=false'
    ],
    pageLoadTimeout: 20000,
    waitAfterLastRequest: parseInt(process.env.WAIT_AFTER_LAST_REQUEST, 10) || 200,
    pageDoneCheckInterval: 50,
    chromeRefreshRate: 100
});

process.env.CACHE_MAXSIZE = process.env.CACHE_MAXSIZE || 1000;
process.env.CACHE_TTL = process.env.CACHE_TTL || 43200;
process.env.WAIT_AFTER_LAST_REQUEST = process.env.WAIT_AFTER_LAST_REQUEST || 200;

// Block requests that typically hang and prevent page from finishing
const BLOCKED_PATTERNS = [
    /google-analytics\.com/,
    /googletagmanager\.com/,
    /facebook\.net/,
    /facebook\.com\/tr/,
    /hotjar\.com/,
    /intercom\.io/,
    /crisp\.chat/,
    /sentry\.io/,
    /segment\.com/,
    /mixpanel\.com/,
    /amplitude\.com/,
    /clarity\.ms/,
    /doubleclick\.net/,
    /\.woff2?(\?|$)/,
    /\.ttf(\?|$)/,
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /ws:\/\//,
    /wss:\/\//,
    /\/socket\.io\//,
    /\/sockjs-node\//,
    /\/hub\?/,
    /eventsource/i,
    /livereload/,
];

// Patterns for requests that should be ignored in requestsInFlight count
// (they bypass Fetch interception and hang forever)
const IGNORE_INFLIGHT_PATTERNS = [
    /^blob:/,
    /^data:/,
];

server.use({
    tabCreated: (req, res, next) => {
        const tab = req.prerender.tab;

        if (tab) {
            tab.Console.enable();
            tab.Network.enable();

            const pendingRequests = new Map();

            // Use Fetch domain to block unwanted network requests
            tab.Fetch.enable({ patterns: [{ requestStage: 'Request' }] });
            tab.Fetch.requestPaused((params) => {
                const url = params.request.url;
                const blocked = BLOCKED_PATTERNS.some(p => p.test(url));
                if (blocked) {
                    console.log('🚫 Blocked:', url);
                    tab.Fetch.failRequest({
                        requestId: params.requestId,
                        errorReason: 'Aborted'
                    });
                } else {
                    tab.Fetch.continueRequest({ requestId: params.requestId });
                }
            });

            tab.Network.requestWillBeSent((params) => {
                const url = params.request.url;

                // blob: URLs bypass Fetch interception and hang forever.
                // Prerender already incremented numRequestsInFlight before our handler,
                // so we decrement it back and skip tracking.
                if (IGNORE_INFLIGHT_PATTERNS.some(p => p.test(url))) {
                    tab.prerender.numRequestsInFlight--;
                    console.log('⏭️ Ignored from inflight:', url);
                    return;
                }

                pendingRequests.set(params.requestId, { url, time: Date.now() });
            });

            tab.Network.loadingFinished((params) => {
                pendingRequests.delete(params.requestId);
            });

            tab.Network.loadingFailed((params) => {
                const info = pendingRequests.get(params.requestId);
                if (info) {
                    console.log('🔴 Network Failed:', params.errorText, info.url);
                    pendingRequests.delete(params.requestId);
                }
            });

            tab.Console.messageAdded((params) => {
                console.log('🟡 Browser log:', params.message.text);
            });

            tab.Runtime.enable();
            tab.Runtime.exceptionThrown((exception) => {
                console.log('💥 JS Exception:', exception.exceptionDetails.text);
            });

            const intervalStart = Date.now();
            const interval = setInterval(() => {
                // Safety: kill interval after 30s max to prevent leaks
                if (Date.now() - intervalStart > 20000 || pendingRequests.size === 0) {
                    clearInterval(interval);
                    return;
                }
                const now = Date.now();
                console.log(`⏳ Pending requests (${pendingRequests.size}), inflight=${tab.prerender.numRequestsInFlight}:`);
                pendingRequests.forEach(({ url, time }) => {
                    console.log(`   - ${((now - time) / 1000).toFixed(1)}s ${url}`);
                });
            }, 3000);
        }

        next();
    }
});

server.use({
    beforeSend: (req, res, next) => {
        if (req.prerender.res) {
            const body = req.prerender.res.body || '';
            req.prerender.res.headers = {
                'content-type': 'text/html; charset=utf-8',
                'content-length': Buffer.byteLength(body, 'utf8'),
            };
        }
        next();
    }
});

server.use(prerender.removeScriptTags()); 
server.use(memoryCache);

const RESTART_INTERVAL = 24 * 60 * 60 * 1000;
const startedAt = Date.now();

setTimeout(() => {
    console.log('♻️ Scheduled restart after 24 hours');
    process.exit(0);
}, RESTART_INTERVAL);

setInterval(() => {
    const remaining = RESTART_INTERVAL - (Date.now() - startedAt);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    console.log(`🕐 Restart in ${hours}h ${minutes}m`);
}, 60 * 60 * 1000);

console.log('Prerender on Node 24 is starting...');
server.start();
