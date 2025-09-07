// Define um nome e versão para o cache. Mude a versão para forçar a atualização.
const CACHE_NAME = 'almoxarifado-f6p-cache-v1';

// --- CORREÇÃO APLICADA: Links externos removidos ---
const urlsToCache = [
    '/dashboard',
    '/static/js/app.js'
    // Links externos como 'cdn.tailwindcss.com' foram removidos para evitar erros de CORS.
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto. Guardando ficheiros essenciais...');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Falha ao abrir ou adicionar ao cache:', err);
            })
    );
});

// Evento de Fetch: Interceta os pedidos à rede.
self.addEventListener('fetch', event => {
    // Ignora todos os pedidos que não são GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Estratégia: Cache, e depois rede (Cache falling back to network)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se o recurso estiver em cache, retorna-o.
                if (!event.request.url.startsWith('http')) {
                    return;
                }

                // Se não estiver em cache, busca na rede.
                return fetch(event.request).then(
                    networkResponse => {
                        // Se o pedido for para a nossa API, não guarda em cache.
                        if (event.request.url.includes('/api/')) {
                            return networkResponse;
                        }
                        
                        // Para outros recursos, clona a resposta e guarda em cache para uso futuro.
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    }
                );
            })
    );
});

// Evento de Ativação: Limpa caches antigos.
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