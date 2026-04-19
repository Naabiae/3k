const fs = require('fs');
const file = '/workspace/node_modules/@nomicfoundation/hardhat-utils/dist/src/request.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /export async function download\(url, destination, requestOptions = \{\}, dispatcherOrDispatcherOptions\) \{[\s\S]*?\}\n\}/;

const replacement = "export async function download(url, destination, requestOptions = {}, dispatcherOrDispatcherOptions) {\n" +
"    const cp = await import('child_process');\n" +
"    const path = await import('path');\n" +
"    try {\n" +
"        console.log('CURLING: ' + url + ' to ' + destination);\n" +
"        cp.execSync('mkdir -p ' + path.dirname(destination));\n" +
"        cp.execSync('curl -sL -o ' + destination + ' ' + url);\n" +
"    } catch (e) {\n" +
"        throw new Error('Curl failed: ' + e.message);\n" +
"    }\n" +
"}";

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
