const fs = require('fs');
const path = require('path');

const dataFile = fs.readFileSync('c:/Ikigai-Web/js/data.js', 'utf8');

// A very hacky way to extract the image paths, as I just want to check them
const lines = dataFile.split('\n');
const imagePaths = [];
lines.forEach(line => {
    if (line.includes('imagenes: [')) {
        const matches = line.match(/'([^']+)'/g);
        if (matches) {
            matches.forEach(m => {
                if (m.includes('assets/')) {
                    imagePaths.push(m.replace(/'/g, ''));
                }
            });
        }
    }
});

let allExist = true;
imagePaths.forEach(p => {
    if (p.includes('CONTEMPORÁNEO')) {
        const fullPath = path.join('c:/Ikigai-Web', p);
        const exists = fs.existsSync(fullPath);
        console.log(`${exists ? 'OK' : 'MISSING'}: ${fullPath}`);
        if (!exists) allExist = false;
    }
});

console.log(allExist ? "ALL GOOD" : "SOME MISSING");
