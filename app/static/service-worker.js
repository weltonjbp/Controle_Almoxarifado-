self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(networkResponse => {
            // VERIFICAÇÕES ADICIONAIS
            if (!networkResponse || !networkResponse.ok) {
              return networkResponse;
            }
            
            // Não cacheiar requisições de extensões do Chrome
            if (event.request.url.startsWith('chrome-extension://')) {
              return networkResponse;
            }
            
            // Apenas respostas GET podem ser cacheiadas
            if (event.request.method !== 'GET') {
              return networkResponse;
            }
            
            // Não cacheiar respostas opaque
            if (networkResponse.type === 'opaque') {
              return networkResponse;
            }
            
            // Não cacheiar recursos de outros domínios
            if (!event.request.url.startsWith(self.location.origin)) {
              return networkResponse;
            }
            
            // Não cacheiar respostas da API
            if (event.request.url.includes('/api/')) {
              return networkResponse;
            }
            
            // Apenas para recursos válidos, cacheiar
            return caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            return caches.match(event.request) || 
              new Response('Offline', { status: 503 });
          });
      })
      .catch(error => {
        console.error('Cache match failed:', error);
        return new Response('Offline', { status: 503 });
      })
  );
});