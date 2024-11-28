////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes with animation.
//

var gl;
var color;
var animation;
var degree0 = 0;
var degree1 = 0;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var circleBuf;
var circleIndexBuf;
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

let rotationAngle = 0.0;
const rotationSpeed = 0.3;
var animation;

let brightness = 0.5;  // Start brightness at a mid-point for smoother initial animation
const brightnessinc = 0.1;  // Lower increment for smoother transitions
let dir = 1;

let movingSpeed = 0.004*0.8;
let x1 = 0;
let x2 = 0;

let dir1 = 1;
  let dir2 = 1;
  let angle = 0;
  let speed = 0.1;

var running = 's';

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 5.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square

  if(running == 's'){
    gl.drawElements(
      gl.TRIANGLES,
      sqVertexIndexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  if(running == 'w'){
    gl.drawElements(
      gl.LINE_LOOP,
      sqVertexIndexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  if(running == 'p'){
    gl.drawElements(
      gl.POINTS,
      sqVertexIndexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }
  
}

function initCircleBuffer() {
  const circleVertices = [];
  const numSegments = 100; // Number of segments to approximate the circle
  const radius = 0.5;

  for (let i = 0; i <= numSegments; i++) {
    const angle = (i * 2 * Math.PI) / numSegments;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    circleVertices.push(x, y);
  }

  circleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
  circleBuf.itemSize = 2;
  circleBuf.numItems = numSegments + 1;

  const circleIndices = [];
  for (let i = 0; i < numSegments; i++) {
    circleIndices.push(i, i + 1, 0);
  }
  circleIndices.push(numSegments, 1, 0); // Close the circle

  circleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circleIndices), gl.STATIC_DRAW);
  circleIndexBuf.itemSize = 1;
  circleIndexBuf.numItems = circleIndices.length;
}


function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function drawCircle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    circleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the circle
  if(running=='s'){
    gl.drawElements(
      gl.TRIANGLES,
      circleIndexBuf.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  if(running=='w'){
    gl.drawElements(
      gl.LINE_LOOP,
      circleIndexBuf.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  if(running == 'p'){
    gl.drawElements(
      gl.POINTS,
      circleIndexBuf.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }
  
}


function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  if(running == 's'){
    gl.drawElements(
      gl.TRIANGLES,
      triangleIndexBuf.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  if(running == 'w'){
    gl.drawElements(
      gl.LINE_LOOP,
      triangleIndexBuf.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  if(running == 'p'){
    gl.drawElements(
      gl.POINTS,
      triangleIndexBuf.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  }
  
}


function drawGround(){
  color = [0.404, 0.882, 0.549,1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [2, 1, 0]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
}


function drawRiver(){
  color = [0.169, 0.388, 0.965,1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.15, 0]);
  mMatrix = mat4.scale(mMatrix, [2, 0.25, 0]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);


  color = [1,1,1,1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.65, -0.14, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.0018, 0]);
  drawSquare(color,mMatrix);

  mMatrix = mat4.translate(mMatrix, [3.4, -40, 0]);
  drawSquare(color,mMatrix);

  mMatrix = mat4.translate(mMatrix, [-1.7, 90, 0]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawGrass(){
   color = [0.467, 0.690, 0.278, 1];
   pushMatrix(matrixStack, mMatrix);
   mMatrix = mat4.translate(mMatrix, [0.5, -0.95, 0]);
   mMatrix = mat4.rotate(mMatrix, degToRad(40), [0, 0, 1]);
   mMatrix = mat4.scale(mMatrix, [2.5, 2, 0]);
   drawTriangle(color,mMatrix);
   mMatrix = popMatrix(matrixStack);
}


function MountainsGenerator(translation, rotation, scale, colorMou) {
  for (let i = 0; i < colorMou.length; i++) {
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, translation[i]);
    mMatrix = mat4.rotate(mMatrix, degToRad(rotation[i]), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, scale[i]);
    drawTriangle(colorMou[i], mMatrix);
    mMatrix = popMatrix(matrixStack);
  }
}

function drawMountains(){
  let translations = [
    [-0.72, 0.04, 0],
    [-0.68, 0.045, 0]
  ];
  
  let rotations = [
    0, 
    10 
  ];
  
  let scales = [
    [1.2, 0.4, 0],
    [1.3, 0.4, 0]
  ];
  
  let colors = [
    [0.478, 0.369, 0.275, 1],
    [0.569, 0.475, 0.341, 1]
  ];
  MountainsGenerator(translations, rotations, scales, colors);
  translations = [
    [0.77,-0.2,0]
  ];
  
  rotations = [
    0
  ];
  
  scales = [
    [2.6, 0.8, 0]
  ];
  
  colors = [
    [0.569, 0.475, 0.341, 1]
  ];
  MountainsGenerator(translations, rotations, scales, colors);
  translations = [
    [0, 0.15, 0],
    [0.07, -0.045, 0]
  ];
  
  rotations = [
    0, 
    10 
  ];
  
  scales = [
    [1.2, 0.4, 0],
    [2.6, 0.8, 0]
  ];
  
  colors = [
    [0.478, 0.369, 0.275, 1],
    [0.569, 0.475, 0.341, 1]
  ];
  MountainsGenerator(translations, rotations, scales, colors);
}

function drawRays(){  
  color = [0,0,0,0];
  for(let i = 0; i < 8; i ++){
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(i*45), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.7, 0.03, 0]);
    mMatrix = mat4.translate(mMatrix, [0.5, 0, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
  }
} 

function drawMoon(rotationAngle){
  pushMatrix(matrixStack, mMatrix);
  color = [0,0,0,0];
  mMatrix = mat4.translate(mMatrix, [-0.72, 0.8, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(rotationAngle), [0, 0, 1]);
  drawRays();
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawCloud(){
  pushMatrix(matrixStack, mMatrix);
  
  mMatrix = mat4.scale(mMatrix, [0.5, 0.26, 0]);

  pushMatrix(matrixStack, mMatrix);
  color = [0.15,0.15,0.15,0.4];
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 0]);
  mMatrix = mat4.translate(mMatrix, [-2.15 ,2.6, 0]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  
  pushMatrix(matrixStack, mMatrix);
  color = [0,0,0,0];
  mMatrix = mat4.translate(mMatrix, [-1.3, 1.95, 0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 0]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  color = [0.85,0.85,0.85,1];
  mMatrix = mat4.translate(mMatrix, [-0.9, 1.9, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  mMatrix = popMatrix(matrixStack);
}



function applyTransformation(mMatrix, scale, translation) {
  mMatrix = mat4.scale(mMatrix, [scale, scale, 1.0]);
  mMatrix = mat4.translate(mMatrix, translation);
  return mMatrix;
}

function drawRotatedTriangle(mMatrix, color) {
  for (let i = 0; i < 4; i++) {
      pushMatrix(matrixStack, mMatrix);

      mMatrix = mat4.rotate(mMatrix, degToRad(i * 90), [0, 0, 1]);
      mMatrix = mat4.scale(mMatrix, [0.5, 1.0, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0, 0.5, 0]);

      drawTriangle(color, mMatrix);

      mMatrix = popMatrix(matrixStack);
  }
}

function drawStar(mMatrix, brightness, color) {
  pushMatrix(matrixStack, mMatrix);

  mMatrix = mat4.scale(mMatrix, [brightness, brightness, 1.0]);
  drawRotatedTriangle(mMatrix, color);

  mMatrix = popMatrix(matrixStack);
}

function drawStarsAtConfiguredPositions(starConfigurations, brightness, color) {
  starConfigurations.forEach(config => {
      pushMatrix(matrixStack, mMatrix);

      let transformedMatrix = applyTransformation(mMatrix, config.scale, config.translation);
      drawStar(transformedMatrix, brightness, color);

      mMatrix = popMatrix(matrixStack);
  });
}

function drawStars(brightness) {
  const color = [0, 0, 0, 0];

  // Configuration for star positions and scales
  const starConfigurations = [
      { scale: 0.06, translation: [-4.5, 12, 0] },
      { scale: 0.05, translation: [-2, 13, 0] },
      { scale: 0.03, translation: [-5, 17.5, 0] },
      { scale: 0.1, translation: [3.5, 8, 0] },
      { scale: 0.04, translation: [13.5, 22.8, 0] },
  ];

  pushMatrix(matrixStack, mMatrix);

  // Draw stars at configured positions
  drawStarsAtConfiguredPositions(starConfigurations, brightness, color);

  mMatrix = popMatrix(matrixStack);
}

function drawTrees(){
    color = [0.498, 0.290, 0.290, 1];
    pushMatrix(matrixStack, mMatrix);
    
    mMatrix = mat4.scale(mMatrix, [0.1, 0.9, 1.0]);


    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [3, 0.19, 0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.4, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix); 
    mMatrix = mat4.translate(mMatrix, [5.4, 0.24, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.5, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


    pushMatrix(matrixStack, mMatrix); 
    mMatrix = mat4.translate(mMatrix, [7.6, 0.215, 0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.45, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    mMatrix = popMatrix(matrixStack);
    
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.04, 0]);

    pushMatrix(matrixStack, mMatrix);
    color = [0.298, 0.639, 0.352,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.4+0.04, 0]);
    mMatrix = mat4.scale(mMatrix, [0.32, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.463, 0.725, 0.388,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.45+0.04, 0]);
    mMatrix = mat4.scale(mMatrix, [0.36, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.522, 0.757, 0.396,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.50+0.04, 0]);
    mMatrix = mat4.scale(mMatrix, [0.40, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
    //////////////////////////////////// 
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.37, 0.02, 0]);
    mMatrix = mat4.scale(mMatrix, [1.2, 1.2, 1.0]);

    pushMatrix(matrixStack, mMatrix);
    color = [0.298, 0.639, 0.352,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.4, 0]);
    mMatrix = mat4.scale(mMatrix, [0.32, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.463, 0.725, 0.388,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.36, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.522, 0.757, 0.396,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.50, 0]);
    mMatrix = mat4.scale(mMatrix, [0.40, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
    mMatrix = popMatrix(matrixStack);
    //////////////////////////////////// 


    //////////////////////////////////// 
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.305, 0.1, 0]);
    mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);


    pushMatrix(matrixStack, mMatrix);
    color = [0.298, 0.639, 0.352,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.4, 0]);
    mMatrix = mat4.scale(mMatrix, [0.32, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.463, 0.725, 0.388,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.36, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.522, 0.757, 0.396,1];
    mMatrix = mat4.translate(mMatrix, [0.76, 0.50, 0]);
    mMatrix = mat4.scale(mMatrix, [0.40, 0.32, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
    mMatrix = popMatrix(matrixStack);
    //////////////////////////////////// 


    mMatrix = popMatrix(matrixStack);
}





function drawBoat(check){


  color = [0, 0, 0,1];
  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.4, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(-63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.04, 0.85, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///


  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.22, 0.4, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-30), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.01, 0.86, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  /// 

  if(check)
    color = [0.474, 0.223, 0.831,1];
  else 
    color = [0.933, 0.251, 0.157,1];

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.335, 0.45, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.63, 0.63, 1]);
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  color = [0.882, 0.886, 0.894,1];

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.2, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.35, 0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 1]);
  drawTriangle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.35, 0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 1]);
  drawTriangle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

 
}


function drawBoats(position1, position2){


  pushMatrix(matrixStack, mMatrix); 
  mMatrix = mat4.translate(mMatrix, [position2, -0.08, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1]);
  drawBoat(true);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix); 
  mMatrix = mat4.translate(mMatrix, [position1, -0.165, 0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 1]);
  drawBoat(false);
  mMatrix = popMatrix(matrixStack);

} 


function drawWindMill(angle){

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.2, 0]);

  //
  pushMatrix(matrixStack, mMatrix);
  color = [0.078, 0.086, 0.102, 1];
  mMatrix = mat4.translate(mMatrix, [0, -0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.05, 1, 1]);
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //

  //  
  pushMatrix(matrixStack, mMatrix);
  color = [0.780, 0.784, 0.180, 1];
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 1]);
  mMatrix = mat4.rotate(mMatrix,angle, [0, 0, 1]);
  for(let i = 0; i < 4; i++){
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(i*90), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [0, -0.4, 0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 1, 1]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
  }
  
  mMatrix = popMatrix(matrixStack);
  //

  //  
  pushMatrix(matrixStack, mMatrix);
  color = [0, 0, 0, 1];
  mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //


  mMatrix = popMatrix(matrixStack);
  


}

function drawWindMills(angle){

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.49, -0.01, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 1]);
  drawWindMill(angle);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.7, -0.03, 0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 1]);
  drawWindMill(angle);
  mMatrix = popMatrix(matrixStack);

} 

