/* Hero background: Paper Shaders "warp" - the same shader library the
   reference site uses for its flowing granular gradient - colored by the
   site accent. Falls back to a static CSS gradient if WebGL or the CDN
   import fails. */
import {
  ShaderMount,
  warpFragmentShader,
  getShaderColorFromString
} from 'https://esm.sh/@paper-design/shaders@0.0.29';

const host = document.getElementById('hero-bg');

function accentColors() {
  const styles = getComputedStyle(document.documentElement);
  return [
    styles.getPropertyValue('--accent-a').trim() || '#ffffff',
    styles.getPropertyValue('--accent-b').trim() || '#000000'
  ];
}

const BASE = '#060607';

// Blend a hex colour toward the dark base; t=1 is fully base
function towardBase(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const m = parseInt(BASE.slice(1), 16);
  const mix = (shift) => Math.round(((n >> shift) & 255) * (1 - t) + ((m >> shift) & 255) * t);
  return `#${[16, 8, 0].map((shift) => mix(shift).toString(16).padStart(2, '0')).join('')}`;
}

function colorUniforms() {
  const [a, b] = accentColors();
  return {
    u_colors: [
      getShaderColorFromString(a),
      // Second colour stays a subtle dark tint - near the black base -
      // so it never floods whole regions, and the dark borders between
      // the first colour's flows are preserved.
      getShaderColorFromString(towardBase(b, 0.82)),
      getShaderColorFromString(BASE)
    ],
    u_colorsCount: 3
  };
}

function fallback() {
  const hero = document.querySelector('.hero');
  if (hero) hero.classList.add('hero--no-shader');
}

if (host) {
  try {
    const SPEED = 1.0;
    // A fresh pattern on every refresh: jitter the warp parameters and
    // start the animation at a random point in time
    const rand = (min, max) => min + Math.random() * (max - min);
    const startFrame = Math.random() * 1000000;
    const mount = new ShaderMount(host, warpFragmentShader, {
      ...colorUniforms(),
      u_scale: rand(1.2, 1.7),
      u_proportion: 0.62,
      u_softness: 1,
      u_shape: 0, // checks: broken lava-lamp bubbles
      u_shapeScale: rand(0.5, 0.8),
      u_distortion: rand(0.2, 0.35),
      u_swirl: rand(0.2, 0.45),
      u_swirlIterations: Math.floor(rand(3, 6))
    }, undefined, SPEED, startFrame);

    document.addEventListener('accentchange', () => {
      mount.setUniforms(colorUniforms());
    });

    // Save power when the hero is off screen or the tab is hidden
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let heroVisible = true;
    const syncSpeed = () => {
      mount.setSpeed(!reducedMotion && heroVisible && !document.hidden ? SPEED : 0);
    };
    new IntersectionObserver((entries) => {
      heroVisible = entries.some((entry) => entry.isIntersecting);
      syncSpeed();
    }).observe(host);
    document.addEventListener('visibilitychange', syncSpeed);
    syncSpeed();
  } catch (error) {
    fallback();
  }
} else {
  fallback();
}
