const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. viewport-fit=cover を追加
html = html.replace(
  /(<meta name="viewport" content="[^"]*)"(\s*\/>)/,
  '$1, viewport-fit=cover"$2'
);

// 2. </head> の直前に上書きスタイルを注入
const patch = `
  <style id="safe-area-patch">
    html {
      height: -webkit-fill-available;
    }
    html, body, #root {
      height: 100%;
      height: 100dvh;
    }
    body, #root {
      background-color: #FDFBF5;
    }
    #root {
      box-sizing: border-box;
      padding-bottom: env(safe-area-inset-bottom);
    }
  </style>
`;

html = html.replace('</head>', patch + '</head>');

fs.writeFileSync(htmlPath, html);
console.log('✓ dist/index.html patched');
