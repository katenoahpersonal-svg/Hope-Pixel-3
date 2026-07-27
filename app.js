window.__HOPE_APP_STARTED__ = true;

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 780px)').matches;
const lowPower = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const dpr = Math.min(devicePixelRatio, lowPower ? 1.35 : 1.8);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp01 = THREE.MathUtils.clamp;

// ——— Local-time dimension ----------------------------------------------------
const hour = new Date().getHours();
const timeMode = hour < 7 ? 'dawn' : hour < 17 ? 'day' : hour < 21 ? 'dusk' : 'night';
document.documentElement.dataset.time = timeMode;
const palettes = {
  dawn:  { fog: 0x120b1a, a: 0xff9fb8, b: 0x8c7cff, grade: new THREE.Vector3(1.08, .9, 1.02) },
  day:   { fog: 0x050b17, a: 0x4fd5ff, b: 0x7167ff, grade: new THREE.Vector3(.93, 1.03, 1.1) },
  dusk:  { fog: 0x0d0617, a: 0x6b9dff, b: 0xc15fff, grade: new THREE.Vector3(1.05, .9, 1.07) },
  night: { fog: 0x04030a, a: 0x52b8ff, b: 0x9867ff, grade: new THREE.Vector3(.94, .92, 1.12) }
};
const palette = palettes[timeMode];

// ——— DOM and scroll ---------------------------------------------------------
const loader = $('#loader');
const loaderCount = $('#loaderCount');
const loaderBar = $('#loaderBar');
let loaded = 0;
const loadingTimer = setInterval(() => {
  loaded = Math.min(loaded + Math.ceil(Math.random() * 7), 100);
  loaderCount.textContent = loaded;
  loaderBar.style.transform = `scaleX(${loaded / 100})`;
  if (loaded >= 100) {
    clearInterval(loadingTimer);
    setTimeout(() => {
      loader.classList.add('is-complete');
      gsap.from('.site-header, .journey-ui, .scroll-hint', { opacity: 0, y: -12, duration: 1, stagger: .08, ease: 'power3.out' });
      gsap.from('.hero-letter', { yPercent: 125, rotateX: -70, opacity: 0, duration: 1.45, stagger: .08, ease: 'expo.out' });
      gsap.from('.hero-copy .reveal', { opacity: 0, y: 18, duration: 1, stagger: .1, delay: .35 });
    }, 450);
  }
}, 45);

const lenis = reducedMotion ? null : new Lenis({
  duration: 1.35,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: .9,
  touchMultiplier: 1.1
});
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ——— Three.js scene ---------------------------------------------------------
const canvas = $('#universe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(palette.fog);
scene.fog = new THREE.FogExp2(palette.fog, .016);
const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 52, innerWidth / innerHeight, .1, 240);

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 13),
  new THREE.Vector3(0, 0, 5),
  new THREE.Vector3(5, 1, -7),
  new THREE.Vector3(-5, -1, -20),
  new THREE.Vector3(6, 2, -34),
  new THREE.Vector3(-4, 0, -50),
  new THREE.Vector3(0, 1.5, -66),
  new THREE.Vector3(0, 0, -84)
], false, 'catmullrom', .55);
const lookPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -9), new THREE.Vector3(2, 0, -20),
  new THREE.Vector3(-2, 0, -34), new THREE.Vector3(2, 0, -48), new THREE.Vector3(0, 0, -64),
  new THREE.Vector3(0, 0, -83), new THREE.Vector3(0, 0, -95)
]);

const universe = new THREE.Group();
scene.add(universe);

scene.add(new THREE.AmbientLight(0xb8b0ff, .42));
const key = new THREE.PointLight(palette.a, 42, 70, 1.5); key.position.set(5, 8, 7); scene.add(key);
const rim = new THREE.PointLight(palette.b, 55, 85, 1.6); rim.position.set(-8, -5, -30); scene.add(rim);

