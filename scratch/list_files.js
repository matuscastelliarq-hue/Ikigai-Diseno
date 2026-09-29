const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      files.push(name.replace(/\\/g, '/'));
    }
  }
  return files;
}

const files = getFiles('assets');
fs.writeFileSync('files.json', JSON.stringify(files, null, 2));
console.log('Done');
