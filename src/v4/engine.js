// Universo Genesi IV — motore WebGPU (fisica + rendering interamente su GPU)
const UF=['N','TB','step','doLife','j0','j1','mode','spare'];
const FF=['G','EPS2','MP','LS','CS','RN2','HMIN','NGB','DT','VMAX','UMIN','UMAX','T1','T2','T3','T4','K1','RHO1','QS','FH','lam','rhoThick','metK','vdamp','mix','snk','snu','snCool','feSN','zSN','Tmol','Tdust','dustP','lumStar','T0','F0','watMin','orgMin','orgK','gr','spread','pAbio','cx','cy','cz','rsMin','Ks','Kr','Kl','FeSun','CNOsun','sp4'];
const PSTRUCT='struct P{'+UF.map(f=>f+':u32,').join('')+FF.map(f=>f+':f32,').join('')+'};';
const PWORDS=UF.length+FF.length;
const COMMON=PSTRUCT+`
@group(0) @binding(0) var<uniform> p:P;
const EMPTY:u32=0xffffffffu;
const PI8:f32=2.5464790894703255;
fn cellOf(x:vec3<f32>)->vec3<i32>{return vec3<i32>(floor(x/p.CS));}
fn hashc(c:vec3<i32>)->u32{let u=bitcast<vec3<u32>>(c);return ((u.x*73856093u)^(u.y*19349663u)^(u.z*83492791u))&(p.TB-1u);}
fn Wk(q:f32,hh:f32)->f32{let s=PI8/(hh*hh*hh);if(q<0.5){return s*(1.0-6.0*q*q+6.0*q*q*q);}let a=1.0-q;return s*2.0*a*a*a;}
fn dWk(q:f32,hh:f32)->f32{let s=PI8/(hh*hh*hh*hh);if(q<0.5){return s*(-12.0*q+18.0*q*q);}let a=1.0-q;return s*(-6.0*a*a);}
fn rnd(a:u32,b:u32,c:u32)->f32{var v=a*747796405u+b*2891336453u+c*277803737u+12345u;v=((v>>((v>>28u)+4u))^v)*277803737u;v=(v>>22u)^v;return f32(v)/4294967296.0;}
`;
const WG_CLEAR=COMMON+`
@group(0) @binding(1) var<storage,read_write> grid:array<atomic<u32>>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) g:vec3<u32>){if(g.x<p.TB){atomicStore(&grid[g.x],EMPTY);}}`;
const WG_HASH=COMMON+`
@group(0) @binding(1) var<storage,read> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read_write> grid:array<atomic<u32>>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let k=hashc(cellOf(pos[i].xyz));let prev=atomicExchange(&grid[k],i);atomicStore(&grid[p.TB+i],prev);}`;
const NBLOOP=(body)=>`
 let ci=cellOf(pi);var it:u32=0u;
 for(var a:i32=-1;a<=1;a++){for(var b:i32=-1;b<=1;b++){for(var c:i32=-1;c<=1;c++){
  let cc=ci+vec3<i32>(a,b,c);var j=grid[hashc(cc)];
  loop{if(j==EMPTY||it>MAXIT){break;}it++;
   if(j!=i){let pj4=pos[j];if(all(cellOf(pj4.xyz)==cc)){let d=pj4.xyz-pi;let r2=dot(d,d);if(r2<p.CS*p.CS){${body}}}}
   j=grid[p.TB+j];}
 }}}`;
const WG_DENS=COMMON+`
@group(0) @binding(1) var<storage,read> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read> vel:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read> grid:array<u32>;
@group(0) @binding(4) var<storage,read_write> dens:array<vec4<f32>>;
const MAXIT:u32=1500u;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let pi4=pos[i];let pi=pi4.xyz;let hi=pi4.w;var rho=Wk(0.0,hi);var cnt=0.0;var crs=0.0;let rs=min(max(2.0*hi,p.rsMin),p.CS);
 ${NBLOOP(`let hh=(hi+pj4.w)*0.5;if(r2<hh*hh){let r=sqrt(r2);rho+=Wk(r/hh,hh);cnt+=1.0;} if(r2<rs*rs){crs+=1.0;}`)}
 rho*=p.MP;let u=vel[i].w;let P=(2.0/3.0)*rho*u;
 let hn=clamp(hi*pow((p.NGB+1.0)/(cnt+1.0),0.15),p.HMIN,p.CS);
 dens[i]=vec4<f32>(rho,P,crs,hn);}`;
