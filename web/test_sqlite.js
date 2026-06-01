const fs = require('fs'); try { require('better-sqlite3'); fs.writeFileSync('sqlite_test.log', 'SUCCESS!'); } catch (e) { fs.writeFileSync('sqlite_test.log', e.stack); }