// Shader star field with cursor warp
const starCount = lowPower ? 1900 : 4300;
const starPositions = new Float32Array(starCount * 3);
const starScales = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
  const z = THREE.MathUtils.randFloat(-110, 18);
  const radius = THREE.MathUtils.randFloat(4, 34) * (1 + Math.abs(z) / 160);
  const angle = Math.random() * Math.PI * 2;
  starPositions[i * 3] = Math.cos(angle) * radius + THREE.MathUtils.randFloatSpread(8);
  starPositions[i * 3 + 1] = Math.sin(angle) * radius * .65 + THREE.MathUtils.randFloatSpread(5);
  starPositions[i * 3 + 2] = z;
  starScales[i] = Math.random();
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('aScale', new THREE.BufferAttribute(starScales, 1));
const starMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }, uPixelRatio: { value: dpr }, uCursor: { value: new THREE.Vector2() },
    uColorA: { value: new THREE.Color(palette.a) }, uColorB: { value: new THREE.Color(palette.b) },
    uAudio: { value: 0 }
  },
  vertexShader: `
    uniform float uTime; uniform float uPixelRatio; uniform vec2 uCursor; uniform float uAudio;
    attribute float aScale; varying float vMix;
    void main(){
      vec3 p = position;
      p.x += sin(uTime*.08 + p.z*.12) * .16;
      p.y += cos(uTime*.07 + p.x*.14) * .12;
      vec4 mv = modelViewMatrix * vec4(p,1.);
      vec2 screen = mv.xy / max(.1,-mv.z);
      float d = distance(screen, uCursor*.38);
      float warp = smoothstep(.34,0.,d);
      mv.xy += normalize(screen-uCursor*.38+.0001) * warp * (1.2 + uAudio*1.8);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.4 + aScale*2.7 + uAudio*1.2) * uPixelRatio * (18. / max(2.,-mv.z));
      vMix = aScale;
    }`,
  fragmentShader: `
    uniform vec3 uColorA; uniform vec3 uColorB; varying float vMix;
    void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.03,d); gl_FragColor=vec4(mix(uColorA,uColorB,vMix),a*.82); }
  `
});
const stars = new THREE.Points(starGeo, starMat); universe.add(stars);