const WG_FORCE=COMMON+`
@group(0) @binding(1) var<storage,read> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read> vel:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read> grid:array<u32>;
@group(0) @binding(4) var<storage,read> dens:array<vec4<f32>>;
@group(0) @binding(5) var<storage,read> comp:array<vec4<f32>>;
@group(0) @binding(6) var<storage,read> bio:array<vec4<f32>>;
@group(0) @binding(7) var<storage,read_write> fout:array<vec4<f32>>;
const MAXIT:u32=1500u;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let pi=pos[i].xyz;let vi=vel[i];let di=dens[i];let hi=di.w;let Ai=comp[3u*i];let Bi=comp[3u*i+1u];let Ci=comp[3u*i+2u];let b0i=bio[2u*i];
 let pri=di.y/(di.x*di.x);let GG=10.0/9.0;let csi=sqrt(GG*max(vi.w,0.0));
 var acc=vec3<f32>(0.0);var du=0.0;var dA=vec4<f32>(0.0);var dB=vec3<f32>(0.0);var dC=vec4<f32>(0.0);var heat=0.0;var sncS=0.0;var bdamp=1.0;var seed=-1.0;
 let canSeed=p.doLife==1u&&b0i.z>0.0&&b0i.x==0.0;
 ${NBLOOP(`
  let r=sqrt(r2);let dj=dens[j];let hh=(hi+dj.w)*0.5;
  if(r<hh&&r>0.0){let q=r/hh;let gk=dWk(q,hh)/r;let prj=dj.y/(dj.x*dj.x);let vj=vel[j];
   let vr=-dot(vi.xyz-vj.xyz,d);var pv=0.0;
   if(vr<0.0){let mu=hh*vr/(r2+0.01*hh*hh);let cb=(csi+sqrt(GG*max(vj.w,0.0)))*0.5;let rb=(di.x+dj.x)*0.5;pv=(-cb*mu+2.0*mu*mu)/rb;}
   acc+=p.MP*(pri+prj+pv)*gk*d;du+=(pri+pv*0.5)*p.MP*vr*gk;
   let wm=p.MP*p.mix*Wk(q,hh)/max(di.x,dj.x);dA+=(comp[3u*j]-Ai)*wm;dB+=(comp[3u*j+1u].xyz-Bi.xyz)*wm;dC+=(comp[3u*j+2u]-Ci)*wm;}
  if(r2<p.RN2){let q2=r2+p.EPS2;acc+=p.G/(q2*sqrt(q2))*d;}
  let b1j=bio[2u*j+1u];
  if(b1j.w>0.5){let rsj=min(max(2.0*pos[j].w,p.rsMin),p.CS);if(r<rsj){let share=0.6/max(1.0,dj.z);
   dA+=(comp[3u*j]-Ai)*share;dB+=(comp[3u*j+1u].xyz-Bi.xyz)*share;dC+=(comp[3u*j+2u]-Ci)*share;let kk=p.snk/(1.0+r/3.0);acc-=d/max(r,1e-3)*kk;heat+=p.snu;sncS=max(sncS,p.snCool);bdamp*=0.1;}}
  if(canSeed){let b0j=bio[2u*j];if(b0j.x>0.4&&r<pos[j].w&&rnd(i,j,p.step)<p.spread){seed=fract((b0j.y+(rnd(j,i,p.step+7u)-0.5)*30.0+360.0)/360.0)*360.0;}}
 `)}
 fout[5u*i]=vec4<f32>(acc,du);fout[5u*i+1u]=dA;fout[5u*i+2u]=vec4<f32>(dB,heat);fout[5u*i+3u]=vec4<f32>(seed,sncS,bdamp,0.0);fout[5u*i+4u]=dC;}`;
const WG_FAR=COMMON+`
@group(0) @binding(1) var<storage,read> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read> comp:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read_write> facc:array<vec4<f32>>;
var<workgroup> tile:array<vec4<f32>,256>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) g:vec3<u32>,@builtin(local_invocation_index) l:u32){
 let i=g.x;let ok=i<p.N;var pi=vec3<f32>(0.0);if(ok){pi=pos[i].xyz;}var acc=vec3<f32>(0.0);var flux=0.0;
 var t=p.j0;
 loop{if(t>=p.j1){break;}
  let j=t+l;if(j<p.j1){let lj=comp[3u*j+1u].w;tile[l]=vec4<f32>(pos[j].xyz,select(0.0,lj,lj>p.lumStar));}else{tile[l]=vec4<f32>(1e20,1e20,1e20,0.0);}
  workgroupBarrier();
  let n=min(256u,p.j1-t);
  for(var k:u32=0u;k<n;k++){let tj=tile[k];let d=tj.xyz-pi;let r2=dot(d,d);
   if(r2>=p.RN2){let q=r2+p.EPS2;acc+=(p.G*inverseSqrt(q)/q)*d;}
   if(tj.w>0.0&&r2<400.0){flux+=p.MP*tj.w/(r2+0.25);}}
  workgroupBarrier();t+=256u;}
 if(ok){facc[i]+=vec4<f32>(acc,flux);}}`;
