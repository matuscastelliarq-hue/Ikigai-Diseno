const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const outPath = path.join(__dirname, 'images.txt');
let outStr = '';
walkDir(path.join(__dirname, '../assets'), function(filePath) {
  if(filePath.match(/\.(png|jpg|jpeg|webp)$/i)) {
    outStr += filePath + '\n';
  }
});
fs.writeFileSync(outPath, outStr);
console.log('done');
