const fs = require('fs');

let content = fs.readFileSync('hooks/__tests__/useLocation.test.ts', 'utf8');
content = content.replace(/\/\/ Use the actual state from catch block[\s\S]*?fix the bug\.\n/g, "");
fs.writeFileSync('hooks/__tests__/useLocation.test.ts', content);
