const fs = require('fs');
const path = require('path');

// Check if it's a Next.js project
if (!fs.existsSync('package.json')) process.exit(0);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

if (!deps.next) {
    console.log('Not a Next.js project. Skipping config injection.');
    process.exit(0);
}

console.log('Next.js project detected.');

// Check for existing config
const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
const existingConfig = configFiles.find(f => fs.existsSync(f));

const CONFIG_CONTENT = `output: "export",`;

if (!existingConfig) {
    console.log('No next.config.js found. Creating default static export config.');
    fs.writeFileSync('next.config.js', `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
};
module.exports = nextConfig;
`);
    process.exit(0);
}

console.log(`Found ${existingConfig}. Attempting to inject static export config...`);
let content = fs.readFileSync(existingConfig, 'utf8');

if (content.includes('output: "export"') || content.includes("output: 'export'")) {
    console.log('Config already has static export enabled.');
    process.exit(0);
}

// Robust injection for different config styles
if (content.includes('const nextConfig = {')) {
    // Standard CommonJS
    const newContent = content.replace('const nextConfig = {', 'const nextConfig = { output: "export", ');
    fs.writeFileSync(existingConfig, newContent);
    console.log('Injected static export config (const nextConfig).');

} else if (content.includes('module.exports = {')) {
    // Direct module.exports
    const newContent = content.replace('module.exports = {', 'module.exports = { output: "export", ');
    fs.writeFileSync(existingConfig, newContent);
    console.log('Injected static export config (module.exports).');

} else if (content.includes('export default {')) {
    // ES Modules (Newer Next.js) - CRITICAL FIX
    const newContent = content.replace('export default {', 'export default { output: "export", ');
    fs.writeFileSync(existingConfig, newContent);
    console.log('Injected static export config (export default).');

} else {
    // Fallback: If we can't parse it, warn the user but don't crash.
    // They might have a complex config (functions, etc.)
    console.log('⚠️  Could not automatically inject config. Please ensure "output: \'export\'" is set in your next.config.js');
}
