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
  float s = .1;
  vec2 offset = texture(offsetMap, vUv).xy;
  vec2 uvr = vUv + s * offset.x;
  vec2 uvg = vUv;;
  vec2 uvb = vUv + s * offset.y;
  vec4 r = texture(map, uvr);
  vec4 g = texture(map, uvg);
  vec4 b = texture(map, uvb);
  color = vec4(r.r, g.g, b.b, 1.);
  // color = vec4(.5 + texture(offsetMap, vUv).xy / 10., 0., 1.);
}
`;

export { vertexShader, fragmentShader };
