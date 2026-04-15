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
        '--allow-insecure-localhost'
    ]
});

process.env.CACHE_MAXSIZE = process.env.CACHE_MAXSIZE || 1000;
process.env.CACHE_TTL = process.env.CACHE_TTL || 43200;

server.use({
    tabCreated: (req, res, next) => {
        const tab = req.prerender.tab;

        if (tab) {
            tab.Console.enable();
            tab.Network.enable();

            tab.Console.messageAdded((params) => {
                console.log('🟡 Browser log:', params.message.text);
            });

            tab.Network.loadingFailed((params) => {
                console.log('🔴 Network Failed:', params.errorText, params.url);
            });

            tab.Runtime.enable();
            tab.Runtime.exceptionThrown((exception) => {
                console.log('💥 JS Exception:', exception.exceptionDetails.text);
            });
        }

        next();
    }
});




server.use(prerender.removeScriptTags()); 

server.use(memoryCache);

console.log('Prerender on Node 24 starting...');
server.start();
