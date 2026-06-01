const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
  'shrink-to-fit=no"',
  'shrink-to-fit=no, viewport-fit=cover"'
);

html = html.replace(
  'body {\n        overflow: hidden;\n      }',
  'body {\n        overflow: hidden;\n        background-color: #FDFBF5;\n      }'
);

html = html.replace(
  '#root {\n        display: flex;\n        height: 100%;\n        flex: 1;\n      }',
  '#root {\n        display: flex;\n        height: 100%;\n        flex: 1;\n        box-sizing: border-box;\n        padding-bottom: env(safe-area-inset-bottom);\n        background-color: #FDFBF5;\n      }'
);

fs.writeFileSync(htmlPath, html);
console.log('✓ dist/index.html patched for mobile safe area');