// Nebula volumes — additive shader planes
const nebulaGroup = new THREE.Group();
const nebulaTexture = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); const g = x.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,'rgba(255,255,255,.85)'); g.addColorStop(.18,'rgba(255,255,255,.33)'); g.addColorStop(.55,'rgba(255,255,255,.08)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,256,256); return new THREE.CanvasTexture(c);
})();
for (let i = 0; i < (lowPower ? 8 : 15); i++) {
  const material = new THREE.SpriteMaterial({ map: nebulaTexture, color: i % 2 ? palette.a : palette.b, transparent:true, opacity:THREE.MathUtils.randFloat(.035,.1), depthWrite:false, blending:THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material); sprite.position.set(THREE.MathUtils.randFloatSpread(32),THREE.MathUtils.randFloatSpread(18),THREE.MathUtils.randFloat(-95,4));
  const s=THREE.MathUtils.randFloat(12,30); sprite.scale.set(s,s*.65,1); nebulaGroup.add(sprite);
}
universe.add(nebulaGroup);

// Luminous path ribbon
const tube = new THREE.Mesh(
  new THREE.TubeGeometry(cameraPath, 260, .018, 8, false),
  new THREE.MeshBasicMaterial({ color: palette.b, transparent:true, opacity:.28, blending:THREE.AdditiveBlending })
);
universe.add(tube);

// World factories
const worldData = [
  { title:'HOPE PIXEL', category:'IMMERSIVE WEB', year:'2026', pos:[4.8,.5,-16], color:0x58cfff, shape:'torus' },
  { title:'WALKING WITH GOD', category:'FILM', year:'2026', pos:[-5.5,-.4,-30], color:0xb97aff, shape:'crystal' },
  { title:'MATUSKA DIGITAL', category:'COMMERCE', year:'2025—26', pos:[5.3,1,-45], color:0x7e78ff, shape:'sphere' },
  { title:'HOPE IN PRINT', category:'IDENTITY', year:'2025', pos:[-3.8,0,-59], color:0xf09aff, shape:'ring' }
];
const worlds = [];
const clickable = [];

function makeLabelTexture(title, category, year, color) {
  const c=document.createElement('canvas'); c.width=1024; c.height=512; const x=c.getContext('2d');
  const grad=x.createLinearGradient(0,0,1024,512); grad.addColorStop(0,'rgba(8,6,20,.86)'); grad.addColorStop(1,'rgba(8,6,20,.18)');
  x.fillStyle=grad; x.fillRect(0,0,c.width,c.height); x.strokeStyle='rgba(255,255,255,.24)'; x.lineWidth=3; x.strokeRect(22,22,980,468);
  x.fillStyle='rgba(255,255,255,.6)'; x.font='28px monospace'; x.fillText(category,58,82); x.textAlign='right'; x.fillText(year,962,82);
  x.textAlign='left'; x.fillStyle='white'; x.font='500 76px Arial'; x.fillText(title,58,330);
  x.fillStyle=`#${new THREE.Color(color).getHexString()}`; x.fillRect(58,376,300,4);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=renderer.capabilities.getMaxAnisotropy(); return tex;
}

function createWorld(data, index) {
  const group=new THREE.Group(); group.position.set(...data.pos); group.userData.index=index;
  const color=new THREE.Color(data.color);
  const coreMat=new THREE.MeshPhysicalMaterial({ color, metalness:.25, roughness:.18, transmission:.28, thickness:1.3, transparent:true, opacity:.92, iridescence:1, iridescenceIOR:1.7, emissive:color, emissiveIntensity:.22 });
  let core;
  if(data.shape==='torus') core=new THREE.Mesh(new THREE.TorusKnotGeometry(1.15,.28,120,16,2,3),coreMat);
  else if(data.shape==='crystal') core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.45,2),coreMat);
  else if(data.shape==='sphere') core=new THREE.Mesh(new THREE.SphereGeometry(1.3,48,48),coreMat);
  else core=new THREE.Mesh(new THREE.TorusGeometry(1.45,.34,24,80),coreMat);
  core.userData.index=index; group.add(core); clickable.push(core);

  const wireMat=new THREE.MeshBasicMaterial({ color, wireframe:true, transparent:true, opacity:.18, blending:THREE.AdditiveBlending });
  const wire=new THREE.Mesh(core.geometry.clone(),wireMat); wire.scale.setScalar(1.28); group.add(wire);

  for(let r=0;r<3;r++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.3+r*.36,.012,6,100),new THREE.MeshBasicMaterial({color:r%2?palette.a:color,transparent:true,opacity:.28,blending:THREE.AdditiveBlending}));
    ring.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2); group.add(ring);
  }

  const plane=new THREE.Mesh(new THREE.PlaneGeometry(5.6,2.8),new THREE.MeshBasicMaterial({map:makeLabelTexture(data.title,data.category,data.year,data.color),transparent:true,opacity:.92,depthWrite:false}));
  plane.position.set(index%2===0?-3.7:3.7,-2.5,.2); plane.rotation.y=index%2===0?.18:-.18; group.add(plane);

  const count=lowPower?120:260; const p=new Float32Array(count*3);
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;const rr=THREE.MathUtils.randFloat(1.8,4.2);p[i*3]=Math.cos(a)*rr;p[i*3+1]=THREE.MathUtils.randFloatSpread(4);p[i*3+2]=Math.sin(a)*rr;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(p,3));
  group.add(new THREE.Points(pg,new THREE.PointsMaterial({color,size:.025,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false})));
  universe.add(group); worlds.push({group,core,wire,index,base:data.pos});
}
worldData.forEach(createWorld);

// About orbit form
const aboutWorld=new THREE.Group(); aboutWorld.position.set(2.5,.5,-70);
const aboutCore=new THREE.Mesh(new THREE.TorusKnotGeometry(1.7,.48,180,24,3,5),new THREE.MeshPhysicalMaterial({color:palette.b,roughness:.12,metalness:.45,transmission:.18,iridescence:1,emissive:palette.a,emissiveIntensity:.14}));
aboutWorld.add(aboutCore);
for(let i=0;i<8;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5+i*.18,.008,5,80),new THREE.MeshBasicMaterial({color:i%2?palette.a:palette.b,transparent:true,opacity:.14}));ring.rotation.set(i*.37,i*.23,i*.17);aboutWorld.add(ring)}
universe.add(aboutWorld);

// Contact landing flower/platform
const contactWorld=new THREE.Group(); contactWorld.position.set(0,-1.1,-86);
for(let i=0;i<10;i++){const petal=new THREE.Mesh(new THREE.CircleGeometry(1.65,48,0,Math.PI*.72),new THREE.MeshPhysicalMaterial({color:i%2?palette.a:palette.b,transparent:true,opacity:.13,side:THREE.DoubleSide,emissive:i%2?palette.a:palette.b,emissiveIntensity:.18,roughness:.3}));petal.rotation.z=i/10*Math.PI*2;petal.rotation.x=-Math.PI/2.15;petal.position.y=.12;contactWorld.add(petal)}
universe.add(contactWorld);

