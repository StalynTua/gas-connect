#!/usr/bin/env node
// scripts/floor-guard.mjs — Diff-scoped enforcement of CONSTRAINTS.md floor.
// Usage: node scripts/floor-guard.mjs [--base <ref>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const git = (args, { diffExit = false } = {}) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return diffExit && e.status === 1 && typeof e.stdout === 'string' ? e.stdout : null;
  }
};

const bail = (msg) => {
  console.error('floor-guard: ' + msg);
  process.exit(2);
};

const baseArgIndex = process.argv.indexOf('--base');
let baseRef = baseArgIndex > -1 ? process.argv[baseArgIndex + 1] : null;

if (!baseRef) {
  // Try origin/main, fallback to HEAD~1, fallback to HEAD
  const hasOriginMain = git(['rev-parse', '--verify', 'origin/main']) !== null;
  if (hasOriginMain) {
    baseRef = 'origin/main';
  } else {
    const hasHeadPrev = git(['rev-parse', '--verify', 'HEAD~1']) !== null;
    baseRef = hasHeadPrev ? 'HEAD~1' : 'HEAD';
  }
}

// Find merge base; bail to exit 2 rather than pretending a shallow/rootless clone is clean.
let mergeBase = git(['merge-base', baseRef, 'HEAD'])?.trim();
if (!mergeBase) {
  // If baseRef is HEAD itself (clean baseline check)
  if (baseRef === 'HEAD') {
    mergeBase = 'HEAD';
  } else {
    bail('no merge base against ' + baseRef);
  }
}

// Unified diff plus untracked files
const tracked = git(['diff', '--unified=0', mergeBase, '--']);
if (tracked === null) bail('could not diff against ' + mergeBase);

const untrackedFiles = git(['ls-files', '--others', '--exclude-standard']);
if (untrackedFiles === null) bail('could not list untracked files');

const untracked = untrackedFiles
  .split('\n')
  .filter(Boolean)
  .map((f) => {
    const d = git(['diff', '--no-index', '--unified=0', '/dev/null', f], { diffExit: true });
    if (d === null) bail('could not diff untracked file ' + f);
    return d;
  })
  .join('\n');

const diff = (tracked || '') + '\n' + untracked;

