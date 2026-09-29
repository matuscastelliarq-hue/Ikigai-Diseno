const fs = require('fs');
const content = fs.readFileSync('c:/Ikigai-Web/js/admin.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('kpi-visitantes-unicos')) {
        console.log(`Line ${idx + 1}: ${line}`);
    }
});
