import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ── Butterfly catastrophe ─────────────────────────────────────────────
// Potential: V(x) = x^6/6 + ax^4/4 + cx^2/2 + dx  (b=0, symmetric)
// Equilibrium surface: dV/dx = x^5 + ax^3 + cx + d = 0
// → d = -(x^5 + ax^3 + cx)
// Stability: d²V/dx² = 5x^4 + 3ax^2 + c > 0
// a = -1.5 opens the double well and creates three stable sheets

const BA = -1.5;
const SC = 0.50, SX = 1.10, SD = 0.048;
const C_MIN = -1.3, C_MAX = 2.05;
const X_MIN = -2.0, X_MAX = 2.0;
const NC = 88, NX = 110;
const FOLD_C_MAX = 1.0125; // above this: single global minimum, no folds

function pt(c, x) {
  const d = -(Math.pow(x,5) + BA*Math.pow(x,3) + c*x);
  return new THREE.Vector3(c*SC, x*SX, d*SD);
}

function stab2(c, x) {
  return 5*Math.pow(x,4) + 3*BA*Math.pow(x,2) + c;
}

function foldData(c) {
  const disc = 9*BA*BA - 20*c; // 20.25 - 20c
  if (disc < 0) return null;
  const s = Math.sqrt(Math.max(0, disc));
  const u1 = (-3*BA + s)/10;
  const u2 = (-3*BA - s)/10;
  return {
    xOuter: u1 > 1e-8 ? Math.sqrt(u1) : null,
    xInner: u2 > 1e-8 ? Math.sqrt(u2) : null,
  };
}

// Sheet: 1=upper(genuine), -1=lower(false/heresies), 2=pocket, 0=unstable
function sheetOf(c, x) {
  if (stab2(c, x) <= 0) return 0;
  const fd = foldData(c);
  if (!fd || !fd.xOuter) return 1;          // c > FOLD_C_MAX: always stable upper
  if (x >  fd.xOuter) return 1;
  if (x < -fd.xOuter) return -1;
  if (fd.xInner && Math.abs(x) < fd.xInner) return 2;
  return 0;
}

function surfColor(c, x) {
  const sh = sheetOf(c, x);
  if (sh === 1) {
    const t = Math.max(0, Math.min(1, (x-0.85)/1.1));
    return new THREE.Color().setHSL(0.60 - t*0.06, 0.72, 0.08 + t*0.31);
  }
  if (sh === -1) {
    // colour gradient: low-c (humanity extracted) → high-c (transcendence extracted)
    const tc = Math.max(0, Math.min(1, (c - C_MIN)/(C_MAX - C_MIN)));
    return new THREE.Color().setHSL(0.03 + tc*0.06, 0.80, 0.06 + Math.max(0,(-x-0.85)/1.1)*0.19);
  }
  if (sh === 2) return new THREE.Color().setHSL(0.11, 0.78, 0.09);
  return new THREE.Color(0.030, 0.025, 0.038);
}

function nodeHex(t) {
  return { P:0xd8a828, A:0x4488cc, F:0xcc2828, H:0xcc5522, K:0xc89020 }[t] || 0x888888;
}

const ZOOM_MIN = 3.5, ZOOM_MAX = 18.0;

