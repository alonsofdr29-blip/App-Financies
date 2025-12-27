// check-brackets.cjs
const fs = require("fs");

const file = process.argv[2] || "src/App.jsx";
const s = fs.readFileSync(file, "utf8");


const stack = [];
const pairs = { "}": "{", ")": "(", "]": "[" };
const opens = new Set(["{", "(", "["]);
const closes = new Set(["}", ")", "]"]);

let line = 1, col = 0;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  col++;
  if (ch === "\n") { line++; col = 0; continue; }

  // ignora strings simples (aprox) para no contar llaves dentro de texto
  if (ch === '"' || ch === "'" || ch === "`") {
    const q = ch;
    i++;
    col++;
    while (i < s.length) {
      const c = s[i];
      if (c === "\n") { line++; col = 0; }
      if (c === "\\" ) { i++; col++; } // salta escape
      else if (c === q) break;
      i++; col++;
    }
    continue;
  }

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

console.log("✅ Llaves/paréntesis/corchetes balanceados (aprox).");
