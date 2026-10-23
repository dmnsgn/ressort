import createCanvasContext from "canvas-context";

// Palette
// Bauhaus light palette, defined once as CSS custom properties in index.html.
// https://github.com/dmnsgn/vscode-bauhaus-theme
const style = getComputedStyle(document.documentElement);
const color = (name) => style.getPropertyValue(`--${name}`).trim();
const group = (prefix, names) =>
  Object.fromEntries(names.map((name) => [name, color(`${prefix}-${name}`)]));

const PALETTE = {
  bg: group("bg", ["editor", "chrome", "line"]),
  fg: group("fg", ["default", "muted"]),
  ink: group("ink", [
    "red",
    "orange",
    "yellow",
    "green",
    "cyan",
    "blue",
    "violet",
  ]),
};

// One colour per technique, the same on every page.
const COLORS = {
  spring: PALETTE.ink.red,
  springMoving: PALETTE.ink.orange,
  easing: PALETTE.ink.yellow,
  css: PALETTE.ink.blue,
  euler: PALETTE.ink.violet,
  damp: PALETTE.ink.cyan,
  smoothDamp: PALETTE.ink.green,
};

// Canvas
// 2D canvas sized by CSS: `resize` matches its backing store to the layout and
// pixel ratio before each frame.
function createCanvas(element) {
  const { canvas, context } = createCanvasContext("2d", { canvas: element });

  const resize = () => {
    const ratio = window.devicePixelRatio;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.font = "11px ui-monospace, monospace";
    return { width, height };
  };

  const strokePath = (points, color, width = 1, dash = []) => {
    context.beginPath();
    points.forEach(([x, y], i) =>
      i ? context.lineTo(x, y) : context.moveTo(x, y),
    );
    context.strokeStyle = color;
    context.lineWidth = width;
    context.setLineDash(dash);
    context.stroke();
    context.setLineDash([]);
  };

  return { canvas, context, resize, strokePath };
}

// Highlight
// Syntax colouring with the CSS Custom Highlight API: tokens are ranges over
// the plain text, so the <pre> stays a single text node. Covers only what the
// exported snippets contain. Colours are set in index.html.
const GRAMMARS = {
  js: {
    string: /"[^"]*"|'[^']*'|`[^`]*`/,
    // "from" is also a variable in the snippet: a keyword only before a path.
    keyword: /\b(?:import|const|let|new)\b|\bfrom(?=\s*["'])/,
    constant: /\b\d+(?:\.\d+)?\b/,
    function: /[\w$]+(?=\()/,
    punctuation: /[=+\-*/%<>!?:;,.(){}[\]]/,
  },
  css: {
    constant: /-?\d+(?:\.\d+)?(?:ms|s|%)?/,
    function: /[\w-]+(?=\()/,
    property: /[\w-]+(?=\s*:)/,
    value: /[\w-]+/,
    punctuation: /[:;,()]/,
  },
};
// Theme scopes: CSS keyword values are constants, property names plain text.
const HIGHLIGHT_NAMES = { value: "constant", property: "text" };

const PATTERNS = Object.fromEntries(
  Object.entries(GRAMMARS).map(([language, grammar]) => [
    language,
    new RegExp(
      Object.entries(grammar)
        .map(([token, pattern]) => `(?<${token}>${pattern.source})`)
        .join("|"),
      "g",
    ),
  ]),
);

const highlightName = (token) => `code-${HIGHLIGHT_NAMES[token] ?? token}`;
for (const grammar of Object.values(GRAMMARS)) {
  for (const token of Object.keys(grammar)) {
    const name = highlightName(token);
    if (!CSS.highlights.has(name)) CSS.highlights.set(name, new Highlight());
  }
}

// Ranges outlive a textContent change: they are removed before re-highlighting.
const registered = new WeakMap();

function highlight(element, language) {
  for (const [name, range] of registered.get(element) ?? []) {
    CSS.highlights.get(name).delete(range);
  }
  const node = element.firstChild;
  const ranges = [];
  for (const match of node?.data.matchAll(PATTERNS[language]) ?? []) {
    const [token] = Object.entries(match.groups).find(([, value]) => value);
    const range = new Range();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const name = highlightName(token);
    CSS.highlights.get(name).add(range);
    ranges.push([name, range]);
  }
  registered.set(element, ranges);
}

export { PALETTE, COLORS, createCanvas, highlight };
