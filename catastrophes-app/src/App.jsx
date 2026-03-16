import { useState, useCallback, useRef, useEffect, useMemo, Component } from "react";

const CATS = [
  { id:"fold",        name:"Fold",               codim:1, corank:1, color:"#f97316", potential:"x\u00B3/3 + cx" },
  { id:"cusp",        name:"Cusp",               codim:2, corank:1, color:"#00cc60", potential:"x\u2074/4 + bx\u00B2/2 + ax" },
  { id:"swallowtail", name:"Swallowtail",        codim:3, corank:1, color:"#a78bfa", potential:"x\u2075/5 + ax\u00B3/3 + bx\u00B2/2 + cx" },
  { id:"butterfly",   name:"Butterfly",          codim:4, corank:1, color:"#e879f9", potential:"x\u2076/6 + ax\u2074/4 + cx\u00B2/2 + dx" },
  { id:"elliptic",    name:"Elliptic Umbilic",   codim:3, corank:2, color:"#fb7185", potential:"x\u00B3 \u2212 3xy\u00B2 + c(x\u00B2+y\u00B2) \u2212 ax \u2212 by" },
  { id:"hyperbolic",  name:"Hyperbolic Umbilic", codim:3, corank:2, color:"#34d399", potential:"x\u00B3 + y\u00B3 + cxy \u2212 ax \u2212 by" },
  { id:"parabolic",   name:"Parabolic Umbilic",  codim:4, corank:2, color:"#fbbf24", potential:"x\u00B2y + y\u2074 + cx\u00B2 + dy\u00B2 \u2212 ax \u2212 by" },
];

// ── math ─────────────────────────────────────────────────────────────────────
function bisectRoots(f, lo, hi) {
  const N = 2000, pts = [];
  let prev = f(lo);
  for (let i = 1; i <= N; i++) {
    const x = lo + (hi - lo) * i / N;
    const cur = f(x);
    if (prev * cur < 0) {
      let a = x - (hi - lo) / N, b = x;
      for (let j = 0; j < 60; j++) {
        const mid = (a + b) / 2;
        f(a) * f(mid) <= 0 ? (b = mid) : (a = mid);
      }
      const root = (a + b) / 2;
      if (isFinite(root) && !pts.some(q => Math.abs(q - root) < 0.04)) pts.push(root);
    }
    prev = cur;
  }
  return pts;
}

