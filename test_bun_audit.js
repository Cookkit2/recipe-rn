const { execSync } = require('child_process');
try {
  const result = execSync('bun --version').toString();
  console.log("Bun version:", result.trim());

  // Actually run bun x bun audit --audit-level=high (Using bun to run bun directly from path might fix missing script issue)
  execSync('bun x bun audit --audit-level=high', { stdio: 'inherit' });
} catch (e) {
  console.log("Error:", e.message);
}
