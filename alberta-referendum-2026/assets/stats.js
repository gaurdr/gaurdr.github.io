// Shows "N views" for this page from GoatCounter (dgiitrpr.goatcounter.com).
// Needs "allow using the visitor counter" turned on in GoatCounter's settings;
// until then (or if the request fails) nothing is shown.
(function () {
  const GC = "https://dgiitrpr.goatcounter.com";
  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return;

  fetch(`${GC}/counter/${encodeURIComponent(location.pathname)}.json`)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then(({ count }) => {
      const el = document.createElement("div");
      el.className = "views";
      el.textContent = `${count} views of this page`;
      (document.querySelector("footer") ?? document.body).appendChild(el);
    })
    .catch(() => {});
})();
