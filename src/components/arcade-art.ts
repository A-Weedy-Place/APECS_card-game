import { ARCADE_SIZE, gateIndices, iceGate, laneY, type ArcadeVariant, type PuffinState, type ReefState, type Trash } from "@/game/arcade";
type Ctx = CanvasRenderingContext2D;
const TAU=Math.PI*2;
function shape(ctx:Ctx,points:number[][],fill:string|CanvasGradient,stroke?:string) {
  ctx.beginPath(); points.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.6;ctx.stroke();}
}
function ellipse(ctx:Ctx,x:number,y:number,rx:number,ry:number,fill:string) {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=fill;ctx.fill();}
function line(ctx:Ctx,points:number[][],colour:string,width=2) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.stroke();}
function star(ctx:Ctx,x:number,y:number,r:number,colour:string) {shape(ctx,Array.from({length:8},(_,i)=>[x+Math.cos(i*Math.PI/4)*r*(i%2?.42:1),y+Math.sin(i*Math.PI/4)*r*(i%2?.42:1)]),colour);}
export function drawPuffin(ctx:Ctx,state:PuffinState,renderFrame:number,reduced:boolean,y=state.y,variant:ArcadeVariant="classic") {
  const t=reduced?0:renderFrame;
  const sky=ctx.createLinearGradient(0,0,0,420);sky.addColorStop(0,"#183b65");sky.addColorStop(.6,"#5db1c8");sky.addColorStop(1,"#c5f0ed");ctx.fillStyle=sky;ctx.fillRect(0,0,420,420);
  const sun=ctx.createRadialGradient(330,83,5,330,83,100);sun.addColorStop(0,"#f9edbf99");sun.addColorStop(1,"#ecf4d400");ctx.fillStyle=sun;ctx.fillRect(230,0,190,185);ellipse(ctx,330,83,25,25,"#f8ecd7");
  for(let i=0;i<5;i++){const x=((i*127-t*.12+900)%620)-100;ellipse(ctx,x,64+i%3*31,42,8,"#e3f5ee25");ellipse(ctx,x+25,64+i%3*31,30,11,"#e3f5ee25");}
  for(let i=0;i<5;i++){
    const x=((i*150-t*.12+950)%750)-150;
    shape(ctx,[[x-75,340],[x,206+i%3*25],[x+43,268],[x+81,229],[x+166,340]],"#477b985a");
    shape(ctx,[[x-23,252+i%3*13],[x,206+i%3*25],[x+25,241+i%3*13],[x+6,231+i%3*17]],"#def0ee77");
  }
  ctx.fillStyle="#3a91ac";ctx.fillRect(0,345,420,75);
  for(let i=0;i<13;i++){const x=((i*43-t*.35+600)%530)-45;line(ctx,[[x,354+i%5*11],[x+23,354+i%5*11]],"#bde8e955",1.5);}
  for(const i of gateIndices(renderFrame,variant)){
    const gate=iceGate(i,renderFrame,variant);if(gate.x< -70||gate.x>435)continue;
    const top=gate.centre-gate.gap/2,bottom=gate.centre+gate.gap/2;
    iceberg(ctx,gate.x,0,gate.width,top,true);iceberg(ctx,gate.x,bottom,gate.width,420-bottom,false);
    if(variant==="endless"?state.lastCollected!==i:!(state.collected&(1<<i))){ellipse(ctx,gate.x+26,gate.centre,14,14,"#f7d77627");star(ctx,gate.x+26,gate.centre,10,"#ffe49a");star(ctx,gate.x+26,gate.centre,4,"#fffbe4");}
    else if(!reduced){for(let p=0;p<4;p++)star(ctx,gate.x+26+Math.cos(p*1.6+t*.03)*19,gate.centre+Math.sin(p*1.6+t*.03)*19,3,"#fff1b5aa");}
  }
  if(!reduced)for(let i=1;i<5;i++)ellipse(ctx,98-i*12,y+Math.sin(t*.16-i)*3,3.5-i*.5,2.5,"#f8e9c6"+Math.round((.6-i*.1)*255).toString(16).padStart(2,"0"));
  ctx.save();ctx.translate(98,y);ctx.rotate(Math.max(-.32,Math.min(.6,state.velocity/14)));
  shape(ctx,[[-15,-3],[-30,-10],[-26,4],[-15,8]],"#16364a","#102c40");
  ellipse(ctx,0,1,20,17,"#102e43");ellipse(ctx,5,4,13,13,"#fff5df");
  ctx.save();ctx.translate(-5,4);ctx.rotate(reduced?-.35:Math.sin(t*.42)*.45-.3);ellipse(ctx,-3,0,12,6,"#3b6076");line(ctx,[[-10,0],[-1,2]],"#81b3c1",1.4);ctx.restore();
  ellipse(ctx,8,-7,12,13,"#f8f1de");shape(ctx,[[16,-8],[31,-2],[17,4]],"#f2a25e","#9e5437");line(ctx,[[17,-2],[28,-2]],"#b95135",1.3);
  ellipse(ctx,11,-9,3,3.8,"#142d40");ellipse(ctx,12,-10.3,1,1,"white");
  shape(ctx,[[-2,16],[4,20],[11,18],[9,14]],"#ee9658");ctx.restore();
  shape(ctx,[[0,410],[65,403],[106,412],[158,407],[199,416],[259,405],[318,411],[370,402],[420,409],[420,420],[0,420]],"#b9e8e7");
}
function iceberg(ctx:Ctx,x:number,y:number,width:number,height:number,top:boolean) {
  if(height<=0)return;
  const edge=top?y+height:y,outer=top?y:y+height;
  const gradient=ctx.createLinearGradient(x,0,x+width,0);gradient.addColorStop(0,"#e6fbf6");gradient.addColorStop(.45,"#a2dfdf");gradient.addColorStop(1,"#3d92ad");
  shape(ctx,[[x,outer],[x+width,outer],[x+width,edge+(top?-8:8)],[x+width*.65,edge],[x+width*.4,edge+(top?-5:5)],[x,edge]],gradient,"#2d718b");
  shape(ctx,[[x+width*.63,outer],[x+width,outer],[x+width,edge+(top?-8:8)],[x+width*.63,edge]],"#2c7d9d44");
  line(ctx,[[x+7,edge+(top?-10:10)],[x+width*.4,edge+(top?-14:14)],[x+width*.6,edge+(top?-9:9)]],"#f1ffffaa",2.2);
  const mid=(edge+outer)/2;line(ctx,[[x+11,mid-17],[x+23,mid],[x+16,mid+17]],"#538fa566",1.4);
}
export function drawReef(ctx:Ctx,state:ReefState,renderFrame:number,reduced:boolean,y=state.y) {
  const t=reduced?0:renderFrame,sea=ctx.createLinearGradient(0,0,0,420);sea.addColorStop(0,"#168a9b");sea.addColorStop(.48,"#0c5f80");sea.addColorStop(1,"#092e50");ctx.fillStyle=sea;ctx.fillRect(0,0,420,420);
  for(let i=0;i<4;i++)shape(ctx,[[i*140-60,0],[i*140-25,0],[i*140+90+Math.sin(t*.004)*10,420],[i*140-20,420]],"#a6f1e20a");
  for(let i=0;i<12;i++){const x=(i*83+35)%420,yy=(i*97-t*.25+700)%470-20;ctx.beginPath();ctx.arc(x,yy,2+i%3,0,TAU);ctx.strokeStyle="#b5f6eb44";ctx.lineWidth=1;ctx.stroke();}
  for(let lane=0;lane<3;lane++){ctx.setLineDash([3,14]);line(ctx,[[28,laneY(lane as 0|1|2)],[420,laneY(lane as 0|1|2)]],"#9bedea19",1);ctx.setLineDash([]);}
  shape(ctx,[[0,394],[57,379],[107,397],[166,389],[220,404],[305,381],[365,392],[420,376],[420,420],[0,420]],"#123e54");
  for(let i=0;i<11;i++){
    const x=i*43-10,base=420,h=21+i%4*14;
    ctx.strokeStyle=i%2?"#287a79":"#39796f";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,base);ctx.bezierCurveTo(x+14,base-h*.4,x-8+Math.sin(t*.018+i)*7,base-h*.6,x+Math.sin(t*.014+i)*7,base-h);ctx.stroke();
    if(i%3===0){ctx.strokeStyle="#c47b7b99";ctx.lineWidth=4;line(ctx,[[x+15,416],[x+15,390],[x+6,380]],"#c47b7b99",4);line(ctx,[[x+15,402],[x+29,389],[x+31,377]],"#c47b7b99",4);}
  }
  for(const item of state.trash)drawTrash(ctx,item,renderFrame-state.frame);
  for(const bubble of state.bubbles){ellipse(ctx,bubble.x,bubble.y,6.5,6.5,"#97f2ee55");ctx.beginPath();ctx.arc(bubble.x,bubble.y,6.5,0,TAU);ctx.strokeStyle="#c0fff1";ctx.lineWidth=1.8;ctx.stroke();ellipse(ctx,bubble.x-2,bubble.y-2,1.7,1.7,"#ffffff");}
  for(const splash of state.splashes){const age=(state.frame-splash.frame)/25;if(reduced)continue;for(let i=0;i<7;i++){const angle=i/7*TAU;ellipse(ctx,splash.x+Math.cos(angle)*(10+age*24),splash.y+Math.sin(angle)*(10+age*24),3*(1-age),3*(1-age),splash.hit?"#ffb38c":"#a4fff1");}}
  const boost=state.boostUntil>state.frame;
  ctx.save();ctx.translate(72,y);
  if(state.frame<state.invulnerableUntil)ctx.globalAlpha=.55;
  if(boost){ctx.beginPath();ctx.arc(0,0,31,0,TAU);ctx.strokeStyle="#9affdf88";ctx.lineWidth=3;ctx.stroke();}
  shape(ctx,[[-16,0],[-33,-15],[-30,1],[-33,15]],"#e77c4a","#6c4941");
  shape(ctx,[[-6,-13],[0,-25],[13,-12]],"#f9c867","#9c693a");
  ellipse(ctx,0,0,23,17,"#f4a85a");ellipse(ctx,7,4,15,10,"#ffe3a2");
  ctx.save();ctx.rotate(reduced?0:Math.sin(t*.3)*.17);ellipse(ctx,-6,4,8,4,"#da784b");ctx.restore();
  ellipse(ctx,11,-5,8,9,"#fff5df");ellipse(ctx,14,-5,3.8,4.5,"#14384b");ellipse(ctx,15,-7,1.3,1.3,"white");
  ellipse(ctx,22,4,4,3,"#4a6466");line(ctx,[[-16,-4],[-6,-6]],"#fff0b366",1.4);ctx.restore();
}
function drawTrash(ctx:Ctx,item:Trash,interpolation:number) {
  ctx.save();ctx.translate(item.x-interpolation*(2.1+.0019*1080),laneY(item.lane));
  if(item.kind==="net"){
    ctx.fillStyle="#e8a87b11";ctx.fillRect(-17,-32,34,64);ctx.strokeStyle="#f3b27b";ctx.lineWidth=2;ctx.strokeRect(-17,-32,34,64);
    for(let i=-1;i<=1;i++)line(ctx,[[i*11,-31],[i*11,31]],"#f3b27b99",1.2);
    for(let i=-2;i<=2;i++)line(ctx,[[-16,i*11],[16,i*11]],"#f3b27b99",1.2);
    ellipse(ctx,0,-36,10,10,"#f7bb80");ctx.fillStyle="#6a3b32";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillText("!",0,-31);ctx.textAlign="left";
  }else if(item.kind==="bottle"){
    ctx.rotate(.2);shape(ctx,[[-5,-25],[5,-25],[5,-15],[10,-10],[10,21],[-10,21],[-10,-10],[-5,-15]],"#8ad5b7bb","#cef3cf");ctx.fillStyle="#bed8ab";ctx.fillRect(-6,-27,12,5);ctx.fillStyle="#e7d7b2";ctx.fillRect(-9,-1,18,12);line(ctx,[[-5,-8],[-5,-4]],"#fff7da",2);
  }else if(item.kind==="bag"){
    shape(ctx,[[-5,-15],[-10,-24],[1,-22],[8,-26],[7,-15],[19,-1],[21,15],[12,23],[-12,22],[-22,10],[-18,-3]],"#78858c","#c5d7d7");line(ctx,[[-5,-12],[-7,10],[4,15]],"#c1c8c777",1.5);line(ctx,[[5,-8],[12,10]],"#45586e99",2);
    if(item.hp===1)line(ctx,[[-14,5],[0,-2],[9,5]],"#e6f6ee",2);
  }else{
    ctx.rotate(-.22);ctx.fillStyle="#d88791";ctx.fillRect(-12,-18,24,36);ellipse(ctx,0,-18,12,4,"#d2dfd9");ellipse(ctx,0,18,12,4,"#a7677a");ellipse(ctx,0,-18,5,1.8,"#5d7b86");line(ctx,[[-7,-11],[-7,10]],"#ffcfbe99",2);line(ctx,[[1,-9],[7,-4],[0,0],[5,7]],"#f9d8be",2);
  }
  ctx.restore();
}
export function prepareCanvas(canvas:HTMLCanvasElement) {
  const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=ARCADE_SIZE*ratio;canvas.height=ARCADE_SIZE*ratio;
  const ctx=canvas.getContext("2d");ctx?.setTransform(ratio,0,0,ratio,0,0);return ctx;
}
