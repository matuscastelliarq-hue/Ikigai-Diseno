const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\gemat\\.gemini\\antigravity-ide\\brain\\c136fd04-af4f-4873-b1f1-5ba24fdc630e\\.system_generated\\steps\\33\\content.md', 'utf8');

const matches = [];
const wordsToSearch = ['mouseOut', 'mouseLeave', 'getIntersections', 'raycast', 'hovering'];
wordsToSearch.forEach(word => {
    if (content.toLowerCase().includes(word.toLowerCase())) {
        matches.push(word);
    }
});

console.log("Found:", matches);
