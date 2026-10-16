// Service worker minimal : il rend l'application installable. Aucune mise en
// cache : l'application a besoin du serveur local pour fonctionner.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request));
});
