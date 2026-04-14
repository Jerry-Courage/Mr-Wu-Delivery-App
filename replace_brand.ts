import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkAndReplace(dir: string) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        walkAndReplace(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.html')) {
      const content = readFileSync(fullPath, 'utf8');
      const newContent = content
        .replace(/Mr Wu's/g, "Fishing Panda") // We don't want "Fishing Panda's" everywhere, just Fishing Panda
        .replace(/Mr\. Wu/g, "Fishing Panda")
        .replace(/Mr Wu/g, "Fishing Panda")
        .replace(/mr-wu/g, "fishing-panda")
        .replace(/Mr wus/gi, "Fishing Panda");
      
      if (content !== newContent) {
        writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walkAndReplace('./src');
walkAndReplace('./server');
console.log('Mass replacement complete!');
