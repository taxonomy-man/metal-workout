// Definiera cache-namn (ändra vid större uppdateringar för att tvinga omcaching)
const CACHE_NAME = 'metal-workout-cache-v1.4';

// Lista över filer och resurser som ska cachelagras när Service Worker installeras
const URLS_TO_CACHE = [
  '/', // Cachelagra startsidan
  'index.html', // Cachelagra huvud-HTML-filen (byt namn om din fil heter något annat)
  // Lägg till CSS om du har separat fil: 'styles/main.css',
  'https://cdn.tailwindcss.com', // Cachelagra Tailwind (kan vara svårt, men värt ett försök)
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js', // Cachelagra Tone.js
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js', // Cachelagra Chart.js
  'https://fonts.googleapis.com/css2?family=Metal+Mania&family=Russo+One&display=swap', // Cachelagra typsnitt
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css', // Cachelagra Font Awesome CSS
   // Cachelagra Font Awesome webfonts (viktigt för offline-ikoner)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-brands-400.woff2', // Om du använder brand-ikoner
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-regular-400.woff2', // Om du använder regular-ikoner
  // Lägg till ikoner från manifest.json
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'icons/apple-touch-icon.png', // Om den finns
  'icons/favicon.ico' // Om den finns
  // Lägg eventuellt till fler bilder eller resurser här
];

// INSTALL Event: Körs när Service Worker installeras första gången
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  // Vänta tills cachelagringen är klar innan installationen anses slutförd
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell individually...');
        // Fetch and cache each URL individually, allowing no-cors for external resources
        const cachePromises = URLS_TO_CACHE.map(urlToCache => {
          // Create a new Request object to specify the mode
          const request = new Request(urlToCache, { mode: 'no-cors' });
          return fetch(request)
            .then(response => {
              if (response.status === 404) {
                  // Log specific 404s, but don't fail the entire install if one file is missing
                  console.error(`[Service Worker] Failed to fetch ${urlToCache}: 404 Not Found`);
                  // Don't return cache.put promise here, effectively skipping this file
                  return Promise.resolve(); // Resolve so Promise.all doesn't reject immediately
              } 
              // For opaque responses (mode: 'no-cors'), status is 0, but we still cache them
              // For same-origin or CORS-enabled responses, check for valid status
              if (!response.ok && response.status !== 0) { 
                  console.error(`[Service Worker] Failed to fetch ${urlToCache}: Status ${response.status}`);
                  // Don't return cache.put promise here
                   return Promise.resolve();
              }
              return cache.put(urlToCache, response); // Use original URL as cache key
            })
            .catch(error => {
              console.error(`[Service Worker] Fetching ${urlToCache} failed:`, error);
               // Don't reject Promise.all immediately on individual fetch errors
               return Promise.resolve(); 
            });
        });

        // Wait for all cache operations to settle (resolve or reject individually)
        return Promise.all(cachePromises)
            .then(() => {
                console.log('[Service Worker] Finished attempting to cache URLs.');
            })
            // We don't catch here anymore, individual errors are handled above
      })
      .then(() => {
         console.log('[Service Worker] Installation complete, skipping waiting.');
         // Tvinga den nya Service Workern att bli aktiv direkt
         return self.skipWaiting();
      })
       // Add a catch at the end of the waitUntil chain to handle fatal errors like inability to open cache
       .catch(error => {
            console.error('[Service Worker] Installation failed fatally:', error);
       })
  );
});

// ACTIVATE Event: Körs när Service Worker aktiveras (efter installation eller uppdatering)
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  // Rensa gamla cache-versioner för att spara utrymme och undvika konflikter
  const cacheWhitelist = [CACHE_NAME]; // Behåll endast den aktuella cachen
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Om cachen inte finns i vitlistan, ta bort den
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Activation complete, claiming clients.');
        // Ta kontroll över alla öppna klienter (flikar) direkt
        return self.clients.claim();
    })
  );
});

// FETCH Event: Körs varje gång appen gör ett nätverksanrop (hämtar filer, bilder, API-data etc.)
self.addEventListener('fetch', event => {
    // console.log('[Service Worker] Fetching:', event.request.url);

    // Använd en "Cache First, then Network" strategi
    event.respondWith(
        caches.match(event.request) // Försök hitta resursen i cachen först
            .then(response => {
                // Om resursen finns i cachen, returnera den direkt
                if (response) {
                    // console.log('[Service Worker] Found in cache:', event.request.url);
                    return response;
                }

                // Om resursen inte finns i cachen, hämta den från nätverket
                // console.log('[Service Worker] Not in cache, fetching from network:', event.request.url);
                return fetch(event.request).then(
                    networkResponse => {
                        // Kontrollera om det är ett GET-anrop och om det lyckades
                        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
                            // Viktigt: Klona svaret eftersom det bara kan läsas en gång
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    // console.log('[Service Worker] Caching new resource:', event.request.url);
                                    // Använd original request som nyckel
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        // Returnera det ursprungliga svaret från nätverket
                        return networkResponse;
                    }
                ).catch(error => {
                    // Om både cache och nätverk misslyckas (t.ex. offline och inte cachelagrad)
                    console.error('[Service Worker] Fetch failed; returning offline fallback or error.', event.request.url, error);
                    // Här kan man returnera en generell offline-sida om man har en:
                    // return caches.match('/offline.html');
                    // Eller bara låta felet ske så appen hanterar det
                    // Returnera ett Error Response för att signalera problemet tydligare
                    return new Response(`Network error: ${error.message}`, {
                        status: 408, // Request Timeout
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});


// MESSAGE Event: Hantera meddelanden från klienten (t.ex. för att visa notiser)
self.addEventListener('message', event => {
    console.log('[Service Worker] Received message:', event.data);
    if (event.data && event.data.type === 'show-notification') {
        const { title, options } = event.data.options;
        // Visa notisen via Service Worker (mer pålitligt för PWA)
        event.waitUntil(
            self.registration.showNotification(title, options)
                .catch(err => console.error('[Service Worker] Notification error:', err))
        );
    }
    // Lägg till hantering för andra meddelandetyper här (t.ex. Background Sync)
});

// Optional: Background Sync event listener (kräver mer logik i appen för att registrera sync)
/*
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync event fired:', event.tag);
  if (event.tag === 'sync-workout-data') { // Example tag
    event.waitUntil(syncWorkoutDataToServer()); // Define this function to fetch from IndexedDB and POST
  }
});

async function syncWorkoutDataToServer() {
    // 1. Open IndexedDB
    // 2. Read unsynced data
    // 3. Make fetch POST requests for each item
    // 4. Handle success/failure (remove from DB on success)
    console.log("[Service Worker] Attempting to sync data...");
    // Placeholder for actual sync logic
}
*/
