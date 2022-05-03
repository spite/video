const vertexShader = `in vec3 position;
in vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const fragmentShader = `precision highp float;
in vec2 vUv;

uniform sampler2D map;
uniform sampler2D offsetMap;

out vec4 color;

void main() {
  vec2 uv = vUv + .01 * texture(offsetMap, vUv).xy;
  color = texture(map, uv);
}
`;

export { vertexShader, fragmentShader };
