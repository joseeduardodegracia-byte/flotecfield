import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

const C = { bg:"#0b1624", surface:"#0f1e30", border:"#1c3050", blue:"#1565c0", blueLight:"#1e88e5", orange:"#e65100", orangeBr:"#f57c00", text:"#e3edf8", textMid:"#8aacc8", textDim:"#3d6080" };

export default function Login() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const [mode,setMode] = useState("login");

  const handle = async () => {
    if (!email||!password) { setError("Completa todos los campos."); return; }
    setLoading(true); setError("");
    try {
      if (mode==="login") await signInWithEmailAndPassword(auth,email,password);
      else await createUserWithEmailAndPassword(auth,email,password);
    } catch(e) {
      const msgs = { "auth/user-not-found":"Usuario no encontrado.", "auth/wrong-password":"Contraseña incorrecta.", "auth/invalid-email":"Correo inválido.", "auth/email-already-in-use":"Ese correo ya está registrado.", "auth/weak-password":"Mínimo 6 caracteres.", "auth/invalid-credential":"Correo o contraseña incorrectos." };
      setError(msgs[e.code]||"Error: "+e.message);
    }
    setLoading(false);
  };

  const IB = { width:"100%", padding:"12px 14px", borderRadius:8, border:"1.5px solid "+C.border, background:"#0a1520", color:C.text, fontSize:15, outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:12 };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'IBM Plex Sans','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,"+C.blue+" 0%,"+C.blueLight+" 100%)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke={C.orange} strokeWidth="2.5"/>
              <circle cx="12" cy="12" r="4" stroke={C.orange} strokeWidth="2"/>
              <circle cx="12" cy="12" r="1.5" fill="#fff"/>
              <line x1="12" y1="3" x2="12" y2="6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="3" y1="12" x2="6" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="18" y1="12" x2="21" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:C.text }}>FlotecField</div>
          <div style={{ fontSize:12, color:C.blueLight, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:4 }}>Grupo Flotec S.A.</div>
        </div>
        <div style={{ background:C.surface, border:"1.5px solid "+C.border, borderRadius:14, padding:"28px 24px" }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20 }}>{mode==="login"?"Iniciar sesión":"Crear cuenta"}</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Correo electrónico" style={IB} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" style={{...IB,marginBottom:error?8:20}} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          {error&&<div style={{ fontSize:13, color:"#ef9a9a", marginBottom:14, padding:"8px 12px", background:"#7f1d1d22", borderRadius:6, border:"1px solid #7f1d1d" }}>{error}</div>}
          <button onClick={handle} disabled={loading} style={{ width:"100%", padding:"13px", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, fontFamily:"inherit", marginBottom:16 }}>
            {loading?"Cargando...":mode==="login"?"Entrar":"Crear cuenta"}
          </button>
          <div style={{ textAlign:"center", fontSize:13, color:C.textDim }}>
            {mode==="login"?"¿No tienes cuenta?":"¿Ya tienes cuenta?"}{" "}
            <button onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}} style={{ background:"none", border:"none", color:"#42a5f5", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>
              {mode==="login"?"Crear cuenta":"Iniciar sesión"}
            </button>
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:C.textDim }}>Atlas Copco · Panamá y Centroamérica</div>
      </div>
    </div>
  );
}
