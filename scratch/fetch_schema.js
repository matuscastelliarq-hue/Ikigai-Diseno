const https = require('https');

const url = "https://documentacion.simpleapi.cl/api/collections/13819912/UVJk9smg?environment=13819912-e04c1727-3153-4a7b-9d0a-bb085d8ad8d9&segregateAuth=true&versionTag=latest";

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            
            // Recurse to find the request bodies
            let results = [];
            function traverse(node) {
                if (node.request && node.request.body && node.request.body.mode === 'formdata') {
                    node.request.body.formdata.forEach(item => {
                        if (item.key === 'input' && item.value) {
                            if (item.value.includes('CodRef') || item.value.includes('RazonRef') || item.value.includes('Referencia')) {
                                results.push({ name: node.name, input: item.value });
                            }
                        }
                    });
                }
                if (node.item) {
                    node.item.forEach(traverse);
                }
            }
            traverse(parsed.collection);
            
            console.log(JSON.stringify(results, null, 2));
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });
}).on('error', console.error);
