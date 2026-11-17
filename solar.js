import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { surfaceClock, solarMaterial, atmosphere, animateCloudBands, solarCorona, attachSolarBursts, updateSolarBursts } from './surface-effects.js';

// Distances and sizes are deliberately compressed for classroom exploration.
// Period ratios are preserved; 1 Earth year takes 20 minutes of animation.
const bodies = [
 {name:'Sun',type:'Our star',size:5,map:'sun',description:'A glowing sphere of hot plasma. Its visible surface is about 5,500°C. Color and motion are enhanced here to reveal its changing texture.',fact:'Sunlight takes about eight minutes to reach Earth.',source:'sun/facts/'},
 {name:'Mercury',type:'Rocky planet',size:.85,distance:9,year:.241,map:'mercury',description:'A small, rocky world covered in craters, with almost no atmosphere to hold in heat.',fact:'A year on Mercury lasts just 88 Earth days.',source:'mercury/facts/'},
 {name:'Venus',type:'Rocky planet · thick atmosphere',size:1.35,distance:14,year:.615,map:'venus_atmosphere',description:'A rocky planet wrapped in thick clouds. This view shows its cloud tops; the solid surface is hidden underneath.',fact:'Venus is hotter than Mercury, even though it is farther from the Sun.',source:'venus/venus-facts/'},
 {name:'Earth',type:'Rocky planet · our home',size:1.45,distance:20,year:1,map:'earth_daymap',description:'Blue oceans, continents, and a thin atmosphere make our home a remarkable rocky world.',fact:'Earth is the only world where we have found life.',source:'earth/facts/'},
 {name:'Moon',type:'Earth’s natural satellite',size:.5,distance:3.2,year:.0748,map:'moon',description:'A rocky, cratered world that travels around Earth. Its dark plains were formed by ancient lava flows.',fact:'The Moon turns once per orbit, so the same side always faces Earth.',source:'moon/facts/'},
 {name:'Mars',type:'Rocky planet',size:1.1,distance:27,year:1.881,map:'mars',description:'A cold desert world with rusty soil, giant volcanoes, deep canyons, and polar ice.',fact:'Mars has Olympus Mons, the largest volcano in the solar system.',source:'mars/facts/'},
 {name:'Jupiter',type:'Gas giant',size:3.5,distance:40,year:11.86,map:'jupiter',description:'Bands of clouds wrap around this giant of hydrogen and helium. There is no solid surface to stand on.',fact:'Jupiter spins once in about ten hours—the shortest day of any planet.',source:'jupiter/jupiter-facts/'},
 {name:'Saturn',type:'Gas giant',size:2.9,distance:56,year:29.45,map:'saturn',description:'A pale, banded gas giant surrounded by rings made of countless pieces of ice and rock.',fact:'Saturn’s average density is lower than the density of water.',source:'saturn/facts/'},
 {name:'Uranus',type:'Ice giant',size:2.1,distance:73,year:84,map:'uranus',description:'A blue-green world with a deep atmosphere. Methane absorbs red light and gives it its cool color.',fact:'Uranus spins almost on its side, as if it were rolling around the Sun.',source:'uranus/facts/'},
 {name:'Neptune',type:'Ice giant',size:2.05,distance:89,year:164.8,map:'neptune',description:'A distant, cold world with methane in its atmosphere and powerful winds. This map enhances its blue color.',fact:'Neptune takes about 165 Earth years to circle the Sun.',source:'neptune/facts/'}
];
const $ = s => document.querySelector(s);
const overlay = document.createElement('section');
overlay.id='solar-view'; overlay.hidden=true; overlay.setAttribute('aria-label','Interactive Solar System');
overlay.innerHTML=`<div id="solar-stage"></div><header class="solar-header"><button id="solar-back">← GALAXY</button><div><span class="solar-eyebrow">ÆTHER / EXPLORE</span><h2 id="solar-title">The Solar System</h2></div><button id="solar-pause" aria-pressed="false">Ⅱ PAUSE</button></header><div id="solar-status" role="status"></div><div id="solar-labels"></div><div class="solar-tools"><button id="solar-out" aria-label="Zoom out">−</button><button id="solar-in" aria-label="Zoom in">+</button><button id="solar-home">RESET VIEW</button></div><article id="planet-card" hidden><span id="planet-type"></span><h2 id="planet-name"></h2><p id="planet-description"></p><p class="planet-fact"><span>✦ DID YOU KNOW?</span><span id="planet-fact"></span></p><a id="planet-source" target="_blank" rel="noopener">Explore with NASA ↗</a></article><footer class="solar-footer"><p id="solar-help">Drag to orbit · Scroll to zoom · Right-drag or two fingers to pan</p><nav id="planet-picker" aria-label="Explore a planet, Sun, or Moon"></nav><div class="solar-notes"><span>Illustrative sizes & distances · Animated orbits, not current positions</span><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Maps: Solar System Scope / CC BY 4.0</a></div></footer>`;
document.body.append(overlay);
const launch=document.createElement('button'); launch.id='solar-launch';launch.textContent='VIEW THE SOLAR SYSTEM ↗';$('#go').after(launch);
let renderer, scene, camera, controls, system, detail, detailLight, stars;
let active=false, selected=null, stopped=false, elapsed=0, last=0, raf=0, ready=false;
let savedCamera, savedTarget, pointerStart, transition=null;
let arrival=null;
function galaxyFlight(active,progress=0){document.dispatchEvent(new CustomEvent('aether-solar-flight',{detail:{active,progress}}));}
function finishArrival(){arrival=null;document.body.classList.remove('solar-arriving');galaxyFlight(true,1);if(controls){controls.enabled=true;controls.maxDistance=520;camera.position.set(0,34,48);controls.target.set(0,0,0);controls.update();}}
let detailTexture=null, detailRequest=0;
const hdMaps=new Set(['sun','mercury','earth_daymap','moon','mars','jupiter','saturn','venus_atmosphere']);
const objects=[], labels=[], textures=new Map(), raycaster=new THREE.Raycaster();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader=new THREE.TextureLoader();
function texture(name){
 if(!textures.has(name)){
  const t=loader.load(`assets/planets/${name}.${name==='saturn_ring_alpha'?'png':'jpg'}`,undefined,undefined,()=>{$('#solar-status').textContent='A planet map could not load. Reload to try again.'});
  t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.set(name,t);
 }
 return textures.get(name);
}
function planet(d, radius, closeup=false){
 const group=new THREE.Group();
 const material=d.name==='Sun'?solarMaterial(texture(d.map)):new THREE.MeshStandardMaterial({map:texture(d.map),roughness:d.name==='Earth'?.75:1,metalness:0});
 if(['Jupiter','Saturn','Venus','Neptune','Uranus'].includes(d.name))animateCloudBands(material);
 if(closeup&&['Mercury','Moon','Mars'].includes(d.name)){material.bumpMap=texture(d.map);material.bumpScale=radius*.0015;}
 const globe=new THREE.Mesh(new THREE.SphereGeometry(radius,closeup?160:96,closeup?112:64),material);
 globe.userData.body=d;group.add(globe); group.userData.globe=globe;
 if(d.name==='Uranus')globe.rotation.z=THREE.MathUtils.degToRad(98);
 if(d.name==='Earth'){
  globe.rotation.z=THREE.MathUtils.degToRad(23.4);
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.008,96,64),new THREE.MeshStandardMaterial({map:texture('earth_clouds'),alphaMap:texture('earth_clouds'),transparent:true,opacity:.8,depthWrite:false,roughness:1}));
  clouds.rotation.z=globe.rotation.z;group.add(clouds);group.userData.clouds=clouds;
 }
 const haloColors={Earth:0x368eff,Venus:0xeab76b,Mars:0xd98450,Jupiter:0xc6ae8e,Saturn:0xe6cd9f,Uranus:0x65c8d3,Neptune:0x397afa};
 if(haloColors[d.name])group.add(atmosphere(radius*1.018,haloColors[d.name],d.name==='Earth'?.5:.22));
 if(d.name==='Sun'){
  const corona=solarCorona(radius);group.add(corona);group.userData.corona=corona;attachSolarBursts(group,radius,globe);
 }
 if(closeup&&hdMaps.has(d.map))refineSurface(d,material);

 if(d.name==='Saturn'){
  const geometry=new THREE.RingGeometry(radius*1.28,radius*2.3,128);
  const pos=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,(Math.hypot(pos.getX(i),pos.getY(i))/radius-1.28)/1.02, .5);
  const ring=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture('saturn_ring_alpha'),side:THREE.DoubleSide,transparent:true,roughness:1,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.rotation.y=.45;ring.userData.body=d;group.add(ring);
 }
 return group;
}

