/** Camera math reference only. Port into src/ui/ending-tree.ts (or import adapted). */
export class TreeCamera {
  constructor({minScale=0.35,maxScale=2.2,scale=1,tx=0,ty=0}={}){
    this.minScale=minScale; this.maxScale=maxScale; this.scale=scale; this.tx=tx; this.ty=ty;
  }
  worldFromScreen(x,y){return {x:(x-this.tx)/this.scale,y:(y-this.ty)/this.scale};}
  screenFromWorld(x,y){return {x:x*this.scale+this.tx,y:y*this.scale+this.ty};}
  panBy(dx,dy){this.tx+=dx;this.ty+=dy;return this;}
  zoomAt(x,y,factor){
    const world=this.worldFromScreen(x,y);
    const target=Math.max(this.minScale,Math.min(this.maxScale,this.scale*factor));
    this.scale=target;
    this.tx=x-world.x*target;this.ty=y-world.y*target;
    return this;
  }
  centerWorld(x,y,viewWidth,viewHeight){
    this.tx=viewWidth/2-x*this.scale;
    this.ty=viewHeight/2-y*this.scale;
    return this;
  }
  visibleWorldRect(width,height){
    const a=this.worldFromScreen(0,0),b=this.worldFromScreen(width,height);
    return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};
  }
  fit(bounds,width,height,padding=20){
    if(width<=0||height<=0||bounds.width<=0||bounds.height<=0)throw Error('invalid fit dimensions');
    this.scale=Math.max(this.minScale,Math.min(this.maxScale,Math.min((width-2*padding)/bounds.width,(height-2*padding)/bounds.height)));
    return this.centerWorld(bounds.x+bounds.width/2,bounds.y+bounds.height/2,width,height);
  }
}
/** Mini-map viewport / point conversion with uniform scale and inset. */
export function minimapTransform(bounds,width,height,padding=8){
  if(width<=0||height<=0||bounds.width<=0||bounds.height<=0)throw Error('invalid minimap dimensions');
  const scale=Math.min((width-padding*2)/bounds.width,(height-padding*2)/bounds.height);
  const offsetX=(width-bounds.width*scale)/2;
  const offsetY=(height-bounds.height*scale)/2;
  return {
    scale,offsetX,offsetY,
    project:(x,y)=>({x:offsetX+(x-bounds.x)*scale,y:offsetY+(y-bounds.y)*scale}),
    unproject:(x,y)=>({x:bounds.x+(x-offsetX)/scale,y:bounds.y+(y-offsetY)/scale}),
    rect:r=>({x:offsetX+(r.x-bounds.x)*scale,y:offsetY+(r.y-bounds.y)*scale,width:r.width*scale,height:r.height*scale})
  };
}
