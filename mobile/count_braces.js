const fs = require('fs');
const lines = fs.readFileSync('src/screens/AnalyzeScreen.tsx', 'utf8').split('\n');
let depth = 0;
let inComponent = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('export function AnalyzeScreen')) inComponent = true;
  if (!inComponent) continue;
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  depth += opens - closes;
  if (depth <= 0 && inComponent) {
    console.log(`Component closes at line ${i + 1}, depth=${depth}`);
    inComponent = false;
  }
}