// Only the selected object's large map is resident; the orbital view keeps lightweight maps.
function refineSurface(d,material){
 const request=detailRequest;
 $('#solar-status').textContent='Refining surface detail…';
 const high=loader.load(`assets/planets/hd/${d.map}.jpg`,()=>{
  if(request!==detailRequest){high.dispose();return;}
  detailTexture=high;
  if(d.name==='Sun')material.uniforms.uMap.value=high;
  else{material.map=high;if(material.bumpMap)material.bumpMap=high;material.needsUpdate=true;}
  $('#solar-status').textContent='';
 },undefined,()=>{if(request===detailRequest)$('#solar-status').textContent='Showing the standard map; the detailed map could not load.';high.dispose();});
 high.colorSpace=THREE.SRGBColorSpace;high.anisotropy=renderer.capabilities.getMaxAnisotropy();
}

function orbit(radius,parent){
 const points=Array.from({length:257},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2)*radius,0,Math.sin(i/256*Math.PI*2)*radius));
 parent.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x7d9ac6,transparent:true,opacity:.18})));
}
function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x02050e,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 $('#solar-stage').append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D Solar System. Drag to orbit; scroll or pinch to zoom.');
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(48,1,.05,40000);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=6;controls.maxDistance=520;controls.zoomSpeed=.8;controls.panSpeed=.8;
 system=new THREE.Group();scene.add(system);scene.add(new THREE.AmbientLight(0xadc6ef,.65));
 const sunlight=new THREE.PointLight(0xfff4df,3,0,0);system.add(sunlight);
 detail=new THREE.Group();detail.visible=false;scene.add(detail);
 detailLight=new THREE.DirectionalLight(0xfff6e8,2.5);detailLight.position.set(4,3,5);detailLight.visible=false;scene.add(detailLight);
 const coords=[];for(let i=0;i<2200;i++){const u=Math.random()*2-1,a=Math.random()*Math.PI*2,r=450+Math.random()*300;coords.push(r*Math.sqrt(1-u*u)*Math.cos(a),r*u,r*Math.sqrt(1-u*u)*Math.sin(a))}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xc4d5f5,size:.5,sizeAttenuation:true}));scene.add(stars);stars.visible=false;
 bodies.forEach((d,i)=>{
  const group=planet(d,d.size);system.add(group);objects.push({d,group,phase:i*1.83});
  if(d.distance&&d.name!=='Moon')orbit(d.distance,system);
  const button=document.createElement('button');button.className='solar-label';button.textContent=d.name;button.onclick=()=>select(d);$('#solar-labels').append(button);labels.push(button);
 });
 const moonPath=new THREE.Group();orbit(3.2,moonPath);system.add(moonPath);system.userData.moonPath=moonPath;
 renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()}});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(selected||!pointerStart||e.pointerId!==pointerStart.id||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6||performance.now()-pointerStart.time>450)return;
  const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
  const hit=raycaster.intersectObjects(objects.map(o=>o.group),true).find(h=>h.object.userData.body);if(hit)select(hit.object.userData.body);
 });
 renderer.domElement.addEventListener('pointercancel',()=>pointerStart=null);
 controls.addEventListener('start',()=>transition=null);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#solar-status').textContent='The 3D view was interrupted. Reload the page to restart it.'});
 ready=true;resize();overview(false);
}
function resize(){
 if(!ready)return;const width=$('#solar-stage').clientWidth,height=$('#solar-stage').clientHeight;
 if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
}
function moveCamera(position,target,animate=true){
 if(!animate||reduced){camera.position.copy(position);controls.target.copy(target);controls.update();transition=null;return}
 transition={start:performance.now(),from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone()};
}
function overview(restore=true){
 selected=null;system.visible=true;detail.visible=false;detailLight.visible=false;stars.visible=false;
 overlay.classList.remove('detail');$('#planet-card').hidden=true;$('#solar-labels').hidden=false;$('#solar-back').textContent='← GALAXY';$('#solar-title').textContent='The Solar System';$('#solar-help').textContent='Drag to orbit · Scroll to zoom · Right-drag or two fingers to pan';
 controls.enablePan=true;controls.minDistance=6;controls.maxDistance=520;
 resize();moveCamera(restore&&savedCamera?savedCamera:new THREE.Vector3(0,34,48),restore&&savedTarget?savedTarget:new THREE.Vector3(0,0,0),restore);
 document.querySelectorAll('#planet-picker button').forEach(b=>b.setAttribute('aria-pressed','false'));
}
function select(d){
 if(!ready)return;if(!selected){savedCamera=camera.position.clone();savedTarget=controls.target.clone()}
 selected=d;system.visible=false;detail.visible=true;detailLight.visible=true;stars.visible=false;
 while(detail.children.length){const old=detail.children[0];old.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose()});detail.remove(old)}
 detailRequest++;detailTexture?.dispose();detailTexture=null;$('#solar-status').textContent='';
 detail.add(planet(d,2.2,true));overlay.classList.add('detail');$('#planet-card').hidden=false;$('#solar-labels').hidden=true;
 $('#solar-title').textContent=d.name;$('#solar-back').textContent='← SOLAR SYSTEM';$('#planet-type').textContent=d.type;$('#planet-name').textContent=d.name;$('#planet-description').textContent=d.description;$('#planet-fact').textContent=d.fact;$('#planet-source').href='https://science.nasa.gov/'+d.source;$('#solar-help').textContent='Drag to see every side · Scroll or pinch to zoom';
 controls.enablePan=false;controls.minDistance=d.name==='Saturn'?6:3.1;controls.maxDistance=18;
 resize();const distance=d.name==='Saturn'?12:7.7;moveCamera(new THREE.Vector3(0,1,distance*Math.max(1,.9/camera.aspect)),new THREE.Vector3(),false);
 document.querySelectorAll('#planet-picker button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===d.name)));
}
function updateOrbits(){
 for(const o of objects){
  if(o.d.distance&&o.d.name!=='Moon'){const a=o.phase+elapsed*Math.PI*2/(1200*o.d.year);o.group.position.set(Math.cos(a)*o.d.distance,0,Math.sin(a)*o.d.distance)}
  o.group.userData.globe.rotation.y=elapsed*.025;
 }
 const earth=objects.find(o=>o.d.name==='Earth').group.position,moon=objects.find(o=>o.d.name==='Moon');const a=elapsed*Math.PI*2/(1200*.0748);
 moon.group.position.copy(earth).add(new THREE.Vector3(Math.cos(a)*3.2,Math.sin(a)*.28,Math.sin(a)*3.2));moon.group.userData.globe.rotation.y=-a;system.userData.moonPath.position.copy(earth);
}
function frame(now){
 if(!active)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!stopped)elapsed+=dt;
 surfaceClock.value=reduced?0:elapsed;
 if(arrival!==null){
  if(!stopped)arrival+=dt;
  const progress=Math.min(1,arrival/9);
  galaxyFlight(true,progress);
  // Approach the planets physically, through the same persistent galaxy background.
  const ease=progress*progress*(3-2*progress);
  camera.position.set(0,34,48).multiplyScalar(Math.exp((1-ease)*6));
  controls.target.set(0,0,0);
  if(progress===1)finishArrival();
 }
 updateOrbits();
 for(const o of objects)if(o.group.userData.clouds)o.group.userData.clouds.rotation.y=elapsed*.029;
 if(selected&&detail.children[0].userData.clouds&&!stopped&&!reduced)detail.children[0].userData.clouds.rotation.y+=dt*.105;
 if(selected&&!stopped&&!reduced)detail.children[0].userData.globe.rotation.y+=dt*.09;
 if(transition){const f=Math.min(1,(now-transition.start)/1300),e=f*f*(3-2*f);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,e);if(f===1)transition=null}
 controls.update();
 for(const o of objects)if(o.group.userData.corona)o.group.userData.corona.quaternion.copy(camera.quaternion);
 if(selected&&detail.children[0].userData.corona)detail.children[0].userData.corona.quaternion.copy(camera.quaternion);
 if(!reduced&&!stopped){
  if(selected)updateSolarBursts(detail.children[0],elapsed,camera);
  else for(const o of objects)updateSolarBursts(o.group,elapsed,camera);
 }
 renderer.render(scene,camera);
 if(!selected){objects.forEach((o,i)=>{const v=o.group.position.clone();v.y+=o.d.size+1;v.project(camera);const b=labels[i];b.hidden=v.z>1||v.z< -1||Math.abs(v.x)>1||Math.abs(v.y)>1;b.style.transform=`translate(-50%,-50%) translate(${(v.x*.5+.5)*renderer.domElement.clientWidth}px,${(-v.y*.5+.5)*renderer.domElement.clientHeight}px)`})}
 raf=requestAnimationFrame(frame);
}
function close(){finishArrival();galaxyFlight(false);active=false;cancelAnimationFrame(raf);overlay.hidden=true;document.body.classList.remove('solar-open');$('main').inert=false;launch.focus()}
launch.onclick=()=>{
 overlay.hidden=false;document.body.classList.add('solar-open','solar-arriving');$('main').inert=true;active=true;arrival=0;galaxyFlight(true,0);
 stopped=$('#pause').getAttribute('aria-pressed')==='true';$('#solar-pause').textContent=stopped?'▷ RESUME':'Ⅱ PAUSE';$('#solar-pause').setAttribute('aria-pressed',String(stopped));
 if(!stopped&&$('#sound').getAttribute('aria-pressed')==='true')$('#music').play().catch(()=>{});
 try{if(!ready)init();else{savedCamera=null;savedTarget=null;overview(false);}controls.enabled=false;controls.maxDistance=30000;if(reduced)finishArrival();last=0;raf=requestAnimationFrame(frame);$('#solar-back').focus()}
 catch(error){finishArrival();$('#solar-status').textContent='This browser could not start 3D graphics. Please try a browser with WebGL enabled.';console.error(error)}
};
$('#solar-back').onclick=()=>selected?overview():close();
$('#solar-pause').onclick=()=>{$('#pause').click();stopped=$('#pause').getAttribute('aria-pressed')==='true';$('#solar-pause').textContent=stopped?'▷ RESUME':'Ⅱ PAUSE';$('#solar-pause').setAttribute('aria-pressed',String(stopped))};
$('#solar-home').onclick=()=>{if(selected)select(selected);else{savedCamera=null;savedTarget=null;overview()}};
function zoom(f){if(!ready)return;transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*f,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update()}
$('#solar-in').onclick=()=>zoom(.8);$('#solar-out').onclick=()=>zoom(1.25);
for(const d of bodies){const b=document.createElement('button');b.textContent=d.name;b.setAttribute('aria-pressed','false');b.onclick=()=>select(d);$('#planet-picker').append(b)}
addEventListener('resize',resize);addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();selected?overview():close()}});

// Prepare buffers and shaders while the landing page is idle, before the flight starts.
function prepareSolarView(){
 if(ready||active)return;
 try{init();renderer.compile(scene,camera);}catch(error){console.warn('Solar preview preparation deferred until launch.',error);}
}
if('requestIdleCallback' in window)requestIdleCallback(prepareSolarView,{timeout:1500});
else setTimeout(prepareSolarView,400);
