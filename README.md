# WebGL Graphics Projects

Welcome to the **WebGL Graphics Projects** repository! This project encompasses a series of assignments focused on exploring and implementing various WebGL techniques for 2D and 3D graphics rendering. Each assignment builds upon the previous one, introducing new concepts and advanced rendering techniques to create visually engaging and interactive graphics applications.

## Table of Contents

- [Project Overview](#project-overview)
- [Assignments](#assignments)
  - [Assignment 1: 2D WebGL Animation](#assignment-1-2d-webgl-animation)
  - [Assignment 2: 3D Rendering and Shading](#assignment-2-3d-rendering-and-shading)
  - [Assignment 3: Ray Tracing](#assignment-3-ray-tracing)
  - [Assignment 4: Cel Shading](#assignment-4-cel-shading)
  - [Assignment 5: Advanced Ray Tracing](#assignment-5-advanced-ray-tracing)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Credits](#credits)
- [License](#license)

## Project Overview

This repository serves as a comprehensive collection of assignments aimed at mastering WebGL for creating dynamic and interactive graphics. From simple 2D animations to complex 3D shading techniques and ray tracing, each assignment is meticulously crafted to enhance your understanding and proficiency in WebGL programming.

## Assignments

### Assignment 1: 2D WebGL Animation

**Description:**  
Explore the fundamentals of WebGL by creating simple 2D animations. This assignment covers setting up the WebGL context, shaders, buffers, and rendering basic shapes with animations.

**Key Features:**
- Initialization of WebGL context.
- Vertex and fragment shaders for 2D rendering.
- Animation loop using `requestAnimationFrame`.
- Interactive controls to switch between point, wireframe, and solid views.

**Files:**
- `index.html`
- `script.js`
- `glMatrix-0.9.5.min.js`

### Assignment 2: 3D Rendering and Shading

**Description:**  
Delve into 3D graphics by implementing various shading techniques. This assignment focuses on creating 3D models, applying textures, and implementing different shading methods such as flat shading, Gouraud shading, and Phong shading.

**Key Features:**
- Creation and manipulation of 3D models.
- Implementation of different shading techniques.
- Texture mapping and environment mapping.
- Responsive design for various screen sizes.

**Files:**
- `index.html`
- `script.js`
- `stylesheet.css`
- `glMatrix-0.9.5.min.js`

### Assignment 3: Ray Tracing

**Description:**  
Introduce ray tracing techniques to simulate realistic lighting and shadows. This assignment covers the basics of ray tracing algorithms, intersection calculations, and rendering scenes with multiple light sources.

**Key Features:**
- Implementation of basic ray tracing algorithms.
- Calculation of ray-object intersections.
- Rendering scenes with realistic lighting.
- Optimization techniques for performance improvement.

**Files:**
- `index.html`
- `ray_tracing.js`
- Additional resources and assets.

### Assignment 4: Cel Shading

**Description:**  
Implement cel shading to achieve a stylized, cartoon-like appearance in 3D models. This assignment involves creating custom shaders to produce sharp edges and flat color regions, enhancing the visual appeal of 3D objects.

**Key Features:**
- Custom vertex and fragment shaders for cel shading.
- Integration of outline effects to emphasize model edges.
- Adjustable parameters for shading intensity and outline thickness.
- Interactive controls for real-time adjustments.

**Files:**
- `index.html`
- `celShading.js`
- `webgl-utils.js`
- `webgl-debug.js`
- `stylesheet.css`
- Model files (`.json` formats)

### Assignment 5: Advanced Ray Tracing

**Description:**  
Enhance the ray tracing project by incorporating advanced features such as reflections, refractions, and more complex lighting models. This assignment focuses on creating more realistic and visually compelling scenes.

**Key Features:**
- Recursive ray tracing for reflections and refractions.
- Implementation of Phong illumination model.
- Support for multiple light sources and shadow calculations.
- Performance optimizations for handling complex scenes.

**Files:**
- `index.html`
- `advanced_ray_tracing.js`
- Enhanced assets and resources.

## Technologies Used

- **WebGL 2.0:** For rendering interactive 2D and 3D graphics.
- **JavaScript:** Core programming language for implementing functionality.
- **glMatrix:** A high-performance matrix and vector library for WebGL.
- **HTML5 & CSS3:** For structuring and styling the web interface.
- **Shaders (GLSL):** Vertex and fragment shaders for custom rendering effects.