const NST=104; // slot statistiche
const WG_INTEG=COMMON+`
@group(0) @binding(1) var<storage,read_write> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read_write> vel:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read_write> comp:array<vec4<f32>>;
@group(0) @binding(4) var<storage,read> dens:array<vec4<f32>>;
@group(0) @binding(5) var<storage,read_write> bio:array<vec4<f32>>;
@group(0) @binding(6) var<storage,read> fout:array<vec4<f32>>;
@group(0) @binding(7) var<storage,read> far:array<vec4<f32>>;
@group(0) @binding(8) var<storage,read_write> st:array<atomic<u32>>;
var<workgroup> ws:array<atomic<u32>,${NST}>;
fn wadd(k:u32,v:u32){if(v!=0u){atomicAdd(&ws[k],v);}}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>,@builtin(local_invocation_index) l:u32){
 for(var k=l;k<${NST}u;k+=64u){atomicStore(&ws[k],0u);}
 workgroupBarrier();
 let i=g.x;
 if(i<p.N){
 var ps=pos[i];var v=vel[i];var A=comp[3u*i];var B=comp[3u*i+1u];var C=comp[3u*i+2u];let dn=dens[i];var b0=bio[2u*i];var b1=bio[2u*i+1u];
 let f0=fout[5u*i];let f1=fout[5u*i+1u];let f2=fout[5u*i+2u];let f3=fout[5u*i+3u];let f4=fout[5u*i+4u];let fr=far[i];
 var u=v.w;let rho=dn.x;
 A=max(A+f1,vec4<f32>(0.0));C=max(C+f4,vec4<f32>(0.0));B=vec4<f32>(max(B.xyz+f2.xyz,vec3<f32>(0.0)),B.w);
 var snc=b0.w;
 if(b1.w>0.5){B.z*=0.4;B.y*=0.6;let s=A.x+A.y+A.z+A.w+B.x+B.y+B.z;A.x+=1.0-s;u=min(p.UMAX,u+2.0*p.snu);b0.x=0.0;snc=300.0;b1.w=0.0;}
 if(f2.w>0.0){u=min(p.UMAX,u+f2.w);}snc=max(snc,f3.y);b0.x*=f3.z;
 // combustione nucleare (energie di legame reali per nucleone, MeV)
 var e=0.0;var lum=0.0;let T=u;
 if(T>=p.T1&&rho>=p.RHO1&&snc<=0.0){let dtr=p.DT*min(20.0,rho/p.RHO1);var d=0.0;
  d=min(A.x,p.K1*dtr*A.x*A.x*pow(T/p.T1,4.0)*0.25);A.x-=d;A.y+=d;e+=d*7.07;
  if(A.z>0.0){let dc=min(A.z,d*4.0*A.z);A.z-=dc;A.w+=dc;}
  if(T>p.T2){let f=pow(T/p.T2,4.0);d=min(A.y,p.K1*dtr*A.y*A.y*A.y*f*0.5);A.y-=d;A.z+=d;e+=d*0.61;C.x+=p.Ks*d*(B.z/p.FeSun);if(d>1e-6){wadd(21u,1u);}
   let d2=min(A.z,p.K1*dtr*A.z*A.y*f*0.5);A.z-=d2;B.x+=d2;e+=d2*0.3;if(d2>1e-6){wadd(22u,1u);}}
  if(T>p.T3){let f=pow(T/p.T3,4.0);d=min(B.x,p.K1*0.1*dtr*B.x*B.x*f);B.x-=d;B.y+=d;e+=d*0.28;if(d>1e-5){wadd(23u,1u);}}
  if(T>p.T4){let f=pow(T/p.T4,4.0);d=min(B.y,p.K1*0.3*dtr*B.y*f);B.y-=d;B.z+=d;e+=d*0.53;if(d>1e-5){wadd(24u,1u);}}
  if(e>0.0){lum=e;wadd(20u,1u);wadd(18u,u32(e*p.QS*p.MP*1e6));}}
 var du=f0.w;
 if(e>0.0){var tc=p.T1;if(T>p.T4){tc=p.T4;}else if(T>p.T3){tc=p.T3;}else if(T>p.T2){tc=p.T2;}tc*=1.25;du+=max(0.0,min(e*p.QS*p.FH,tc-u))/p.DT;}
 B.w=lum;
 var vv=v.xyz+(f0.xyz+fr.xyz)*p.DT;if(rho>p.RHO1*0.05){vv*=p.vdamp;}let sp=length(vv);if(sp>p.VMAX){vv*=p.VMAX/sp;}
 ps=vec4<f32>(ps.xyz+vv*p.DT,dn.w);
 var un=u+du*p.DT;let met=1.0+p.metK*(1.0-A.x-A.y);let re=rho/(1.0+(rho/p.rhoThick)*(rho/p.rhoThick));
 let cool=p.lam*re*met*max(0.0,un-p.UMIN)*sqrt(max(un,1e-8))*p.DT;un-=min(cool,(un-p.UMIN)*0.5);u=clamp(un,p.UMIN,p.UMAX);
 if(snc>0.0){snc-=1.0;}
 if(snc<=0.0&&(B.z>p.feSN||(rho>p.RHO1&&A.x+A.y<p.zSN))){b1.w=1.0;C.y+=p.Kr;let zp=A.z+B.x+B.y+B.z;A.z=0.18*zp;B.x=0.55*zp;B.y=0.20*zp;B.z=0.07*zp;wadd(16u,1u);wadd(25u,1u);}
 if(rho<p.RHO1*0.2){C.z+=p.Kl*(A.z+A.w+B.x)/p.CNOsun*p.DT;}
 // chimica: acqua, molecole organiche, polveri
 let cold=u<p.Tmol;b1.x=select(0.0,min(A.x*0.5,B.x),cold);b1.y=select(0.0,min(min(A.z,B.x*0.6),min(A.w*4.0,A.x*0.2)),cold);b1.z=select(0.0,min(B.y+B.z,B.x*0.8),u<p.Tdust);
 if(b1.x>0.001){wadd(26u,1u);}if(b1.y>0.0003){wadd(27u,1u);}
 // pianeti, zona abitabile (T = T0·(L/d²)^¼) e vita
 if(p.doLife==1u){
  b0.z=0.0;if(b1.z>p.dustP&&lum==0.0&&fr.w>p.F0*0.02){b0.z=p.T0*pow(fr.w/p.F0,0.25);}
  let te=b0.z;let hab=te>=273.0&&te<=373.0&&b1.x>p.watMin&&b1.y>p.orgMin;
  if(f3.x>=0.0&&b0.x==0.0&&te>0.0){b0.x=0.01;b0.y=f3.x;wadd(31u,1u);}
  else if(b0.x>0.0){let K=min(1.0,b1.y/p.orgK);if(hab){b0.x+=p.gr*b0.x*(1.0-b0.x/max(K,0.05));}else{b0.x-=b0.x*select(0.01,0.4,te>500.0||u>0.05);}if(b0.x<0.001){b0.x=0.0;b0.y=-1.0;}}
  else if(hab&&rnd(i,p.step,99u)<p.pAbio){b0.x=0.01;b0.y=rnd(i,p.step,7u)*360.0;wadd(17u,1u);wadd(30u,1u);}
 }
 b0.w=snc;
 pos[i]=ps;vel[i]=vec4<f32>(vv,u);comp[3u*i]=A;comp[3u*i+1u]=B;comp[3u*i+2u]=C;bio[2u*i]=b0;bio[2u*i+1u]=b1;
 // statistiche
 if(lum>p.lumStar){wadd(0u,1u);}if(b0.z>0.0){wadd(1u,1u);wadd(28u,1u);if(b0.z>=273.0&&b0.z<=373.0){wadd(2u,1u);wadd(29u,1u);}}if(b0.x>0.0){wadd(3u,1u);}
 wadd(4u,u32(A.x*1e7));wadd(5u,u32(A.y*1e7));wadd(6u,u32(A.z*1e7));wadd(7u,u32(A.w*1e7));wadd(8u,u32(B.x*1e7));wadd(9u,u32(B.y*1e7));wadd(10u,u32(B.z*1e7));
 wadd(11u,u32(u*1e5));wadd(32u,u32(min(C.x,4.0)*1e6));wadd(33u,u32(min(C.y,4.0)*1e6));wadd(34u,u32(min(C.z,4.0)*1e6));
 wadd(12u,bitcast<u32>(i32(round(ps.x*0.5))));wadd(13u,bitcast<u32>(i32(round(ps.y*0.5))));wadd(14u,bitcast<u32>(i32(round(ps.z*0.5))));
 let rr=length(ps.xyz-vec3<f32>(p.cx,p.cy,p.cz));wadd(40u+u32(clamp(floor(log2(max(rr,1.0))*3.0),0.0,47.0)),1u);
 }
 workgroupBarrier();
 for(var k=l;k<${NST}u;k+=64u){let v=atomicLoad(&ws[k]);if(v!=0u){if(k>=20u&&k<32u){atomicMax(&st[k],1u);}else if(k>=4u&&k<=10u){let old=atomicAdd(&st[k],v);if(old>0xffffffffu-v){atomicAdd(&st[84u+k],1u);}}else if(k>=32u&&k<=34u){let old=atomicAdd(&st[k],v);if(old>0xffffffffu-v){atomicAdd(&st[k+64u],1u);}}else{atomicAdd(&st[k],v);}}}}`;
