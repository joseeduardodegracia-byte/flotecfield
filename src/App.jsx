import { useState, useEffect, useCallback, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login";
import { exportQuotePDF } from "./usePDF";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#0b1624", surface:"#0f1e30", border:"#1c3050", borderBr:"#1e3d60",
  blue:"#1565c0", blueLight:"#1e88e5", bluePale:"#42a5f5",
  orange:"#e65100", orangeBr:"#f57c00", orangePale:"#ffb74d",
  greenBr:"#43a047", greenPale:"#81c784",
  yellow:"#f9a825", red:"#c62828", redPale:"#ef9a9a",
  purple:"#7b1fa2", purplePale:"#ce93d8",
  text:"#e3edf8", textMid:"#8aacc8", textDim:"#3d6080",
  topBar:"#071020", navBg:"#071020",
};
const ITBMS = 0.07;
const COL = { clients:"clients", equipment:"equipment", maintenance:"maintenance", quotes:"quotes", users:"users" };
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmt = (n,dec=2) => Number(n||0).toLocaleString("es-PA",{minimumFractionDigits:dec,maximumFractionDigits:dec});

// ─── FIRESTORE ────────────────────────────────────────────────────────────────
async function upsert(colName, id, data) {
  await setDoc(doc(db,colName,id), {...data, id, updatedAt:serverTimestamp()});
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const PATHS = {
  home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  back:"M19 12H5M12 5l-7 7 7 7",
  client:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  machine:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  wrench:"M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  gauge:"M12 2a10 10 0 110 20A10 10 0 0112 2zM12 6v6l4 2",
  parts:"M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  list:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  alert:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  check:"M20 6L9 17l-5-5",
  quote:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  plus:"M12 5v14M5 12h14",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  logout:"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  pdf:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h3",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  chart:"M18 20V10M12 20V4M6 20v-6",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  history:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
};
const Icon = ({name,size=20}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {PATHS[name]?.split("M").filter(Boolean).map((d,i)=><path key={i} d={"M"+d}/>)}
  </svg>
);

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const IB = { width:"100%", padding:"10px 12px", borderRadius:7, border:"1.5px solid "+C.border, background:"#0a1520", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };

const Field = ({label,value,onChange,type="text",options,optionLabels,unit,required,placeholder,small}) => (
  <div style={{marginBottom:small?8:13}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:4}}>
      {label}{required&&<span style={{color:C.orangeBr}}> *</span>}
    </label>}
    <div style={{position:"relative"}}>
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={{...IB,appearance:"none",cursor:"pointer"}}>
            <option value="">— Seleccionar —</option>
            {options.map((o,i)=><option key={o} value={o}>{optionLabels?optionLabels[i]:o}</option>)}
          </select>
        : type==="textarea"
          ? <textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} placeholder={placeholder} style={{...IB,resize:"vertical"}}/>
          : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...IB,paddingRight:unit?44:12,fontSize:small?13:14}}/>
      }
      {unit&&<span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:C.textDim,fontSize:11,fontWeight:700}}>{unit}</span>}
    </div>
  </div>
);

const SecH = ({icon,title,color}) => (
  <div style={{display:"flex",alignItems:"center",gap:9,padding:"13px 0 9px",borderBottom:"2px solid "+color+"30",marginBottom:14}}>
    <div style={{color}}><Icon name={icon} size={15}/></div>
    <h3 style={{margin:0,fontSize:11,fontWeight:800,color,letterSpacing:"0.12em",textTransform:"uppercase"}}>{title}</h3>
  </div>
);

const Card = ({children,onClick,accent,sx={}}) => (
  <div onClick={onClick} style={{background:C.surface,border:"1.5px solid "+(accent?accent+"35":C.border),borderRadius:11,padding:"13px 15px",marginBottom:9,cursor:onClick?"pointer":"default",position:"relative",overflow:"hidden",...sx}}>
    {accent&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:accent,borderRadius:"11px 0 0 11px"}}/>}
    <div style={{paddingLeft:accent?9:0}}>{children}</div>
  </div>
);

const Badge = ({label,color}) => (
  <span style={{background:color+"20",color,border:"1px solid "+color+"45",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>
);

const Btn = ({label,icon,onClick,variant="primary",small,full,disabled}) => {
  const S={primary:{bg:C.blue,text:"#fff",bd:"none"},success:{bg:"#1b5e20",text:"#81c784",bd:"none"},ghost:{bg:"transparent",text:C.textMid,bd:"1px solid "+C.border},orange:{bg:C.orange,text:"#fff",bd:"none"},danger:{bg:"#7f1d1d",text:"#fca5a5",bd:"none"},purple:{bg:C.purple,text:"#fff",bd:"none"}};
  const s=S[variant]||S.primary;
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:small?"7px 13px":"10px 18px",background:s.bg,color:s.text,border:s.bd,borderRadius:7,fontSize:small?12:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?0.5:1,fontFamily:"inherit"}}>{icon&&<Icon name={icon} size={small?13:15}/>} {label}</button>;
};

const Empty = ({icon,text}) => (
  <div style={{textAlign:"center",padding:"40px 20px",color:C.textDim}}>
    <div style={{marginBottom:10,opacity:0.3}}><Icon name={icon} size={38}/></div>
    <p style={{margin:0,fontSize:13}}>{text}</p>
  </div>
);

