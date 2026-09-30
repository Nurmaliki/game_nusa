// The whole app is client-side: prerender every route to static HTML so the
// deploy has no cold starts and pages are served straight from the CDN edge.
// `/play` additionally sets `ssr = false` (Phaser needs the browser) but is
// still prerendered to a shell that hydrates on the client.
export const prerender = true;
