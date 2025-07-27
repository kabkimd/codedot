export const P5_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdn.jsdelivr.net/npm/p5@latest/lib/p5.js"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    <meta charset="utf-8" />

  </head>
  <body>
    <main>
    </main>
    <script src="sketch.js"></script>
  </body>
</html>
`;

export const P5_STYLE_CSS = `html, body {
  margin: 0;
  padding: 0;
}
canvas {
  display: block;
}
`;

export const P5_SKETCH_JS = `function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background("palevioletred");
}

function windowResized(){
  resizeCanvas(windowWidth,windowHeight);
}`;
