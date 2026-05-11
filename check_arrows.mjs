import fs from 'fs';
const content = fs.readFileSync('README.md', 'utf8');

const mermaidRegex = /```mermaid\n[\s\S]*?\n```/g;
let m;
while ((m = mermaidRegex.exec(content)) !== null) {
  const block = m[0];
  const arrowLabels = block.match(/-->\".*?\"-->/g);
  if (arrowLabels) {
    console.log('Block at offset ' + m.index + ': ' + arrowLabels.join(', '));
  }
}
console.log('Done checking');
