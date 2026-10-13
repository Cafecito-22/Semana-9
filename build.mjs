import { mkdirSync,cpSync,readdirSync } from 'node:fs';
mkdirSync('public',{recursive:true});
for(const name of readdirSync('.'))if(name.endsWith('.html')||['css','js','img'].includes(name))cpSync(name,`public/${name}`,{recursive:true});