// ── svg helpers ───────────────────────────────────────────────────────────────
function mkPts(pts) {
  return pts.filter(p => isFinite(p.x) && isFinite(p.y)).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function Axes({ toS, W, H, xTicks, yTicks, xLabel, yLabel }) {
  const o = toS(0, 0);
  return (
    <g>
      {xTicks.map(v => { const p = toS(v, 0); return <line key={"xg"+v} x1={p.x} y1={0} x2={p.x} y2={H} stroke="#111c2e" strokeWidth={0.5}/>; })}
      {yTicks.map(v => { const p = toS(0, v); return <line key={"yg"+v} x1={0} y1={p.y} x2={W} y2={p.y} stroke="#111c2e" strokeWidth={0.5}/>; })}
      <line x1={0} y1={o.y} x2={W} y2={o.y} stroke="#1e3347" strokeWidth={0.8}/>
      <line x1={o.x} y1={0} x2={o.x} y2={H} stroke="#1e3347" strokeWidth={0.8}/>
      <text x={W-4} y={o.y-4} fill="#253d52" fontSize={9} textAnchor="end" fontFamily="monospace">{xLabel}</text>
      <text x={o.x+4} y={12} fill="#253d52" fontSize={9} fontFamily="monospace">{yLabel}</text>
      {xTicks.filter(v => v !== 0).map(v => { const p = toS(v,0); return <text key={"xl"+v} x={p.x} y={o.y+11} fill="#1a2b3c" fontSize={7} textAnchor="middle" fontFamily="monospace">{v}</text>; })}
      {yTicks.filter(v => v !== 0).map(v => { const p = toS(0,v); return <text key={"yl"+v} x={o.x-4} y={p.y+3} fill="#1a2b3c" fontSize={7} textAnchor="end" fontFamily="monospace">{v}</text>; })}
    </g>
  );
}

// ── shared ui ─────────────────────────────────────────────────────────────────
function Nav({ active, setActive }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #111e2d", width:"100%", maxWidth:760, overflowX:"auto" }}>
      {CATS.map(c => {
        const on = c.id === active;
        return (
          <button key={c.id} onClick={() => setActive(c.id)}
            style={{ background:"none", border:"none", borderBottom: on ? `2px solid ${c.color}` : "2px solid transparent",
              padding:"9px 13px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontFamily:"monospace", fontSize:8, color: on ? c.color : "#1a2b3c", letterSpacing:1, textTransform:"uppercase" }}>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function PageHeader({ cat }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end",
      padding:"14px 0 12px", borderBottom:"1px solid #0c1825", marginBottom:16 }}>
      <div>
        <div style={{ fontSize:8, letterSpacing:3, color:"#1a2b3c", textTransform:"uppercase", marginBottom:4, fontFamily:"monospace" }}>
          codim {cat.codim} · corank {cat.corank}
        </div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:"#dde6f0", fontWeight:400 }}>{cat.name}</div>
      </div>
      <div style={{ fontFamily:"monospace", fontSize:16, color:cat.color, textAlign:"right", fontWeight:600, letterSpacing:0.5 }}>V = {cat.potential}</div>
    </div>
  );
}

function Panel({ children, title }) {
  return (
    <div style={{ background:"#090f1a", border:"1px solid #18293d", borderRadius:2, padding:14 }}>
      <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2, color:"#1a2b3c", marginBottom:8, textTransform:"uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

function StatusBar({ color, lit, text }) {
  return (
    <div style={{ width:"100%", padding:"8px 14px", background:"#060c14",
      border:`1px solid ${lit ? color+"44" : "#18293d"}`,
      borderRadius:2, fontFamily:"monospace", fontSize:9, color: lit ? color : "#3a5570", letterSpacing:0.5 }}>
      {text}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
      <span style={{ fontFamily:"monospace", fontSize:8, color:"#1e3347", width:10 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} style={{ flex:1, accentColor:color }}/>
      <span style={{ fontFamily:"monospace", fontSize:8, color, width:44, textAlign:"right" }}>{Number(value).toFixed(2)}</span>
    </div>
  );
}

function Placeholder({ cat }) {
  return (
    <div style={{ height:280, display:"flex", alignItems:"center", justifyContent:"center",
      background:"#060c14", border:"1px solid #0c1825", borderRadius:2,
      fontFamily:"monospace", fontSize:9, color:"#1a2b3c", letterSpacing:2 }}>
      INTERACTIVE — COMING SOON
    </div>
  );
}

// ── FOLD ─────────────────────────────────────────────────────────────────────
function FoldPage() {
  const [c, setC] = useState(-0.8);
  const COL = "#f97316";
  const W=340, H=280, BW=280, BH=280;
  const xR=[-2.4,2.4], vR=[-2.8,3.2], cR=[-2.2,0.6];

  const toS = useCallback((x,v) => ({ x:((x-xR[0])/(xR[1]-xR[0]))*W, y:H-((v-vR[0])/(vR[1]-vR[0]))*H }), []);
  const toB = useCallback((x,cv) => ({ x:((x-xR[0])/(xR[1]-xR[0]))*BW, y:BH-((cv-cR[0])/(cR[1]-cR[0]))*BH }), []);

  const crits = useMemo(() => {
    if (c >= 0) return [];
    const xc = Math.sqrt(-c);
    return [
      { x:-xc, v:(-xc)**3/3+c*(-xc), stable:true  },
      { x: xc, v:  xc**3/3+c*  xc,   stable:false },
    ];
  }, [c]);

  const potPts = useMemo(() => {
    const pts = [];
    for (let i=0; i<=600; i++) {
      const x = xR[0]+(xR[1]-xR[0])*i/600, v = x**3/3+c*x;
      if (v >= vR[0]-0.3 && v <= vR[1]+0.3) pts.push(toS(x,v));
    }
    return pts;
  }, [c, toS]);

  const bifS = useMemo(() => { const pts=[]; for(let i=0;i<=200;i++){const x=0.01+i/200*2.2;pts.push(toB(x,-x*x));} return pts; }, [toB]);
  const bifU = useMemo(() => { const pts=[]; for(let i=0;i<=200;i++){const x=-(0.01+i/200*2.2);pts.push(toB(x,-x*x));} return pts; }, [toB]);

  return (
    <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
      <Panel title="Potential  V(x) = x\u00B3/3 + cx">
        <svg width={W} height={H} style={{ display:"block" }}>
          <Axes toS={toS} W={W} H={H} xTicks={[-2,-1,0,1,2]} yTicks={[-2,-1,0,1,2,3]} xLabel="x" yLabel="V"/>
          <polyline points={mkPts(potPts)} fill="none" stroke={COL} strokeWidth={2.2} strokeLinejoin="round"/>
          {crits.map((p,i) => {
            const sp = toS(p.x, p.v);
            return p.stable
              ? <g key={i}><circle cx={sp.x} cy={sp.y} r={6} fill={COL} opacity={0.9}/><circle cx={sp.x} cy={sp.y} r={2} fill="#fff"/></g>
              : <g key={i}><circle cx={sp.x} cy={sp.y} r={5} fill="none" stroke="#ef4444" strokeWidth={1.5}/></g>;
          })}
          <text x={5} y={H-5} fill="#1a2b3c" fontSize={8} fontFamily="monospace">c = {c.toFixed(3)}</text>
        </svg>
        <Slider label="c" min={-2.2} max={0.5} step={0.01} value={c} onChange={e => setC(parseFloat(e.target.value))} color={COL}/>
      </Panel>
      <Panel title="Bifurcation Diagram  (x* vs c)">
        <svg width={BW} height={BH} style={{ display:"block" }}>
          <Axes toS={toB} W={BW} H={BH} xTicks={[-2,-1,0,1,2]} yTicks={[-2,-1,0]} xLabel="x*" yLabel="c"/>
          <line x1={0} y1={toB(0,c).y} x2={BW} y2={toB(0,c).y} stroke={COL} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.35}/>
          <polyline points={mkPts(bifS)} fill="none" stroke={COL} strokeWidth={2}/>
          <polyline points={mkPts(bifU)} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,3"/>
          <circle cx={toB(0,0).x} cy={toB(0,0).y} r={5} fill={COL} opacity={0.9}/>
          <text x={toB(0,0).x+7} y={toB(0,0).y+4} fill={COL} fontSize={8} fontFamily="monospace">fold</text>
          {crits.map((p,i) => { const bp=toB(p.x,c); return p.stable ? <circle key={i} cx={bp.x} cy={bp.y} r={5} fill={COL} opacity={0.8}/> : <circle key={i} cx={bp.x} cy={bp.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5}/>; })}
        </svg>
      </Panel>
      <StatusBar color={COL} lit={c<0}
        text={c < 0 ? `TWO critical points — stable min x=${crits.find(p=>p.stable)?.x?.toFixed(3)}, unstable max x=${crits.find(p=>!p.stable)?.x?.toFixed(3)}` : "NO critical points — the stable state has ceased to exist. Drag c below 0 to restore."}/>
    </div>
  );
}

// ── CUSP ─────────────────────────────────────────────────────────────────────
function CuspPage() {
  const [ctrl, setCtrl] = useState({ a:0.3, b:-1.8 });
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevCount = useRef(2);
  const svgRef = useRef(null);
  const COL = "#00cc60";
  const CC = ["#fbbf24","#38bdf8"];
  const aR=[-2.6,2.6], bR=[-3.6,0.9], xR=[-3.2,3.2], vR=[-3.5,6.5];
  const CW=310, CH=270, PW=360, PH=270;

  const cToS = useCallback((a,b) => ({ x:((a-aR[0])/(aR[1]-aR[0]))*CW, y:CH-((b-bR[0])/(bR[1]-bR[0]))*CH }), []);
  const sToC = useCallback((sx,sy) => ({
    a: Math.max(aR[0], Math.min(aR[1], aR[0]+(sx/CW)*(aR[1]-aR[0]))),
    b: Math.max(bR[0], Math.min(bR[1], bR[0]+((CH-sy)/CH)*(bR[1]-bR[0])))
  }), []);
  const pToS = useCallback((x,v) => ({ x:((x-xR[0])/(xR[1]-xR[0]))*PW, y:PH-((v-vR[0])/(vR[1]-vR[0]))*PH }), []);

  const { a, b } = ctrl;

  const critPts = useMemo(() => {
    const dV  = x => x**3 + b*x + a;
    const d2V = x => 3*x**2 + b;
    return bisectRoots(dV, xR[0], xR[1]).filter(x => isFinite(x)).map(x => ({ x, v:x**4/4+b*x**2/2+a*x, stable:d2V(x)>0 })).filter(p => isFinite(p.v));
  }, [a, b]);

  const minima = useMemo(() => critPts.filter(p=>p.stable),  [critPts]);
  const maxima = useMemo(() => critPts.filter(p=>!p.stable), [critPts]);
  const inside = minima.length >= 2;

  useEffect(() => {
    if (prevCount.current === 2 && minima.length === 1) { setFlash(true); setTimeout(() => setFlash(false), 700); }
    prevCount.current = minima.length;
  }, [minima.length]);

  const cusp = useMemo(() => {
    const R=[], L=[], tip=cToS(0,0);
    for (let i=0; i<=400; i++) { const t=(i/400)*2.8; R.push(cToS(2*t**3,-3*t**2)); L.push(cToS(-2*t**3,-3*t**2)); }
    const Lr = [...L].reverse();
    return {
      r: `M ${tip.x},${tip.y} ` + R.map(p=>`L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
      l: `M ${tip.x},${tip.y} ` + L.map(p=>`L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
      fill: `M ${tip.x},${tip.y} ` + R.map(p=>`L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " " + Lr.map(p=>`L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z",
    };
  }, [cToS]);

  const potLine = useMemo(() => {
    const pts=[];
    for (let i=0; i<=700; i++) { const x=xR[0]+(xR[1]-xR[0])*i/700, v=x**4/4+b*x**2/2+a*x; if(v>=vR[0]-0.5&&v<=vR[1]+0.5) pts.push(pToS(x,v)); }
    return pts;
  }, [a, b, pToS]);

  const getCtrl = useCallback((e,rect) => sToC(CW*(e.clientX-rect.left)/rect.width, CH*(e.clientY-rect.top)/rect.height), [sToC]);
  const onDown  = useCallback(e => { e.preventDefault(); setDragging(true); setCtrl(getCtrl(e, svgRef.current.getBoundingClientRect())); }, [getCtrl]);
  useEffect(() => {
    const mv = e => { if (dragging && svgRef.current) setCtrl(getCtrl(e, svgRef.current.getBoundingClientRect())); };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [dragging, getCtrl]);

  const cp = cToS(a, b);

  return (
    <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
      <Panel title="Control Space (a, b) — drag">
        <svg ref={svgRef} width={CW} height={CH} style={{ display:"block", cursor:"crosshair", userSelect:"none" }} onMouseDown={onDown}>
          <Axes toS={cToS} W={CW} H={CH} xTicks={[-2,-1,0,1,2]} yTicks={[-3,-2,-1,0]} xLabel="a" yLabel="b"/>
          <path d={cusp.fill} fill="#061410" opacity={0.95}/>
          <path d={cusp.r}    fill="none" stroke={COL} strokeWidth={5} opacity={0.07}/>
          <path d={cusp.l}    fill="none" stroke={COL} strokeWidth={5} opacity={0.07}/>
          <path d={cusp.r}    fill="none" stroke={COL} strokeWidth={1.5}/>
          <path d={cusp.l}    fill="none" stroke={COL} strokeWidth={1.5}/>
          <circle cx={cp.x} cy={cp.y} r={18} fill={inside ? "#fbbf24" : "#3b5268"} opacity={0.06}/>
          <circle cx={cp.x} cy={cp.y} r={8}  fill={inside ? "#fbbf24" : "#3a5570"} opacity={0.85}/>
          <circle cx={cp.x} cy={cp.y} r={3}  fill="#f8fafc" opacity={0.9}/>
          <text x={5} y={CH-5} fill="#1a2b3c" fontSize={8} fontFamily="monospace">a={a.toFixed(3)} b={b.toFixed(3)}</text>
        </svg>
      </Panel>
      <div style={{ background:"#090f1a", border:`1px solid ${flash?"#ef4444":"#18293d"}`, borderRadius:2, padding:14, transition:"border-color 0.15s", boxShadow:flash?"0 0 18px #ef444430":"none" }}>
        <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2, color:"#1a2b3c", marginBottom:8, textTransform:"uppercase" }}>Potential Landscape V(x)</div>
        <svg width={PW} height={PH} style={{ display:"block" }}>
          <Axes toS={pToS} W={PW} H={PH} xTicks={[-2,-1,0,1,2]} yTicks={[-2,0,2,4,6]} xLabel="x" yLabel="V"/>
          {minima.map((m,i) => { let xl=xR[0],xr=xR[1]; maxima.forEach(mx=>{if(mx.x<m.x)xl=Math.max(xl,mx.x);if(mx.x>m.x)xr=Math.min(xr,mx.x);}); const p1=pToS(xl,vR[0]),p2=pToS(xr,vR[0]); return <rect key={i} x={p1.x} y={0} width={Math.max(0,p2.x-p1.x)} height={PH} fill={CC[i%2]} opacity={0.04}/>; })}
          <polyline points={mkPts(potLine)} fill="none" stroke="#c8d8e8" strokeWidth={2.2} strokeLinejoin="round"/>
          {maxima.map((m,i) => { const p=pToS(m.x,m.v); if(!isFinite(p.x)||!isFinite(p.y)) return null; return <g key={i}><circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#ef4444" strokeWidth={1.5}/></g>; })}
          {minima.map((m,i) => { const p=pToS(m.x,m.v), col=CC[i%2], lbl=i===0?"A":"B"; if(!isFinite(p.x)||!isFinite(p.y)) return null; return <g key={i}><circle cx={p.x} cy={p.y} r={6} fill={col} opacity={0.9}/><circle cx={p.x} cy={p.y} r={2.5} fill="#fff"/><text x={p.x} y={p.y-14} fill={col} fontSize={8} textAnchor="middle" fontFamily="monospace">{lbl}</text></g>; })}
          {flash && <rect x={0} y={0} width={PW} height={PH} fill="#ef4444" opacity={0.07}/>}
        </svg>
      </div>
      <StatusBar color={COL} lit={inside}
        text={inside ? `BISTABLE — A x=${minima[0]?.x?.toFixed(3)}, B x=${minima[1]?.x?.toFixed(3)} — cross the green locus to annihilate one` : `MONOSTABLE — x=${minima[0]?.x?.toFixed(3) ?? "--"} — drag into the cusp to bifurcate`}/>
    </div>
  );
}

// ── SWALLOWTAIL ───────────────────────────────────────────────────────────────
function SwallowtailPage() {
  const [a, setA] = useState(-1.5);
  const [ctrl, setCtrl] = useState({ b:-1.0, c:3.5 });
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);
  const COL="#a78bfa", CC=["#fbbf24","#a78bfa","#38bdf8"];
  const xR=[-2.8,2.8], vR=[-5,8], bR=[-10,10], cR=[-1,13];
  const PW=340, PH=280, DW=320, DH=280;

  const pToS = useCallback((x,v) => ({ x:((x-xR[0])/(xR[1]-xR[0]))*PW, y:PH-((v-vR[0])/(vR[1]-vR[0]))*PH }), []);
  const dToS = useCallback((bv,cv) => ({ x:((bv-bR[0])/(bR[1]-bR[0]))*DW, y:DH-((cv-cR[0])/(cR[1]-cR[0]))*DH }), []);
  const sToD = useCallback((sx,sy) => ({
    b: Math.max(bR[0], Math.min(bR[1], bR[0]+(sx/DW)*(bR[1]-bR[0]))),
    c: Math.max(cR[0], Math.min(cR[1], cR[0]+((DH-sy)/DH)*(cR[1]-cR[0])))
  }), []);

  const { b: bv, c: cv } = ctrl;

  const critPts = useMemo(() => {
    const dV  = x => x**4 + a*x**2 + bv*x + cv;
    const d2V = x => 4*x**3 + 2*a*x + bv;
    return bisectRoots(dV, xR[0], xR[1]).filter(x => isFinite(x)).map(x => ({ x, v:x**5/5+a*x**3/3+bv*x**2/2+cv*x, stable:d2V(x)>0 })).filter(p => isFinite(p.v));
  }, [a, bv, cv]);

  const minima = useMemo(() => critPts.filter(p=>p.stable),  [critPts]);
  const maxima = useMemo(() => critPts.filter(p=>!p.stable), [critPts]);

  const potPts = useMemo(() => {
    const pts=[];
    for(let i=0;i<=700;i++){const x=xR[0]+(xR[1]-xR[0])*i/700,v=x**5/5+a*x**3/3+bv*x**2/2+cv*x;if(v>=vR[0]-0.5&&v<=vR[1]+0.5)pts.push(pToS(x,v));}
    return pts;
  }, [a, bv, cv, pToS]);

  const foldCurve = useMemo(() => {
    const pts=[];
    for(let i=0;i<=500;i++){const t=-1.8+(i/500)*3.6;pts.push(dToS(-4*t**3-2*a*t, 3*t**4+a*t**2));}
    return pts;
  }, [a, dToS]);

  const getCtrl = useCallback((e,rect) => sToD(DW*(e.clientX-rect.left)/rect.width, DH*(e.clientY-rect.top)/rect.height), [sToD]);
  const onDown  = useCallback(e => { e.preventDefault(); setDragging(true); setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect())); }, [getCtrl]);
  useEffect(() => {
    const mv = e => { if(dragging&&svgRef.current) setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect())); };
    const up = () => setDragging(false);
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return () => { window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
  }, [dragging, getCtrl]);

  const cp = dToS(bv, cv), nMin = minima.length;

  return (
    <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
      <Panel title="Potential">
        <svg width={PW} height={PH} style={{display:"block"}}>
          <Axes toS={pToS} W={PW} H={PH} xTicks={[-2,-1,0,1,2]} yTicks={[-4,-2,0,2,4,6]} xLabel="x" yLabel="V"/>
          {minima.map((m,i)=>{let xl=xR[0],xr=xR[1];maxima.forEach(mx=>{if(mx.x<m.x)xl=Math.max(xl,mx.x);if(mx.x>m.x)xr=Math.min(xr,mx.x);});const p1=pToS(xl,vR[0]),p2=pToS(xr,vR[0]);return <rect key={i} x={p1.x} y={0} width={Math.max(0,p2.x-p1.x)} height={PH} fill={CC[i%3]} opacity={0.04}/>;  })}
          <polyline points={mkPts(potPts)} fill="none" stroke="#c8d8e8" strokeWidth={2} strokeLinejoin="round"/>
          {maxima.map((m,i)=>{const p=pToS(m.x,m.v);if(!isFinite(p.x)||!isFinite(p.y)||p.y<-20||p.y>PH+20)return null;return <g key={i}><circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#ef4444" strokeWidth={1.5}/></g>;})}
          {minima.map((m,i)=>{const p=pToS(m.x,m.v),col=CC[i%3],lbl=["A","B","C"][i];if(!isFinite(p.x)||!isFinite(p.y))return null;return <g key={i}><circle cx={p.x} cy={p.y} r={6} fill={col} opacity={0.9}/><circle cx={p.x} cy={p.y} r={2.5} fill="#fff"/><text x={p.x} y={p.y-13} fill={col} fontSize={8} textAnchor="middle" fontFamily="monospace">{lbl}</text></g>;})}
        </svg>
        <Slider label="a" min={-3} max={0} step={0.05} value={a} onChange={e=>setA(parseFloat(e.target.value))} color={COL}/>
      </Panel>
      <Panel title="Control Space (b,c) — drag">
        <svg ref={svgRef} width={DW} height={DH} style={{display:"block",cursor:"crosshair",userSelect:"none"}} onMouseDown={onDown}>
          <Axes toS={dToS} W={DW} H={DH} xTicks={[-8,-4,0,4,8]} yTicks={[0,4,8,12]} xLabel="b" yLabel="c"/>
          <polyline points={mkPts(foldCurve)} fill="none" stroke={COL} strokeWidth={6} opacity={0.07}/>
          <polyline points={mkPts(foldCurve)} fill="none" stroke={COL} strokeWidth={2}/>
          <circle cx={cp.x} cy={cp.y} r={8} fill={nMin===3?COL:"#3a5570"} opacity={0.85}/>
          <circle cx={cp.x} cy={cp.y} r={3} fill="#f8fafc" opacity={0.9}/>
        </svg>
      </Panel>
      <StatusBar color={COL} lit={nMin>=2}
        text={nMin===3 ? `TRI-STABLE — A/B/C at x=${minima.map(m=>m.x.toFixed(2)).join(", ")}` : nMin===2 ? `BISTABLE — x=${minima.map(m=>m.x.toFixed(2)).join(", ")}` : `MONOSTABLE — x=${minima[0]?.x?.toFixed(2)??"--"} — set a=-1.5, drag into the locus`}/>
    </div>
  );
}

// ── BUTTERFLY ─────────────────────────────────────────────────────────────────
function ButterflyPage() {
  const [a, setA] = useState(-2.0);
  const [b, setB] = useState(0.0);
  const [ctrl, setCtrl] = useState({ c:-2.0, d:0.5 });
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);
  const COL="#e879f9", CC=["#fbbf24","#e879f9","#38bdf8"];
  const xR=[-2.8,2.8], vR=[-6,10], cR=[-14,5], dR=[-10,10];
  const PW=340, PH=280, DW=320, DH=280;

  const pToS = useCallback((x,v) => ({ x:((x-xR[0])/(xR[1]-xR[0]))*PW, y:PH-((v-vR[0])/(vR[1]-vR[0]))*PH }), []);
  const dToS = useCallback((c2,d2) => ({ x:((c2-cR[0])/(cR[1]-cR[0]))*DW, y:DH-((d2-dR[0])/(dR[1]-dR[0]))*DH }), []);
  const sToD = useCallback((sx,sy) => ({
    c: Math.max(cR[0], Math.min(cR[1], cR[0]+(sx/DW)*(cR[1]-cR[0]))),
    d: Math.max(dR[0], Math.min(dR[1], dR[0]+((DH-sy)/DH)*(dR[1]-dR[0])))
  }), []);

  const { c: cv, d: dv } = ctrl;

  const critPts = useMemo(() => {
    const dV  = x => x**5 + a*x**3 + b*x**2 + cv*x + dv;
    const d2V = x => 5*x**4 + 3*a*x**2 + 2*b*x + cv;
    return bisectRoots(dV, xR[0], xR[1]).filter(x => isFinite(x)).map(x => ({ x, v:x**6/6+a*x**4/4+b*x**3/3+cv*x**2/2+dv*x, stable:d2V(x)>0 })).filter(p => isFinite(p.v));
  }, [a, b, cv, dv]);

  const minima = useMemo(() => critPts.filter(p=>p.stable),  [critPts]);
  const maxima = useMemo(() => critPts.filter(p=>!p.stable), [critPts]);

  const potPts = useMemo(() => {
    const pts=[];
    for(let i=0;i<=700;i++){const x=xR[0]+(xR[1]-xR[0])*i/700,v=x**6/6+a*x**4/4+b*x**3/3+cv*x**2/2+dv*x;if(v>=vR[0]-0.5&&v<=vR[1]+0.5)pts.push(pToS(x,v));}
    return pts;
  }, [a, b, cv, dv, pToS]);

  const foldCurve = useMemo(() => {
    const pts=[];
    for(let i=0;i<=600;i++){const t=-1.5+(i/600)*3.0;pts.push(dToS(-5*t**4-3*a*t**2-2*b*t, 4*t**5+2*a*t**3+b*t**2));}
    return pts;
  }, [a, b, dToS]);

  const getCtrl = useCallback((e,rect) => sToD(DW*(e.clientX-rect.left)/rect.width, DH*(e.clientY-rect.top)/rect.height), [sToD]);
  const onDown  = useCallback(e => { e.preventDefault(); setDragging(true); setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect())); }, [getCtrl]);
  useEffect(() => {
    const mv = e => { if(dragging&&svgRef.current) setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect())); };
    const up = () => setDragging(false);
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return () => { window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
  }, [dragging, getCtrl]);

  const cp = dToS(cv, dv), nMin = minima.length;

  return (
    <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
      <Panel title="Potential">
        <svg width={PW} height={PH} style={{display:"block"}}>
          <Axes toS={pToS} W={PW} H={PH} xTicks={[-2,-1,0,1,2]} yTicks={[-4,-2,0,2,4,6,8]} xLabel="x" yLabel="V"/>
          {minima.map((m,i)=>{let xl=xR[0],xr=xR[1];maxima.forEach(mx=>{if(mx.x<m.x)xl=Math.max(xl,mx.x);if(mx.x>m.x)xr=Math.min(xr,mx.x);});const p1=pToS(xl,vR[0]),p2=pToS(xr,vR[0]);return <rect key={i} x={p1.x} y={0} width={Math.max(0,p2.x-p1.x)} height={PH} fill={CC[i%3]} opacity={0.04}/>;  })}
          <polyline points={mkPts(potPts)} fill="none" stroke="#c8d8e8" strokeWidth={2} strokeLinejoin="round"/>
          {maxima.map((m,i)=>{const p=pToS(m.x,m.v);if(!isFinite(p.x)||!isFinite(p.y)||p.y<-20||p.y>PH+20)return null;return <g key={i}><circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#ef4444" strokeWidth={1.5}/></g>;})}
          {minima.map((m,i)=>{const p=pToS(m.x,m.v),col=CC[i%3],lbl=["A","B","C"][i];if(!isFinite(p.x)||!isFinite(p.y))return null;return <g key={i}><circle cx={p.x} cy={p.y} r={6} fill={col} opacity={0.9}/><circle cx={p.x} cy={p.y} r={2.5} fill="#fff"/><text x={p.x} y={p.y-13} fill={col} fontSize={8} textAnchor="middle" fontFamily="monospace">{lbl}</text></g>;})}
        </svg>
        <Slider label="a" min={-3} max={0} step={0.05} value={a} onChange={e=>setA(parseFloat(e.target.value))} color={COL}/>
        <Slider label="b" min={-2.5} max={2.5} step={0.05} value={b} onChange={e=>setB(parseFloat(e.target.value))} color={COL}/>
      </Panel>
      <Panel title="Control Space (c,d) — drag">
        <svg ref={svgRef} width={DW} height={DH} style={{display:"block",cursor:"crosshair",userSelect:"none"}} onMouseDown={onDown}>
          <Axes toS={dToS} W={DW} H={DH} xTicks={[-12,-8,-4,0,4]} yTicks={[-8,-4,0,4,8]} xLabel="c" yLabel="d"/>
          <polyline points={mkPts(foldCurve)} fill="none" stroke={COL} strokeWidth={6} opacity={0.07}/>
          <polyline points={mkPts(foldCurve)} fill="none" stroke={COL} strokeWidth={2}/>
          <circle cx={cp.x} cy={cp.y} r={8} fill={nMin===3?COL:"#3a5570"} opacity={0.85}/>
          <circle cx={cp.x} cy={cp.y} r={3} fill="#f8fafc" opacity={0.9}/>
        </svg>
      </Panel>
      <StatusBar color={COL} lit={nMin>=2}
        text={nMin===3 ? `TRI-STABLE — butterfly pocket — A/B/C at x=${minima.map(m=>m.x.toFixed(2)).join(", ")}` : nMin===2 ? `BISTABLE — x=${minima.map(m=>m.x.toFixed(2)).join(", ")}` : `MONOSTABLE — x=${minima[0]?.x?.toFixed(2)??"--"} — try a=-2, drag (c,d) into the fold curve`}/>
    </div>
  );
}

// ── ELLIPTIC UMBILIC ──────────────────────────────────────────────────────────
function drawHeatmap(canvas, f, xR, yR, vMin, vMax) {
  const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  const img = ctx.createImageData(W, H);
  for (let px=0; px<W; px++) for (let py=0; py<H; py++) {
    const x = xR[0]+(px/(W-1))*(xR[1]-xR[0]), y = yR[1]-(py/(H-1))*(yR[1]-yR[0]);
    let t = (f(x,y)-vMin)/(vMax-vMin); t = Math.max(0,Math.min(1,t));
    let r,g,bb;
    if (t<0.5){const s=t*2;r=Math.round(5+s*10);g=Math.round(15+s*90);bb=Math.round(40+s*80);}
    else{const s=(t-0.5)*2;r=Math.round(15+s*220);g=Math.round(105+s*110);bb=Math.round(120-s*80);}
    const idx=(py*W+px)*4; img.data[idx]=r;img.data[idx+1]=g;img.data[idx+2]=bb;img.data[idx+3]=255;
  }
  ctx.putImageData(img,0,0);
}

function find2DCrits(Vx,Vy,Vxx,Vxy,Vyy,xR,yR) {
  const N=22, pts=[];
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    let x=xR[0]+(i+0.5)*(xR[1]-xR[0])/N, y=yR[0]+(j+0.5)*(yR[1]-yR[0])/N;
    for(let k=0;k<40;k++){
      const fx=Vx(x,y),fy=Vy(x,y);
      if(Math.abs(fx)+Math.abs(fy)<1e-10) break;
      const a11=Vxx(x,y),a12=Vxy(x,y),a22=Vyy(x,y),det=a11*a22-a12*a12;
      if(Math.abs(det)<1e-12) break;
      x-=(a22*fx-a12*fy)/det; y-=(a11*fy-a12*fx)/det;
      if(x<xR[0]||x>xR[1]||y<yR[0]||y>yR[1]){x=NaN;break;}
    }
    if(isNaN(x)) continue;
    if(Math.abs(Vx(x,y))+Math.abs(Vy(x,y))>1e-5) continue;
    if(pts.some(p=>Math.hypot(p.x-x,p.y-y)<0.09)) continue;
    const H=Vxx(x,y)*Vyy(x,y)-Vxy(x,y)**2;
    pts.push({x,y,type:H<0?"saddle":Vxx(x,y)>0?"min":"max"});
  }
  return pts;
}

const TYPE_COL = { min:"#fbbf24", saddle:"#ef4444", max:"#e879f9" };

function EllipticPage() {
  const [c, setC] = useState(2.2);
  const [ctrl, setCtrl] = useState({ a:0.8, b:0.5 });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const COL="#fb7185";
  const xR=[-2.5,2.5], yR=[-2.5,2.5], aR=[-5,5], bR=[-5,5];
  const CW=280, CH=280, DW=300, DH=280;

  const { a: av, b: bv } = ctrl;
  const Vfn  = useCallback((x,y) => x**3-3*x*y**2+c*(x**2+y**2)-av*x-bv*y, [c,av,bv]);
  const Vx   = useCallback((x,y) => 3*x**2-3*y**2+2*c*x-av, [c,av]);
  const Vy   = useCallback((x,y) => -6*x*y+2*c*y-bv, [c,bv]);
  const Vxx  = useCallback((x,y) => 6*x+2*c, [c]);
  const Vxy  = useCallback((x,y) => -6*y, []);
  const Vyy  = useCallback((x,y) => -6*x+2*c, [c]);

  const crits = useMemo(() => find2DCrits(Vx,Vy,Vxx,Vxy,Vyy,xR,yR), [Vx,Vy,Vxx,Vxy,Vyy]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const samples=[];
    for(let i=0;i<20;i++) for(let j=0;j<20;j++){const x=xR[0]+(i/19)*(xR[1]-xR[0]),y=yR[0]+(j/19)*(yR[1]-yR[0]);samples.push(Vfn(x,y));}
    drawHeatmap(canvasRef.current, Vfn, xR, yR, Math.max(-30,Math.min(...samples)), Math.min(30,Math.max(...samples)));
  }, [Vfn]);

  const deltoid = useMemo(() => {
    const R=c**2/3, pts=[];
    for(let i=0;i<=360;i++){const th=(i/360)*2*Math.PI; pts.push({ x:((R*(Math.cos(2*th)+2*Math.cos(th))-aR[0])/(aR[1]-aR[0]))*DW, y:DH-((R*(-Math.sin(2*th)+2*Math.sin(th))-bR[0])/(bR[1]-bR[0]))*DH });}
    return pts;
  }, [c]);

  const dToS = useCallback((a2,b2) => ({ x:((a2-aR[0])/(aR[1]-aR[0]))*DW, y:DH-((b2-bR[0])/(bR[1]-bR[0]))*DH }), []);
  const sToD = useCallback((sx,sy) => ({ a:Math.max(aR[0],Math.min(aR[1],aR[0]+(sx/DW)*(aR[1]-aR[0]))), b:Math.max(bR[0],Math.min(bR[1],bR[0]+((DH-sy)/DH)*(bR[1]-bR[0]))) }), []);
  const getCtrl = useCallback((e,rect) => sToD(DW*(e.clientX-rect.left)/rect.width,DH*(e.clientY-rect.top)/rect.height), [sToD]);
  const onDown  = useCallback(e => { e.preventDefault(); setDragging(true); setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect())); }, [getCtrl]);
  useEffect(() => {
    const mv=e=>{if(dragging&&svgRef.current)setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect()));};
    const up=()=>setDragging(false);
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
  }, [dragging,getCtrl]);

  const cp=dToS(av,bv);
  const stToC=(x,y)=>({cx:((x-xR[0])/(xR[1]-xR[0]))*CW, cy:CH-((y-yR[0])/(yR[1]-yR[0]))*CH});
  const nMin=crits.filter(p=>p.type==="min").length;

  return (
    <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
      <Panel title="State Space V(x,y)">
        <div style={{position:"relative",width:CW,height:CH}}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{display:"block"}}/>
          <svg width={CW} height={CH} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}>
            <line x1={CW/2} y1={0} x2={CW/2} y2={CH} stroke="#fff" strokeWidth={0.4} opacity={0.15}/>
            <line x1={0} y1={CH/2} x2={CW} y2={CH/2} stroke="#fff" strokeWidth={0.4} opacity={0.15}/>
            {crits.map((p,i)=>{const{cx,cy}=stToC(p.x,p.y),col=TYPE_COL[p.type];return p.type==="min"?<g key={i}><circle cx={cx} cy={cy} r={5} fill={col} opacity={0.9}/><circle cx={cx} cy={cy} r={2} fill="#fff"/></g>:<g key={i}><circle cx={cx} cy={cy} r={4} fill="none" stroke={col} strokeWidth={1.5} opacity={0.7}/></g>;})}
          </svg>
        </div>
        <Slider label="c" min={0.5} max={3.5} step={0.05} value={c} onChange={e=>setC(parseFloat(e.target.value))} color={COL}/>
      </Panel>
      <Panel title="Control Space (a,b) — deltoid — drag">
        <svg ref={svgRef} width={DW} height={DH} style={{display:"block",cursor:"crosshair",userSelect:"none"}} onMouseDown={onDown}>
          <Axes toS={dToS} W={DW} H={DH} xTicks={[-4,-2,0,2,4]} yTicks={[-4,-2,0,2,4]} xLabel="a" yLabel="b"/>
          <polygon points={deltoid.filter(p=>isFinite(p.x)&&isFinite(p.y)).map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="#1a0810" opacity={0.8}/>
          <polygon points={deltoid.filter(p=>isFinite(p.x)&&isFinite(p.y)).map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={COL} strokeWidth={5} opacity={0.08}/>
          <polygon points={deltoid.filter(p=>isFinite(p.x)&&isFinite(p.y)).map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={COL} strokeWidth={1.5}/>
          <circle cx={cp.x} cy={cp.y} r={8} fill={COL} opacity={0.85}/>
          <circle cx={cp.x} cy={cp.y} r={3} fill="#f8fafc" opacity={0.9}/>
        </svg>
      </Panel>
      <StatusBar color={COL} lit={nMin>0} text={`${crits.length} critical points — ${nMin} minima, ${crits.filter(p=>p.type==="saddle").length} saddles — drag inside the deltoid for 4 crits`}/>
    </div>
  );
}

// ── HYPERBOLIC UMBILIC ────────────────────────────────────────────────────────
function HyperbolicPage() {
  const [c, setC] = useState(2.5);
  const [ctrl, setCtrl] = useState({ a:0.5, b:2.5 });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const COL="#34d399";
  const xR=[-2.5,2.5], yR=[-2.5,2.5], aR=[-4,8], bR=[-4,8];
  const CW=280, CH=280, DW=300, DH=280;

  const { a: av, b: bv } = ctrl;
  const Vfn = useCallback((x,y) => x**3+y**3+c*x*y-av*x-bv*y, [c,av,bv]);
  const Vx  = useCallback((x,y) => 3*x**2+c*y-av, [c,av]);
  const Vy  = useCallback((x,y) => 3*y**2+c*x-bv, [c,bv]);
  const Vxx = useCallback((x,y) => 6*x, []);
  const Vxy = useCallback(() => c, [c]);
  const Vyy = useCallback((x,y) => 6*y, []);

  const crits = useMemo(() => find2DCrits(Vx,Vy,Vxx,Vxy,Vyy,xR,yR), [Vx,Vy,Vxx,Vxy,Vyy]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const samples=[];
    for(let i=0;i<20;i++) for(let j=0;j<20;j++){const x=xR[0]+(i/19)*(xR[1]-xR[0]),y=yR[0]+(j/19)*(yR[1]-yR[0]);samples.push(Vfn(x,y));}
    drawHeatmap(canvasRef.current,Vfn,xR,yR,Math.max(-20,Math.min(...samples)),Math.min(20,Math.max(...samples)));
  }, [Vfn]);

  const foldCurve = useMemo(() => {
    const dToS2=(a2,b2)=>({x:((a2-aR[0])/(aR[1]-aR[0]))*DW,y:DH-((b2-bR[0])/(bR[1]-bR[0]))*DH});
    const pos=[], neg=[];
    for(let i=1;i<=300;i++){
      const t=0.08+(i/300)*2.8, tm=-(0.08+(i/300)*2.8);
      const yp=c**2/(36*t),  ap=3*t**2+c*yp,  bp=3*yp**2+c*t;
      const yn=c**2/(36*tm), an=3*tm**2+c*yn, bn=3*yn**2+c*tm;
      if(ap>=aR[0]&&ap<=aR[1]&&bp>=bR[0]&&bp<=bR[1]) pos.push(dToS2(ap,bp));
      if(an>=aR[0]&&an<=aR[1]&&bn>=bR[0]&&bn<=bR[1]) neg.push(dToS2(an,bn));
    }
    return {pos,neg};
  }, [c]);

  const dToS = useCallback((a2,b2) => ({x:((a2-aR[0])/(aR[1]-aR[0]))*DW,y:DH-((b2-bR[0])/(bR[1]-bR[0]))*DH}), []);
  const sToD = useCallback((sx,sy) => ({a:Math.max(aR[0],Math.min(aR[1],aR[0]+(sx/DW)*(aR[1]-aR[0]))),b:Math.max(bR[0],Math.min(bR[1],bR[0]+((DH-sy)/DH)*(bR[1]-bR[0])))}), []);
  const getCtrl = useCallback((e,rect) => sToD(DW*(e.clientX-rect.left)/rect.width,DH*(e.clientY-rect.top)/rect.height), [sToD]);
  const onDown  = useCallback(e=>{e.preventDefault();setDragging(true);setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect()));}, [getCtrl]);
  useEffect(()=>{
    const mv=e=>{if(dragging&&svgRef.current)setCtrl(getCtrl(e,svgRef.current.getBoundingClientRect()));};
    const up=()=>setDragging(false);
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
  },[dragging,getCtrl]);

  const cp=dToS(av,bv);
  const stToC=(x,y)=>({cx:((x-xR[0])/(xR[1]-xR[0]))*CW,cy:CH-((y-yR[0])/(yR[1]-yR[0]))*CH});
  const nMin=crits.filter(p=>p.type==="min").length;

  return (
    <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
      <Panel title="State Space V(x,y)">
        <div style={{position:"relative",width:CW,height:CH}}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{display:"block"}}/>
          <svg width={CW} height={CH} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}>
            <line x1={CW/2} y1={0} x2={CW/2} y2={CH} stroke="#fff" strokeWidth={0.4} opacity={0.15}/>
            <line x1={0} y1={CH/2} x2={CW} y2={CH/2} stroke="#fff" strokeWidth={0.4} opacity={0.15}/>
            {crits.map((p,i)=>{const{cx,cy}=stToC(p.x,p.y),col=TYPE_COL[p.type];return p.type==="min"?<g key={i}><circle cx={cx} cy={cy} r={5} fill={col} opacity={0.9}/><circle cx={cx} cy={cy} r={2} fill="#fff"/></g>:<g key={i}><circle cx={cx} cy={cy} r={4} fill="none" stroke={col} strokeWidth={1.5} opacity={0.7}/></g>;})}
          </svg>
        </div>
        <Slider label="c" min={0.5} max={4.0} step={0.05} value={c} onChange={e=>setC(parseFloat(e.target.value))} color={COL}/>
      </Panel>
      <Panel title="Control Space (a,b) — wave-break locus — drag">
        <svg ref={svgRef} width={DW} height={DH} style={{display:"block",cursor:"crosshair",userSelect:"none"}} onMouseDown={onDown}>
          <Axes toS={dToS} W={DW} H={DH} xTicks={[-2,0,2,4,6]} yTicks={[-2,0,2,4,6]} xLabel="a" yLabel="b"/>
          {foldCurve.pos.length>1 && <polyline points={foldCurve.pos.filter(p=>isFinite(p.x)&&isFinite(p.y)).map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={COL} strokeWidth={2}/>}
          {foldCurve.neg.length>1 && <polyline points={foldCurve.neg.filter(p=>isFinite(p.x)&&isFinite(p.y)).map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={COL} strokeWidth={2}/>}
          <circle cx={cp.x} cy={cp.y} r={8} fill={COL} opacity={0.85}/>
          <circle cx={cp.x} cy={cp.y} r={3} fill="#f8fafc" opacity={0.9}/>
        </svg>
      </Panel>
      <StatusBar color={COL} lit={nMin>0} text={`${crits.length} critical points — ${nMin} minima, ${crits.filter(p=>p.type==="saddle").length} saddles — drag across the fold locus`}/>
    </div>
  );
}

