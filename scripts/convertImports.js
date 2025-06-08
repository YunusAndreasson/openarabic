const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
console.log('Project root:', root);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
      files = files.concat(walk(p));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(p);
    }
  }
  return files;
}

function convertFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  // import ... from '@/..'
  content = content.replace(/(import\s+[\s\S]*?['"])(\.\.\/[^'";]+)/g, (_, start, rel) => {
    if (!rel.startsWith('..')) return start + rel;
    const abs = path.resolve(dir, rel);
    const relToRoot = path.relative(root, abs).replace(/\\/g, '/');
    return start + '@/' + relToRoot;
  });
  // export ... from '@/..'
  content = content.replace(/(export\s+[\s\S]*?from\s+['"])(\.\.\/[^'";]+)/g, (_, start, rel) => {
    const abs = path.resolve(dir, rel);
    const relToRoot = path.relative(root, abs).replace(/\\/g, '/');
    return start + '@/' + relToRoot;
  });
  // export * from '@/..'
  content = content.replace(/(export\s+\*\s+from\s+['"])(\.\.\/[^'";]+)/g, (_, start, rel) => {
    const abs = path.resolve(dir, rel);
    const relToRoot = path.relative(root, abs).replace(/\\/g, '/');
    return start + '@/' + relToRoot;
  });
  // bare import '@/foo'
  content = content.replace(/(import\s+['"])(\.\.\/[^'";]+)/g, (_, start, rel) => {
    const abs = path.resolve(dir, rel);
    const relToRoot = path.relative(root, abs).replace(/\\/g, '/');
    return start + '@/' + relToRoot;
  });
  fs.writeFileSync(file, content, 'utf8');
}

const files = walk(root);
files.forEach(convertFile);