// ── Node data ─────────────────────────────────────────────────────────
// Node positions verified on correct sheets (see working notes)
const NODES = {
  A1:  { label:"Bounded Form",                 sub:"Being requires determination",          t:"A", c:-0.80, x:1.42,
         desc:"To be something is to be bounded. Loss of form is not liberation — it is ceasing to be what one was. Witnesses: peras/apeiron (Greek), maryādā (Sanskrit), gvul (Hebrew), hadd (Arabic), jiè (Chinese), grens (Dutch/Slavic)." },
  A2:  { label:"Definition as Boundary",       sub:"Knowability requires form",             t:"A", c:-0.40, x:1.55,
         desc:"To define a thing and to mark its essential limit are the same act. The horizon is not where the world ends — it is where the world becomes visible as a world. Witnesses: horismos/horizein (Greek), hadd (Arabic), finis/definire (Latin), zhèngmíng (Chinese)." },
  A3:  { label:"Holy as Separated",            sub:"Sacrality requires distinction",        t:"A", c:0.15,  x:1.65,
         desc:"What is most real and most good is what has been most definitively set apart. Three fully independent arrivals: kadosh (Hebrew), kekkai (Japanese), haram (Arabic). What is most sacred is most definitively bounded." },
  A4:  { label:"Normative as Formal",          sub:"Good = actualization of form",          t:"A", c:0.60,  x:1.55,
         desc:"The good for a thing is the actualization of what it essentially is. Violation of form is simultaneously disorder and wrong. Witnesses: dharma, ṛta/anṛta, maryādā, zhèngmíng, hudud Allah." },
  A5:  { label:"Encounter Requires Boundary",  sub:"The limit as condition of relation",    t:"A", c:0.85,  x:1.42,
         desc:"Two surfaces pressed flat against each other fuse. The boundary preserves integrity so that meeting, not merger, can occur. Witnesses: ma (Japanese), confinium (Latin), limen. Register: Buber's I-Thou, Levinas's face, von Balthasar on difference as condition of love." },
  F1:  { label:"Dissolution as Liberation",    sub:"The boundary is a prison",              t:"F", c:-0.80, x:-1.42,
         desc:"Extracts the contemplative summit of Advaita/Daoism and applies it as a political program. Severs transcendence from what it transcends toward. Contemporary: gender dissolution ideologies, posthumanism, self-creation as sovereign good. Mirror on the lower sheet of Docetism: both extract the bounded/human pole." },
  F2:  { label:"Pure Form / No Matter",        sub:"The Gnostic inversion",                 t:"F", c:-0.40, x:-1.55,
         desc:"Takes the priority of form and severs the hylomorphic unity. Form becomes a pattern floating free of material instantiation. Gnosticism with a CPU. Contemporary: information paradigm, transhumanism, inner-pattern gender self-identification. Mirrors Apollinarianism on the lower sheet." },
  F3:  { label:"Naming as Violence",           sub:"Definition as oppression",              t:"F", c:0.15,  x:-1.65,
         desc:"Universalizes the pathology of definition: all names are impositions, all boundaries are power structures. Contemporary: radical constructivism, demolition of natural categories as political act." },
  F4:  { label:"The One Absorbs All",          sub:"Totality swallows the individual",      t:"F", c:0.60,  x:-1.55,
         desc:"Locates the unity of being horizontally in a finite collective rather than vertically in the transcendent ground. Contemporary: totalitarianism, platform absorption of persons, dissolution of subsidiarity." },
  F5:  { label:"Boundaries as Convention",     sub:"Nominalism",                            t:"F", c:0.85,  x:-1.42,
         desc:"From epistemological humility to the ontological claim that reality has no joints of its own. Genealogical root: Ockham → Descartes → information paradigm → administrative constructivism. Mirrors Arianism on the lower sheet: both extract the transcendent/universal pole." },
  // ── Christological heresies (lower sheet) ──────────────────
  // Low-c side: humanity extracted — mirrors F1/F2
  DOC: { label:"Docetism",                     sub:"Humanity illusory",                     t:"H", c:-0.72, x:-1.52,
         desc:"Christ only appeared to have a body — the suffering, cross, and wounds were illusion. The most radical extraction of the human pole: the divine cannot genuinely enter the bounded condition. Origins in Gnosticism; opposed already in John's letters. Shares its region with F1 (Dissolution as Liberation): both dissolve the bounded/human form, one in Christology, the other in anthropology." },
  APO: { label:"Apollinarianism",              sub:"Humanity partial",                      t:"H", c:-0.22, x:-1.38,
         desc:"Christ had a human body and animal soul, but the divine Logos replaced the human rational mind. Partial humanity — the highest faculty missing. Condemned at Constantinople (381). Gregory of Nazianzus: what is not assumed is not healed. Shares its region with F2 (Pure Form / No Matter)." },
  MNT: { label:"Monothelitism",               sub:"Human will removed",                    t:"H", c:0.12,  x:-1.17,
         desc:"Christ has two natures but only one will — the divine. The human will is extracted. Condemned at Constantinople III (681). Maximus the Confessor died for the position that Christ's human will freely conformed to the divine — without which the Redemption is not a free human act." },
  // High-c side: transcendence extracted — mirrors F4/F5
  ARI: { label:"Arianism",                     sub:"Divinity reduced — not same substance", t:"H", c:0.88,  x:-1.12,
         desc:"Christ is the highest of creatures — of similar but not the same substance as the Father. The transcendence pole extracted. Condemned at Nicaea (325). Still numerically the most widespread heresy in history. Shares its region with F5 (Nominalism): both extract the transcendent/universal pole — nominalism from reality in general, Arianism from Christ specifically." },
  ADO: { label:"Adoptionism",                  sub:"Divinity conferred, not possessed",     t:"H", c:0.74,  x:-1.06,
         desc:"Christ was a human being so perfectly obedient that God adopted him as Son — at the Baptism or Resurrection. Divinity is status conferred, not nature possessed. A milder form of the same extraction as Arianism." },
  // ── Pocket heresies (locally stable, globally unstable) ────
  MPH: { label:"Monophysitism",                sub:"Natures fused — drop in ocean",         t:"K", c:0.50,  x:0.22,
         desc:"After the Incarnation Christ has a single fused nature — the human absorbed into the divine like a drop of water in the ocean. Claims to preserve both natures while the distinction has internally collapsed. The pocket position: locally stable (defended by whole councils, inhabited by whole churches), globally unstable — any serious pressure on the humanity question tips it into full Docetism. Condemned at Chalcedon (451)." },
  NES: { label:"Nestorianism",                 sub:"Person split — natures unjoined",       t:"K", c:0.50,  x:-0.18,
         desc:"Christ is two persons loosely conjoined rather than one person with two natures. Preserves both natures correctly described; the union is merely moral, not ontological. Mary: Christotokos but not Theotokos. The pocket position: locally stable, globally unstable — pressure on the divine question tips it toward Arianism. Condemned at Ephesus (431). Maximus the Confessor saw it as producing a Christ who saves by example, not by nature." },
};

