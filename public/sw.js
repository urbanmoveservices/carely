const CACHE_NAME = "vaidya-gpt-shell-v1";

const SHELL_ASSETS = ["/"];



const NEVER_CACHE_PREFIXES = [

  "/api/",

  "/reports/",

  "/documents/",

  "/storage/",

  "/admin/",

  "/share/",

  "/invite/",

  "/emergency-card/",

];



self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))

  );

  self.skipWaiting();

});



self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches.keys().then((keys) =>

      Promise.all(

        keys

          .filter((key) => key !== CACHE_NAME)

          .map((key) => caches.delete(key))

      )

    )

  );

  self.clients.claim();

});



function shouldBypassCache(pathname) {

  if (pathname === "/manifest.webmanifest" || pathname === "/manifest.json") {

    return true;

  }

  return NEVER_CACHE_PREFIXES.some((p) => pathname.startsWith(p));

}



self.addEventListener("fetch", (event) => {

  const url = new URL(event.request.url);



  if (shouldBypassCache(url.pathname)) {

    event.respondWith(fetch(event.request));

    return;

  }



  if (event.request.mode === "navigate") {

    event.respondWith(

      fetch(event.request).catch(

        () => caches.match("/") || new Response("Offline", { status: 503 })

      )

    );

    return;

  }



  event.respondWith(

    caches.match(event.request).then((cached) => {

      if (cached) return cached;

      return fetch(event.request).then((response) => {

        if (

          response.ok &&

          (url.pathname.endsWith(".js") ||

            url.pathname.endsWith(".css") ||

            url.pathname.endsWith(".woff2") ||

            url.pathname.endsWith(".png"))

        ) {

          const clone = response.clone();

          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));

        }

        return response;

      });

    })

  );

});

