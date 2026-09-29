const fs = require('fs');

async function test() {
    const formData = new FormData();
    formData.append('input', 'test');
    formData.append('files', new Blob([fs.readFileSync(__filename)]), 'test.js');
    console.log(formData);
}
test();
