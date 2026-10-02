#!/usr/bin/env node
// scripts/check-ddd-boundaries.mjs — Verifies DDD architecture boundaries.
// Enforces rules from .agents/rules/ddd-backend.md, apps/cab-pwa/AGENTS.md, apps/ops-portal/AGENTS.md
import fs from 'node:fs';
import path from 'node:path';

const violations = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = filePath.replace(process.cwd() + '/', '');
  const lines = content.split('\n');

  // Rule 1: Backend Domain Layer Purity (no infrastructure, presentation, application, fastify, prisma)
  if (rel.match(/^apps\/api\/src\/modules\/[^/]+\/domain\//)) {
    lines.forEach((line, idx) => {
      if (
        line.match(
          /from\s+['"].*(\/infrastructure\/|\/presentation\/|\/application\/|fastify|@prisma\/client|\/lib\/prisma)/
        ) &&
        !line.trim().startsWith('//')
      ) {
        violations.push({
          rule: 'backend-domain-pollution',
          file: rel,
          line: idx + 1,
          detail: 'Domain must not depend on outer layers, Fastify, or Prisma: ' + line.trim(),
        });
      }
    });
  }

  // Rule 2: Backend Application Layer Purity (no infrastructure implementations, prisma, fastify)
  if (rel.match(/^apps\/api\/src\/modules\/[^/]+\/application\//)) {
    lines.forEach((line, idx) => {
      if (
        line.match(/from\s+['"].*(\/infrastructure\/|@prisma\/client|\/lib\/prisma|fastify)/) &&
        !line.trim().startsWith('//')
      ) {
        violations.push({
          rule: 'backend-application-pollution',
          file: rel,
          line: idx + 1,
          detail: 'Application must depend only on domain interfaces, not infrastructure or Prisma: ' + line.trim(),
        });
      }
    });
  }

  // Rule 3: Backend Presentation Layer Purity (no direct Prisma access)
  if (rel.match(/^apps\/api\/src\/modules\/[^/]+\/presentation\//)) {
    lines.forEach((line, idx) => {
      if (
        line.match(/from\s+['"].*(@prisma\/client|\/lib\/prisma)/) &&
        !line.trim().startsWith('//')
      ) {
        violations.push({
          rule: 'backend-presentation-prisma-leak',
          file: rel,
          line: idx + 1,
          detail: 'Controllers/schemas must not access Prisma directly: ' + line.trim(),
        });
      }
    });
  }

  // Rule 4: Frontend Presentation Purity (no raw fetch calls in components)
  if (
    (rel.startsWith('apps/cab-pwa/src/') || rel.startsWith('apps/ops-portal/src/')) &&
    (rel.includes('/components/') || rel.includes('/presentation/'))
  ) {
    lines.forEach((line, idx) => {
      if (line.includes('fetch(') && !line.trim().startsWith('//')) {
        violations.push({
          rule: 'frontend-presentation-fetch-leak',
          file: rel,
          line: idx + 1,
          detail: 'Presentation components must receive data via hooks/props, never call fetch directly: ' + line.trim(),
        });
      }
    });
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walk(full);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      checkFile(full);
    }
  }
}

walk(path.join(process.cwd(), 'apps/api/src'));
walk(path.join(process.cwd(), 'apps/cab-pwa/src'));
walk(path.join(process.cwd(), 'apps/ops-portal/src'));

// Rule 5: Composition Root (apps/api/src/server.ts < 50 lines)
const serverFile = path.join(process.cwd(), 'apps/api/src/server.ts');
if (fs.existsSync(serverFile)) {
  const lineCount = fs.readFileSync(serverFile, 'utf8').split('\n').length;
  if (lineCount > 50) {
    violations.push({
      rule: 'backend-server-line-budget',
      file: 'apps/api/src/server.ts',
      line: lineCount,
      detail: `server.ts must remain strictly a process runner < 50 lines (currently: ${lineCount})`,
    });
  }
}

if (violations.length === 0) {
  console.log('ddd-boundaries: clean (all layer and coupling rules pass)');
  process.exit(0);
}

console.error(`ddd-boundaries: ${violations.length} architecture boundary violation(s):`);
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.file}:${v.line} -> ${v.detail}`);
}
console.error('\nFix architecture layer separation according to .agents/rules/ddd-backend.md');
process.exit(1);