// Butterfly guide made from particles
const butterfly=new THREE.Group();
const wingCount=lowPower?110:220;
function wingGeometry(side=1){
  const arr=new Float32Array(wingCount*3);
  for(let i=0;i<wingCount;i++){
    const t=Math.random()*Math.PI*2, r=Math.sqrt(Math.random());
    const x=(.18+Math.abs(Math.cos(t))*1.2*r)*side;
    const y=Math.sin(t)*.75*r + (Math.random()-.5)*.08;
    const z=(Math.random()-.5)*.15;
    arr.set([x,y,z],i*3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));return g;
}
const butterflyMat=new THREE.PointsMaterial({color:0xd9c8ff,size:lowPower?.045:.035,transparent:true,opacity:.96,blending:THREE.AdditiveBlending,depthWrite:false});
const leftWing=new THREE.Points(wingGeometry(-1),butterflyMat); const rightWing=new THREE.Points(wingGeometry(1),butterflyMat.clone());
butterfly.add(leftWing,rightWing);
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.55,4,8),new THREE.MeshBasicMaterial({color:0xffffff}));body.rotation.z=Math.PI/2;butterfly.add(body);
butterfly.scale.setScalar(.48); universe.add(butterfly);
let butterflyIdle=0, scrollVelocity=0, lastScroll=0;

