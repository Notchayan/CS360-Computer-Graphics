/////////////////////////////////////////


var glContext;
var webGLCanvas;

var positionAttributeLocation;

var lightPositionUniformLocation;
var renderingModeUniformLocation;
var maxBounceUniformLocation;
var quadVertexBuffer;

var lightPosition = [-2,2, 5];
var maxBounce = 1;
var renderingMode = 4;

/////////////////////////////////////////
const vertexShaderCode = `#version 300 es
in vec3 aPosition;

void main() {
    // calcuie clip space position
    gl_Position =  vec4(aPosition,1.0);
}`;

/////////////////////////////////////////
const fragShaderCode = `#version 300 es
precision mediump float;

uniform vec3 uLightPosition;
uniform int uMode;
uniform int uBounce;

out vec4 fragColor;

struct Sphere {
    vec3 position;
    float radius;
    vec3 color;
    float shininess;
};

// Function to calculate the intersection of a ray with a sphere
float intersectSphere(vec3 rayOrigin, vec3 rayDirection, Sphere sphere) {
    vec3 oc = rayOrigin - sphere.position;
    float a = dot(rayDirection, rayDirection);
    float b = 2.0 * dot(oc, rayDirection);
    float c = dot(oc, oc) - sphere.radius * sphere.radius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        return 0.0; // No intersection
    } else {
        float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
        float t2 = (-b + sqrt(discriminant)) / (2.0 * a);

        return min(t1, t2);
    }
}

// Phong shading function
vec3 phongShading(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 color, float shininess) {
    float ambientStrength = 0.25;
    float specularStrength = 1.0;

    vec3 ambient = ambientStrength * color;

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * color;

    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * vec3(1.0);

    return ambient + diffuse + specular;
}

// Function to check if a point is in shadow
bool isPointInShadow(vec3 point, vec3 lightDir, Sphere spheres[7], int currentSphere) {
    for (int i = 0; i < 7; i++) {
        if (i == currentSphere) continue;

        float t = intersectSphere(point, lightDir, spheres[i]);

        if (t > 0.0) {
            return true; // Point is in shadow
        }
    }

    return false; // Point is not in shadow
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(600.0, 600.0);

    // Camera properties
    vec3 cameraPos = vec3(0.0, 0.0, 1.0);
    vec3 cameraDir = normalize(vec3(uv * 2.0 - 1.0, -1.0));
    
    // Light properties
    vec3 lightColor = vec3(1.0, 1.0, 1.0);

    // Sphere properties
    Sphere spheres[7];
    spheres[0] = Sphere(vec3(-0.5, -0.05, -0.3), 0.2, vec3(0.7, 0.1, 0.9), 10.0); 
    spheres[6] = Sphere(vec3(-0.53, 0.2, -0.05), 0.2, vec3(0.251, 0.122, 0.502), 15.0);
    spheres[2] = Sphere(vec3(-0.23, 0.4, 0.1), 0.2, vec3(0.004, 0.298, 0.878), 20.0);
    spheres[1] = Sphere(vec3(0.15, 0.27, 0.12), 0.2, vec3(0.2, 0.6, 1.0), 25.0);
    spheres[3] = Sphere(vec3(0.32, -0.08, 0.15), 0.2, vec3(0.337, 0.969, 0.914), 30.0);
    spheres[4] = Sphere(vec3(0.1, -0.4, 0.17), 0.2, vec3(0.376, 0.722, 0.427), 35.0);
    spheres[5] = Sphere(vec3(-0.27, -0.4, 0.17), 0.2, vec3(0, 1, 0.153), 40.0);
    

    vec3 color = vec3(0.0);
    
    // Ray tracing loop for each sphere
    vec3 reflectedColor = vec3(0.0);
    vec3 rayDir = cameraDir;
    vec3 rayOrigin = cameraPos;
    int inShadow = 0;

    for (int bounce = 0; bounce <= uBounce; bounce++) {
        float closestT = 1e6; // Initialize closestT to a value that indicates no intersection
        int closestSphereIndex = -1;

        for (int i = 0; i < 7; i++) {
            float t = intersectSphere(rayOrigin, rayDir, spheres[i]);
            if (t > 0.0  && t < closestT) {
                // Update closestT and calculate shading only if the intersection is closer
                closestT = t;
                closestSphereIndex = i;
            }
        }

        if (closestSphereIndex == -1) {
            break;  // No intersection found
        }
        
        // Calculate intersection point
        vec3 intersectionPoint = rayOrigin + closestT * rayDir;
            
        // Calculate normal at the intersection point
        vec3 normal = normalize(intersectionPoint - spheres[closestSphereIndex].position);

        vec3 lightDir = normalize(uLightPosition - intersectionPoint);
        vec3 viewDir = normalize(cameraPos - intersectionPoint);
        
        // Calculate reflection direction
        vec3 reflectionDir = reflect(rayDir, normal);

        if (uMode == 1 || uMode == 2) {
            if (bounce > 0){
                break;
            }
        }

        reflectedColor += phongShading(normal, lightDir, viewDir, spheres[closestSphereIndex].color,
            spheres[closestSphereIndex].shininess);
        
        
        if (uMode == 2 || uMode == 4) {
            // Check for shadows
            if (isPointInShadow(intersectionPoint, lightDir, spheres, closestSphereIndex) && bounce == 0) {
                reflectedColor = vec3(0.05);
                inShadow = 1;
            }
        }

        if (uMode == 3 || uMode == 4) {
            rayOrigin = intersectionPoint + 0.001 * normal;
            rayDir = reflectionDir;
        }
    }

    // Final color
    fragColor = vec4(reflectedColor, 1.0);
}`;



