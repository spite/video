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
  vec2 uv = vUv + .1 * texture(offsetMap, vUv).xy;
  color = texture(map, uv);
  // color = vec4(.5 + texture(offsetMap, vUv).xy / 10., 0., 1.);
}
`;

export { vertexShader, fragmentShader };