// ── EXAMPLES ──────────────────────────────────────────────────────────────────
const EXAMPLES = {
  fold: [
    {domain:"Neuroscience",        title:"Action Potential Threshold",      body:"The resting membrane potential is a stable minimum. As depolarising current rises toward 0, the minimum shallows. At c=0 the resting state ceases to exist and the neuron fires discontinuously."},
    {domain:"Structural Mechanics",title:"Euler Column Buckling",           body:"As axial load approaches the Euler critical load, c approaches 0. The straight equilibrium ceases to exist and the column snaps laterally — a jump with no precursor deformation."},
    {domain:"Ecology",             title:"Predator-Prey Extinction Cliff",  body:"As harvest rate approaches maximum sustainable yield, c approaches 0. Beyond it the viable state vanishes; collapse to extinction is discontinuous with no slow decline phase."},
    {domain:"Climate",             title:"Snowball Earth Glaciation",       body:"As CO\u2082 falls, c approaches 0 and the open-water state approaches a fold. Below the threshold it disappears; the climate jumps irreversibly into global glaciation."},
    {domain:"Thermodynamics",      title:"Van der Waals Spinodal",          body:"At c=0 no energy barrier separates phases, triggering instantaneous spinodal decomposition — the limit beyond which a metastable phase cannot exist."},
    {domain:"Astrophysics",        title:"Stellar Core Collapse",           body:"Nuclear fuel depletion drives c to 0. When exhausted the equilibrium disappears and collapse proceeds on the free-fall timescale — no gradual transition."},
  ],
  cusp: [
    {domain:"Cell Biology",        title:"Bistable Gene Toggle Switch",     body:"Two mutually repressing transcription factors produce two stable minima inside the cusp. Crossing a fold collapses one state irreversibly — the cell commits to a fate."},
    {domain:"Cardiology",          title:"Heartbeat Diastole/Systole",      body:"Zeeman modelled the cardiac cycle as a trajectory looping through the cusp. The heart jumps discontinuously between contracted and relaxed states rather than transitioning smoothly."},
    {domain:"Psychology",          title:"Fight-Flight Response",           body:"Zeeman's model: b = arousal, a = fear/rage asymmetry. Inside the cusp an animal is bistable. Under rising arousal it snaps to one behaviour; hysteresis means reversal requires a significant drop."},
    {domain:"Evolutionary Bio",    title:"Punctuated Equilibrium",          body:"Stasis = inside the cusp; speciation event = crossing the fold. The cusp explains why species are stable for long periods then change rapidly, with no intermediate forms."},
    {domain:"Economics",           title:"Market Crash / Bubble",           body:"b = volatility, a = fundamental-price divergence. As volatility rises the system enters the cusp. A crash is a fold: one equilibrium disappears and price jumps discontinuously."},
    {domain:"Optics",              title:"Laser Threshold",                 body:"As pump power raises b past the cusp tip a second minimum (coherent lasing) is born — a bifurcation from monostable to bistable, with hysteresis on the return path."},
  ],
  swallowtail: [
    {domain:"Developmental Bio",   title:"Three-Germ-Layer Specification",  body:"The swallowtail pocket models the brief window during which ectoderm, mesoderm, and endoderm identities coexist before successive folds collapse the field to committed layers."},
    {domain:"Optics",              title:"Swallowtail Diffraction Caustic", body:"Near a critical refracting geometry the ray envelope develops a swallowtail singularity — three bright caustic lines converging with the characteristic shape, visible on a screen."},
    {domain:"Phase Transitions",   title:"Tricritical Point He\u00B3/He\u2074", body:"The \u03BB-line in the He\u00B3/He\u2074 phase diagram has a tricritical point where three phases become simultaneously critical — governed by a sixth-order potential, the swallowtail type."},
    {domain:"Mechanics",           title:"Post-Buckling Two Mode Shapes",   body:"An elastic structure with two competing buckling modes has potential energy with up to three local minima. The swallowtail organises imperfection sensitivity and sudden load-capacity drops."},
    {domain:"Fluid Dynamics",      title:"Three-Shock Confluence",          body:"The stability of the triple-point in Mach reflection as wedge angle and Mach number vary is governed by the swallowtail bifurcation set. The triple-shock point is the swallowtail tip."},
    {domain:"Neuroscience",        title:"Three-State Working Memory",      body:"Models of prefrontal working memory with three stable activity states require the swallowtail. The pocket is the parameter regime where all three attractors coexist simultaneously."},
  ],
  butterfly: [
    {domain:"Embryology",          title:"Dorsal-Ventral Boundary Conflict",body:"The butterfly pocket captures the gradient-crossing phenotype where a strip of cells must interpret competing morphogen gradients: a and b encode opposing gradient strengths, c,d their interference."},
    {domain:"Elasticity",          title:"Post-Buckling Imperfection Sensitivity", body:"Koiter's theory: the butterfly catastrophe in structures with nearly equal critical load mode shapes creates dangerous sensitivity — tiny imperfections collapse carrying capacity dramatically."},
    {domain:"Pharmacology",        title:"Four-Parameter Dose-Response",    body:"Two competing ligands can produce three stable receptor conformations. The butterfly organises the four-dimensional dose-response surface; the pocket is the zone of tri-stable receptor behaviour."},
    {domain:"Geopolitics",         title:"Zeeman's Arms Race Model",        body:"The nested pocket models a stable detente state nested inside hawk/dove bistability — a zone destroyed when economic constraint (a) or ideological asymmetry (b) exceed critical values."},
    {domain:"Genetics",            title:"Canalization and Assimilation",   body:"Waddington's canalization maps onto the butterfly pocket. The third canal is accessible only when both genetic background (a) and environmental stress (b) are within a narrow range."},
    {domain:"Sociology",           title:"Three-Party Political Equilibria",body:"When polarisation is negative and cross-ideological overlap near zero, a viable centrist party can persist inside the butterfly pocket. Its disappearance as polarisation rises is a fold catastrophe."},
  ],
  elliptic: [
    {domain:"Morphogenesis",       title:"Gastrulation — Blastula Invagination", body:"Thom's flagship application. The elliptic umbilic is the only stable singularity producing a three-pronged convergent boundary — the triradiate symmetry of the blastopore lip. Crossing the deltoid is germ-layer commitment."},
    {domain:"Hair Patterning",     title:"Scalp Whorls and Cowlicks",       body:"The hair growth direction field must have singularities summing to index +2. The elliptic umbilic provides an index +1 singularity — the cowlick — explaining why hair converges in three streams."},
    {domain:"Crystal Optics",      title:"Conical Refraction",              body:"In a biaxial crystal, light along the optical axis fans into a hollow cone. The wave-surface has an elliptic umbilic at the optical axis; the refracted cone is its unstable manifold. Predicted by Hamilton in 1832."},
    {domain:"Cytoskeleton",        title:"Actin Convergence Zones",         body:"Where three actin filament streams meet in a migrating cell, the flow field has an elliptic umbilic singularity — directly observable in fluorescence imaging as a Y-junction in stress-fibre networks."},
    {domain:"Fluid Mechanics",     title:"Three-Vortex Confluence",         body:"When three vortex sheets interact, their stream function can develop an elliptic umbilic at the confluence point. The triradiate symmetry predicts three families of vortex reconnection events."},
    {domain:"Neurodevelopment",    title:"Three-Way Axon Path Choice",      body:"At decision points in neural wiring, the chemoattractant gradient around the choice point is governed by the elliptic umbilic. Crossing a cusp of the deltoid is the catastrophic commitment to one target."},
  ],
  hyperbolic: [
    {domain:"Wave Breaking",       title:"Overturning Ocean Wave",          body:"The breaking event is a hyperbolic umbilic: the water surface folds over at the crest. The two branches of the fold locus correspond to the two sides of the crest; their intersection is the moment of breaking."},
    {domain:"Neural Tube Closure", title:"Epithelial Sheet Folding",        body:"During neurulation, flat neuroepithelium rolls into a tube. The hyperbolic umbilic governs this transition: c encodes apical constriction; a,b encode patterning gradients. Failure produces neural tube defects."},
    {domain:"Optics",              title:"Hyperbolic Caustic in Water",     body:"Near a saddle-point water ripple, the caustic develops a hyperbolic umbilic: two bright lines cross at right angles then exchange partners — an X-crossing topology impossible for the elliptic case."},
    {domain:"Developmental Bio",   title:"Optic Cup Formation",             body:"The optic vesicle invaginates to form a double-walled cup. The hyperbolic umbilic produces an inward fold with bilateral symmetry — distinct from the elliptic case's three-pronged convergence."},
    {domain:"Shock Waves",         title:"Mach Stem Formation",             body:"The transition from regular to Mach reflection — where a new shock appears discontinuously — is a hyperbolic umbilic. The fold locus is the von Neumann criterion in (Mach number, wedge angle) space."},
    {domain:"Soap Films",          title:"Plateau Border Reconnection",     body:"When two soap bubbles coalesce, three films at a Plateau border rearrange to a different set of three films. This topological transition is a hyperbolic umbilic — the crossing point is four-way marginally stable."},
  ],
  parabolic: [
    {domain:"Morphogenesis",       title:"Umbilic Points on Biological Surfaces",    body:"Hair whorls, skin creases, and corneal surface topology are governed by umbilic points — locations where principal curvatures are equal. The D₅ organizing center governs the transition between elliptic and hyperbolic umbilic patterns on smoothly deforming surfaces."},
    {domain:"Fluid Dynamics",      title:"Wave Transition: Breaking to Non-breaking",body:"The boundary between breaking and non-breaking wave regimes in three-dimensional water waves is organized by the parabolic umbilic. Crossing from the hyperbolic umbilic (breaking) to the elliptic umbilic (focusing without breaking) passes through the D₅ structure."},
    {domain:"Optics",              title:"Organizing Center for Umbilic Caustics",   body:"In three-dimensional optical systems, the parabolic umbilic is the codimension-4 singularity that organizes transitions between the deltoid (elliptic) and X-shaped (hyperbolic) caustic geometries. It appears in astigmatic lens systems near the transition between the two umbilic focal regimes."},
    {domain:"Elasticity",          title:"Shell Buckling Transition",                body:"The transition between symmetric and asymmetric buckling modes in thin elastic shells under combined loading passes through the D₅ organizing center. The four-parameter space (two load components, two geometric parameters) is exactly the control space of the parabolic umbilic."},
    {domain:"Phase Transitions",   title:"Liquid Crystal Texture Transitions",       body:"In nematic liquid crystals, the transition between radial (elliptic umbilic) and hyperbolic defect textures is organized by D₅. The extra control parameter is the elastic anisotropy ratio, which continuously deforms one umbilic texture into the other through the parabolic transition."},
    {domain:"Developmental Bio",   title:"Symmetry Breaking in Gastrulation",        body:"Thom proposed D₅ as the organizing center for the transition between the triradiate (elliptic) and bilateral (hyperbolic) gastrulation geometries. The four control parameters map to morphogen gradients, mechanical stress, and embryo geometry; the parabolic umbilic is the point at which these symmetry classes exchange stability."},
  ],
};

