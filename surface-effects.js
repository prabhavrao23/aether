import * as THREE from './vendor/three.module.js';

// Illustrative surface motion, not live solar measurements or a thermal map.
export const surfaceClock = { value: 0 };
const noise = `
float hash3(vec3 p){p=fract(p*.3183099+vec3(.17,.23,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise3(p)*.57+noise3(p*2.03)*.28+noise3(p*4.11)*.15;}
`;
const vertex=`varying vec2 vUv;varying vec3 vLocal;varying vec3 vNormalView;varying vec3 vEye;
void main(){vUv=uv;vLocal=normalize(position);vNormalView=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vEye=-p.xyz;gl_Position=projectionMatrix*p;}`;
export function solarMaterial(map){
 return new THREE.ShaderMaterial({uniforms:{uMap:{value:map},uTime:surfaceClock,uBurstPosition:{value:new THREE.Vector3(0,0,1)},uBurstStrength:{value:0}},vertexShader:vertex,fragmentShader:`
 uniform sampler2D uMap;uniform float uTime;uniform vec3 uBurstPosition;uniform float uBurstStrength;varying vec2 vUv;varying vec3 vLocal;varying vec3 vNormalView;varying vec3 vEye;
 ${noise}
 void main(){
  vec3 p=vLocal;float t=uTime*.11;
  float convection=fbm(p*22.+vec3(t*.3,-t*.4,t*.2));
  vec2 drift=vec2(sin(p.y*32.+t+convection*5.),cos(p.x*24.-t*.8+convection*4.))*.0018;
  vec3 tex=texture2D(uMap,vUv+drift).rgb;
  float mapped=dot(tex,vec3(.36,.48,.16));
  float grain=noise3(p*210.+vec3(t,-t*.6,t*.2));
  float cells=fbm(p*65.+convection*2.+vec3(t*.4));
  float heat=clamp(mapped*.65+cells*.3+grain*.13,0.,1.);
  vec3 color=mix(vec3(.27,.018,.001),vec3(1.,.32,.018),smoothstep(.06,.6,heat));
  color=mix(color,vec3(1.4,.91,.36),smoothstep(.53,.86,heat));
  float facing=max(dot(normalize(vNormalView),normalize(vEye)),0.);
  color*=.55+.45*pow(facing,.35);
  float activeRegion=exp((dot(p,uBurstPosition)-1.)*160.);
  color+=vec3(1.2,.49,.08)*activeRegion*uBurstStrength;
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
}
export function atmosphere(radius,color,strength=.45,isSun=false){
 const material=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uStrength:{value:strength},uTime:surfaceClock,uSolar:{value:isSun?1:0}},vertexShader:vertex,fragmentShader:`
 uniform vec3 uColor;uniform float uStrength;uniform float uTime;uniform float uSolar;varying vec3 vLocal;varying vec3 vNormalView;varying vec3 vEye;
 ${noise}
 void main(){float f=abs(dot(normalize(vNormalView),normalize(vEye)));float edge=pow(1.-f,3.5);float flow=fbm(vLocal*19.+vec3(uTime*.08,0.,-uTime*.04));float a=edge*uStrength*mix(1.,.55+flow*.85,uSolar);gl_FragColor=vec4(uColor,a);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});
 return new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),material);
}
export function animateCloudBands(material){
 material.onBeforeCompile=shader=>{
  shader.uniforms.surfaceTime=surfaceClock;
  shader.fragmentShader='uniform float surfaceTime;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
    vec2 cloudUv=vMapUv;
    cloudUv.x+=sin(cloudUv.y*70.)*sin(surfaceTime*.035)*.0015;
    vec4 sampledDiffuseColor=texture2D(map,cloudUv);
    diffuseColor*=sampledDiffuseColor;
  #endif`);
 };
 material.customProgramCacheKey=()=> 'aether-cloud-bands-v1';
}

export function solarCorona(radius){
 const material=new THREE.ShaderMaterial({uniforms:{uTime:surfaceClock},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float uTime;varying vec2 vUv;
 void main(){vec2 p=(vUv-.5)*3.2;float r=length(p);float a=atan(p.y,p.x);
 float rays=.78+.13*sin(a*31.+sin(a*11.-uTime*.17))+.09*sin(a*67.+uTime*.13);
 float halo=exp(-max(0.,r-1.)*10.)*(1.-smoothstep(1.16,1.6,r));
 float strength=halo*rays*.4;
 gl_FragColor=vec4(mix(vec3(1.,.12,.01),vec3(1.,.59,.16),halo),strength);
 #include <colorspace_fragment>
 }`,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
 return new THREE.Mesh(new THREE.PlaneGeometry(radius*3.2,radius*3.2),material);
}


// Small, occasional magnetic-loop-inspired eruptions; timing and placement are illustrative.
export function attachSolarBursts(group,radius,globe){
 const eruption=new THREE.Group();globe.add(eruption);eruption.visible=false;
 const curves=[],life={value:0};
 for(let strand=0;strand<4;strand++){
  const points=[];
  for(let i=0;i<=64;i++){
   const u=i/64,angle=u*Math.PI;
   points.push(new THREE.Vector3((u-.5)*radius*.24,Math.sin(angle)*radius*.018*(strand-1.5),radius*(Math.sqrt(1-Math.pow((u-.5)*.24,2)) + Math.sin(angle)*(.17+strand*.012))));
  }
  const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,radius*[.004,.007,.014,.025][strand],5,false);
  const arc=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:strand===0?0xffe3a1:0xff7626,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  arc.material.onBeforeCompile=shader=>{
   shader.uniforms.burstTime=surfaceClock;shader.uniforms.burstLife=life;
   shader.vertexShader='uniform float burstTime;uniform float burstLife;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    transformed.x+=sin(uv.x*3.14159)*sin(uv.x*19.+burstTime*2.)*${(radius*.004).toFixed(6)};
    transformed.z+=sin(uv.x*3.14159)*sin(burstLife*3.14159)*${(radius*.05).toFixed(6)};
   `);
  };
  arc.material.customProgramCacheKey=()=> 'solar-burst-'+radius;
  eruption.add(arc);curves.push(arc);
 }
 group.userData.bursts={eruption,curves,next:null,start:-100,duration:4,globe,life};
}
export function updateSolarBursts(group,time,camera){
 const state=group.userData.bursts;if(!state)return;
 if(state.next===null)state.next=time+2+Math.random()*3;
 if(time>=state.next){
  state.start=time;state.duration=3.5+Math.random()*2;
  state.next=time+state.duration+7+Math.random()*10;
  // Random active region in the visible hemisphere, in the rotating Sun's local frame.
  state.globe.updateWorldMatrix(true,false);
  const toward=state.globe.worldToLocal(camera.position.clone()).normalize();
  const phi=Math.random()*Math.PI*2,z=.06+Math.random()*.78,rad=Math.sqrt(1-z*z);
  const normal=new THREE.Vector3(rad*Math.cos(phi),rad*Math.sin(phi),z).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),toward));
  state.eruption.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  state.eruption.rotateZ(Math.random()*Math.PI*2);
  state.globe.material.uniforms.uBurstPosition.value.copy(normal);
 }
 const phase=(time-state.start)/state.duration;
 const strength=phase>=0&&phase<=1?Math.pow(Math.sin(phase*Math.PI),1.5):0;
 state.eruption.visible=strength>.002;state.life.value=Math.min(1,Math.max(0,phase));
 state.globe.material.uniforms.uBurstStrength.value=strength;
 for(let i=0;i<state.curves.length;i++)state.curves[i].material.opacity=strength*[.95,.32,.12,.045][i];
}