const FlotecMark = ({size=32}) => (
  <div style={{width:size,height:size,borderRadius:Math.round(size*0.22),background:"linear-gradient(135deg,"+C.blue+" 0%,"+C.blueLight+" 100%)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
    <svg width={size*0.58} height={size*0.58} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={C.orange} strokeWidth="2.5"/>
      <circle cx="12" cy="12" r="4" stroke={C.orange} strokeWidth="2"/>
      <circle cx="12" cy="12" r="1.5" fill="#fff"/>
      <line x1="12" y1="3" x2="12" y2="6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3" y1="12" x2="6" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="12" x2="21" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </div>
);

// ─── PARTS EDITOR ─────────────────────────────────────────────────────────────
const PartsEditor = ({parts,onChange}) => {
  const add = () => onChange([...parts,{id:uid(),name:"",pn:"",unit:"und"}]);
  const upd = (id,k,v) => onChange(parts.map(p=>p.id===id?{...p,[k]:v}:p));
  const del = (id) => onChange(parts.filter(p=>p.id!==id));
  return (
    <div>
      {parts.map((p,i)=>(
        <div key={p.id} style={{background:"#0a1520",border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:"0.08em"}}>Repuesto #{i+1}</span>
            <button onClick={()=>del(p.id)} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",display:"flex",padding:2}}><Icon name="trash" size={14}/></button>
          </div>
          <Field label="Descripción" value={p.name} onChange={v=>upd(p.id,"name",v)} placeholder="ej. Filtro de aire" small/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Field label="P/N" value={p.pn} onChange={v=>upd(p.id,"pn",v)} placeholder="ej. 1625165337" small/>
            <Field label="Unidad" value={p.unit} onChange={v=>upd(p.id,"unit",v)} options={["und","L","kg","m","par","kit","juego"]} small/>
          </div>
        </div>
      ))}
      <button onClick={add} style={{width:"100%",padding:"9px",background:"transparent",border:"1.5px dashed "+C.border,borderRadius:8,color:C.textDim,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit"}}>
        <Icon name="plus" size={14}/> Agregar repuesto
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════════

const ClientForm = ({initial={},onSave,onCancel}) => {
  const [f,setF] = useState({name:"",country:"Panamá",city:"",industry:"",contact:"",phone:"",email:"",notes:"",...initial});
  const s=k=>v=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <SecH icon="client" title="Datos del Cliente" color={C.bluePale}/>
      <Field label="Nombre de empresa" value={f.name} onChange={s("name")} required placeholder="ej. Minera Panamá"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="País" value={f.country} onChange={s("country")} options={["Panamá","Costa Rica","Guatemala","Honduras","El Salvador","Nicaragua","Belice"]}/>
        <Field label="Ciudad" value={f.city} onChange={s("city")} placeholder="ej. Colón"/>
      </div>
      <Field label="Industria" value={f.industry} onChange={s("industry")} options={["Minería","Manufactura","Salud / Hospital","Petroquímica","Alimentos y Bebidas","Construcción","Energía","Transporte","Otro"]}/>
      <Field label="Persona de contacto" value={f.contact} onChange={s("contact")} placeholder="Nombre y cargo"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Teléfono" value={f.phone} onChange={s("phone")} type="tel" placeholder="+507..."/>
        <Field label="Email" value={f.email} onChange={s("email")} type="email"/>
      </div>
      <Field label="Notas" value={f.notes} onChange={s("notes")} type="textarea" placeholder="Observaciones..."/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn label="Guardar" icon="check" variant="success" onClick={()=>f.name&&onSave(f)} full/>
        <Btn label="Cancelar" variant="ghost" onClick={onCancel}/>
      </div>
    </div>
  );
};

const EquipmentForm = ({initial={},clients,onSave,onCancel}) => {
  const blank = {clientId:"",brand:"Atlas Copco",model:"",serial:"",type:"",year:"",pressure:"",flow:"",power:"",voltage:"",rpm:"",stages:"",cooling:"",siteTemp:"",siteHumidity:"",siteAltitude:"",siteEnvironment:"",siteNotes:"",parts:[],status:"Operativo",lastService:"",notes:""};
  const [f,setF] = useState({...blank,...initial,parts:initial.parts||[]});
  const s=k=>v=>setF(p=>({...p,[k]:v}));
  const cn=clients.find(c=>c.id===f.clientId)?.name;
  return (
    <div>
      <SecH icon="machine" title="Identificación del Equipo" color={C.bluePale}/>
      <Field label="Cliente" value={f.clientId} onChange={s("clientId")} options={clients.map(c=>c.id)} optionLabels={clients.map(c=>c.name)}/>
      {cn&&<div style={{marginTop:-8,marginBottom:12,fontSize:12,color:C.bluePale}}>→ {cn}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Marca" value={f.brand} onChange={s("brand")} options={["Atlas Copco","Ingersoll Rand","Kaeser","Gardner Denver","CompAir","ABAC","Sullair","Quincy","Otra"]}/>
        <Field label="Modelo" value={f.model} onChange={s("model")} required placeholder="ej. GA250"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="N° de serie" value={f.serial} onChange={s("serial")} placeholder="SN..."/>
        <Field label="Año" value={f.year} onChange={s("year")} type="number" placeholder="2022"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Tipo" value={f.type} onChange={s("type")} options={["Tornillo rotativo","Centrífugo","Pistón","Scroll","Soplador (Blower)","Booster"]}/>
        <Field label="Estado" value={f.status} onChange={s("status")} options={["Operativo","En mantenimiento","Fuera de servicio","En standby"]}/>
      </div>
      <SecH icon="gauge" title="Parámetros Técnicos" color={C.orangePale}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Presión nominal" value={f.pressure} onChange={s("pressure")} unit="psi" type="number"/>
        <Field label="Caudal" value={f.flow} onChange={s("flow")} unit="cfm" type="number"/>
        <Field label="Potencia motor" value={f.power} onChange={s("power")} unit="kW" type="number"/>
        <Field label="Voltaje" value={f.voltage} onChange={s("voltage")} options={["208V / 3Φ","230V / 3Φ","460V / 3Φ","480V / 3Φ","575V / 3Φ","Otro"]}/>
        <Field label="RPM motor" value={f.rpm} onChange={s("rpm")} unit="rpm" type="number"/>
        <Field label="Etapas" value={f.stages} onChange={s("stages")} options={["1 etapa","2 etapas","Multietapa"]}/>
      </div>
      <Field label="Sistema de enfriamiento" value={f.cooling} onChange={s("cooling")} options={["Aire (air cooled)","Agua (water cooled)","Mixto"]}/>
      <SecH icon="alert" title="Condiciones del Sitio" color={C.yellow}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Temperatura" value={f.siteTemp} onChange={s("siteTemp")} unit="°C" type="number"/>
        <Field label="Humedad relativa" value={f.siteHumidity} onChange={s("siteHumidity")} unit="%" type="number"/>
        <Field label="Altitud" value={f.siteAltitude} onChange={s("siteAltitude")} unit="msnm" type="number"/>
        <Field label="Ambiente" value={f.siteEnvironment} onChange={s("siteEnvironment")} options={["Limpio / interior","Polvo moderado","Polvo severo","Salinidad / costa","Productos químicos","Minero / subterráneo"]}/>
      </div>
      <Field label="Notas del sitio" value={f.siteNotes} onChange={s("siteNotes")} type="textarea" placeholder="Observaciones del entorno..."/>
      <SecH icon="parts" title="Repuestos del Equipo" color={C.bluePale}/>
      <PartsEditor parts={f.parts} onChange={v=>setF(p=>({...p,parts:v}))}/>
      <SecH icon="list" title="Observaciones" color={C.textMid}/>
      <Field label="Última revisión" value={f.lastService} onChange={s("lastService")} type="date"/>
      <Field label="Notas generales" value={f.notes} onChange={s("notes")} type="textarea" placeholder="Estado general, anomalías..."/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn label="Guardar Equipo" icon="check" variant="success" onClick={()=>(f.model&&f.clientId)&&onSave(f)} full/>
        <Btn label="Cancelar" variant="ghost" onClick={onCancel}/>
      </div>
    </div>
  );
};

const MaintForm = ({equipment,clients,initial={},onSave,onCancel}) => {
  const [f,setF] = useState({equipmentId:"",date:new Date().toISOString().slice(0,10),type:"",technician:"",hours:"",description:"",partsUsed:"",cost:"",nextDate:"",status:"Completado",...initial});
  const s=k=>v=>setF(p=>({...p,[k]:v}));
  const eq=equipment.find(e=>e.id===f.equipmentId);
  const cl=eq?clients.find(c=>c.id===eq.clientId):null;
  return (
    <div>
      <SecH icon="wrench" title="Registro de Mantenimiento" color={C.orangePale}/>
      <Field label="Equipo" value={f.equipmentId} onChange={s("equipmentId")}
        options={equipment.map(e=>e.id)}
        optionLabels={equipment.map(e=>{const c=clients.find(x=>x.id===e.clientId); return (c?c.name+" · ":"")+e.brand+" "+e.model+(e.serial?" ("+e.serial+")":"");})}
        required/>
      {eq&&<div style={{marginTop:-8,marginBottom:12,fontSize:12,color:C.orangePale}}>→ {eq.brand} {eq.model} — SN: {eq.serial||"N/A"}{cl?" · "+cl.name:""}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Fecha" value={f.date} onChange={s("date")} type="date" required/>
        <Field label="Tipo" value={f.type} onChange={s("type")} options={["Preventivo","Correctivo","Predictivo","Overhaul","Inspección","Cambio de aceite"]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Técnico" value={f.technician} onChange={s("technician")} placeholder="Nombre"/>
        <Field label="Horas de trabajo" value={f.hours} onChange={s("hours")} unit="h" type="number"/>
      </div>
      <Field label="Descripción del trabajo" value={f.description} onChange={s("description")} type="textarea" required placeholder="Trabajos realizados..."/>
      <Field label="Repuestos utilizados" value={f.partsUsed} onChange={s("partsUsed")} type="textarea" placeholder="Lista de repuestos con P/N..."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Costo total" value={f.cost} onChange={s("cost")} unit="$" type="number"/>
        <Field label="Próximo servicio" value={f.nextDate} onChange={s("nextDate")} type="date"/>
      </div>
      <Field label="Estado" value={f.status} onChange={s("status")} options={["Completado","En progreso","Pendiente","Cancelado"]}/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn label="Guardar" icon="check" variant="success" onClick={()=>(f.equipmentId&&f.date)&&onSave(f)} full/>
        <Btn label="Cancelar" variant="ghost" onClick={onCancel}/>
      </div>
    </div>
  );
};

const QuoteForm = ({clients,equipment,initial={},onSave,onCancel}) => {
  const [f,setF] = useState({clientId:"",equipmentId:"",title:"",date:new Date().toISOString().slice(0,10),validDays:"30",notes:"",items:[],applyITBMS:true,...initial});
  const s=k=>v=>setF(p=>({...p,[k]:v}));
  const clientEq=equipment.filter(e=>e.clientId===f.clientId);
  const selEq=equipment.find(e=>e.id===f.equipmentId);
  const cl=clients.find(c=>c.id===f.clientId);
  const addBlank=()=>setF(p=>({...p,items:[...p.items,{id:uid(),name:"",pn:"",qty:"1",price:""}]}));
  const addFromPart=(part)=>{if(f.items.find(i=>i.pn===part.pn&&part.pn))return;setF(p=>({...p,items:[...p.items,{id:uid(),name:part.name,pn:part.pn,qty:"1",price:""}]}));};
  const updItem=(id,k,v)=>setF(p=>({...p,items:p.items.map(i=>i.id===id?{...i,[k]:v}:i)}));
  const delItem=(id)=>setF(p=>({...p,items:p.items.filter(i=>i.id!==id)}));
  const subtotal=f.items.reduce((acc,i)=>acc+(parseFloat(i.price)||0)*(parseFloat(i.qty)||1),0);
  const itbmsAmt=f.applyITBMS?subtotal*ITBMS:0;
  const total=subtotal+itbmsAmt;
  const eqParts=selEq?.parts||[];
  return (
    <div>
      <SecH icon="quote" title="Nueva Cotización" color={C.orangePale}/>
      {/* FIX: Show client names not IDs */}
      <Field label="Cliente" value={f.clientId} onChange={v=>{s("clientId")(v);s("equipmentId")("");}}
        options={clients.map(c=>c.id)} optionLabels={clients.map(c=>c.name)}/>
      {cl&&<div style={{marginTop:-8,marginBottom:12,fontSize:12,color:C.bluePale}}>→ {cl.name} · {cl.city}</div>}
      {f.clientId&&<>
        {/* FIX: Show equipment names not IDs */}
        <Field label="Equipo" value={f.equipmentId} onChange={s("equipmentId")}
          options={clientEq.map(e=>e.id)}
          optionLabels={clientEq.map(e=>e.brand+" "+e.model+(e.serial?" (SN: "+e.serial+")":""))}/>
        {selEq&&<div style={{marginTop:-8,marginBottom:12,fontSize:12,color:C.orangePale}}>→ {selEq.brand} {selEq.model} · SN: {selEq.serial||"N/A"}</div>}
      </>}
      <Field label="Título de cotización" value={f.title} onChange={s("title")} placeholder="ej. Repuestos mantenimiento 4000h"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Fecha" value={f.date} onChange={s("date")} type="date"/>
        <Field label="Válido por" value={f.validDays} onChange={s("validDays")} unit="días" type="number"/>
      </div>
      {eqParts.length>0&&<div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>Repuestos del equipo — toca para agregar</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {eqParts.map(p=>{const added=f.items.find(i=>i.pn===p.pn&&p.pn);return<button key={p.id} onClick={()=>!added&&addFromPart(p)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid "+(added?C.greenBr:C.border),background:added?C.greenBr+"18":"#0a1520",color:added?C.greenPale:C.textMid,fontSize:12,fontWeight:700,cursor:added?"default":"pointer",fontFamily:"inherit"}}>{added?"✓ ":""}{p.name||p.pn||"Repuesto"}</button>;})}
        </div>
      </div>}
      <SecH icon="parts" title="Ítems de la Cotización" color={C.bluePale}/>
      {f.items.map((item,i)=>(
        <div key={item.id} style={{background:"#0a1520",border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:"0.08em"}}>Ítem #{i+1}</span>
            <button onClick={()=>delItem(item.id)} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",display:"flex",padding:2}}><Icon name="trash" size={14}/></button>
          </div>
          <Field label="Descripción" value={item.name} onChange={v=>updItem(item.id,"name",v)} placeholder="Descripción del repuesto / servicio" small/>
          <Field label="P/N (opcional)" value={item.pn} onChange={v=>updItem(item.id,"pn",v)} placeholder="Número de parte" small/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Field label="Cantidad" value={item.qty} onChange={v=>updItem(item.id,"qty",v)} type="number" small/>
            <Field label="Precio unit. $" value={item.price} onChange={v=>updItem(item.id,"price",v)} type="number" unit="$" small/>
          </div>
          {item.price&&<div style={{textAlign:"right",fontSize:12,color:C.textMid,marginTop:2}}>Sub: <span style={{color:C.text,fontWeight:700}}>${fmt((parseFloat(item.price)||0)*(parseFloat(item.qty)||1))}</span></div>}
        </div>
      ))}
      <button onClick={addBlank} style={{width:"100%",padding:"9px",background:"transparent",border:"1.5px dashed "+C.border,borderRadius:8,color:C.textDim,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit",marginBottom:16}}>
        <Icon name="plus" size={14}/> Agregar ítem
      </button>
      {f.items.length>0&&<div style={{background:"#0a1e10",border:"1px solid "+C.greenBr+"30",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.textMid,fontSize:13}}>Subtotal</span><span style={{color:C.text,fontWeight:700,fontSize:14}}>${fmt(subtotal)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid "+C.border}}>
          <div><span style={{color:C.textMid,fontSize:13}}>ITBMS (7%)</span>{f.applyITBMS&&<span style={{color:C.textDim,fontSize:12}}> +${fmt(itbmsAmt)}</span>}</div>
          <button onClick={()=>setF(p=>({...p,applyITBMS:!p.applyITBMS}))} style={{padding:"4px 12px",borderRadius:6,border:"1px solid "+(f.applyITBMS?C.greenBr:C.border),background:f.applyITBMS?C.greenBr+"20":"transparent",color:f.applyITBMS?C.greenPale:C.textDim,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            {f.applyITBMS?"✓ Aplicado":"Excluido"}
          </button>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 0"}}><span style={{color:C.text,fontWeight:800,fontSize:14}}>TOTAL</span><span style={{color:C.orangePale,fontWeight:800,fontSize:22}}>${fmt(total)}</span></div>
      </div>}
      <Field label="Notas / condiciones" value={f.notes} onChange={s("notes")} type="textarea" placeholder="Condiciones de pago, tiempo de entrega, garantía..."/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn label="Guardar Cotización" icon="check" variant="success" onClick={()=>(f.clientId&&f.items.length>0)&&onSave({...f,subtotal,itbmsAmt,total})} full/>
        <Btn label="Cancelar" variant="ghost" onClick={onCancel}/>
      </div>
    </div>
  );
};

// ─── QUOTE DETAIL with PDF + Email ────────────────────────────────────────────
const QuoteDetail = ({quote,client,eq,onBack}) => {
  const [emailTo,setEmailTo] = useState(client?.email||"");
  const [sending,setSending] = useState(false);
  const [sent,setSent] = useState(false);
  const exp=new Date(quote.date);exp.setDate(exp.getDate()+(parseInt(quote.validDays)||30));

  const handleEmail = async () => {
    if (!emailTo) return;
    setSending(true);
    // Build mailto link as fallback (EmailJS requires account setup)
    const subject = encodeURIComponent("Cotización FlotecField: "+( quote.title||"Cotización"));
    const body = encodeURIComponent(
      "Estimado cliente,\n\nAdjunto encontrará la cotización "+( quote.title||"")+"\n\n"+
      "Cliente: "+(client?.name||"")+"\n"+
      "Equipo: "+(eq?eq.brand+" "+eq.model:"")+"\n"+
      "Fecha: "+quote.date+"\n"+
      "Válida hasta: "+exp.toISOString().slice(0,10)+"\n\n"+
      "TOTAL: $"+fmt(quote.total)+"\n"+
      (quote.applyITBMS?"(ITBMS incluido)":"(Sin ITBMS)")+"\n\n"+
      "Saludos,\nGrupo Flotec S.A.\nAtlas Copco - Panamá y Centroamérica"
    );
    window.open("mailto:"+emailTo+"?subject="+subject+"&body="+body);
    setSending(false);setSent(true);
    setTimeout(()=>setSent(false),3000);
  };

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1a1200 0%,"+C.surface+" 100%)",borderRadius:12,padding:16,marginBottom:12,border:"1px solid "+C.orangeBr+"30"}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text}}>{quote.title||"Cotización"}</div>
        <div style={{fontSize:12,color:C.textMid,marginTop:4}}>{quote.date} · Válida hasta: {exp.toISOString().slice(0,10)}</div>
        {client&&<div style={{marginTop:8,fontSize:13,color:C.textMid}}>🏢 {client.name}</div>}
        {eq&&<div style={{fontSize:12,color:C.textDim}}>⚙️ {eq.brand} {eq.model} · SN: {eq.serial||"N/A"}</div>}
      </div>

      {/* PDF + Email actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
        <Btn label="Exportar PDF" icon="pdf" variant="primary" onClick={()=>exportQuotePDF(quote,client,eq)} full/>
        <Btn label={sent?"✓ Abierto":"Enviar por Email"} icon="mail" variant="orange" onClick={handleEmail} disabled={sending} full/>
      </div>
      {/* Email input */}
      <div style={{marginBottom:14}}>
        <Field label="Correo destinatario" value={emailTo} onChange={setEmailTo} type="email" placeholder="cliente@empresa.com"/>
      </div>

      <Card>
        <SecH icon="parts" title="Detalle de Ítems" color={C.bluePale}/>
        {quote.items.map((item,i)=>(
          <div key={item.id||i} style={{padding:"8px 0",borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,paddingRight:12}}>
                <div style={{fontWeight:700,color:C.text,fontSize:13}}>{item.name||"Ítem sin nombre"}</div>
                {item.pn&&<div style={{fontSize:11,color:C.textDim}}>P/N: {item.pn}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:C.textMid}}>{item.qty} × ${fmt(parseFloat(item.price)||0)}</div>
                <div style={{fontWeight:700,color:C.text,fontSize:13}}>${fmt((parseFloat(item.price)||0)*(parseFloat(item.qty)||1))}</div>
              </div>
            </div>
          </div>
        ))}
      </Card>
      <Card accent={C.orange}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.textMid,fontSize:13}}>Subtotal</span><span style={{color:C.text,fontWeight:700}}>${fmt(quote.subtotal)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.textMid,fontSize:13}}>ITBMS (7%)</span><span style={{color:quote.applyITBMS?C.text:C.textDim,fontWeight:600}}>{quote.applyITBMS?"$"+fmt(quote.itbmsAmt):"Excluido"}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 0"}}><span style={{color:C.text,fontWeight:800,fontSize:15}}>TOTAL</span><span style={{color:C.orangePale,fontWeight:800,fontSize:22}}>${fmt(quote.total)}</span></div>
      </Card>
      {quote.notes&&<Card><p style={{color:C.textMid,fontSize:13,margin:0,lineHeight:1.6}}>{quote.notes}</p></Card>}
      <div style={{marginTop:12}}><Btn label="Volver" icon="back" variant="ghost" onClick={onBack} full/></div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({clients,equipment,maintenance,quotes}) => {
  const SC={"Operativo":C.greenBr,"En mantenimiento":C.orangeBr,"Fuera de servicio":C.red,"En standby":C.yellow};

  // Alerts: next maintenance due within 30 days
  const today=new Date();
  const alerts=maintenance.filter(m=>{
    if(!m.nextDate)return false;
    const d=new Date(m.nextDate);
    const diff=(d-today)/(1000*60*60*24);
    return diff>=0&&diff<=30;
  }).sort((a,b)=>a.nextDate.localeCompare(b.nextDate));

  // Stats
  const totalQuoteValue=quotes.reduce((acc,q)=>acc+(q.total||0),0);
  const eqByStatus=equipment.reduce((acc,e)=>{const k=e.status||"Operativo";acc[k]=(acc[k]||0)+1;return acc;},{});
  const topClients=clients.map(c=>({...c,eqCount:equipment.filter(e=>e.clientId===c.id).length})).sort((a,b)=>b.eqCount-a.eqCount).slice(0,5);

  // Services by month (last 6)
  const monthlyServices=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setMonth(d.getMonth()-i);
    const key=d.toISOString().slice(0,7);
    const label=d.toLocaleString("es-PA",{month:"short"});
    const count=maintenance.filter(m=>m.date&&m.date.startsWith(key)).length;
    monthlyServices.push({label,count});
  }
  const maxCount=Math.max(...monthlyServices.map(m=>m.count),1);

  return (
    <div>
      <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>📊 Dashboard</div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
        <div style={{background:C.surface,border:"1px solid "+C.blueLight+"30",borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:10,color:C.textDim,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Valor total cotizado</div>
          <div style={{fontSize:20,fontWeight:800,color:C.orangePale}}>${fmt(totalQuoteValue,0)}</div>
          <div style={{fontSize:11,color:C.textDim}}>{quotes.length} cotizaciones</div>
        </div>
        <div style={{background:C.surface,border:"1px solid "+C.greenBr+"30",borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:10,color:C.textDim,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Servicios registrados</div>
          <div style={{fontSize:20,fontWeight:800,color:C.greenPale}}>{maintenance.length}</div>
          <div style={{fontSize:11,color:C.textDim}}>{clients.length} clientes · {equipment.length} equipos</div>
        </div>
      </div>

      {/* Equipment by status */}
      <Card>
        <SecH icon="machine" title="Equipos por Estado" color={C.bluePale}/>
        {Object.entries(eqByStatus).map(([status,count])=>(
          <div key={status} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:SC[status]||C.textDim,flexShrink:0}}/>
            <div style={{flex:1,fontSize:13,color:C.text}}>{status}</div>
            <div style={{width:80,height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
              <div style={{width:(count/equipment.length*100)+"%",height:"100%",background:SC[status]||C.textDim,borderRadius:3}}/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,minWidth:20,textAlign:"right"}}>{count}</div>
          </div>
        ))}
        {equipment.length===0&&<div style={{fontSize:13,color:C.textDim}}>Sin equipos registrados</div>}
      </Card>

      {/* Monthly services chart */}
      <Card>
        <SecH icon="chart" title="Servicios por Mes" color={C.greenPale}/>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:60}}>
          {monthlyServices.map((m,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:"100%",background:m.count>0?C.blueLight:C.border,borderRadius:"3px 3px 0 0",height:m.count>0?(m.count/maxCount*48)+12+"px":"4px",transition:"height 0.3s",minHeight:4}}/>
              <div style={{fontSize:9,color:C.textDim,fontWeight:600}}>{m.label}</div>
              {m.count>0&&<div style={{fontSize:9,color:C.bluePale,fontWeight:700}}>{m.count}</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* Alerts */}
      {alerts.length>0&&(
        <Card accent={C.yellow}>
          <SecH icon="bell" title={"Próximos Mantenimientos ("+alerts.length+")"} color={C.yellow}/>
          {alerts.map(m=>{
            const eq=equipment.find(e=>e.id===m.equipmentId);
            const cl=eq?clients.find(c=>c.id===eq.clientId):null;
            const d=new Date(m.nextDate);
            const diff=Math.round((d-today)/(1000*60*60*24));
            return (
              <div key={m.id} style={{padding:"8px 0",borderBottom:"1px solid "+C.border}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,color:C.text,fontSize:13}}>{eq?eq.brand+" "+eq.model:"Equipo"}</div>
                    {cl&&<div style={{fontSize:11,color:C.textDim}}>{cl.name}</div>}
                  </div>
                  <Badge label={diff===0?"HOY":diff+"d"} color={diff<=7?C.red:C.yellow}/>
                </div>
                <div style={{fontSize:11,color:C.textMid,marginTop:2}}>{m.nextDate} · {m.type}</div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Top clients */}
      <Card>
        <SecH icon="client" title="Clientes con más equipos" color={C.bluePale}/>
        {topClients.length===0?<div style={{fontSize:13,color:C.textDim}}>Sin clientes</div>:
          topClients.map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<topClients.length-1?"1px solid "+C.border:"none"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:C.blue+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.bluePale,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{c.name}</div>
                <div style={{fontSize:11,color:C.textDim}}>{c.industry||"—"} · {c.city}</div>
              </div>
              <Badge label={c.eqCount+" equipo"+(c.eqCount!==1?"s":"")} color={C.blueLight}/>
            </div>
          ))
        }
      </Card>
    </div>
  );
};

// ─── EQ DETAIL ────────────────────────────────────────────────────────────────
const EqDetail = ({eq,client,maintenance,quotes,onEdit,onBack,onAddMaint,onNewQuote,onViewQuote}) => {
  const SC={"Operativo":C.greenBr,"En mantenimiento":C.orangeBr,"Fuera de servicio":C.red,"En standby":C.yellow};
  const TC={"Preventivo":C.blueLight,"Correctivo":C.red,"Predictivo":"#9c27b0","Overhaul":C.orangeBr,"Inspección":C.yellow,"Cambio de aceite":C.greenBr};
  const sc=SC[eq.status]||C.textDim;
  const eqQuotes=quotes.filter(q=>q.equipmentId===eq.id);
  const IR=({label,value,unit})=>value?(<div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.textMid,fontSize:13}}>{label}</span><span style={{color:C.text,fontSize:13,fontWeight:600}}>{value}{unit?" "+unit:""}</span></div>):null;
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#0d2244 0%,"+C.surface+" 100%)",borderRadius:12,padding:16,marginBottom:12,border:"1px solid "+C.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:22,fontWeight:800,color:C.text}}>{eq.brand} {eq.model}</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>S/N: {eq.serial||"—"} · {eq.year||"—"}</div></div>
          <Badge label={eq.status} color={sc}/>
        </div>
        {client&&<div style={{marginTop:10,fontSize:13,color:C.textMid}}>🏢 {client.name} · {client.city}</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
        <Btn label="+ Cotización" icon="quote" variant="orange" onClick={onNewQuote} full/>
        <Btn label="+ Servicio" icon="wrench" variant="primary" onClick={onAddMaint} full/>
      </div>
      <Card accent={C.orange}><SecH icon="gauge" title="Parámetros Técnicos" color={C.orangePale}/><IR label="Tipo" value={eq.type}/><IR label="Presión" value={eq.pressure} unit="psi"/><IR label="Caudal" value={eq.flow} unit="cfm"/><IR label="Potencia" value={eq.power} unit="kW"/><IR label="Voltaje" value={eq.voltage}/><IR label="RPM" value={eq.rpm} unit="rpm"/><IR label="Etapas" value={eq.stages}/><IR label="Enfriamiento" value={eq.cooling}/></Card>
      <Card accent={C.yellow}><SecH icon="alert" title="Condiciones del Sitio" color={C.yellow}/><IR label="Temperatura" value={eq.siteTemp} unit="°C"/><IR label="Humedad" value={eq.siteHumidity} unit="%"/><IR label="Altitud" value={eq.siteAltitude} unit="msnm"/><IR label="Ambiente" value={eq.siteEnvironment}/>{eq.siteNotes&&<p style={{color:"#c8a020",fontSize:13,margin:"8px 0 0"}}>{eq.siteNotes}</p>}</Card>
      {eq.parts?.length>0&&<Card accent={C.blue}><SecH icon="parts" title={"Repuestos ("+eq.parts.length+")"} color={C.bluePale}/>{eq.parts.map((p,i)=>(<div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<eq.parts.length-1?"1px solid "+C.border:"none"}}><div><div style={{color:C.text,fontSize:13,fontWeight:600}}>{p.name||"Sin nombre"}</div>{p.pn&&<div style={{color:C.textDim,fontSize:11}}>P/N: {p.pn}</div>}</div><div style={{color:C.textMid,fontSize:12}}>{p.unit}</div></div>))}</Card>}

      {/* Quote history for this equipment */}
      {eqQuotes.length>0&&(
        <Card accent={C.orange}>
          <SecH icon="history" title={"Cotizaciones del equipo ("+eqQuotes.length+")"} color={C.orangePale}/>
          {eqQuotes.sort((a,b)=>b.date?.localeCompare(a.date)).map(q=>(
            <div key={q.id} onClick={()=>onViewQuote(q)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.border,cursor:"pointer"}}>
              <div>
                <div style={{fontWeight:700,color:C.text,fontSize:13}}>{q.title||"Cotización"}</div>
                <div style={{fontSize:11,color:C.textMid}}>{q.date} · {q.items?.length||0} ítems</div>
              </div>
              <span style={{color:C.orangePale,fontWeight:800,fontSize:14}}>${fmt(q.total)}</span>
            </div>
          ))}
        </Card>
      )}

      <div style={{marginTop:4}}>
        <SecH icon="wrench" title="Historial de Mantenimiento" color={C.bluePale}/>
        {maintenance.length===0?<Empty icon="wrench" text="Sin registros de mantenimiento"/>:
          maintenance.sort((a,b)=>b.date?.localeCompare(a.date)).map(m=>(
            <Card key={m.id} accent={TC[m.type]||C.blue}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontWeight:700,color:C.text,fontSize:14}}>{m.type}</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>{m.date} · {m.technician||"—"}</div></div>
                {m.cost&&<span style={{color:C.greenPale,fontWeight:700,fontSize:14}}>${fmt(parseFloat(m.cost),0)}</span>}
              </div>
              {m.description&&<p style={{margin:"8px 0 0",fontSize:12,color:C.textMid,lineHeight:1.5}}>{m.description}</p>}
              {m.nextDate&&<div style={{marginTop:6,fontSize:11,color:C.yellow}}>⏰ Próximo: {m.nextDate}</div>}
            </Card>
          ))
        }
      </div>
      {eq.notes&&<Card><p style={{color:C.textMid,fontSize:13,margin:0}}>{eq.notes}</p></Card>}
      <div style={{display:"flex",gap:10,marginTop:12}}>
        <Btn label="Editar" icon="edit" variant="primary" onClick={onEdit} full/>
        <Btn label="Volver" icon="back" variant="ghost" onClick={onBack}/>
      </div>
    </div>
  );
};

const ClientDetail = ({client,equipment,quotes,onBack,onEdit,onNewEquipment,onViewEquipment,onNewQuote,onViewQuote}) => {
  const ceq=equipment.filter(e=>e.clientId===client.id);
  const cq=quotes.filter(q=>q.clientId===client.id).sort((a,b)=>b.date?.localeCompare(a.date));
  const SC={"Operativo":C.greenBr,"En mantenimiento":C.orangeBr,"Fuera de servicio":C.red,"En standby":C.yellow};
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#0d1a40 0%,"+C.surface+" 100%)",borderRadius:12,padding:16,marginBottom:12,border:"1px solid "+C.border}}>
        <div style={{fontSize:20,fontWeight:800,color:C.text}}>{client.name}</div>
        <div style={{fontSize:12,color:C.textMid,marginTop:3}}>{client.industry||"—"} · {client.city}, {client.country}</div>
        {client.contact&&<div style={{fontSize:12,color:C.textDim,marginTop:6}}>👤 {client.contact}</div>}
        {client.phone&&<div style={{fontSize:12,color:C.textDim}}>📞 {client.phone}</div>}
        {client.email&&<div style={{fontSize:12,color:C.textDim}}>✉️ {client.email}</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
        <Btn label="+ Equipo" icon="machine" variant="primary" onClick={onNewEquipment} full/>
        <Btn label="+ Cotización" icon="quote" variant="orange" onClick={onNewQuote} full/>
      </div>
      <SecH icon="machine" title={"Equipos ("+ceq.length+")"} color={C.bluePale}/>
      {ceq.length===0?<Empty icon="machine" text="Sin equipos registrados"/>:
        ceq.map(eq=>{const sc=SC[eq.status]||C.textDim;return<Card key={eq.id} accent={sc} onClick={()=>onViewEquipment(eq)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,color:C.text,fontSize:14}}>{eq.brand} {eq.model}</div><div style={{fontSize:11,color:C.textMid,marginTop:2}}>S/N: {eq.serial||"—"}{eq.pressure?" · "+eq.pressure+" psi":""} · {eq.parts?.length||0} repuestos</div></div><Badge label={eq.status||"—"} color={sc}/></div></Card>;})}
      {cq.length>0&&<>
        <SecH icon="history" title={"Cotizaciones ("+cq.length+")"} color={C.orangePale}/>
        {cq.map(q=><Card key={q.id} accent={C.orange} onClick={()=>onViewQuote(q)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,color:C.text,fontSize:13}}>{q.title||"Cotización"}</div><div style={{fontSize:11,color:C.textMid,marginTop:2}}>{q.date} · {q.items?.length||0} ítem(s)</div></div><span style={{color:C.orangePale,fontWeight:800,fontSize:15}}>${fmt(q.total)}</span></div></Card>)}
      </>}
      {client.notes&&<Card><p style={{color:C.textMid,fontSize:13,margin:0}}>{client.notes}</p></Card>}
      <div style={{display:"flex",gap:10,marginTop:12}}>
        <Btn label="Editar" icon="edit" variant="primary" onClick={onEdit} full/>
        <Btn label="Volver" icon="back" variant="ghost" onClick={onBack}/>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]       = useState(undefined);
  const [clients,setClients]         = useState([]);
  const [equipment,setEquipment]     = useState([]);
  const [maintenance,setMaintenance] = useState([]);
  const [quotes,setQuotes]           = useState([]);
  const [tab,setTab]     = useState("home");
  const [view,setView]   = useState(null);
  const [search,setSearch] = useState("");
  const [saving,setSaving] = useState(false);

  useEffect(()=>{ return onAuthStateChanged(auth,u=>setUser(u||null)); },[]);

  useEffect(()=>{
    if(!user) return;
    const unsubs=[
      onSnapshot(collection(db,COL.clients),   s=>setClients(s.docs.map(d=>d.data()))),
      onSnapshot(collection(db,COL.equipment), s=>setEquipment(s.docs.map(d=>d.data()))),
      onSnapshot(collection(db,COL.maintenance),s=>setMaintenance(s.docs.map(d=>d.data()))),
      onSnapshot(collection(db,COL.quotes),    s=>setQuotes(s.docs.map(d=>d.data()))),
    ];
    return ()=>unsubs.forEach(u=>u());
  },[user]);

  const save=useCallback(async(colName,data,id)=>{
    setSaving(true);const rid=id||uid();
    await upsert(colName,rid,{...data,id:rid});
    setSaving(false);setView(null);
  },[]);

  // Upcoming alerts count for badge
  const today=new Date();
  const alertCount=maintenance.filter(m=>{
    if(!m.nextDate)return false;
    const d=new Date(m.nextDate);
    const diff=(d-today)/(1000*60*60*24);
    return diff>=0&&diff<=30;
  }).length;

  if(user===undefined) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,gap:16}}><FlotecMark size={52}/><div style={{color:C.textDim,fontSize:13,fontFamily:"sans-serif"}}>Cargando...</div></div>;
  if(!user) return <Login/>;

  const SC={"Operativo":C.greenBr,"En mantenimiento":C.orangeBr,"Fuera de servicio":C.red,"En standby":C.yellow};

  // View router
  let content=null;
  if(view?.type==="newClient")       content=<ClientForm onSave={f=>save(COL.clients,f)} onCancel={()=>setView(null)}/>;
  else if(view?.type==="editClient") content=<ClientForm initial={view.payload} onSave={f=>save(COL.clients,f,view.payload.id)} onCancel={()=>setView(null)}/>;
  else if(view?.type==="viewClient") content=<ClientDetail client={view.payload} equipment={equipment} quotes={quotes}
    onBack={()=>setView(null)} onEdit={()=>setView({type:"editClient",payload:view.payload})}
    onNewEquipment={()=>setView({type:"newEquipment",payload:{clientId:view.payload.id}})}
    onViewEquipment={eq=>setView({type:"viewEquipment",payload:eq})}
    onNewQuote={()=>setView({type:"newQuote",payload:{clientId:view.payload.id}})}
    onViewQuote={q=>setView({type:"viewQuote",payload:q})}/>;
  else if(view?.type==="newEquipment")   content=<EquipmentForm clients={clients} initial={view.payload||{}} onSave={f=>save(COL.equipment,f)} onCancel={()=>setView(null)}/>;
  else if(view?.type==="editEquipment")  content=<EquipmentForm clients={clients} initial={view.payload} onSave={f=>save(COL.equipment,f,view.payload.id)} onCancel={()=>setView(null)}/>;
  else if(view?.type==="viewEquipment")  content=<EqDetail eq={view.payload}
    client={clients.find(c=>c.id===view.payload.clientId)}
    maintenance={maintenance.filter(m=>m.equipmentId===view.payload.id)}
    quotes={quotes}
    onEdit={()=>setView({type:"editEquipment",payload:view.payload})}
    onBack={()=>setView(null)}
    onAddMaint={()=>setView({type:"newMaint",payload:{equipmentId:view.payload.id}})}
    onNewQuote={()=>setView({type:"newQuote",payload:{clientId:view.payload.clientId,equipmentId:view.payload.id}})}
    onViewQuote={q=>setView({type:"viewQuote",payload:q})}/>;
  else if(view?.type==="newMaint")   content=<MaintForm equipment={equipment} clients={clients} initial={view.payload||{}} onSave={f=>save(COL.maintenance,f)} onCancel={()=>setView(null)}/>;
  else if(view?.type==="newQuote")   content=<QuoteForm clients={clients} equipment={equipment} initial={view.payload||{}} onSave={f=>save(COL.quotes,f)} onCancel={()=>setView(null)}/>;
  else if(view?.type==="viewQuote")  content=<QuoteDetail quote={view.payload} client={clients.find(c=>c.id===view.payload.clientId)} eq={equipment.find(e=>e.id===view.payload.equipmentId)} onBack={()=>setView(null)}/>;
  else if(view?.type==="dashboard")  content=<Dashboard clients={clients} equipment={equipment} maintenance={maintenance} quotes={quotes}/>;

  const HomeTab=()=>(
    <div>
      <div style={{background:"linear-gradient(135deg,#0d2244 0%,#0f1e30 70%,"+C.bg+" 100%)",borderRadius:14,padding:18,marginBottom:16,border:"1px solid "+C.borderBr,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:C.orange+"10"}}/>
        <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:12}}><FlotecMark size={42}/><div><div style={{fontSize:20,fontWeight:800,color:C.text}}>FlotecField</div><div style={{fontSize:11,color:C.blueLight,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase"}}>Perfilador de Equipos</div></div></div>
        <div style={{fontSize:11,color:C.textDim}}>{user.email}{saving&&<span style={{color:C.orangePale}}> · 💾 guardando...</span>}</div>
      </div>

      {/* Alert banner */}
      {alertCount>0&&<div onClick={()=>setView({type:"dashboard"})} style={{background:"#7f1d1d22",border:"1px solid "+C.red+"50",borderRadius:10,padding:"10px 14px",marginBottom:12,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
        <div style={{color:C.red}}><Icon name="bell" size={18}/></div>
        <div style={{flex:1}}><div style={{fontWeight:700,color:C.redPale,fontSize:13}}>⚠️ {alertCount} mantenimiento{alertCount!==1?"s":""} próximo{alertCount!==1?"s":""}</div><div style={{fontSize:11,color:C.textDim}}>Vence en los próximos 30 días · toca para ver</div></div>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[{label:"Clientes",value:clients.length,color:C.blueLight,icon:"client"},{label:"Equipos",value:equipment.length,color:C.orangeBr,icon:"machine"},{label:"Servicios",value:maintenance.length,color:C.greenBr,icon:"wrench"},{label:"Cotizac.",value:quotes.length,color:C.yellow,icon:"quote"}].map(s=>(
          <div key={s.label} style={{background:C.surface,border:"1px solid "+s.color+"25",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
            <div style={{color:s.color,display:"flex",justifyContent:"center",marginBottom:4}}><Icon name={s.icon} size={16}/></div>
            <div style={{fontSize:20,fontWeight:800,color:C.text}}>{s.value}</div>
            <div style={{fontSize:9,color:C.textDim,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase"}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
        <Btn label="+ Cliente" icon="client" variant="ghost" onClick={()=>setView({type:"newClient"})} full/>
        <Btn label="+ Equipo" icon="machine" variant="primary" onClick={()=>setView({type:"newEquipment"})} full/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:16}}>
        <Btn label="+ Cotización" icon="quote" variant="orange" onClick={()=>setView({type:"newQuote"})} full/>
        <Btn label="Dashboard" icon="chart" variant="ghost" onClick={()=>setView({type:"dashboard"})} full/>
      </div>
      <div style={{fontSize:11,fontWeight:800,color:C.textDim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Últimos equipos</div>
      {equipment.slice(-5).reverse().map(eq=>{const cl=clients.find(c=>c.id===eq.clientId);const sc=SC[eq.status]||C.textDim;return<Card key={eq.id} accent={sc} onClick={()=>setView({type:"viewEquipment",payload:eq})}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,color:C.text,fontSize:14}}>{eq.brand} {eq.model}</div><div style={{fontSize:11,color:C.textMid,marginTop:2}}>{cl?.name||"Sin cliente"}{eq.pressure?" · "+eq.pressure+" psi":""}</div></div><Badge label={eq.status||"—"} color={sc}/></div></Card>;})}
      {equipment.length===0&&<Empty icon="machine" text="Agrega tu primer equipo arriba"/>}
    </div>
  );

  const ClientsTab=()=>{const q=search.toLowerCase();const f=clients.filter(c=>c.name?.toLowerCase().includes(q)||c.city?.toLowerCase().includes(q)||c.industry?.toLowerCase().includes(q));return(
    <div>
      <div style={{display:"flex",gap:9,marginBottom:13}}><div style={{position:"relative",flex:1}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{...IB,padding:"9px 12px 9px 34px"}}/><div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textDim}}><Icon name="search" size={15}/></div></div><Btn label="+" variant="primary" onClick={()=>setView({type:"newClient"})}/></div>
      {f.length===0?<Empty icon="client" text="Sin clientes registrados"/>:f.map(c=>{const ec=equipment.filter(e=>e.clientId===c.id).length;const qc=quotes.filter(q=>q.clientId===c.id).length;return<Card key={c.id} accent={C.blue} onClick={()=>setView({type:"viewClient",payload:c})}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontWeight:700,color:C.text,fontSize:15}}>{c.name}</div><div style={{fontSize:12,color:C.textMid,marginTop:3}}>{c.industry||"—"} · {c.city}, {c.country}</div>{c.contact&&<div style={{fontSize:11,color:C.textDim,marginTop:2}}>👤 {c.contact}</div>}</div><div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><Badge label={ec+" equipo"+(ec!==1?"s":"")} color={C.blueLight}/>{qc>0&&<Badge label={qc+" cotiz."} color={C.yellow}/>}</div></div></Card>;})}
    </div>
  );};

  const EquipmentTab=()=>{const q=search.toLowerCase();const f=equipment.filter(e=>{const cl=clients.find(c=>c.id===e.clientId);return e.model?.toLowerCase().includes(q)||e.brand?.toLowerCase().includes(q)||e.serial?.toLowerCase().includes(q)||cl?.name?.toLowerCase().includes(q);});return(
    <div>
      <div style={{display:"flex",gap:9,marginBottom:13}}><div style={{position:"relative",flex:1}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Modelo, S/N, cliente..." style={{...IB,padding:"9px 12px 9px 34px"}}/><div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textDim}}><Icon name="search" size={15}/></div></div><Btn label="+" variant="primary" onClick={()=>setView({type:"newEquipment"})}/></div>
      {f.length===0?<Empty icon="machine" text="Sin equipos registrados"/>:f.map(eq=>{const cl=clients.find(c=>c.id===eq.clientId);const sc=SC[eq.status]||C.textDim;const mc=maintenance.filter(m=>m.equipmentId===eq.id).length;return<Card key={eq.id} accent={sc} onClick={()=>setView({type:"viewEquipment",payload:eq})}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontWeight:700,color:C.text,fontSize:15}}>{eq.brand} {eq.model}</div><div style={{fontSize:11,color:C.textMid,marginTop:2}}>S/N: {eq.serial||"—"} · {eq.year||"—"}</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>🏢 {cl?.name||"Sin cliente"}</div></div><div style={{textAlign:"right"}}><Badge label={eq.status||"—"} color={sc}/>{eq.pressure&&<div style={{fontSize:11,color:C.textMid,marginTop:5}}>{eq.pressure} psi · {eq.flow} cfm</div>}<div style={{fontSize:10,color:C.textDim,marginTop:3}}>{mc} serv. · {eq.parts?.length||0} repuestos</div></div></div></Card>;})}
    </div>
  );};

  const QuotesTab=()=>{const sorted=[...quotes].sort((a,b)=>b.date?.localeCompare(a.date));return(
    <div>
      <div style={{marginBottom:13}}><Btn label="+ Nueva Cotización" icon="quote" variant="orange" onClick={()=>setView({type:"newQuote"})} full/></div>
      {sorted.length===0?<Empty icon="quote" text="Sin cotizaciones generadas"/>:sorted.map(q=>{const cl=clients.find(c=>c.id===q.clientId);const eq=equipment.find(e=>e.id===q.equipmentId);return<Card key={q.id} accent={C.orange} onClick={()=>setView({type:"viewQuote",payload:q})}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1,paddingRight:10}}><div style={{fontWeight:700,color:C.text,fontSize:14}}>{q.title||"Cotización"}</div><div style={{fontSize:11,color:C.textMid,marginTop:2}}>{q.date}</div>{cl&&<div style={{fontSize:11,color:C.textDim,marginTop:2}}>🏢 {cl.name}</div>}{eq&&<div style={{fontSize:11,color:C.textDim}}>⚙️ {eq.brand} {eq.model}</div>}<div style={{fontSize:11,color:C.textDim,marginTop:2}}>{q.items?.length||0} ítem(s) · ITBMS: {q.applyITBMS?"Sí":"No"}</div></div><div style={{color:C.orangePale,fontWeight:800,fontSize:17}}>${fmt(q.total)}</div></div></Card>;})}
    </div>
  );};

  const tabs=[{id:"home",label:"Inicio",icon:"home"},{id:"clients",label:"Clientes",icon:"client"},{id:"equipment",label:"Equipos",icon:"machine"},{id:"quotes",label:"Cotizac.",icon:"quote"}];
  const VT={newClient:"Nuevo Cliente",editClient:"Editar Cliente",viewClient:view?.payload?.name,newEquipment:"Nuevo Equipo",editEquipment:"Editar Equipo",viewEquipment:(view?.payload?.brand||"")+" "+(view?.payload?.model||""),newMaint:"Registrar Servicio",newQuote:"Nueva Cotización",viewQuote:view?.payload?.title||"Cotización",dashboard:"Dashboard"};

  return (
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Sans','Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.topBar,borderBottom:"1px solid "+C.border,padding:"11px 16px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",gap:12}}>
        {view?<button onClick={()=>setView(null)} style={{background:"none",border:"none",color:C.textMid,cursor:"pointer",display:"flex",padding:4}}><Icon name="back" size={20}/></button>:<FlotecMark size={30}/>}
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>{view?VT[view.type]||"Detalle":"FlotecField"}</div>
          {!view&&<div style={{fontSize:10,color:C.textDim,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase"}}>Grupo Flotec S.A.</div>}
        </div>
        {saving&&<div style={{width:7,height:7,borderRadius:"50%",background:C.orange}}/>}
        {alertCount>0&&!view&&<div style={{width:18,height:18,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{alertCount}</div>}
        {!view&&<button onClick={()=>signOut(auth)} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",display:"flex",padding:4}} title="Cerrar sesión"><Icon name="logout" size={18}/></button>}
      </div>
      <div style={{flex:1,padding:"16px 16px 88px",overflowY:"auto"}}>
        {view?content:tab==="home"?<HomeTab/>:tab==="clients"?<ClientsTab/>:tab==="equipment"?<EquipmentTab/>:<QuotesTab/>}
      </div>
      {!view&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.navBg,borderTop:"1px solid "+C.border,display:"flex",zIndex:100}}>
        {tabs.map(t=>{const a=tab===t.id;return<button key={t.id} onClick={()=>{setTab(t.id);setSearch("");}} style={{flex:1,background:a?C.blue+"18":"none",border:"none",borderTop:"2px solid "+(a?C.blue:"transparent"),padding:"9px 4px 11px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:a?C.bluePale:C.textDim,transition:"all 0.15s",fontFamily:"inherit"}}><Icon name={t.icon} size={20}/><span style={{fontSize:10,fontWeight:a?700:500,letterSpacing:"0.05em"}}>{t.label}</span></button>;})}
      </div>}
    </div>
  );
}