function bushGruop(){
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.25, 1]);

  //
  pushMatrix(matrixStack, mMatrix);
  color = [0.247, 0.675, 0.176,1];
  mMatrix = mat4.translate(mMatrix, [-0.55, -0.08, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.6, 1]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //

  //
  pushMatrix(matrixStack, mMatrix);
  color = [0.147, 0.326, 0.085,1];
  mMatrix = mat4.translate(mMatrix, [0.55, -0.08, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.6, 1]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //

  //
  color = [0.247, 0.529, 0.094,1];
  drawCircle(color, mMatrix);
  //

  mMatrix = popMatrix(matrixStack);
}

function drawBushes(){
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.2, -0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 1]);
  bushGruop();
  mMatrix = popMatrix(matrixStack);


  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.9, -0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 1]);
  bushGruop();
  mMatrix = popMatrix(matrixStack);


  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.155, -1.03, 0]);
  mMatrix = mat4.scale(mMatrix, [0.9, 0.9, 1]);
  bushGruop();
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.04, -0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1]);
  bushGruop();
  mMatrix = popMatrix(matrixStack);

} 

function drawHouse(){
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1,-0.05, 0]);
  mMatrix = mat4.scale(mMatrix, [0.85, 1, 1]);
  mMatrix = mat4.scale(mMatrix, [0.92, 0.9, 1]);
  //
  pushMatrix(matrixStack, mMatrix);
  color = [0.882, 0.886, 0.894,1];
  mMatrix = mat4.translate(mMatrix, [-0.6, -0.49, 0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.4, 1]);
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //

  //
  pushMatrix(matrixStack, mMatrix);
  color = [0.882, 0.886, 0.894,1];
  mMatrix = mat4.translate(mMatrix, [-0.6, -0.49, 0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.4, 1]);
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.6, -0.3, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.8, 1.3, 1]);
  ///
  color = [0.933, 0.388, 0.200,1];
  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.2, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.35, 0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 1]);
  drawTriangle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.35, 0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 1]);
  drawTriangle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  mMatrix = popMatrix(matrixStack);
  ///
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  color = [0.937, 0.745, 0.243,1]
  mMatrix = mat4.translate(mMatrix, [-0.7, -0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  color = [0.937, 0.745, 0.243,1]
  mMatrix = mat4.translate(mMatrix, [-0.45, -0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  color = [0.937, 0.745, 0.243,1]
  mMatrix = mat4.translate(mMatrix, [-0.57, -0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.14, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);

}

function drawCar(){
  //
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.5, -0.75, 0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 1]);

  // oval
  pushMatrix(matrixStack, mMatrix);
  color = [0.106, 0.302, 0.733,1];
  mMatrix = mat4.scale(mMatrix, [0.4, 0.25, 1]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  color = [0.790, 0.766, 0.851, 1];
  mMatrix = mat4.translate(mMatrix, [0, 0.01, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.11, 1]);
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);



  pushMatrix(matrixStack, mMatrix);
 
  mMatrix = mat4.translate(mMatrix, [-0.19, -0.18, 0]);

  pushMatrix(matrixStack, mMatrix);
  color = [0,0,0,1];
  mMatrix = mat4.scale(mMatrix, [0.13, 0.13, 1]);
  drawCircle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);


  pushMatrix(matrixStack, mMatrix);
  color = [0.15,0.15,0.15,0.7];
  mMatrix = mat4.scale(mMatrix, [0.11, 0.11, 1]);
  drawCircle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);

  mMatrix = popMatrix(matrixStack);

  /////
  pushMatrix(matrixStack, mMatrix);
 
  mMatrix = mat4.translate(mMatrix, [0.19, -0.18, 0]);

  pushMatrix(matrixStack, mMatrix);
  color = [0,0,0,1];
  mMatrix = mat4.scale(mMatrix, [0.13, 0.13, 1]);
  drawCircle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);


  pushMatrix(matrixStack, mMatrix);
  color = [0.15,0.15,0.15,0.7];
  mMatrix = mat4.scale(mMatrix, [0.11, 0.11, 1]);
  drawCircle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);

  mMatrix = popMatrix(matrixStack);


  ////

  //
  pushMatrix(matrixStack, mMatrix);
  color = [0.263, 0.545, 0.878,1];
  mMatrix = mat4.translate(mMatrix, [0, -0.087, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.65, 0.7, 1]);
  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.2, 1]);
  drawSquare(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.35, 0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 1]);
  drawTriangle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///

  ///
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.35, 0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-63.5), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 1]);
  drawTriangle(color,mMatrix);
  mMatrix = popMatrix(matrixStack);
  ///
  mMatrix = popMatrix(matrixStack);

  

  mMatrix = popMatrix(matrixStack);
  //
}