const WG_STCLR=COMMON+`
@group(0) @binding(1) var<storage,read_write> st:array<atomic<u32>>;
@compute @workgroup_size(${NST}) fn main(@builtin(local_invocation_index) l:u32){if(p.N==0u){return;}if(l<16u||l>=32u){atomicStore(&st[l],0u);}}`;
const WG_FARSW=COMMON+`
@group(0) @binding(1) var<storage,read_write> facc:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read_write> far:array<vec4<f32>>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}far[i]=facc[i];facc[i]=vec4<f32>(0.0);}`;
// preparazione per il rendering: posizione, colore, flag
const WG_PREP=COMMON+`
@group(0) @binding(1) var<storage,read> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read> vel:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read> comp:array<vec4<f32>>;
@group(0) @binding(4) var<storage,read> bio:array<vec4<f32>>;
@group(0) @binding(5) var<storage,read> dens:array<vec4<f32>>;
@group(0) @binding(6) var<storage,read_write> rb:array<vec4<f32>>;
fn rampT(t:f32)->vec3<f32>{var c=array<vec3<f32>,8>(vec3(0.24,0.08,0.35),vec3(0.59,0.12,0.2),vec3(0.86,0.31,0.16),vec3(1.0,0.59,0.24),vec3(1.0,0.84,0.59),vec3(1.0,0.97,0.92),vec3(0.8,0.87,1.0),vec3(0.59,0.71,1.0));
 let x=clamp(t,0.0,0.9999)*7.0;let k=u32(floor(x));return mix(c[k],c[k+1u],fract(x));}
fn rampZ(t:f32)->vec3<f32>{var c=array<vec3<f32>,5>(vec3(0.43,0.55,0.84),vec3(0.63,0.69,0.88),vec3(0.84,0.75,0.55),vec3(0.96,0.55,0.27),vec3(0.92,0.31,0.16));
 let x=clamp(t,0.0,0.9999)*4.0;let k=u32(floor(x));return mix(c[k],c[k+1u],fract(x));}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let ps=pos[i];let u=vel[i].w;let A=comp[3u*i];let B=comp[3u*i+1u];let b0=bio[2u*i];let b1=bio[2u*i+1u];
 var col:vec3<f32>;if(p.mode==0u){col=rampT((log2(max(u,1e-5))*0.30103+5.0)/3.6);}else{col=rampZ(sqrt(max(0.0,1.0-A.x-A.y)/0.15));}
 var ring=0.0;if(b0.z>0.0){ring=select(1.0,2.0,b0.z>=273.0&&b0.z<=373.0);}if(b0.x>0.0){ring=3.0;}
 var fl=0.0;if(b0.w>250.0){fl=(b0.w-250.0)/50.0;}
 rb[4u*i]=vec4<f32>(ps.xyz,ps.w);rb[4u*i+1u]=vec4<f32>(col,select(0.0,B.w,B.w>p.lumStar));rb[4u*i+2u]=vec4<f32>(ring,b0.y,b0.x,min(dens[i].x,1e4));rb[4u*i+3u]=vec4<f32>(b0.z,max(0.0,1.0-A.x-A.y),b1.x,b1.y);}`;
