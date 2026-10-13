module.exports=[745680,e=>{"use strict";let t=String.raw`(function () {
  "use strict";
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "https://rynet.co.za";

  var CSS = [
    ":host{display:block;font:inherit;color:inherit}",
    "*{box-sizing:border-box}",
    ".bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;margin:0 0 16px}",
    ".count{font-weight:600}",
    "select{font:inherit;padding:8px 10px;border:1px solid #c9ced6;border-radius:8px;background:#fff;color:#0b1320;min-height:40px}",
    ".grid{list-style:none;margin:0;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))}",
    ".card{display:flex;flex-direction:column;height:100%;border:1px solid #e3e6eb;border-radius:12px;overflow:hidden;background:#fff;color:#0b1320;text-decoration:none;transition:box-shadow .15s,transform .15s}",
    ".card:hover{box-shadow:0 8px 24px rgba(0,17,35,.12);transform:translateY(-2px)}",
    ".card:focus-visible{outline:3px solid var(--accent);outline-offset:2px}",
    ".photo{aspect-ratio:4/3;background:#eef0f3;overflow:hidden}",
    ".photo img{display:block;width:100%;height:100%;object-fit:cover}",
    ".body{display:flex;flex-direction:column;gap:6px;padding:14px 14px 16px}",
    ".title{margin:0;font-size:1rem;font-weight:700;line-height:1.3}",
    ".facts{margin:0;font-size:.875rem;color:#4b5563}",
    ".price{margin:auto 0 0;padding-top:6px;font-size:1.125rem;font-weight:800;color:var(--accent)}",
    ".empty,.error{margin:0;padding:16px;border:1px dashed #c9ced6;border-radius:12px;color:#4b5563}",
    ".credit{margin:14px 0 0;font-size:.75rem;color:#6b7280}",
    ".credit a{color:inherit}",
    "@media (prefers-reduced-motion:reduce){.card{transition:none}.card:hover{transform:none}}"
  ].join("");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function safeUrl(value) {
    try {
      var url = new URL(String(value));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function card(car) {
    var item = el("li");
    var link = el("a", "card");
    var href = safeUrl(car.url);
    if (href) {
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
    }
    var photo = el("div", "photo");
    var src = car.photo && safeUrl(car.photo.url);
    if (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = String((car.photo && car.photo.alt) || car.title || "");
      img.loading = "lazy";
      img.decoding = "async";
      if (car.photo.width) img.width = car.photo.width;
      if (car.photo.height) img.height = car.photo.height;
      photo.appendChild(img);
    }
    var body = el("div", "body");
    body.appendChild(el("h3", "title", car.title));
    var facts = [car.mileageLabel, car.transmission, car.fuel].filter(Boolean).join("  |  ");
    if (facts) body.appendChild(el("p", "facts", facts));
    body.appendChild(el("p", "price", car.priceLabel || "Price on request"));
    link.appendChild(photo);
    link.appendChild(body);
    item.appendChild(link);
    return item;
  }

  function render(host, feed) {
    var root = host.shadowRoot;
    var limit = parseInt(host.getAttribute("data-limit") || "", 10);
    var all = feed.cars || [];
    var makes = [];
    all.forEach(function (car) { if (car.make && makes.indexOf(car.make) === -1) makes.push(car.make); });
    makes.sort();

    var wrap = el("div");
    var bar = el("div", "bar");
    var count = el("p", "count");
    bar.appendChild(count);

    var select = null;
    if (makes.length > 1) {
      select = document.createElement("select");
      select.setAttribute("aria-label", "Show cars by make");
      var any = el("option", null, "All makes");
      any.value = "";
      select.appendChild(any);
      makes.forEach(function (make) { var option = el("option", null, make); option.value = make; select.appendChild(option); });
      bar.appendChild(select);
    }

    var grid = el("ul", "grid");
    function draw() {
      var chosen = select ? select.value : "";
      var shown = all.filter(function (car) { return !chosen || car.make === chosen; });
      if (limit > 0) shown = shown.slice(0, limit);
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      shown.forEach(function (car) { grid.appendChild(card(car)); });
      count.textContent = shown.length === 1 ? "1 car" : shown.length + " cars";
    }
    if (select) select.addEventListener("change", draw);

    wrap.appendChild(bar);
    if (all.length === 0) {
      wrap.appendChild(el("p", "empty", "No cars in stock right now. Please check back soon."));
    } else {
      wrap.appendChild(grid);
      draw();
    }
    if (host.getAttribute("data-credit") !== "off") {
      var credit = el("p", "credit");
      credit.appendChild(document.createTextNode("Stock kept up to date by "));
      var rynet = el("a", null, "Rynet");
      rynet.href = origin + "/";
      rynet.target = "_blank";
      rynet.rel = "noopener";
      credit.appendChild(rynet);
      wrap.appendChild(credit);
    }
    while (root.lastChild && root.lastChild.nodeName !== "STYLE") root.removeChild(root.lastChild);
    root.appendChild(wrap);
  }

  function mount(host) {
    if (host.shadowRoot) return;
    var slug = (host.getAttribute("data-rynet-stock") || "").trim();
    if (!/^[a-z0-9-]{1,190}$/.test(slug)) return;
    var root = host.attachShadow({ mode: "open" });
    var accent = host.getAttribute("data-accent") || "";
    var style = document.createElement("style");
    style.textContent = ":host{--accent:" + (/^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#001123") + "}" + CSS;
    root.appendChild(style);
    root.appendChild(el("p", "empty", "Loading our cars"));

    fetch(origin + "/api/stock/" + slug, { credentials: "omit" })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function (feed) { render(host, feed); })
      .catch(function () {
        while (root.lastChild && root.lastChild.nodeName !== "STYLE") root.removeChild(root.lastChild);
        root.appendChild(el("p", "error", "Our stock could not be loaded just now. Please try again in a moment."));
      });
  }

  function start() {
    var hosts = document.querySelectorAll("[data-rynet-stock]");
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
`;e.s(["GET",0,function(){return new Response(t,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"public, max-age=3600, s-maxage=3600","access-control-allow-origin":"*"}})},"dynamic",0,"force-static"],745680)},925945,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),o=e.i(759756),n=e.i(561916),i=e.i(174677),l=e.i(869741),s=e.i(316795),d=e.i(487718),c=e.i(995169),p=e.i(47587),u=e.i(666012),h=e.i(570101),f=e.i(626937),m=e.i(10372),g=e.i(193695);e.i(52474);var v=e.i(600220);let w=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/embed/stock.js/route",pathname:"/embed/stock.js",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/embed/stock.js/route.ts",nextConfigOutput:"",userland:()=>e.r(745680),...{}}),{workAsyncStorage:x,workUnitAsyncStorage:b,serverHooks:C}=w;async function y(e,t,a){a.requestMeta&&(0,o.setRequestMeta)(e,a.requestMeta),w.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let x="/embed/stock.js/route";x=x.replace(/\/index$/,"")||"/";let b=await w.prepare(e,t,{srcPage:x,multiZoneDraftMode:!1});if(!b)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:C,deploymentId:y,params:R,nextConfig:k,parsedUrl:E,isDraftMode:S,prerenderManifest:A,routerServerContext:T,isOnDemandRevalidate:N,revalidateOnlyGenerated:P,resolvedPathname:O,clientReferenceManifest:_,serverActionsManifest:q}=b,U=(0,l.normalizeAppPath)(x),H=!!(A.dynamicRoutes[U]||A.routes[O]),j=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,E,!1):t.end("This page could not be found"),null);if(H&&!S){let e=!!A.routes[O],t=A.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(k.adapterPath)return await j();throw new g.NoFallbackError}}let I=null;!H||w.isDev||S||(I="/index"===(I=O)?"/":I);let L=!0===w.isDev||!H,M=H&&!L;q&&_&&(0,i.setManifestsSingleton)({page:x,clientReferenceManifest:_,serverActionsManifest:q});let D=e.method||"GET",z=(0,n.getTracer)(),F=z.getActiveScopeSpan(),$=!!(null==T?void 0:T.isWrappedByNextServer),K=!!(0,o.getRequestMeta)(e,"minimalMode"),B=(0,o.getRequestMeta)(e,"incrementalCache")||await w.getIncrementalCache(e,k,A,K);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let G={params:R,previewProps:A.preview,renderOpts:{experimental:{authInterrupts:!!k.experimental.authInterrupts,useCacheTimeout:k.experimental.useCacheTimeout},cacheComponents:!!k.cacheComponents,validationLevel:k.experimental.instantInsights.validationLevel,supportsDynamicResponse:L,incrementalCache:B,hmrRefreshHash:(0,o.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:k.cacheLife,staticPageGenerationTimeout:k.staticPageGenerationTimeout,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,o)=>w.onRequestError(e,t,a,o,T)},sharedContext:{buildId:C,deploymentId:y}},V=new s.NodeNextRequest(e),X=new s.NodeNextResponse(t),Y=d.NextRequestAdapter.fromNodeNextRequest(V,(0,d.signalFromNodeResponse)(t)),W=async({previousCacheEntry:r})=>{try{if(!K&&N&&P&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await w.handle(Y,G);e.fetchMetrics=G.renderOpts.fetchMetrics;let n=G.renderOpts.pendingWaitUntil;n&&a.waitUntil&&(a.waitUntil(n),n=void 0);let i=G.renderOpts.collectedTags;if(!H)return await (0,u.sendResponse)(V,X,o,n),null;{let e=await o.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(o.headers);i&&(t[m.NEXT_CACHE_TAGS_HEADER]=i),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,a=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=m.INFINITE_CACHE?!1!==r&&r>0?k.expireTime:void 0:G.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await w.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:N})},!1,T),t}},Z=async(o,i)=>{try{var l,s;let o=await w.handleResponse({req:e,nextConfig:k,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:N,revalidateOnlyGenerated:P,responseGenerator:W,waitUntil:a.waitUntil,isMinimalMode:K});if(!H)return;if((null==o||null==(l=o.value)?void 0:l.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==o||null==(s=o.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});K||t.setHeader("x-nextjs-cache",N?"REVALIDATED":o.isMiss?"MISS":o.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let n=(0,h.fromNodeOutgoingHttpHeaders)(o.value.headers);K&&H||n.delete(m.NEXT_CACHE_TAGS_HEADER),!o.cacheControl||t.getHeader("Cache-Control")||n.get("Cache-Control")||n.set("Cache-Control",(0,f.getCacheControlHeader)(o.cacheControl)),await (0,u.sendResponse)(V,X,new Response(o.value.body,{headers:n,status:o.value.status||200}));return}catch(t){if(t instanceof g.NoFallbackError||await w.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:N})},!1,T),H)throw t;await (0,u.sendResponse)(V,X,new Response(null,{status:500}));return}finally{(()=>{if(!o)return;let e=t.statusCode;o.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(o.setStatus({code:n.SpanStatusCode.ERROR}),o.setAttribute("error.type",e.toString()));let r=z.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route")||U,l=`${D} ${a}`;o.setAttributes({"next.route":a,"http.route":a,"next.span_name":l}),o.updateName(l),i&&i!==o&&(i.setAttribute("http.route",a),i.updateName(l))})()}};if($&&F)await Z(F,void 0);else{let t=z.getActiveScopeSpan();await z.withPropagatedContext(e.headers,()=>z.trace(c.BaseServerSpan.handleRequest,{spanName:`${D} ${x}`,kind:n.SpanKind.SERVER,attributes:{"http.method":D,"http.target":e.url}},e=>Z(e,t)),void 0,!$)}}e.s(["handler",0,y,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:b})},"routeModule",0,w,"serverHooks",0,C,"workAsyncStorage",0,x,"workUnitAsyncStorage",0,b])}];

//# sourceMappingURL=_1a1s7p-._.js.map