function ExamplesPanel({ catId, color }) {
  const [open, setOpen] = useState(null);
  const data = EXAMPLES[catId];
  if (!data) return null;
  return (
    <div style={{ marginTop:14 }}>
      <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2.5, color:"#1a2b3c", textTransform:"uppercase", marginBottom:10 }}>Real-World Instances</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {data.map((ex, i) => (
          <div key={i} onClick={() => setOpen(open===i ? null : i)}
            style={{ background: open===i ? "#070d18" : "#060c14", border:`1px solid ${open===i ? color+"40" : "#0c1825"}`, borderRadius:2, padding:"10px 12px", cursor:"pointer" }}>
            <div style={{ fontFamily:"monospace", fontSize:7, letterSpacing:1.5, color, opacity:0.6, textTransform:"uppercase", marginBottom:5 }}>{ex.domain}</div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:11, color:"#8899aa", lineHeight:1.4 }}>{ex.title}</div>
            {open===i && <div style={{ fontFamily:"monospace", fontSize:8, color:"#2a3e52", lineHeight:1.8, borderTop:`1px solid ${color}20`, paddingTop:8, marginTop:8 }}>{ex.body}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PARABOLIC UMBILIC ─────────────────────────────────────────────────────────
function ParabolicPage() {
  const COL = "#fbbf24";
  const W = 720, H = 320;

  // Static SVG: schematic of the parabolic umbilic bifurcation set
  // It has a "purse" or "beak-to-beak" structure in 2D cross-sections
  // Four distinct regions: 0, 1, 2, or 3 stable states
  // We show: the wing-like bifurcation set in (a,b) plane at fixed c,d
  // and a 3D schematic of the umbilic point structure

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Two diagrams side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        {/* Left: bifurcation set cross-section */}
        <div style={{ background:"#090f1a", border:"1px solid #18293d", borderRadius:2, padding:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2, color:"#1a2b3c", marginBottom:10, textTransform:"uppercase" }}>
            Bifurcation Set (c, d fixed)
          </div>
          <svg width="100%" viewBox="0 0 340 300" style={{ display:"block" }}>
            {/* Grid */}
            {[-1,0,1,2].map(v => { const x=80+v*60; return <line key={"vg"+v} x1={x} y1={10} x2={x} y2={290} stroke="#0c1825" strokeWidth={0.5}/>; })}
            {[-2,-1,0,1,2].map(v => { const y=150+v*50; return <line key={"hg"+v} x1={20} y1={y} x2={320} y2={y} stroke="#0c1825" strokeWidth={0.5}/>; })}
            {/* Axes */}
            <line x1={80} y1={10} x2={80} y2={290} stroke="#1e3347" strokeWidth={0.8}/>
            <line x1={20} y1={150} x2={320} y2={150} stroke="#1e3347" strokeWidth={0.8}/>
            <text x={308} y={144} fill="#253d52" fontSize={9} fontFamily="monospace">a</text>
            <text x={84} y={18} fill="#253d52" fontSize={9} fontFamily="monospace">b</text>
            {/* Upper arm */}
            <path d="M80 150 C100 100 140 65 200 50 C240 40 280 48 310 62"
                  fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.9}/>
            {/* Lower arm */}
            <path d="M80 150 C100 200 140 235 200 250 C240 260 280 252 310 238"
                  fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.9}/>
            {/* Inner dashed branches (pocket) */}
            <path d="M80 150 C62 132 44 122 26 120"
                  fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.55}/>
            <path d="M80 150 C62 168 44 178 26 180"
                  fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.55}/>
            {/* Umbilic point */}
            <circle cx={80} cy={150} r={5} fill="#fbbf24" opacity={0.9}/>
            <text x={87} y={145} fill="#fbbf24" fontSize={8} fontFamily="monospace">D₅</text>
            <text x={87} y={156} fill="#3a5570" fontSize={7} fontFamily="monospace">umbilic</text>
            {/* Region labels */}
            <text x={185} y={148} fill="#c8d8e8" fontSize={8} fontFamily="monospace" textAnchor="middle">2 states</text>
            <text x={260} y={110} fill="#c8d8e8" fontSize={7} fontFamily="monospace" textAnchor="middle">1 state</text>
            <text x={260} y={200} fill="#c8d8e8" fontSize={7} fontFamily="monospace" textAnchor="middle">1 state</text>
            <text x={46} y={136} fill="#c8d8e8" fontSize={7} fontFamily="monospace" textAnchor="middle">3</text>
            <text x={46} y={167} fill="#c8d8e8" fontSize={7} fontFamily="monospace" textAnchor="middle">0</text>
          </svg>
        </div>

        {/* Right: parameter hierarchy */}
        <div style={{ background:"#090f1a", border:"1px solid #18293d", borderRadius:2, padding:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2, color:"#1a2b3c", marginBottom:10, textTransform:"uppercase" }}>
            Parameter Hierarchy
          </div>
          <svg width="100%" viewBox="0 0 300 300" style={{ display:"block" }}>
            <defs>
              <marker id="arPar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M1 1L7 4L1 7" fill="none" stroke="#3a5570" strokeWidth={1.5}/>
              </marker>
            </defs>
            {/* D5 */}
            <rect x={90} y={20} width={120} height={36} rx={2} fill="#1a1208" stroke="#fbbf24" strokeWidth={1}/>
            <text x={150} y={38} fill="#fbbf24" fontSize={9} fontFamily="monospace" textAnchor="middle">D₅  codim 4</text>
            <text x={150} y={50} fill="#5a4010" fontSize={7} fontFamily="monospace" textAnchor="middle">parabolic umbilic</text>
            {/* arrows */}
            <line x1={120} y1={56} x2={80} y2={86} stroke="#3a5570" strokeWidth={1} markerEnd="url(#arPar)"/>
            <line x1={180} y1={56} x2={220} y2={86} stroke="#3a5570" strokeWidth={1} markerEnd="url(#arPar)"/>
            {/* D4- */}
            <rect x={10} y={86} width={120} height={36} rx={2} fill="#1a0808" stroke="#fb7185" strokeWidth={0.8}/>
            <text x={70} y={104} fill="#fb7185" fontSize={9} fontFamily="monospace" textAnchor="middle">D₄⁻  codim 3</text>
            <text x={70} y={115} fill="#5a2020" fontSize={7} fontFamily="monospace" textAnchor="middle">elliptic umbilic</text>
            {/* D4+ */}
            <rect x={170} y={86} width={120} height={36} rx={2} fill="#081a0e" stroke="#34d399" strokeWidth={0.8}/>
            <text x={230} y={104} fill="#34d399" fontSize={9} fontFamily="monospace" textAnchor="middle">D₄⁺  codim 3</text>
            <text x={230} y={115} fill="#0a3020" fontSize={7} fontFamily="monospace" textAnchor="middle">hyperbolic umbilic</text>
            {/* arrows to A3 */}
            <line x1={70}  y1={122} x2={110} y2={152} stroke="#3a5570" strokeWidth={0.8} markerEnd="url(#arPar)"/>
            <line x1={230} y1={122} x2={190} y2={152} stroke="#3a5570" strokeWidth={0.8} markerEnd="url(#arPar)"/>
            {/* A3 */}
            <rect x={100} y={152} width={100} height={32} rx={2} fill="#060f0a" stroke="#00cc60" strokeWidth={0.8}/>
            <text x={150} y={169} fill="#00cc60" fontSize={9} fontFamily="monospace" textAnchor="middle">A₃  codim 2</text>
            <text x={150} y={179} fill="#0a3018" fontSize={7} fontFamily="monospace" textAnchor="middle">cusp</text>
            {/* note */}
            <text x={150} y={220} fill="#3a5570" fontSize={7} fontFamily="monospace" textAnchor="middle">D₅ is the unique organizing</text>
            <text x={150} y={233} fill="#3a5570" fontSize={7} fontFamily="monospace" textAnchor="middle">center for both D₄ umbilics.</text>
            <text x={150} y={250} fill="#3a5570" fontSize={7} fontFamily="monospace" textAnchor="middle">Slicing its parameter space</text>
            <text x={150} y={263} fill="#3a5570" fontSize={7} fontFamily="monospace" textAnchor="middle">reveals either D₄⁻ or D₄⁺</text>
            <text x={150} y={276} fill="#3a5570" fontSize={7} fontFamily="monospace" textAnchor="middle">depending on direction.</text>
          </svg>
        </div>

      </div>

      {/* Explanation panels */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        <div style={{ background:"#090f1a", border:"1px solid #18293d", borderRadius:2, padding:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2, color:`${COL}80`, textTransform:"uppercase", marginBottom:10 }}>
            Why it is different
          </div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:12, color:"#8899aa", lineHeight:1.85 }}>
            The parabolic umbilic D₅ is the only one of the seven elementary catastrophes that
            is an organizing center for two other catastrophes simultaneously. Its parameter space
            contains both the elliptic umbilic D₄⁻ and the hyperbolic umbilic D₄⁺ as special
            cross-sections, separated by a wall of cusp bifurcations A₃. Moving through the
            four-dimensional parameter space, one passes continuously between the deltoid
            structure of the elliptic and the two-branched structure of the hyperbolic — a
            transition that cannot happen within either D₄ type alone.
          </div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:12, color:"#8899aa", lineHeight:1.85, marginTop:10 }}>
            Its bifurcation set has four qualitatively distinct regions in any generic
            two-dimensional cross-section, with 0, 1, 2, or 3 stable states — one more than
            either D₄ umbilic can produce in isolation. The umbilic point itself is the
            unique point in parameter space where all four regions meet.
          </div>
        </div>

        <div style={{ background:"#090f1a", border:"1px solid #18293d", borderRadius:2, padding:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:8, letterSpacing:2, color:`${COL}80`, textTransform:"uppercase", marginBottom:10 }}>
            Why it is rarely visualized
          </div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:12, color:"#8899aa", lineHeight:1.85 }}>
            Visualization requires four control parameters (a, b, c, d) and two state variables
            (x, y) simultaneously. The equilibrium surface lives in a six-dimensional space.
            Any rendering is a projection or cross-section, and different cross-sections reveal
            qualitatively different behaviour — elliptic-umbilic-like in one slice,
            hyperbolic-umbilic-like in another. There is no single three-dimensional picture
            that captures the full structure, unlike D₄± which each have a canonical three-dimensional
            representation.
          </div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:12, color:"#8899aa", lineHeight:1.85, marginTop:10 }}>
            The potential V = x²y + y⁴ + cx² + dy² − ax − by has a symmetry broken by the
            asymmetric coupling term x²y: when x → −x the potential changes, which is why the
            parabolic umbilic lacks the reflective symmetry of the elliptic and hyperbolic cases.
          </div>
        </div>

      </div>

      {/* Status bar */}
      <div style={{ width:"100%", padding:"8px 14px", background:"#060c14",
        border:"1px solid #fbbf2430", borderRadius:2,
        fontFamily:"monospace", fontSize:9, color:"#5a4010", letterSpacing:0.5 }}>
        D₅ · codim 4 · corank 2 · V = x²y + y⁴ + cx² + dy² − ax − by · organizing center for both D₄ umbilics · four stable-state regions · no interactive diagram (6-dimensional parameter+state space)
      </div>

    </div>
  );
}

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────────
class PageBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ background:"#1a0505", border:"1px solid #ef4444", borderRadius:2, padding:16, margin:"12px 0",
          fontFamily:"monospace", fontSize:10, color:"#ef4444", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {"ERROR: " + this.state.err.message + "\n\n" + (this.state.err.stack || "").slice(0, 600)}
          <div style={{ marginTop:12 }}>
            <button onClick={() => this.setState({ err: null })}
              style={{ background:"#ef4444", border:"none", color:"#fff", padding:"4px 10px", cursor:"pointer", fontFamily:"monospace", fontSize:9 }}>
              RESET
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
const PAGES = { fold:FoldPage, cusp:CuspPage, swallowtail:SwallowtailPage, butterfly:ButterflyPage, elliptic:EllipticPage, hyperbolic:HyperbolicPage, parabolic:ParabolicPage };

