import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {TreeCamera,minimapTransform} from './tree-camera.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('screen world inverse and pan',()=>{
 const c=new TreeCamera({scale:1.2,tx:25,ty:-13});const p=c.worldFromScreen(111,99);const q=c.screenFromWorld(p.x,p.y);approx(q.x,111);approx(q.y,99);c.panBy(22,33);approx(c.tx,47);approx(c.ty,20);
});
test('wheel anchor does not slide',()=>{
 const c=new TreeCamera({scale:1,tx:13,ty:27});const before=c.worldFromScreen(150,200);c.zoomAt(150,200,1.75);const after=c.worldFromScreen(150,200);approx(after.x,before.x);approx(after.y,before.y);
});
test('fit centers graph',()=>{
 const c=new TreeCamera();c.fit({x:100,y:200,width:800,height:400},800,600);const p=c.screenFromWorld(500,400);approx(p.x,400);approx(p.y,300);
});
test('minimap pointer maps onto world; viewport rectangle',()=>{
 const bounds={x:10,y:20,width:1200,height:900};const mm=minimapTransform(bounds,140,90);const p=mm.project(750,430),q=mm.unproject(p.x,p.y);approx(q.x,750);approx(q.y,430);
 const c=new TreeCamera({scale:0.55,tx:-20,ty:30});const rect=c.visibleWorldRect(390,720);const mr=mm.rect(rect);approx(mr.width,rect.width*mm.scale);
});