// ── Component ─────────────────────────────────────────────────────────
export default function ButterflyAttractor() {
  const mountRef = useRef(null);
  const [active, setActive] = useState(null);
  const [zoom, setZoom] = useState(9.5);
  const zoomRef = useRef(9.5);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    const el = mountRef.current;
    const W = el.clientWidth || 900;
    const H = Math.max(480, Math.min(610, window.innerHeight * 0.68));

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070810);
    const camera = new THREE.PerspectiveCamera(44, W/H, 0.1, 80);
    camera.position.set(0.6, 1.1, zoomRef.current);
    camera.lookAt(0, 0, 0);

    const pivot = new THREE.Group();
    pivot.rotation.x = -0.16;
    pivot.rotation.y = 0.26;
    scene.add(pivot);

    scene.add(new THREE.AmbientLight(0x18202e, 2.1));
    const d1 = new THREE.DirectionalLight(0xe0d8c0, 1.3);
    d1.position.set(1,4,6); scene.add(d1);

    const d2 = new THREE.DirectionalLight(0x304878, 0.8);
    d2.position.set(-5, -2, 3);
    scene.add(d2);

    const d3 = new THREE.DirectionalLight(0x200818, 0.6);
    d3.position.set(1, -5, -3);
    scene.add(d3);

    // ── Surface geometry ──────────────────────────────────────
    const vCount = (NC+1)*(NX+1);
    const posArr = new Float32Array(vCount*3);
    const colArr = new Float32Array(vCount*3);
    for (let i=0; i<=NC; i++) {
      for (let j=0; j<=NX; j++) {
        const c = C_MIN + (C_MAX-C_MIN)*(i/NC);
        const x = X_MIN + (X_MAX-X_MIN)*(j/NX);
        const v = pt(c,x);
        const col = surfColor(c,x);
        const idx = (i*(NX+1)+j)*3;
        posArr[idx]=v.x; posArr[idx+1]=v.y; posArr[idx+2]=v.z;
        colArr[idx]=col.r; colArr[idx+1]=col.g; colArr[idx+2]=col.b;
      }
    }
    const idxArr=[];
    for (let i=0;i<NC;i++) for (let j=0;j<NX;j++) {
      const a=i*(NX+1)+j, b=(i+1)*(NX+1)+j;
      const c=(i+1)*(NX+1)+(j+1), d2=i*(NX+1)+(j+1);
      idxArr.push(a,b,c, a,c,d2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr,3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colArr,3));
    geo.setIndex(idxArr);
    geo.computeVertexNormals();
    pivot.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      vertexColors:true, side:THREE.DoubleSide,
      shininess:34, specular:new THREE.Color(0.05,0.09,0.14)
    })));

    // ── Fold lines ────────────────────────────────────────────
    // Outer folds (gold) — cusp lines bounding upper/lower sheets
    for (const sgn of [1,-1]) {
      const pts=[];
      for (let k=0;k<=150;k++) {
        const c = C_MIN + (FOLD_C_MAX-C_MIN)*(k/150);
        const fd=foldData(c);
        if (!fd?.xOuter) continue;
        pts.push(pt(c, sgn*fd.xOuter));
      }
      if (pts.length>1) {
        pivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({color:0xd4a843, linewidth:2})));
        pivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({color:0xfff080, transparent:true, opacity:0.20})));
      }
    }
    // Inner folds (amber) — pocket boundaries
    for (const sgn of [1,-1]) {
      const pts=[];
      for (let k=0;k<=80;k++) {
        const c = FOLD_C_MAX*(k/80);
        const fd=foldData(c);
        if (!fd?.xInner) continue;
        pts.push(pt(c, sgn*fd.xInner));
      }
      if (pts.length>1)
        pivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({color:0xc07820, transparent:true, opacity:0.82})));
    }
    // Special points: cusp (c=0, x=0) and butterfly tips (c=FOLD_C_MAX, x=±√0.45)
    [pt(0,0), pt(FOLD_C_MAX, Math.sqrt(0.45)), pt(FOLD_C_MAX, -Math.sqrt(0.45))].forEach(p => {
      const sp=new THREE.Mesh(new THREE.SphereGeometry(0.055,10,10),
        new THREE.MeshBasicMaterial({color:0xf0d060}));
      sp.position.copy(p); pivot.add(sp);
    });

    // ── Nodes ─────────────────────────────────────────────────
    const meshes={}, npos={};
    Object.entries(NODES).forEach(([id,d]) => {
      const p=pt(d.c,d.x);
      npos[id]=p.clone();
      const r = 0.092;
      const col=new THREE.Color(nodeHex(d.t));
      const m=new THREE.Mesh(
        new THREE.SphereGeometry(r,18,18),
        new THREE.MeshPhongMaterial({color:col,emissive:col.clone().multiplyScalar(0.50),shininess:90})
      );
      m.position.copy(p); m.userData.id=id;
      pivot.add(m); meshes[id]=m;
    });

    // ── Flux lines ─────────────────────────────────────────────
    // Genuine → False (dashed red, extraction across outer fold)
    [['A1','F1'],['A2','F2'],['A3','F3'],['A4','F4'],['A5','F5']].forEach(([g,f])=>{
      const s=NODES[g], e=NODES[f];
      for(let k=0;k<22;k+=2){
        pivot.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            pt(s.c+(e.c-s.c)*k/22, s.x+(e.x-s.x)*k/22),
            pt(s.c+(e.c-s.c)*(k+1)/22, s.x+(e.x-s.x)*(k+1)/22)
          ]),
          new THREE.LineBasicMaterial({color:0xaa2020,transparent:true,opacity:0.40})));
      }
    });
    // Genuine → Pocket heresies (amber dashed, extraction across inner fold)
    [['A3','MPH'],['A4','NES']].forEach(([g,k])=>{
      const s=NODES[g], e=NODES[k];
      for(let i=0;i<18;i+=2){
        pivot.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            pt(s.c+(e.c-s.c)*i/18, s.x+(e.x-s.x)*i/18),
            pt(s.c+(e.c-s.c)*(i+1)/18, s.x+(e.x-s.x)*(i+1)/18)
          ]),
          new THREE.LineBasicMaterial({color:0xb07810,transparent:true,opacity:0.38})));
      }
    });
    // Pocket → lower sheet (gravity arrows showing instability)
    [['MPH','DOC'],['NES','ARI']].forEach(([pk,ls])=>{
      const s=NODES[pk], e=NODES[ls];
      for(let i=0;i<12;i+=2){
        pivot.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            pt(s.c+(e.c-s.c)*i/12, s.x+(e.x-s.x)*i/12),
            pt(s.c+(e.c-s.c)*(i+1)/12, s.x+(e.x-s.x)*(i+1)/12)
          ]),
          new THREE.LineBasicMaterial({color:0x988010,transparent:true,opacity:0.28})));
      }
    });

    // ── Sprites ────────────────────────────────────────────────
    const LC={P:'#f0d070',A:'#80b8e0',F:'#e08888',H:'#e0a070',K:'#d4a830'};
    const SC2={P:'#c8a030',A:'#507898',F:'#905050',H:'#885030',K:'#8a6010'};
    Object.entries(NODES).forEach(([id,d])=>{
      const cv=document.createElement('canvas');
      cv.width=400; cv.height=78;
      const ctx=cv.getContext('2d');
      ctx.font=`bold 14px 'Palatino Linotype',Palatino,serif`;
      ctx.fillStyle=LC[d.t]||'#aaa';
      ctx.fillText(`${id}  ${d.label}`,8,22);
      ctx.font=`italic 12px 'Palatino Linotype',Palatino,serif`;
      ctx.fillStyle=SC2[d.t]||'#888';
      ctx.fillText(d.sub,8,44);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({
        map:new THREE.CanvasTexture(cv), transparent:true, depthWrite:false
      }));
      sp.scale.set(2.05,0.40,1);
      const p=npos[id].clone();
      if (d.t==='P'||d.t==='A') p.y+=0.44;
      else if (d.t==='K') { p.y+=(d.x>0?0.36:-0.36); p.x+=0.28; }
      else p.y-=0.42;
      p.z+=0.06;
      sp.position.copy(p); pivot.add(sp);
    });

    // ── Axis hint sprites ─────────────────────────────────────
    [[`humanity extracted ←`, [-0.85,-2.62,-0.1], '#3a2010'],
     [`→ transcendence extracted`, [1.0,-2.62,-0.1], '#3a2010'],
     [`state (x)`, [-2.25, 0, 0], '#2a3040'],
    ].forEach(([txt,pos,fill])=>{
      const cv=document.createElement('canvas'); cv.width=360; cv.height=44;
      const ctx=cv.getContext('2d');
      ctx.font=`italic 12px 'Palatino Linotype',Palatino,serif`;
      ctx.fillStyle=fill; ctx.textAlign='center';
      ctx.fillText(txt,180,26);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({
        map:new THREE.CanvasTexture(cv), transparent:true, depthWrite:false, opacity:0.55
      }));
      sp.scale.set(1.9,0.23,1);
      sp.position.set(...pos); pivot.add(sp);
    });

    // ── Interaction ────────────────────────────────────────────
    let drag=false, px=0, py=0;
    const onDown=e=>{ if(e.button!==0) return; drag=true; px=e.clientX; py=e.clientY; };
    const onMove=e=>{
      if(!drag) return;
      pivot.rotation.y+=(e.clientX-px)*0.007;
      pivot.rotation.x=Math.max(-1.2,Math.min(1.2,pivot.rotation.x+(e.clientY-py)*0.007));
      px=e.clientX; py=e.clientY;
    };
    const onUp=()=>{ drag=false; };
    const onClick=e=>{
      const rect=el.getBoundingClientRect();
      const mv=new THREE.Vector2(
        ((e.clientX-rect.left)/W)*2-1,
        -((e.clientY-rect.top)/H)*2+1
      );
      const ray=new THREE.Raycaster();
      ray.setFromCamera(mv,camera);
      const hits=ray.intersectObjects(Object.values(meshes));
      if(hits.length){ const id=hits[0].object.userData.id; setActive(p=>p===id?null:id); }
    };
    const onWheel=e=>{
      e.preventDefault();
      setZoom(p=>Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,p+e.deltaY*0.015)));
    };
    let lastPinch=null;
    const onTS=e=>{ if(e.touches.length===2) lastPinch=null; };
    const onTM=e=>{
      if(e.touches.length===2){
        const dx=e.touches[0].clientX-e.touches[1].clientX;
        const dy=e.touches[0].clientY-e.touches[1].clientY;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(lastPinch!==null) setZoom(p=>Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,p-(dist-lastPinch)*0.04)));
        lastPinch=dist;
      }
    };
    el.addEventListener('mousedown',onDown);
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
    el.addEventListener('click',onClick);
    el.addEventListener('wheel',onWheel,{passive:false});
    el.addEventListener('touchstart',onTS,{passive:true});
    el.addEventListener('touchmove',onTM,{passive:true});

    let raf;
    const tick=()=>{
      raf=requestAnimationFrame(tick);
      if(!drag) pivot.rotation.y+=0.0009;
      camera.position.z+=(zoomRef.current-camera.position.z)*0.09;
      renderer.render(scene,camera);
    };
    tick();
    return ()=>{
      cancelAnimationFrame(raf);
      el.removeEventListener('mousedown',onDown);
      window.removeEventListener('mousemove',onMove);
      window.removeEventListener('mouseup',onUp);
      el.removeEventListener('click',onClick);
      el.removeEventListener('wheel',onWheel);
      el.removeEventListener('touchstart',onTS);
      el.removeEventListener('touchmove',onTM);
      geo.dispose(); renderer.dispose();
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const nd = active ? NODES[active] : null;
  const btnBase = { background:'#0f0e18', border:'1px solid #2a2010', color:'#6a5a30',
    width:30, height:30, borderRadius:3, fontSize:17, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center' };

  return (
    <div style={{ background:'#070810',
      fontFamily:"'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif",
      color:'#b0a070', minHeight:'100vh', userSelect:'none' }}>

      {/* Header */}
      <div style={{textAlign:'center', padding:'18px 0 4px'}}>
        <div style={{fontSize:9,letterSpacing:'0.34em',color:'#3a2e12',textTransform:'uppercase',marginBottom:5}}>
          The Erosion of Boundaries
        </div>
        <h1 style={{fontSize:20,fontWeight:'normal',color:'#d8c888',margin:0,letterSpacing:'0.06em'}}>
          Taxonomy of Attractors
        </h1>
        <div style={{fontSize:9,color:'#2e2610',letterSpacing:'0.18em',marginTop:4}}>
          Butterfly Catastrophe Surface &nbsp;·&nbsp; v2 &nbsp;·&nbsp; Andrea Cortis, PhD
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',
        gap:'6px 15px',fontSize:10,color:'#3a3018',marginBottom:3,
        padding:'0 12px',letterSpacing:'0.08em'}}>
        <span>● <span style={{color:'#4488cc'}}>Genuine attractor</span></span>
        <span>● <span style={{color:'#cc2828'}}>False attractor</span></span>
        <span>● <span style={{color:'#cc5522'}}>Christological heresy</span></span>
        <span>● <span style={{color:'#c89020'}}>Pocket heresy</span></span>
        <span>— <span style={{color:'#d4a843'}}>Outer fold line</span></span>
        <span>— <span style={{color:'#c07820'}}>Inner fold (pocket)</span></span>
        <span>- - <span style={{color:'#b07810'}}>Pocket flux</span></span>
      </div>

      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14,marginBottom:4}}>
        <span style={{fontSize:9,color:'#1e1a0c',letterSpacing:'0.10em'}}>
          drag · scroll to zoom · click nodes
        </span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button style={btnBase} onClick={()=>setZoom(z=>Math.max(ZOOM_MIN,z-1.4))}>−</button>
          <span style={{fontSize:9,color:'#2a2010',width:28,textAlign:'center'}}>
            {Math.round(((ZOOM_MAX-zoom)/(ZOOM_MAX-ZOOM_MIN))*100)}%
          </span>
          <button style={btnBase} onClick={()=>setZoom(z=>Math.min(ZOOM_MAX,z+1.4))}>+</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={mountRef} style={{width:'100%', cursor:'grab'}} />

      {/* Info panel */}
      <div style={{margin:'5px 16px 20px', minHeight:100,
        padding:nd?'16px 22px':0, background:nd?'#0b0c18':'transparent',
        border:nd?'1px solid #201c0e':'1px solid transparent',
        borderRadius:2, transition:'all 0.15s'}}>
        {nd ? (
          <>
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:9}}>
              <span style={{fontSize:9,letterSpacing:'0.24em',textTransform:'uppercase',
                color:active==='P'?'#d4a843':nd.t==='A'?'#4488cc':nd.t==='F'?'#cc2828':nd.t==='H'?'#cc5522':'#c89020'}}>
                {active}
              </span>
              <span style={{fontSize:16,color:'#d8c888'}}>{nd.label}</span>
              <span style={{fontSize:11,color:'#3a3018',fontStyle:'italic'}}>{nd.sub}</span>
            </div>
            <p style={{fontSize:12,lineHeight:1.88,color:'#78694a',margin:0}}>{nd.desc}</p>
          </>
        ) : (
          <div style={{textAlign:'center',color:'#1c1808',fontSize:9,
            padding:'16px 0',letterSpacing:'0.18em',textTransform:'uppercase'}}>
            Select a node to read
          </div>
        )}
      </div>
    </div>
  );
}