/////////////////////////////////////////


function setPhongShading() {
    renderingMode = 1;
    drawScene();
    drawScene();
}
  
function setPhongShadingWithShadow() {
    renderingMode = 2;
    drawScene();
    drawScene();
}
  
function setPhongShadingWithReflection() {
    renderingMode = 3;
    drawScene();
    drawScene();
}
  
function setPhongShadingWithShadowAndReflection() {
    renderingMode = 4;
    drawScene();
    drawScene();
}
  
function updateLightPosition(value) {
    console.log("Adjusting light position");
    document.getElementById('light-loc').innerHTML = value;
    lightPosition[0] = value;
    drawScene();
    drawScene();
}
  
function updateBounceLimit(value) {
    document.getElementById('bounce-limit').innerHTML = value;
    maxBounce = value;
    console.log({bounce: maxBounce});
    drawScene();
    drawScene();
}

/////////////////////////////////////////


function vertexShaderSetup(vertexShaderCode) {
    shader = glContext.createShader(glContext.VERTEX_SHADER);
    glContext.shaderSource(shader, vertexShaderCode);
    glContext.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        alert(glContext.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

/////////////////////////////////////////


function fragmentShaderSetup(fragShaderCode) {
    shader = glContext.createShader(glContext.FRAGMENT_SHADER);
    glContext.shaderSource(shader, fragShaderCode);
    glContext.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        alert(glContext.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

/////////////////////////////////////////

function initShaders() {
    shaderProgram = glContext.createProgram();
  
    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);
  
    // attach the shaders
    glContext.attachShader(shaderProgram, vertexShader);
    glContext.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    glContext.linkProgram(shaderProgram);
  
    // check for compiiion and linking status
    if (!glContext.getProgramParameter(shaderProgram, glContext.LINK_STATUS)) {
        console.log(glContext.getShaderInfoLog(vertexShader));
        console.log(glContext.getShaderInfoLog(fragmentShader));
    }
  
    //finally use the program.
    glContext.useProgram(shaderProgram);
  
    return shaderProgram;
}

/////////////////////////////////////////


function initGL(canvas) {
    try {
        glContext = canvas.getContext("webgl2"); // the graphics webgl2 context
        glContext.viewportWidth = canvas.width; // the width of the canvas
        glContext.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!glContext) {
        alert("WebGL initialization failed");
    }
}

function initQuadBuffer() {
    quadVertexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, quadVertexBuffer);
    var vertices = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertices), glContext.STATIC_DRAW);

}

/////////////////////////////////////////


// Draw a Quad
function drawQuad() {
    glContext.bindBuffer(glContext.ARRAY_BUFFER, quadVertexBuffer);
    glContext.vertexAttribPointer(positionAttributeLocation, 2, glContext.FLOAT, false, 0, 0);
    glContext.drawArrays(glContext.TRIANGLE_STRIP, 0, 4);

    glContext.uniform3fv(lightPositionUniformLocation, lightPosition);
    glContext.uniform1i(maxBounceUniformLocation, maxBounce);
    glContext.uniform1i(renderingModeUniformLocation, renderingMode);
}


/////////////////////////////////////////

//The main drawing routine
function drawScene() {
    glContext.viewport(0, 0, glContext.viewportWidth, glContext.viewportHeight);
    glContext.clearColor(1.0, 1.0, 1.0, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
    
    color = [1.0, 0.0, 0.0];
    drawQuad(color);  
}


/////////////////////////////////////////


function webGLStart() {
    webGLCanvas = document.getElementById("ray-tracer");
    initGL(webGLCanvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    positionAttributeLocation = glContext.getAttribLocation(shaderProgram, "aPosition");
    lightPositionUniformLocation = glContext.getUniformLocation(shaderProgram, "uLightPosition");
    renderingModeUniformLocation = glContext.getUniformLocation(shaderProgram, "uMode");
    maxBounceUniformLocation = glContext.getUniformLocation(shaderProgram, "uBounce");

    glContext.enableVertexAttribArray(positionAttributeLocation);

    initQuadBuffer();
    drawScene();
    drawScene();
}

/////////////////////////////////////////
