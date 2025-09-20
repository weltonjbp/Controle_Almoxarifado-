// Define um nome e uma versão para a cache. Mude a versão sempre que alterar os ficheiros abaixo.
const CACHE_NAME = 'almoxarifado-cache-v1';

// Lista de ficheiros essenciais para a aplicação funcionar offline.
const urlsToCache = [
  '/dashboard',
  '/static/js/app.js',
  '/static/js/main.js',
  '/static/manifest.json',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/favicon.ico' // Adicionado o favicon para ser guardado em cache
];

// Evento de Instalação: Guarda os ficheiros essenciais na cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: A guardar recursos essenciais na cache.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Ativação: Limpa caches antigas para garantir que a versão mais recente seja usada.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de Fetch: Interceta os pedidos de rede.
self.addEventListener('fetch', event => {
  // Ignora pedidos que não sejam GET e pedidos para a API para garantir dados sempre atualizados.
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se o recurso estiver na cache, retorna-o.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se não, busca na rede.
        return fetch(event.request).then(
          networkResponse => {
            // Se o pedido à rede for válido, guarda na cache para a próxima vez.
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch falhou; o utilizador pode estar offline.', error);
        });
      })
  );
});