// Postprocessing: bloom + subtle chromatic aberration / time grade
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),lowPower?.45:.75,.45,.72); composer.addPass(bloom);
const gradePass=new ShaderPass({
  uniforms:{tDiffuse:{value:null},uShift:{value:lowPower?0:.0007},uGrade:{value:palette.grade},uVignette:{value:.38}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uShift;uniform vec3 uGrade;uniform float uVignette;varying vec2 vUv;void main(){vec2 d=vUv-.5;float s=uShift*(.2+length(d));float r=texture2D(tDiffuse,vUv+vec2(s,0.)).r;float g=texture2D(tDiffuse,vUv).g;float b=texture2D(tDiffuse,vUv-vec2(s,0.)).b;vec3 c=vec3(r,g,b)*uGrade;float v=smoothstep(.86,uVignette,length(d));c*=mix(1.,.58,v);gl_FragColor=vec4(c,1.);}`
});
composer.addPass(gradePass); composer.addPass(new OutputPass());

// ——— Scroll choreography ----------------------------------------------------
const journey={progress:0};
ScrollTrigger.create({
  trigger:'main', start:'top top', end:'bottom bottom',
  onUpdate:self=>{
    journey.progress=self.progress;
    scrollVelocity=Math.abs(self.getVelocity());
    const now=performance.now(); if(Math.abs(self.progress-lastScroll)>.0001){butterflyIdle=now;lastScroll=self.progress;}
    document.documentElement.style.setProperty('--progress',self.progress);
  }
});

const chapters=[...$$('.chapter')];
chapters.forEach((chapter,i)=>{
  ScrollTrigger.create({
    trigger:chapter,start:'top center',end:'bottom center',
    onEnter:()=>setChapter(i),onEnterBack:()=>setChapter(i)
  });
});
function setChapter(i){
  $('#chapterIndex').textContent=String(i+1).padStart(2,'0');
  $('#chapterLabel').textContent=chapters[i].dataset.chapter;
}

gsap.to('.hero-copy', { opacity:0, scale:.9, y:-80, ease:'none', scrollTrigger:{trigger:'#hero',start:'40% top',end:'bottom top',scrub:true} });
gsap.to('.hero-letter:nth-child(1)', { xPercent:-28, rotateZ:-6, ease:'none', scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true} });
gsap.to('.hero-letter:nth-child(4)', { xPercent:28, rotateZ:6, ease:'none', scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true} });
gsap.to('.section-intro', { opacity:1,y:0,scrollTrigger:{trigger:'#works',start:'top 70%',end:'top 30%',scrub:true} });
gsap.to('.section-intro', { opacity:0,y:-30,scrollTrigger:{trigger:'#works',start:'8% top',end:'16% top',scrub:true} });

const projectCards=$$('.project-card');
projectCards.forEach((card,i)=>{
  const start=10+i*22;
  gsap.timeline({scrollTrigger:{trigger:'#works',start:`${start}% top`,end:`${start+18}% top`,scrub:true}})
    .to(card,{autoAlpha:1,yPercent:-10,scale:1,duration:.22,ease:'power2.out'})
    .to(card,{autoAlpha:1,duration:.48})
    .to(card,{autoAlpha:0,yPercent:-35,scale:.94,duration:.3,ease:'power2.in'});
});
gsap.to('.about-copy',{opacity:1,y:0,scrollTrigger:{trigger:'#about',start:'top 65%',end:'top 25%',scrub:true}});
gsap.to('.skill-cloud li',{y:()=>gsap.utils.random(-45,45),x:()=>gsap.utils.random(-30,30),stagger:.035,ease:'none',scrollTrigger:{trigger:'#about',start:'top bottom',end:'bottom top',scrub:true}});
gsap.to('.contact-panel',{opacity:1,y:0,scrollTrigger:{trigger:'#contact',start:'top 60%',end:'top 18%',scrub:true}});
gsap.to('.scroll-hint',{autoAlpha:0,scrollTrigger:{trigger:'#hero',start:'10% top',end:'30% top',scrub:true}});

// ——— Pointer, magnetic UI and world interaction ----------------------------
const pointer={x:0,y:0,tx:0,ty:0};
const cursor=$('#cursor'), trail=$('#cursorTrail');
addEventListener('pointermove',e=>{
  pointer.tx=(e.clientX/innerWidth)*2-1; pointer.ty=-(e.clientY/innerHeight)*2+1;
  if(!isMobile){gsap.set(cursor,{x:e.clientX,y:e.clientY});gsap.to(trail,{x:e.clientX,y:e.clientY,duration:.35,ease:'power3.out'});}
});
$$('a,button,.project-card').forEach(el=>{
  el.addEventListener('mouseenter',()=>cursor?.classList.add('is-active'));
  el.addEventListener('mouseleave',()=>cursor?.classList.remove('is-active'));
});
$$('.magnetic').forEach(el=>{
  el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.16,y:(e.clientY-r.top-r.height/2)*.16,duration:.3});});
  el.addEventListener('pointerleave',()=>gsap.to(el,{x:0,y:0,duration:.7,ease:'elastic.out(1,.4)'}));
});

const raycaster=new THREE.Raycaster();
let hoveredWorld=null;
function raycast(){
  raycaster.setFromCamera(new THREE.Vector2(pointer.tx,pointer.ty),camera);
  const hit=raycaster.intersectObjects(clickable,false)[0];
  const next=hit?.object ?? null;
  if(next!==hoveredWorld){
    if(hoveredWorld) gsap.to(hoveredWorld.scale,{x:1,y:1,z:1,duration:.5,ease:'power3.out'});
    hoveredWorld=next;
    if(hoveredWorld) gsap.to(hoveredWorld.scale,{x:1.16,y:1.16,z:1.16,duration:.5,ease:'elastic.out(1,.5)'});
  }
}
canvas.addEventListener('click',()=>{if(hoveredWorld)openCaseStudy(hoveredWorld.userData.index)});

// ——— Case studies / portal transition --------------------------------------
const caseStudy=$('#caseStudy');
const cases=[
  {meta:'WEB · IMMERSIVE · 2026',title:'Hope Pixel',desc:'A living digital atelier built as architecture, not pages—an intimate creative space visitors can wander through.',role:'Creative direction, experience design, creative development',focus:'Spatial UI, dimensional storytelling, interaction'},
  {meta:'FILM · DIRECTION · 2026',title:'Walking With God',desc:'A lyrical visual study of faith, memory, and the moments when ordinary light feels sacred.',role:'Concept, direction, editing, visual design',focus:'Narrative atmosphere, image systems, post-production'},
  {meta:'COMMERCE · SYSTEMS · 2025—26',title:'Matuska Digital',desc:'A full digital ecosystem that turns a complex specialist catalog into a clearer, faster, more human shopping experience.',role:'Web design, UX, front-end systems, marketplace operations',focus:'Commerce architecture, conversion, automation'},
  {meta:'BRAND · PRINT · 2025',title:'Hope in Print',desc:'A creative practice built around one belief: design can make hope physical—something you can hold, share, and return to.',role:'Founder, designer, artist',focus:'Identity, print objects, emotional utility'}
];
function openCaseStudy(index){
  const c=cases[index]||cases[0];
  $('#caseMeta').textContent=c.meta;$('#caseTitle').textContent=c.title;$('#caseDescription').textContent=c.desc;$('#caseRole').textContent=c.role;$('#caseFocus').textContent=c.focus;
  document.body.classList.add('case-open'); caseStudy.showModal();
  gsap.fromTo('.case-study__visual',{clipPath:'circle(0% at 50% 50%)'},{clipPath:'circle(80% at 50% 50%)',duration:1.1,ease:'expo.inOut'});
  gsap.from('.case-study__copy > *',{opacity:0,y:25,duration:.8,stagger:.06,delay:.35,ease:'power3.out'});
  portalColor.set(worldData[index]?.color||palette.b);
}
function closeCase(){gsap.to(caseStudy,{opacity:0,duration:.35,onComplete:()=>{caseStudy.close();gsap.set(caseStudy,{opacity:1});document.body.classList.remove('case-open');}})}
$('#closeCaseStudy').addEventListener('click',closeCase);
caseStudy.addEventListener('click',e=>{if(e.target===caseStudy)closeCase()});
projectCards.forEach(card=>{
  const open=()=>openCaseStudy(+card.dataset.project);
  card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
});

// Small 2D portal canvas (fast, separate from main WebGL scene)
const portalCanvas=$('#portalCanvas'), pctx=portalCanvas.getContext('2d');
const portalColor=new THREE.Color(palette.b);let portalT=0;
function sizePortal(){portalCanvas.width=portalCanvas.clientWidth*dpr;portalCanvas.height=portalCanvas.clientHeight*dpr;}
function drawPortal(){
  if(!caseStudy.open)return; portalT+=.008; const w=portalCanvas.width,h=portalCanvas.height,cx=w/2,cy=h/2;
  pctx.fillStyle='#05030b';pctx.fillRect(0,0,w,h);pctx.save();pctx.translate(cx,cy);
  for(let i=42;i>0;i--){const t=i/42,r=Math.min(w,h)*(.04+t*.52);pctx.beginPath();for(let a=0;a<=Math.PI*2+.08;a+=.08){const wave=Math.sin(a*5+portalT*8+i*.3)*8*dpr*(1-t);const x=Math.cos(a)*(r+wave),y=Math.sin(a)*(r*.58+wave);a===0?pctx.moveTo(x,y):pctx.lineTo(x,y)}const col=portalColor.clone().lerp(new THREE.Color(0xffffff),1-t*.8);pctx.strokeStyle=`rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},${.02+(1-t)*.08})`;pctx.lineWidth=1.2*dpr;pctx.stroke()}
  pctx.restore();requestAnimationFrame(drawPortal);
}
caseStudy.addEventListener('close',()=>{});
const observer=new MutationObserver(()=>{if(caseStudy.open){sizePortal();drawPortal();}});observer.observe(caseStudy,{attributes:true,attributeFilter:['open']});

// ——— Generative ambient sound ----------------------------------------------
let audioCtx, master, analyser, audioData, soundEnabled=false;
function startSound(){
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  master=audioCtx.createGain(); analyser=audioCtx.createAnalyser(); analyser.fftSize=64; audioData=new Uint8Array(analyser.frequencyBinCount);
  master.gain.value=.0001; master.connect(analyser); analyser.connect(audioCtx.destination);
  [55,82.5,110].forEach((freq,i)=>{const osc=audioCtx.createOscillator();const gain=audioCtx.createGain();const filter=audioCtx.createBiquadFilter();osc.type=i===1?'sine':'triangle';osc.frequency.value=freq;gain.gain.value=.035/(i+1);filter.type='lowpass';filter.frequency.value=220+i*90;osc.connect(filter).connect(gain).connect(master);osc.start();});
  const lfo=audioCtx.createOscillator();const lfoGain=audioCtx.createGain();lfo.frequency.value=.08;lfoGain.gain.value=.018;lfo.connect(lfoGain).connect(master.gain);lfo.start();
  master.gain.exponentialRampToValueAtTime(.22,audioCtx.currentTime+1.5);
}
$('#soundToggle').addEventListener('click',async()=>{
  if(!soundEnabled){startSound();await audioCtx.resume();soundEnabled=true;master.gain.exponentialRampToValueAtTime(.22,audioCtx.currentTime+.7)}
  else{soundEnabled=false;master.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.5)}
  const btn=$('#soundToggle');btn.setAttribute('aria-pressed',soundEnabled);$('.sound-toggle__label').textContent=soundEnabled?'Sound on':'Sound off';
});

// Menu
$('#menuToggle').addEventListener('click',()=>{const p=$('#menuPanel'),open=p.classList.toggle('is-open');$('#menuToggle').setAttribute('aria-expanded',open)});
$$('#menuPanel a').forEach(a=>a.addEventListener('click',()=>{$('#menuPanel').classList.remove('is-open');$('#menuToggle').setAttribute('aria-expanded','false')}));

// ——— Render loop ------------------------------------------------------------
const clock=new THREE.Clock();
const tempPos=new THREE.Vector3(), tempLook=new THREE.Vector3(), forward=new THREE.Vector3();
let audioLevel=0;
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  pointer.x=THREE.MathUtils.lerp(pointer.x,pointer.tx,.045);pointer.y=THREE.MathUtils.lerp(pointer.y,pointer.ty,.045);
  const p=clamp01(journey.progress,0,1);
  cameraPath.getPointAt(p,tempPos); lookPath.getPointAt(Math.min(.999,p+.018),tempLook);
  const parallaxStrength=isMobile?.12:.34;
  camera.position.copy(tempPos);camera.position.x+=pointer.x*parallaxStrength;camera.position.y+=pointer.y*parallaxStrength;
  camera.lookAt(tempLook.x+pointer.x*.16,tempLook.y+pointer.y*.12,tempLook.z);

  // Butterfly flies just ahead, then lands at contact.
  camera.getWorldDirection(forward);
  const land=THREE.MathUtils.smoothstep(p,.87,.985);
  const target=tempPos.clone().add(forward.multiplyScalar(isMobile?3.7:5.1));
  target.x+=Math.sin(t*1.25)*(.32*(1-land));target.y+=.35+Math.cos(t*1.7)*(.22*(1-land));
  target.lerp(new THREE.Vector3(0,-.4,-84.8),land);
  butterfly.position.lerp(target,reducedMotion?1:.07);
  butterfly.lookAt(tempPos);butterfly.rotation.z=Math.sin(t*1.1)*.12*(1-land);
  const speedBoost=Math.min(scrollVelocity/3000,1);
  const idle=performance.now()-butterflyIdle>1200;
  const flap=(idle?.8:2.2+speedBoost*4.5);
  leftWing.rotation.y=Math.sin(t*flap)*(.55-speedBoost*.12);rightWing.rotation.y=-Math.sin(t*flap)*(.55-speedBoost*.12);
  butterfly.scale.setScalar(.48+speedBoost*.12);

  worlds.forEach((w,i)=>{
    w.group.rotation.y=t*(.075+i*.012);w.group.rotation.x=Math.sin(t*.22+i)*.08;
    w.core.rotation.x+=.0018;w.core.rotation.y+=.0025;w.wire.rotation.y-=.0016;
  });
  aboutWorld.rotation.y=t*.08;aboutCore.rotation.x=t*.12;
  contactWorld.rotation.y=t*.05;
  nebulaGroup.children.forEach((s,i)=>{s.material.opacity*=1;s.rotation.z=t*(.002+i*.0002)});

  if(soundEnabled&&analyser){analyser.getByteFrequencyData(audioData);audioLevel=audioData.reduce((a,b)=>a+b,0)/(audioData.length*255);}else audioLevel*=.93;
  starMat.uniforms.uTime.value=t;starMat.uniforms.uCursor.value.set(pointer.x,pointer.y);starMat.uniforms.uAudio.value=audioLevel;
  bloom.strength=(lowPower?.42:.72)+audioLevel*.55;
  key.intensity=42+audioLevel*35;rim.intensity=55+audioLevel*44;
  if(!isMobile)raycast();
  composer.render();
}
animate();

function resize(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,lowPower?1.35:1.8));renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<780?62:52;camera.updateProjectionMatrix();
  starMat.uniforms.uPixelRatio.value=Math.min(devicePixelRatio,lowPower?1.35:1.8);sizePortal();ScrollTrigger.refresh();
}
addEventListener('resize',resize,{passive:true});

// WebGL fallback
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('webgl-fallback')});
