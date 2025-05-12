// Nome della cache
const CACHE_NAME = 'serenity-cache-v1';

// Elenco di risorse da memorizzare nella cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon.png',
  '/sounds/white-noise.mp3',
  '/sounds/brown-noise.mp3',
  '/sounds/pink-noise.mp3',
  '/sounds/rain.wav',
  '/sounds/storm.mp3',
  '/sounds/wind.mp3',
  '/sounds/stream.mp3',
  '/sounds/birds.mp3',
  '/sounds/waves.mp3',
  '/sounds/boat.mp3',
  '/sounds/city.mp3',
  '/sounds/fireplace.mp3',
  '/sounds/hair-dryer.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installazione in corso');
  
  // Forza l'attivazione del nuovo Service Worker senza attendere la chiusura di tutte le schede
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Apertura cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Tutte le risorse sono state memorizzate nella cache');
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Attivazione in corso');
  
  // Prendi il controllo immediato di tutte le pagine
  self.clients.claim();
  
  // Elimina cache vecchie
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminazione della vecchia cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercettazione delle richieste di rete
self.addEventListener('fetch', (event) => {
  // Controlla se la richiesta è per un file audio
  if (event.request.url.includes('/sounds/')) {
    // Strategia Cache First per i file audio
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // Se l'elemento è già in cache, restituiscilo
            return response;
          }
          
          // Altrimenti, preleva da internet e memorizza in cache
          return fetch(event.request).then((networkResponse) => {
            // Verifica se abbiamo ricevuto una risposta valida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clona la risposta perché è uno stream e può essere utilizzato una sola volta
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          });
        })
    );
  } else {
    // Strategia Network First per altre risorse
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// Aggiungi nel tuo service-worker.js
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Aggiungi questa funzione al tuo script.js
function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) {
        // Esiste un nuovo service worker in attesa
        showUpdateNotification();
      }
    });
  }
}

function showUpdateNotification() {
  const updateElement = document.createElement('div');
  updateElement.className = 'update-notification';
  updateElement.innerHTML = `
    <div class="update-content">
      <p>È disponibile un aggiornamento dell'app!</p>
      <button class="update-now">Aggiorna ora</button>
    </div>
  `;
  
  document.body.appendChild(updateElement);
  
  updateElement.querySelector('.update-now').addEventListener('click', function() {
    // Invia un messaggio al service worker per aggiornare subito
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    
    // Ricarica la pagina
    window.location.reload();
  });
}

// Controlla aggiornamenti all'avvio
window.addEventListener('load', checkForUpdates);