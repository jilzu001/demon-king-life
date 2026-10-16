#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const f=process.argv[2];if(!f)throw Error('Usage: node scripts/validate-tree.mjs path-to-ending-tree.json');
const data=JSON.parse(await readFile(f,'utf8'));
if(data.schemaVersion!==2||!Number.isInteger(data.endingCount)||data.endingCount<1)throw Error('schema/ending count invalid');
const nodes=new Map(data.nodes.map(n=>[n.id,n]));
if(nodes.size!==data.nodes.length)throw Error('duplicate node');
for(const edge of data.edges){if(!nodes.has(edge.from)||!nodes.has(edge.to))throw Error('dangling edge');}
for(const [id,route] of Object.entries(data.routes)){
 if(route[0]!=='origin'||route.at(-1)!==`ending:${id}`)throw Error(`bad route ${id}`);
 for(let i=1;i<route.length;i++)if(!data.edges.some(edge=>edge.from===route[i-1]&&edge.to===route[i]))throw Error(`disconnected route in ${id}`);
}
if(Object.keys(data.routes).length!==data.endingCount)throw Error('routes/ending count mismatch');
console.log(`OK: complete DAG with ${data.endingCount} verified route exemplars; ${nodes.size} graph nodes`);