// shader di rendering
const RS=`
struct V{vp:mat4x4<f32>,vw:f32,vh:f32,px:f32,cloudA:f32,cloudK:f32,cloudMax:f32,ptA:f32,pad:f32};
@group(0) @binding(0) var<uniform> v:V;
struct O{@builtin(position) pos:vec4<f32>,@location(0) uv:vec2<f32>,@location(1) col:vec4<f32>,@location(2) ex:vec4<f32>};
fn corner(k:u32)->vec2<f32>{var c=array<vec2<f32>,6>(vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));return c[k];}
fn place(c:vec4<f32>,uv:vec2<f32>,rpx:f32)->vec4<f32>{return vec4<f32>(c.xy+uv*vec2<f32>(rpx*2.0/v.vw,rpx*2.0/v.vh)*c.w,c.zw);}
@vertex fn vcloud(@builtin(vertex_index) vi:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 let rpx=min(a.w*v.cloudK*v.vh*0.5/max(c.w,1e-4),v.cloudMax);
 if(c.w<=0.0||rpx<0.6){o.pos=vec4<f32>(2.,2.,2.,1.);return o;}
 o.pos=place(c,uv,rpx);o.uv=uv;let dens=clamp(0.6/sqrt(1.0+e.w*0.5),0.12,0.6);let lu=dot(b.rgb,vec3<f32>(0.3,0.6,0.1));o.col=vec4<f32>(b.rgb,v.cloudA*dens*min(1.0,rpx/3.0)/(1.0+lu*lu*4.0));o.ex=vec4<f32>(0.);return o;}
@fragment fn fcloud(i:O)->@location(0) vec4<f32>{let r2=dot(i.uv,i.uv);if(r2>1.0){discard;}let a=i.col.a*exp(-r2*3.5);return vec4<f32>(i.col.rgb*a,a);}
@vertex fn vpt(@builtin(vertex_index) vi:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 if(c.w<=0.0){o.pos=vec4<f32>(2.,2.,2.,1.);return o;}
 var rpx=v.px;var col=vec4<f32>(b.rgb,v.ptA);var star=0.0;
 if(b.w>0.0){rpx=v.px*clamp(2.0+sqrt(b.w)*14.0,2.0,6.0);col=vec4<f32>(1.0,0.93,0.75,1.0);star=1.0;}
 o.pos=place(c,uv,rpx);o.uv=uv;o.col=col;o.ex=vec4<f32>(star,0.,0.,0.);return o;}
@fragment fn fpt(i:O)->@location(0) vec4<f32>{let r2=dot(i.uv,i.uv);if(r2>1.0){discard;}
 var a=i.col.a;if(i.ex.x>0.5){a=0.9*exp(-r2*16.0)+0.05*exp(-r2*3.0);}else{a*=1.0-smoothstep(0.55,1.0,sqrt(r2));}
 return vec4<f32>(i.col.rgb*a,a);}
@vertex fn vring(@builtin(vertex_index) vi:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 let fl=e.w;
 if(c.w<=0.0||e.x<0.5){o.pos=vec4<f32>(2.,2.,2.,1.);return o;}
 var col=vec4<f32>(0.79,0.54,0.29,0.85);var rpx=v.px*3.5;
 if(e.x>1.5&&e.x<2.5){col=vec4<f32>(0.44,0.83,1.0,0.95);}
 if(e.x>2.5){let h=e.y/60.0;let k=vec3<f32>(5.0,3.0,1.0);let rgb=clamp(abs(fract(vec3<f32>(h/6.0)+k/6.0)*6.0-3.0)-1.0,vec3(0.),vec3(1.));col=vec4<f32>(mix(vec3(1.0),rgb,0.75),0.5+0.5*min(1.0,e.z));rpx=v.px*5.5;}
 o.pos=place(c,uv,rpx);o.uv=uv;o.col=col;o.ex=vec4<f32>(0.);return o;}
@fragment fn fring(i:O)->@location(0) vec4<f32>{let r=length(i.uv);let a=i.col.a*(1.0-smoothstep(0.0,0.18,abs(r-0.78)));if(a<0.01){discard;}return vec4<f32>(i.col.rgb*a,a);}
`;
class GenesisGPU{
 static async create(canvas,opts){const g=new GenesisGPU();await g.init(canvas,opts||{});return g;}
 async init(canvas,o){
  if(!navigator.gpu)throw new Error('WebGPU non disponibile');
  const ad=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!ad)throw new Error('Nessuna GPU compatibile');
  const need={maxStorageBuffersPerShaderStage:Math.min(8,ad.limits.maxStorageBuffersPerShaderStage),maxStorageBufferBindingSize:Math.min(ad.limits.maxStorageBufferBindingSize,1<<30),maxBufferSize:Math.min(ad.limits.maxBufferSize,1<<30)};
  if(need.maxStorageBuffersPerShaderStage<8)throw new Error('GPU con troppo pochi buffer di storage');
  this.adapter=ad;this.dev=await ad.requestDevice({requiredLimits:need});
  this.lost=false;this.dev.lost.then(i=>{this.lost=true;this.onlost&&this.onlost(i);});
  this.canvas=canvas;if(canvas){this.ctx=canvas.getContext('webgpu');this.fmt=navigator.gpu.getPreferredCanvasFormat();this.ctx.configure({device:this.dev,format:this.fmt,alphaMode:'opaque'});}
  const d=this.dev,mk=(code)=>{const m=d.createShaderModule({code});return m;};
  this.mods={};const src={clear:WG_CLEAR,hash:WG_HASH,dens:WG_DENS,force:WG_FORCE,far:WG_FAR,integ:WG_INTEG,stclr:WG_STCLR,farsw:WG_FARSW,prep:WG_PREP};
  this.pipes={};for(const k in src){const m=mk(src[k]);this.pipes[k]=d.createComputePipeline({layout:'auto',compute:{module:m,entryPoint:'main'}});}
  if(canvas){const rm=mk(RS);const vb=[{arrayStride:64,stepMode:'instance',attributes:[{shaderLocation:0,offset:0,format:'float32x4'},{shaderLocation:1,offset:16,format:'float32x4'},{shaderLocation:2,offset:32,format:'float32x4'}]}];
   const add={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}};
   const over={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
   const rp=(vs,fs,bl)=>d.createRenderPipeline({layout:'auto',vertex:{module:rm,entryPoint:vs,buffers:vb},fragment:{module:rm,entryPoint:fs,targets:[{format:this.fmt,blend:bl}]},primitive:{topology:'triangle-list'}});
   this.rp={cloud:rp('vcloud','fcloud',add),pt:rp('vpt','fpt',add),ring:rp('vring','fring',over)};
   this.vub=d.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   this.rbg={};for(const k in this.rp)this.rbg[k]=d.createBindGroup({layout:this.rp[k].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.vub}}]});}
  this.ub=d.createBuffer({size:Math.ceil(PWORDS*4/16)*16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.uarr=new ArrayBuffer(Math.ceil(PWORDS*4/16)*16);this.u32=new Uint32Array(this.uarr);this.f32=new Float32Array(this.uarr);
 }
 setU(k,val){const i=UF.indexOf(k);if(i>=0){this.u32[i]=val>>>0;return;}const j=FF.indexOf(k);if(j<0)throw new Error(k);this.f32[UF.length+j]=val;}
 reset(N,o){o=o||{};const d=this.dev;this.N=N;this.TB=1<<Math.max(16,Math.ceil(Math.log2(N*2)));
  const MP=(o.nref||2000)/N,LS=Math.cbrt(MP);this.MP=MP;this.LS=LS;const R0=o.R0||100,G=(o.G||0.0015)*MP;
  const prm={G,EPS2:((o.eps||2.5)*LS)**2,MP,LS,CS:(o.cs||4)*LS,RN2:((o.rn||4)*LS)**2,HMIN:(o.hmin||1.2)*LS,NGB:o.ngb||32,DT:o.dt||1,VMAX:o.vmax||3,UMIN:o.umin||1e-5,UMAX:o.umax||0.03,
   T1:o.T1||0.0018,T2:o.T2||0.006,T3:o.T3||0.012,T4:o.T4||0.02,K1:o.K1||0.0006,RHO1:o.rho1||0.5,QS:o.Q||0.003,FH:o.fh||0.1,lam:o.lam||0.3,rhoThick:o.rhoThick||3,metK:o.metK||300,vdamp:o.vdamp||0.9997,
   mix:o.mix||0.002,snk:o.snk||0.06,snu:o.snu||0.01,snCool:o.snCool||200,feSN:o.feSN||0.005,zSN:o.zSN||0.6,Tmol:o.Tmol||0.004,Tdust:o.Tdust||0.008,dustP:o.dustP||0.00002,lumStar:o.lumStar||2e-5,T0:o.T0||278,F0:o.F0||2e-5,
   watMin:o.watMin||0.0003,orgMin:o.orgMin||0.00005,orgK:o.orgK||0.001,gr:o.gr||0.05,spread:o.spread||0.03,pAbio:o.pAbio||0.03,cx:0,cy:0,cz:0,rsMin:3*LS,Ks:o.Ks||800,Kr:o.Kr||25,Kl:o.Kl||3e-3,FeSun:SOLAR.fePeak,CNOsun:SOLAR.cno};
  this.u32.fill(0);for(const k in prm)this.setU(k,prm[k]);this.setU('N',N);this.setU('TB',this.TB);
  this.K=o.K||Math.max(N<=16384?4:N<=65536?6:8,Math.ceil(N*N/2e9));this.chunk=Math.ceil(N/this.K/256)*256;
  // condizioni iniziali: sfera H/He 75/25, fluttuazioni di densità, flusso di Hubble
  const R=Math.random,pos=new Float32Array(N*4),vel=new Float32Array(N*4),comp=new Float32Array(N*12),bio=new Float32Array(N*8);
  const rdir=()=>{const c=R()*2-1,a=R()*6.2832,s=Math.sqrt(1-c*c);return[s*Math.cos(a),s*Math.sin(a),c];};
  const seeds=[];for(let k=0;k<(o.seeds||30);k++){const dd=rdir(),r=R0*.85*Math.cbrt(R());seeds.push([dd[0]*r,dd[1]*r,dd[2]*r]);}
  const vesc=Math.sqrt(2*G*N/R0),H0=(o.fH||0.85)*vesc/R0;
  for(let i=0;i<N;i++){let q;if(R()<(o.clump||0.6)){const s=seeds[(R()*seeds.length)|0],dd=rdir(),r=(o.sr||9)*Math.cbrt(R());q=[s[0]+dd[0]*r,s[1]+dd[1]*r,s[2]+dd[2]*r];}
   else{do{q=[(R()*2-1)*R0,(R()*2-1)*R0,(R()*2-1)*R0];}while(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]>R0*R0);}
   pos.set([q[0],q[1],q[2],6*LS],i*4);vel.set([H0*q[0]+(R()-.5)*.02,H0*q[1]+(R()-.5)*.02,H0*q[2]+(R()-.5)*.02,o.u0||0.0005],i*4);
   comp[i*12]=0.75;comp[i*12+1]=0.25;bio[i*8+1]=-1;}
  for(const b of Object.values(this.b||{}))b.destroy();
  const S=GPUBufferUsage.STORAGE,CD=GPUBufferUsage.COPY_DST,CS=GPUBufferUsage.COPY_SRC,VX=GPUBufferUsage.VERTEX;
  const mkb=(bytes,us,data)=>{const b=d.createBuffer({size:bytes,usage:us,mappedAtCreation:!!data});if(data){new Float32Array(b.getMappedRange()).set(data);b.unmap();}return b;};
  this.b={pos:mkb(N*16,S|CD|CS,pos),vel:mkb(N*16,S|CD|CS,vel),comp:mkb(N*48,S|CD|CS,comp),bio:mkb(N*32,S|CD|CS,bio),dens:mkb(N*16,S|CS),fout:mkb(N*80,S),
   far:mkb(N*16,S|CD),facc:mkb(N*16,S|CD),grid:mkb((this.TB+N)*4,S),st:mkb(NST*4,S|CS|CD),rb:mkb(N*64,S|VX|CS),
   stRead:d.createBuffer({size:NST*4,usage:GPUBufferUsage.MAP_READ|CD}),pick:d.createBuffer({size:N*64,usage:GPUBufferUsage.MAP_READ|CD}),fol:d.createBuffer({size:96,usage:GPUBufferUsage.MAP_READ|CD})};
  const bg=(pipe,list)=>d.createBindGroup({layout:this.pipes[pipe].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.ub}},...list.map((n,k)=>({binding:k+1,resource:{buffer:this.b[n]}}))]});
  this.bg={clear:bg('clear',['grid']),hash:bg('hash',['pos','grid']),dens:bg('dens',['pos','vel','grid','dens']),force:bg('force',['pos','vel','grid','dens','comp','bio','fout']),
   far:bg('far',['pos','comp','facc']),integ:bg('integ',['pos','vel','comp','dens','bio','fout','far','st']),stclr:bg('stclr',['st']),farsw:bg('farsw',['facc','far']),prep:bg('prep',['pos','vel','comp','bio','dens','rb'])};
  this.t=0;this.farChunk=0;this.stats=null;this.statBusy=false;this.pickBusy=false;this.folBusy=false;this.cm=[0,0,0];
  // forze lontane iniziali complete
  this.u32[UF.indexOf('j0')]=0;this.u32[UF.indexOf('j1')]=N;d.queue.writeBuffer(this.ub,0,this.uarr);
  const e=d.createCommandEncoder();this.pass(e,'far',Math.ceil(N/256));this.pass(e,'farsw',Math.ceil(N/64));d.queue.submit([e.finish()]);
 }
 pass(e,k,n){const p=e.beginComputePass();p.setPipeline(this.pipes[k]);p.setBindGroup(0,this.bg[k]);p.dispatchWorkgroups(n);p.end();}
 step(n,mode){const d=this.dev,N=this.N,W64=Math.ceil(N/64);
  for(let s=0;s<n;s++){this.t++;
   this.setU('step',this.t);this.setU('doLife',this.t%5===0?1:0);this.setU('mode',mode||0);
   const j0=this.farChunk*this.chunk,j1=Math.min(N,j0+this.chunk);this.setU('j0',j0);this.setU('j1',Math.max(j0,j1));
   this.setU('cx',this.cm[0]);this.setU('cy',this.cm[1]);this.setU('cz',this.cm[2]);
   d.queue.writeBuffer(this.ub,0,this.uarr);
   const e=d.createCommandEncoder();
   this.pass(e,'clear',Math.ceil(this.TB/256));this.pass(e,'hash',W64);this.pass(e,'dens',W64);this.pass(e,'force',W64);
   if(j1>j0)this.pass(e,'far',Math.ceil(N/256));
   this.pass(e,'stclr',1);this.pass(e,'integ',W64);
   this.farChunk++;if(this.farChunk*this.chunk>=N){this.farChunk=0;this.pass(e,'farsw',W64);}
   d.queue.submit([e.finish()]);}
 }
 prep(mode){this.setU('mode',mode||0);this.dev.queue.writeBuffer(this.ub,0,this.uarr);const e=this.dev.createCommandEncoder();this.pass(e,'prep',Math.ceil(this.N/64));this.dev.queue.submit([e.finish()]);}
 render(vp,o){const d=this.dev,W=this.canvas.width,H=this.canvas.height;const f=new Float32Array(28);f.set(vp,0);f[16]=W;f[17]=H;f[18]=o.px;f[19]=o.cloudA;f[20]=o.cloudK;f[21]=o.cloudMax;f[22]=o.ptA;
  d.queue.writeBuffer(this.vub,0,f);const e=d.createCommandEncoder();
  const rp=e.beginRenderPass({colorAttachments:[{view:o.view||this.ctx.getCurrentTexture().createView(),clearValue:(this.clear||{r:0.016,g:0.02,b:0.04,a:1}),loadOp:'clear',storeOp:'store'}]});
  rp.setVertexBuffer(0,this.b.rb);
  if(o.cloudA>0){rp.setPipeline(this.rp.cloud);rp.setBindGroup(0,this.rbg.cloud);rp.draw(6,this.N);}
  rp.setPipeline(this.rp.pt);rp.setBindGroup(0,this.rbg.pt);rp.draw(6,this.N);
  rp.setPipeline(this.rp.ring);rp.setBindGroup(0,this.rbg.ring);rp.draw(6,this.N);
  rp.end();d.queue.submit([e.finish()]);}
 async readStats(){if(this.statBusy)return null;this.statBusy=true;const d=this.dev,e=d.createCommandEncoder();e.copyBufferToBuffer(this.b.st,0,this.b.stRead,0,NST*4);d.queue.submit([e.finish()]);
  try{await this.b.stRead.mapAsync(GPUMapMode.READ);}catch(err){this.statBusy=false;return null;}
  const a=new Uint32Array(this.b.stRead.getMappedRange().slice(0));this.b.stRead.unmap();this.statBusy=false;
  const N=this.N,i32=new Int32Array(a.buffer);const s={t:this.t,stars:a[0],planets:a[1],habit:a[2],lifeP:a[3],tot:[4,5,6,7,8,9,10].map(k=>(a[84+k]*4294967296+a[k])/1e7/N),temp:a[11]/1e5/N,
   cm:[i32[12]*2/N,i32[13]*2/N,i32[14]*2/N],trac:[32,33,34].map(k=>(a[k+64]*4294967296+a[k])/1e6/N),sn:a[16],lin:a[17],efus:a[18]/1e6,first:{fus:a[20],c:a[21],o:a[22],mg:a[23],fe:a[24],sn:a[25],h2o:a[26],org:a[27],planet:a[28],hz:a[29],life:a[30],spread:a[31]}};
  let c=0,med=0;for(let b=0;b<48;b++){const nb=a[40+b];if(c+nb>=N/2){med=Math.pow(2,(b+(N/2-c)/Math.max(1,nb))/3);break;}c+=nb;}s.R=med;this.cm=s.cm;this.stats=s;return s;}
 async readPick(){if(this.pickBusy)return null;this.pickBusy=true;const d=this.dev,e=d.createCommandEncoder();e.copyBufferToBuffer(this.b.rb,0,this.b.pick,0,this.N*64);d.queue.submit([e.finish()]);
  try{await this.b.pick.mapAsync(GPUMapMode.READ);}catch(e){this.pickBusy=false;return null;}const a=new Float32Array(this.b.pick.getMappedRange().slice(0));this.b.pick.unmap();this.pickBusy=false;return a;}
 async readOne(i){if(this.folBusy)return null;this.folBusy=true;const d=this.dev,e=d.createCommandEncoder();if(i>=this.N){this.folBusy=false;return null;}e.copyBufferToBuffer(this.b.pos,i*16,this.b.fol,0,16);e.copyBufferToBuffer(this.b.comp,i*48,this.b.fol,16,48);e.copyBufferToBuffer(this.b.bio,i*32,this.b.fol,64,32);d.queue.submit([e.finish()]);
  try{await this.b.fol.mapAsync(GPUMapMode.READ);}catch(e){this.folBusy=false;return null;}const a=new Float32Array(this.b.fol.getMappedRange().slice(0));this.b.fol.unmap();this.folBusy=false;return a;}
 async done(){await this.dev.queue.onSubmittedWorkDone();}
}
if(typeof window!=='undefined')window.GenesisGPU=GenesisGPU;