function drawsky(){
  
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.95, 0.95, 0.95, 1.0); // Clear the buffer with a light grey color
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Stop the current loop of animation
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  // Initialize animation function
  function animate() {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);

    drawBackground();
    updateAnimationState();
    applyBoundaryConstraints();
    drawSceneElements();

    animation = window.requestAnimationFrame(animate);
  }

  // Draw background with scaling
  function drawBackground() {
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.scale(mMatrix, [2, 2, 1]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
  }

  // Update animation state variables
  function updateAnimationState() {
    rotationAngle += rotationSpeed;
    brightness += brightnessinc * dir * 0.03;
    angle -= speed * 0.3;
    x1 += movingSpeed * dir1 * 1.3;
    x2 += movingSpeed * dir2;

    // Control brightness direction
    if (brightness > 0.6) {
      brightness = 0.6;
      dir = -1;
    } else if (brightness < 0.4) {
      brightness = 0.4;
      dir = 1;
    }
  }

  // Apply boundary constraints for movement
  function applyBoundaryConstraints() {
    if (x1 > 0.86) {
      x1 = 0.86;
      dir1 = -1;
    } else if (x1 < -0.86) {
      x1 = -0.86;
      dir1 = 1;
    }

    if (x2 > 0.9) {
      x2 = 0.9;
      dir2 = -1;
    } else if (x2 < -0.9) {
      x2 = -0.9;
      dir2 = 1;
    }
  }

  // Draw all elements of the scene
  function drawSceneElements() {
    drawMountains();
    drawGround();
    drawGrass();
    drawRiver();
    drawMoon(rotationAngle);
    drawCloud();
    drawStars(brightness);
    drawTrees();
    drawBoats(x1, x2);
    drawWindMills(angle);
    drawBushes();
    drawHouse();
    drawCar();
  }

  animate();
}


function view(x){
  running = x;
  drawScene();
}

// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("exampleAnimation2D");
  initGL(canvas);
  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();


  drawScene();
}

