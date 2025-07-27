export const P5_INDEX_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>p5.js sketch</title>
    <link rel="stylesheet" href="style.css" />
    <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
    <script src="sketch.js"></script>
  </head>
  <body>
  </body>
</html>`;

export const P5_STYLE_CSS = `body { margin: 0; padding: 0; }
canvas { display: block; }`;

export const P5_SKETCH_JS = `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
}`;
