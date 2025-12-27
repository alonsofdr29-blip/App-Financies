// check-brackets.js
const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("Uso: node check-brackets.js src/App.jsx");
  process.exit(1);
}
const s = fs.readFileSync(file, "utf8");

const stack = [];
const pairs = { "}": "{", ")": "(", "]": "[" };
const opens = new Set(["{", "(", "["]);
const closes = new Set(["}", ")", "]"]);

let line = 1, col = 0;

function skipString(i) {
  const quote = s[i];
  i++; col++;
  while (i < s.length) {
    const c = s[i];
    if (c === "\n") { line++; col = 0; i++; continue; }
    if (c === "\\") { i += 2; col += 2; continue; }
    if (c === quote) return i;
    i++; col++;
  }
  return i;
}

function skipLineComment(i) {
  while (i < s.length && s[i] !== "\n") { i++; col++; }
  return i;
}

function skipBlockComment(i) {
  i += 2; col += 2;
  while (i < s.length - 1) {
    if (s[i] === "\n") { line++; col = 0; i++; continue; }
    if (s[i] === "*" && s[i + 1] === "/") { i += 2; col += 2; return i - 1; }
    i++; col++;
  }
  return i;
}

for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  col++;

  if (ch === "\n") { line++; col = 0; continue; }

  // comentarios
  if (ch === "/" && s[i + 1] === "/") { i = skipLineComment(i); continue; }
  if (ch === "/" && s[i + 1] === "*") { i = skipBlockComment(i); continue; }

  // strings
  if (ch === '"' || ch === "'" || ch === "`") { i = skipString(i); continue; }

  // brackets
  if (opens.has(ch)) stack.push({ ch, line, col });
  else if (closes.has(ch)) {
    const top = stack.pop();
    if (!top || top.ch !== pairs[ch]) {
      console.log(`❌ Cierre inesperado '${ch}' en ${line}:${col}`);
      process.exit(1);
    }
  }
}

if (stack.length) {
  const top = stack[stack.length - 1];
  console.log(`❌ Falta cerrar '${top.ch}' (abierto en ${top.line}:${top.col}).`);
  process.exit(1);
}

console.log("✅ Llaves/paréntesis/corchetes balanceados.");