export default function App() {
  const [active, setActive] = useState("fold");
  const cat = CATS.find(c => c.id === active);
  const Page = PAGES[cat.id];
  return (
    <div style={{ background:"#05090f", minHeight:"100vh", fontFamily:"monospace", color:"#cbd5e1",
      display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 16px 56px" }}>
      <div style={{ textAlign:"center", marginBottom:22, maxWidth:760, width:"100%" }}>
        <div style={{ fontSize:8, letterSpacing:5, color:"#0e1a26", textTransform:"uppercase", marginBottom:7 }}>
          René Thom · Stabilité Structurelle et Morphogenèse · 1972
        </div>
        <h1 style={{ margin:0, fontSize:20, fontWeight:400, fontFamily:"Georgia,serif", color:"#dde6f0", letterSpacing:0.3 }}>
          The Elementary Catastrophes
        </h1>
        <div style={{ color:"#132030", fontSize:9, marginTop:6 }}>
          The seven structurally stable singularities for systems with \u2264\u202F4 control parameters
        </div>
      </div>
      <Nav active={active} setActive={setActive}/>
      <div style={{ width:"100%", maxWidth:760 }}>
        <PageHeader cat={cat}/>
        <PageBoundary key={cat.id}>
          <Page/>
        </PageBoundary>
        <ExamplesPanel catId={cat.id} color={cat.color}/>
      </div>
    </div>
  );
}
