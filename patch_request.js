const fs = require('fs');
const path = require('path');
const file = '/workspace/node_modules/@nomicfoundation/hardhat-utils/dist/src/request.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the download function entirely
content = content.replace(
    /async function download\([\s\S]*?\}\s*catch \(_e\)/,
    `async function download(url, filePath, options = {}) {
        const cp = require('child_process');
        try {
            console.log("CURLING: " + url + " to " + filePath);
            cp.execSync('curl -sL -o ' + filePath + ' ' + url);
            return;
        } catch (e) {
            throw new Error("Curl failed: " + e.message);
        }
    }
    
    // ignore original`
);

fs.writeFileSync(file, content);