// Walk the diff
const added = [];
const removed = [];
const deleted = [];
const pathOf = (s) => s.replace(/^[ab]\//, '');
let file = '';
let oldFile = '';

for (const line of diff.split('\n')) {
  if (line.startsWith('--- ')) {
    oldFile = pathOf(line.slice(4));
  } else if (line.startsWith('+++ ')) {
    const newFile = pathOf(line.slice(4));
    file = newFile === '/dev/null' ? oldFile : newFile;
    if (newFile === '/dev/null') deleted.push(file);
  } else if (line.startsWith('+') && !line.startsWith('+++')) {
    added.push({ file, text: line.slice(1) });
  } else if (line.startsWith('-') && !line.startsWith('---')) {
    removed.push({ file, text: line.slice(1) });
  }
}

const findings = [];
const flag = (rule, f, text) => findings.push({ rule, file: f, text: text.trim().slice(0, 120) });
const isTest = (f) => /\.(test|spec)\.|_test\.|test_/.test(f);
const isConstraints = (f) => /CONSTRAINTS\.md$/.test(f);

// 1. Silenced checker
const SUPPRESSIONS = /@ts-ignore|@ts-nocheck|eslint-disable|biome-ignore|# *noqa|# *type: *ignore|istanbul ignore|nosemgrep|gitleaks:allow|Stryker disable/;
// 4. Unfinished work
const STUBS = /throw new (Error|NotImplemented).*[Nn]ot implemented|catch\s*\(\w*\)\s*\{\s*\}|catch\s*\{\s*\}|\bTODO\b|\bpass\s*# *stub/;
// 2. A test made easier (added skips)
const SKIPS = /\.(skip|todo)\b|\bxit\(|\bxdescribe\(|@pytest\.mark\.skip|t\.Skip\(/;

for (const { file: currentFile, text } of added) {
  // Ignore checking floor-guard itself or scripts/rules documentation
  if (currentFile.includes('floor-guard.mjs') || currentFile.endsWith('.md')) {
    if (isConstraints(currentFile) && /^\| *(W|E)\d+ *\|/.test(text)) {
      flag('new-exception', currentFile, text);
    }
    continue;
  }
  if (SUPPRESSIONS.test(text)) flag('silenced-checker', currentFile, text);
  if (STUBS.test(text)) flag('unfinished-work', currentFile, text);
  if (SKIPS.test(text)) flag('test-made-easier', currentFile, text);
}

// 2b. A test file deleted, or an assertion removed from a test file that still exists
for (const f of deleted) {
  if (isTest(f)) flag('test-deleted', f, 'file deleted');
}

for (const { file: currentFile, text } of removed) {
  if (isTest(currentFile) && !deleted.includes(currentFile) && /\b(expect|assert|should)\b/.test(text)) {
    flag('assertion-removed', currentFile, text);
  }
}

// 1b/2c. A rule in CONSTRAINTS.md weakened or removed
const ruleKey = (t) => {
  const s = t.trim();
  if (s.startsWith('|')) return s.split('|').map((c) => c.trim()).filter(Boolean)[0] ?? '';
  if (/^[-*] /.test(s)) return s.slice(2).split(':')[0].trim();
  return null;
};
const isException = (t) => /^\| *(W|E)\d+ *\|/.test(t.trim());
const MIN_BEFORE = /(>=|>|≥|at least|minimum|\bmin\b|no less than|not fall|not drop)\s*$/;
const MAX_BEFORE = /(<=|<|≤|at most|maximum|\bmax\b|no more than|under|below|not grow|not exceed)\s*$/;
const MIN_AFTER = /^\s*\S*\s*(or more|or higher|must not fall|must not drop)/;
const MAX_AFTER = /^\s*\S*\s*(or less|or lower|must not grow|must not exceed)/;
const thresholds = (t) => {
  const out = [];
  const re = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 40).toLowerCase();
    const dir =
      MIN_BEFORE.test(before) || MIN_AFTER.test(after)
        ? 'min'
        : MAX_BEFORE.test(before) || MAX_AFTER.test(after)
          ? 'max'
          : null;
    out.push({ n: Number(m[0]), dir });
  }
  return out;
};

const removedRules = removed.filter((l) => isConstraints(l.file) && ruleKey(l.text) !== null);
const addedRules = added.filter((l) => isConstraints(l.file) && ruleKey(l.text) !== null);
for (const r of removedRules) {
  const a = addedRules.find((x) => ruleKey(x.text) === ruleKey(r.text));
  if (!a) {
    if (!isException(r.text)) flag('rule-removed', r.file, r.text);
    continue;
  }
  const before = thresholds(r.text);
  const after = thresholds(a.text);
  let verdict = null;
  for (const dir of ['min', 'max', null]) {
    const was = before.filter((x) => x.dir === dir);
    const now = after.filter((x) => x.dir === dir);
    was.forEach((b, i) => {
      const n = now[i];
      if (verdict) return;
      if (!n) verdict = 'threshold-removed';
      else if (n.n === b.n) return;
      else if (dir === 'min' ? n.n < b.n : dir === 'max' ? n.n > b.n : true) {
        verdict = dir ? 'threshold-loosened' : 'threshold-changed';
      }
    });
  }
  if (verdict) flag(verdict, r.file, r.text + '  ->  ' + a.text);
}

if (findings.length === 0) {
  console.log('floor-guard: clean');
  process.exit(0);
}

console.error('floor-guard: ' + findings.length + ' floor violation(s):');
for (const f of findings) console.error(`  [${f.rule}] ${f.file}: ${f.text}`);
console.error('\nEach is a move that lowers the bar. Fix the code, or route it through a tracked exception.');
process.exit(1);
