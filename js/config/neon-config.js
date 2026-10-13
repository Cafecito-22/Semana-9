async function enviar(queries,transaction=false){
  const response=await fetch('/api/database',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries,transaction})});
  const result=await response.json();
  if(!response.ok){const error=new Error(result.error||'No se pudo completar la operación.');error.code=result.code;throw error;}
  return result;
}
export function sql(id,values=[]){
  const query={id,values};
  return {query,then(resolve,reject){return enviar([query]).then(result=>result[0]).then(resolve,reject);}};
}
sql.transaction=queries=>enviar(queries.map(item=>item.query),true);
export function verificarConexion(){if(location.protocol==='file:')throw new Error('Abre la aplicación desde Vercel o vercel dev.');}
