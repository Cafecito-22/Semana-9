import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';
const registry=JSON.parse(readFileSync(new URL('../server/queries.json',import.meta.url),'utf8'));
function signature(value){return createHmac('sha256',process.env.SESSION_SECRET).update(value).digest('base64url');}
function session(req){
  try{
    const cookie=req.headers.cookie?.split('; ').find(item=>item.startsWith('sunat_session='))?.slice(14);
    const [data,mac]=cookie.split('.');
    const expected=signature(data);
    if(mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;
    const user=JSON.parse(Buffer.from(data,'base64url').toString());
    return user.exp>Date.now()?user:null;
  }catch{return null;}
}
function setSession(res,user){
  const data=Buffer.from(JSON.stringify({id:user.id,rol:user.rol,exp:Date.now()+28800000})).toString('base64url');
  res.setHeader('Set-Cookie',`sunat_session=${data}.${signature(data)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.VERCEL?'; Secure':''}`);
}
function fail(message,status=403,code){throw Object.assign(new Error(message),{status,code});}
function tariff(regimen){if(!['nrus','mype','general'].includes(regimen))fail('Régimen inválido.',400);return regimen==='nrus'?10:25;}
function passwordMatches(password,stored){
  try{
    if(!stored.startsWith('scrypt$'))return stored===password;
    const [,salt,hash]=stored.split('$');
    const expected=Buffer.from(hash,'hex');const actual=scryptSync(password,salt,64);
    return expected.length===actual.length&&timingSafeEqual(expected,actual);
  }catch{return false;}
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'});
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Origen no permitido.'});
  if(!process.env.DATABASE_URL||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)return res.status(503).json({error:'Configura DATABASE_URL y SESSION_SECRET en el servidor.'});
  try{
    if(req.body?.logout){res.setHeader('Set-Cookie','sunat_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return res.json({ok:true});}
    const db=neon(process.env.DATABASE_URL);
    const queries=req.body?.queries;
    const transaction=req.body?.transaction===true;
    if(!Array.isArray(queries)||queries.length<1||queries.length>3||(!transaction&&queries.length!==1))fail('Petición inválida.',400);
    let user=session(req);
    if(user){const rows=await db.query('SELECT id,COALESCE(rol,\'cliente\') AS rol FROM usuarios WHERE id=$1',[user.id]);user=rows[0];}
    const ids=queries.map(q=>q.id);
    if(ids.length===1&&ids[0]==='q4'){
      const values=queries[0].values;
      if(!Array.isArray(values)||values.length!==2||values.some(v=>typeof v!=='string'||v.length>500))fail('Datos inválidos.',400);
      const rows=await db.query("SELECT id,nombre,correo,COALESCE(rol,'cliente') AS rol,dni,contrasena FROM usuarios WHERE LOWER(correo)=LOWER($1) LIMIT 1",[values[0]]);
      if(!rows.length||!passwordMatches(values[1],rows[0].contrasena))return res.json([[]]);
      const {contrasena,...account}=rows[0];setSession(res,account);return res.json([[account]]);
    }
    const payment=ids.includes('q16')?queries.find(q=>q.id==='q16'):null;
    if(transaction&&!((ids.join(',')==='q6,q7')||(ids.join(',')==='q19,q16,q17')||(ids.join(',')==='q21,q16,q17')))fail('Transacción no permitida.');
    const prepared=[];
    for(const item of queries){
      const def=registry[item.id];
      if(!def||!Array.isArray(item.values)||item.values.length!==def.count||item.values.some(v=>v!==null&&!['number','string','boolean'].includes(typeof v)))fail('Consulta inválida.',400);
      const values=[...item.values];let query=def.query;
      const auth=['q3','q4'].includes(item.id);
      if(item.id==='q3'){
        if(values.some(v=>typeof v!=='string')||values[2].length<4||values[2].length>500)fail('Datos de registro inválidos.',400);
        const salt=randomBytes(16).toString('hex');values[2]='scrypt$'+salt+'$'+scryptSync(values[2],salt,64).toString('hex');
      }
      if(!auth&&!user)fail('Inicia sesión.',401);
      if(auth&&transaction)fail('Petición inválida.',400);
      if(def.source.includes('/panel/')&&!['administrador','empleado'].includes(user.rol))fail('Acceso denegado.');
      if(item.id==='q22'&&user.rol!=='administrador')fail('Acceso denegado.');
      if(def.source.includes('/caja/')&&!['administrador','cajero'].includes(user.rol))fail('Acceso denegado.');
      if(!auth)def.expressions.forEach((expr,i)=>{if(['usuario.id','idUsuario'].includes(expr))values[i]=user.id;});
      if(item.id==='q2')values[4]=tariff(values[3]);
      if(item.id==='q25')values[5]=tariff(values[4]);
      if(item.id==='q26')values[5]=tariff(values[4]);
      if(item.id==='q27')values[6]=tariff(values[5]);
      if(['q15','q16','q17'].includes(item.id)){
        const index=item.id==='q17'?0:1;
        const rows=await db.query('SELECT id,id_usuario,monto_calculado,estado_pago FROM solicitudes_clave_sol WHERE id=$1',[values[index]]);
        const record=rows[0];
        if(!record||Number(record.id_usuario)!==Number(user.id))fail('Solicitud no disponible.');
        if(item.id!=='q15'&&record.estado_pago!=='pendiente')fail('Esta solicitud ya fue pagada.',409,'23505');
        if(item.id!=='q17')values[7]=Number(record.monto_calculado);
        if(item.id==='q16'&&!transaction)fail('El pago requiere una transacción.');
        if(item.id==='q17'&&Number(values[0])!==Number(payment?.values[1]))fail('Solicitud inválida.');
      }
      if(['q19','q21'].includes(item.id)){
        if(!payment||Number(values[0])<=0)fail('Transacción de pago inválida.');
        const rows=await db.query('SELECT monto_calculado FROM solicitudes_clave_sol WHERE id=$1 AND id_usuario=$2',[payment.values[1],user.id]);
        if(!rows.length)fail('Solicitud no disponible.');
        values[0]=Number(rows[0].monto_calculado);
      }
      if(item.id==='q6'){
        if(!transaction)fail('El cobro requiere una transacción.');
        const rows=await db.query('SELECT id_usuario,monto_calculado,estado_pago FROM solicitudes_clave_sol WHERE id=$1',[values[1]]);
        const record=rows[0];if(!record||record.estado_pago!=='pendiente')fail('Solicitud no disponible.',409);
        values[2]=record.id_usuario;values[6]=Number(record.monto_calculado);
        if(values[3]==='efectivo'&&Number(values[7])<values[6])fail('Efectivo insuficiente.',400);
        values[8]=values[3]==='efectivo'?Number(values[7])-values[6]:0;
      }
      if(item.id==='q7'&&(!transaction||Number(values[0])!==Number(queries[0].values[1])))fail('Cobro inválido.');
      if(item.id==='q11'&&user.rol==='cliente'){query=query.replace("AND p.estado='aprobado'","AND p.estado='aprobado' AND p.id_usuario=$2");values.push(user.id);}
      if(['q18','q20'].includes(item.id)&&user.rol!=='cliente')fail('Acceso denegado.');
      prepared.push(db.query(query,values));
    }
    const results=transaction?await db.transaction(prepared):[await prepared[0]];
    if(['q3','q4'].includes(ids[0])&&results[0][0])setSession(res,results[0][0]);
    return res.json(results);
  }catch(error){return res.status(error.status||400).json({error:error.status?error.message:'No se pudo completar la operación en la base de datos.',code:/^\d{5}$/.test(error.code||'')?error.code:undefined});}
}
