import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function buildPod(color, hero) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#414642', roughness: .29, metalness: .88 });
  const black = new THREE.MeshStandardMaterial({ color: '#141a17', roughness: .5, metalness: .7 });
  const light = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5, roughness: .3 });
  const add = (geo, mat, y, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; parent.add(m); return m; };
  // Stacked hexagonal pressure plates surround a transparent asset chamber.
  [-1.05, -.88, .9, 1.06].forEach((y, i) => {
    const plate = add(new THREE.CylinderGeometry(i % 2 ? .89 : 1.02, i % 2 ? .89 : 1.02, .16, 6), metal, y);
    plate.rotation.y = Math.PI / 6;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: '#788477', transparent: true, opacity: .5 }));
    plate.add(edges);
  });
  [-.75, .76].forEach(y => {
    const rim = add(new THREE.TorusGeometry(.79, .027, 8, 6), light, y);
    rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI / 6;
  });
  const glass = new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: .085, metalness: .1, roughness: .1, side: THREE.DoubleSide, depthWrite: false });
  add(new THREE.CylinderGeometry(.79, .79, 1.45, 6, 1, true), glass, 0).rotation.y = Math.PI / 6;
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const x = Math.cos(angle) * .83, z = Math.sin(angle) * .83;
    const rail = add(new THREE.BoxGeometry(.115, 1.6, .12), metal, 0); rail.position.set(x, 0, z);
    const strip = add(new THREE.BoxGeometry(.027, .62, .025), light, -.28); strip.position.x = x * 1.02; strip.position.z = z * 1.02;
    [-.67, .67].forEach(y => { const bolt = add(new THREE.BoxGeometry(.19, .18, .19), black, y); bolt.position.x = x; bolt.position.z = z; });
  }
  const core = add(new THREE.IcosahedronGeometry(.43, 0), new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: .75, metalness: .65, roughness: .15, transparent: true, opacity: .85 }), .02);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry), new THREE.LineBasicMaterial({ color: '#efffe1' })); core.add(wire);
  [-.59, .59].forEach(y => { const disc = add(new THREE.CylinderGeometry(.54, .54, .06, 32), black, y); const ring = new THREE.Mesh(new THREE.TorusGeometry(.43, .01, 8, 48), light); ring.rotation.x = Math.PI / 2; ring.position.y = .04; disc.add(ring); });
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const led = add(new THREE.BoxGeometry(.09, .012, .05), i % 3 === 0 ? light : black, 1.151);
    led.position.x = Math.cos(angle) * .72; led.position.z = Math.sin(angle) * .72; led.rotation.y = -angle;
  }
  const cap = add(new THREE.CylinderGeometry(.58, .68, .1, 6), black, 1.2); cap.rotation.y = Math.PI / 6;
  if (hero) {
    const ring = add(new THREE.TorusGeometry(1.55, .008, 8, 100), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .25 }), -1.24); ring.rotation.x = Math.PI / 2;
    const ring2 = ring.clone(); ring2.scale.setScalar(1.25); group.add(ring2);
  }
  return { group, core };
}

export const PodScene = ({ color = '#b4ef63', hero = false, active = false, testId = 'pod-scene' }) => {
  const host = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let renderer, frame, observer;
    const scene = new THREE.Scene();
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.7;
      node.appendChild(renderer.domElement);
      const camera = new THREE.PerspectiveCamera(33, 1, .1, 50); camera.position.set(3.5, 2.4, 5.6); camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight('#dce7dc', 2.2));
      const key = new THREE.DirectionalLight('#ffffff', 5); key.position.set(2, 5, 4); scene.add(key);
      const fill = new THREE.DirectionalLight(color, 3); fill.position.set(-3, 0, -2); scene.add(fill);
      const back = new THREE.DirectionalLight('#c3d5ef', 3); back.position.set(-2, 3, 2); scene.add(back);
      const { group, core } = buildPod(color, hero); scene.add(group); group.rotation.y = -.3;
      const resize = () => { const w = node.clientWidth, h = node.clientHeight; if (w && h) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); } };
      observer = new ResizeObserver(resize); observer.observe(node); resize();
      let pointer = 0; const move = e => { pointer = ((e.clientX - node.getBoundingClientRect().left) / node.clientWidth - .5) * .6; };
      node.addEventListener('pointermove', move);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let last = 0;
      const render = time => {
        frame = requestAnimationFrame(render);
        if (time - last < 45 || document.hidden) return;
        last = time;
        if (!reduced) { group.rotation.y += (pointer - .3 - group.rotation.y) * .025; group.position.y = Math.sin(time * .0007) * .035; core.rotation.y = time * (active ? .001 : .0003); core.rotation.z = Math.sin(time * .0005) * .15; }
        renderer.render(scene, camera);
        if (node.dataset.renderReady !== 'true') node.dataset.renderReady = 'true';
      };
      frame = requestAnimationFrame(render);
      return () => { cancelAnimationFrame(frame); observer.disconnect(); node.removeEventListener('pointermove', move); scene.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
    } catch { setFailed(true); renderer?.dispose(); }
  }, [color, hero, active]);
  return <div className={`pod-scene ${hero ? 'hero-scene' : ''}`} ref={host} data-testid={testId} aria-label="Quantum incubation pod, interactive 3D model" role="img">{failed && <div className="pod-fallback" style={{ color }}>⬡<span>INC</span></div>}</div>;
};