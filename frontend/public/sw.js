self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Your daily tasks are ready.',
    icon: data.icon || 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
    data: { url: data.url || 'http://localhost:5173/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'MahaPrep AI', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
