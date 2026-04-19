const fs = require('fs');
const file = '/workspace/node_modules/@nomicfoundation/hardhat-utils/dist/src/request.js';
let content = fs.readFileSync(file, 'utf8');

// The actual function starts with export async function download(url, filePath, options = {}) {
content = content.replace(
    /export async function download\(url, filePath, options = \{\}\) \{[\s\S]*?\}\n\}/m,
    `export async function download(url, filePath, options = {}) {
        const cp = require('child_process');
        try {
            console.log("CURLING: " + url + " to " + filePath);
            cp.execSync('curl -sL -o ' + filePath + ' ' + url);
        } catch (e) {
            throw new Error("Curl failed: " + e.message);
        }
    }`
);

fs.writeFileSync(file, content);
