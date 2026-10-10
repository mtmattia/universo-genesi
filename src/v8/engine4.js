// Universo Genesi V — motore WebGPU: gas, materia oscura, resti stellari e buchi neri
// Tipi di particella (comp[4i+3].x): 0 gas · 1 materia oscura · 2 nana bianca · 3 stella di neutroni · 4 buco nero · 5 inattiva (inghiottita)
const UF=['N','TB','step','doLife','j0','j1','mode','spare'];
const FF=['G','EPS2','MP','LS','CS','RN2','HMIN','NGB','DT','VMAX','UMIN','UMAX','T1','T2','T3','T4','K1','RHO1','QS','FH','lam','rhoThick','metK','vdamp','mix','snk','snu','snCool','feSN','zSN','Tmol','Tdust','dustP','lumStar','T0','F0','watMin','orgMin','orgK','gr','spread','pAbio','cx','cy','cz','rsMin','Ks','Kr','Kl','FeSun','CNOsun',
 'Lam','pIa','pKN','KrKN','kAGN','Ks2','fWD','fNS','fBH','mWD','mNS','mBH','mGas','racMax','bondi','rMerge','nsKick','sp5','sp6','sp7','fw0','fw1','fw2','fw3','fw4','fw5','fw6','fw7','fw8','fw9','fth','fon','pz0'];
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
@group(0) @binding(3) var<storage,read> comp:array<vec4<f32>>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}if(comp[4u*i+3u].x>4.5){return;}
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
@group(0) @binding(5) var<storage,read> comp:array<vec4<f32>>;
const MAXIT:u32=1500u;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let pi4=pos[i];if(comp[4u*i+3u].x!=0.0){dens[i]=vec4<f32>(0.0,0.0,0.0,pi4.w);return;}
 let pi=pi4.xyz;let hi=pi4.w;var rho=Wk(0.0,hi);var cnt=0.0;var crs=0.0;let rs=min(max(2.0*hi,p.rsMin),p.CS);
 ${NBLOOP(`if(comp[4u*j+3u].x==0.0){let hh=(hi+pj4.w)*0.5;if(r2<hh*hh){let r=sqrt(r2);rho+=Wk(r/hh,hh);cnt+=1.0;} if(r2<rs*rs){crs+=1.0;}}`)}
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
fn racc(m:f32,cs2:f32,v2:f32)->f32{return min(p.racMax,p.bondi*2.0*p.G*m/(cs2+v2+1e-6));}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let Di=comp[4u*i+3u];let ty=Di.x;
 if(ty>4.5){fout[5u*i]=vec4<f32>(0.0);fout[5u*i+1u]=vec4<f32>(0.0);fout[5u*i+2u]=vec4<f32>(0.0);fout[5u*i+3u]=vec4<f32>(-1.0,0.0,1.0,0.0);fout[5u*i+4u]=vec4<f32>(0.0);return;}
 let isGas=ty==0.0;let pi=pos[i].xyz;let vi=vel[i];let di=dens[i];let hi=di.w;let Ai=comp[4u*i];let Bi=comp[4u*i+1u];let Ci=comp[4u*i+2u];let b0i=bio[2u*i];
 let GG=10.0/9.0;var pri=0.0;var csi=0.0;if(isGas){pri=di.y/(di.x*di.x);csi=sqrt(GG*max(vi.w,0.0));}
 var acc=vec3<f32>(0.0);var du=0.0;var dA=vec4<f32>(0.0);var dB=vec3<f32>(0.0);var dC=vec4<f32>(0.0);var heat=0.0;var sncS=0.0;var bdamp=1.0;var seed=-1.0;
 var accBy=0.0;var bestR=1e9;var gain=0.0;var consumed=0.0;var merges=0.0;
 let canSeed=p.doLife==1u&&isGas&&b0i.z>0.0&&b0i.x==0.0;
 ${NBLOOP(`
  let Dj=comp[4u*j+3u];let tj=Dj.x;
  if(tj<4.5){
   let r=sqrt(r2);
   if(r2<p.RN2){let q2=r2+p.EPS2;acc+=p.G*Dj.y/(q2*sqrt(q2))*d;}
   if(isGas){
    if(tj==0.0){let dj=dens[j];let hh=(hi+dj.w)*0.5;
     if(r<hh&&r>0.0){let q=r/hh;let gk=dWk(q,hh)/r;let prj=dj.y/(dj.x*dj.x);let vj=vel[j];
      let vr=-dot(vi.xyz-vj.xyz,d);var pv=0.0;
      if(vr<0.0){let mu=hh*vr/(r2+0.01*hh*hh);let cb=(csi+sqrt(GG*max(vj.w,0.0)))*0.5;let rb=(di.x+dj.x)*0.5;pv=(-cb*mu+2.0*mu*mu)/rb;}
      acc+=p.MP*(pri+prj+pv)*gk*d;du+=(pri+pv*0.5)*p.MP*vr*gk;
      let wm=p.MP*p.mix*Wk(q,hh)/max(di.x,dj.x);dA+=(comp[4u*j]-Ai)*wm;dB+=(comp[4u*j+1u].xyz-Bi.xyz)*wm;dC+=(comp[4u*j+2u]-Ci)*wm;}
     if(canSeed){let b0j=bio[2u*j];if(b0j.x>0.4&&r<pos[j].w&&rnd(i,j,p.step)<p.spread){seed=fract((b0j.y+(rnd(j,i,p.step+7u)-0.5)*30.0+360.0)/360.0)*360.0;}}}
    let ev=bio[2u*j+1u].w;
    if(ev>0.5){let rsj=min(max(2.0*pos[j].w,p.rsMin),p.CS);if(r<rsj){var share=0.6/max(1.0,dens[j].z+1.0);if(tj!=0.0){share=0.3/8.0;}
     dC+=(comp[4u*j+2u]-Ci)*share;if(ev<3.5){dA+=(comp[4u*j]-Ai)*share;dB+=(comp[4u*j+1u].xyz-Bi.xyz)*share;}
     var kf=1.0;var hf=1.0;if(ev>1.5&&ev<2.5){kf=0.1;hf=0.2;}if(ev>3.5){kf=0.5;hf=0.5;}
     acc-=d/max(r,1e-3)*(p.snk*kf/(1.0+r/3.0));heat+=p.snu*hf;if(ev<1.5||(ev>2.5&&ev<3.5)){sncS=max(sncS,p.snCool);bdamp*=0.1;}}}
    if(tj==4.0){let vj=vel[j].xyz-vi.xyz;let ra=racc(Dj.y,GG*max(vi.w,0.0),dot(vj,vj));if(r<ra&&r<bestR){bestR=r;accBy=f32(j)+1.0;}
     heat+=p.kAGN*Dj.z/(r2+p.EPS2);}
   } else if(ty==4.0){
    if(tj==0.0){let vj=vel[j];let dv=vj.xyz-vi.xyz;let ra=racc(Di.y,GG*max(vj.w,0.0),dot(dv,dv));if(r<ra){gain+=Dj.y;}}
    if(tj==4.0&&r<p.rMerge){if(Dj.y>Di.y||(Dj.y==Di.y&&j<i)){consumed=1.0;}else{gain+=Dj.y;merges+=1.0;}}
   }
  }
 `)}
 if(isGas){fout[5u*i]=vec4<f32>(acc,du);fout[5u*i+1u]=dA;fout[5u*i+2u]=vec4<f32>(dB,heat);fout[5u*i+3u]=vec4<f32>(seed,sncS,bdamp,accBy);fout[5u*i+4u]=dC;}
 else{fout[5u*i]=vec4<f32>(acc,0.0);fout[5u*i+1u]=vec4<f32>(0.0);fout[5u*i+2u]=vec4<f32>(0.0);fout[5u*i+3u]=vec4<f32>(gain,consumed,merges,0.0);fout[5u*i+4u]=vec4<f32>(0.0);}}`;
const WG_FAR=COMMON+`
@group(0) @binding(1) var<storage,read> pos:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read> comp:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read_write> facc:array<vec4<f32>>;
var<workgroup> tile:array<vec4<f32>,256>;
var<workgroup> tl:array<f32,256>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) g:vec3<u32>,@builtin(local_invocation_index) l:u32){
 let i=g.x;let ok=i<p.N;var pi=vec3<f32>(0.0);if(ok){pi=pos[i].xyz;}var acc=vec3<f32>(0.0);var flux=0.0;
 var t=p.j0;
 loop{if(t>=p.j1){break;}
  let j=t+l;if(j<p.j1){let Dj=comp[4u*j+3u];let lj=comp[4u*j+1u].w;tile[l]=vec4<f32>(pos[j].xyz,select(0.0,Dj.y,Dj.x<4.5));tl[l]=select(0.0,lj,lj>p.lumStar&&Dj.x==0.0);}else{tile[l]=vec4<f32>(1e20,1e20,1e20,0.0);tl[l]=0.0;}
  workgroupBarrier();
  let n=min(256u,p.j1-t);
  for(var k:u32=0u;k<n;k++){let tj=tile[k];let d=tj.xyz-pi;let r2=dot(d,d);
   if(r2>=p.RN2){let q=r2+p.EPS2;acc+=(p.G*tj.w*inverseSqrt(q)/q)*d;}
   let lk=tl[k];if(lk>0.0&&r2<400.0){flux+=p.MP*lk/(r2+0.25);}}
  workgroupBarrier();t+=256u;}
 if(ok){facc[i]+=vec4<f32>(acc,flux);}}`;
const NST=104;
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
fn rdir(i:u32,s:u32)->vec3<f32>{let c=rnd(i,s,41u)*2.0-1.0;let a=rnd(i,s,43u)*6.2832;let q=sqrt(1.0-c*c);return vec3<f32>(q*cos(a),q*sin(a),c);}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>,@builtin(local_invocation_index) l:u32){
 for(var k=l;k<${NST}u;k+=64u){atomicStore(&ws[k],0u);}
 workgroupBarrier();
 let i=g.x;
 if(i<p.N){
 var ps=pos[i];var v=vel[i];var A=comp[4u*i];var B=comp[4u*i+1u];var C=comp[4u*i+2u];var D=comp[4u*i+3u];let dn=dens[i];var b0=bio[2u*i];var b1=bio[2u*i+1u];
 let f0=fout[5u*i];let f1=fout[5u*i+1u];let f2=fout[5u*i+2u];let f3=fout[5u*i+3u];let f4=fout[5u*i+4u];let fr=far[i];
 let cen=vec3<f32>(p.cx,p.cy,p.cz);let aL=p.Lam*(ps.xyz-cen);
 var ty=D.x;var u=v.w;let rho=dn.x;var lum=0.0;var snc=b0.w;
 // eventi del passo precedente: la particella diventa il suo resto
 if(b1.w>0.5){let ev=b1.w;
  if(ty==0.0){let fate=D.w;
   if(fate>1.5&&fate<2.5){ty=2.0;D.y=p.mGas*p.mWD;}
   else if(fate>2.5&&fate<3.5){ty=3.0;D.y=p.mGas*p.mNS;v=vec4<f32>(v.xyz+rdir(i,p.step)*p.nsKick,v.w);}
   else if(fate>3.5){ty=4.0;D.y=p.mGas*p.mBH;D.z=0.0;}
   else{B.z*=0.4;B.y*=0.6;let s=A.x+A.y+A.z+A.w+B.x+B.y+B.z;A.x+=1.0-s;u=min(p.UMAX,u+2.0*p.snu);}
   b0.x=0.0;b0.y=-1.0;b0.z=0.0;snc=300.0;}
  else if(ty==2.0&&ev>2.5&&ev<3.5){ty=0.0;D.y=p.mGas;u=p.UMAX;snc=300.0;}
  else if(ty==3.0&&ev>3.5){ty=4.0;D.y=D.y*1.8;D.z=0.0;}
  b1.w=0.0;D.w=0.0;}
 if(ty==0.0&&f3.w>0.0){ty=5.0;D.y=0.0;wadd(38u,1u);}
 if(ty==0.0){
 A=max(A+f1,vec4<f32>(0.0));C=max(C+f4,vec4<f32>(0.0));B=vec4<f32>(max(B.xyz+f2.xyz,vec3<f32>(0.0)),B.w);
 if(f2.w>0.0){u=min(p.UMAX,u+f2.w);}snc=max(snc,f3.y);b0.x*=f3.z;
 // contrazione gravitazionale: il nucleo denso si scalda fino all'innesco; quando un combustibile finisce si contrae ancora e innesca il successivo (H, poi He, poi C/O, poi Si)
 if(rho>p.RHO1*p.sp5&&snc<=0.0){var tg=p.T1;if(A.x<0.35){tg=p.T2;if(A.y<0.2){tg=p.T3;if(B.x<0.02){tg=p.T4;}}}u=max(u,tg*p.sp6);}
 // combustione nucleare (energie di legame reali per nucleone, MeV)
 var e=0.0;let T=u;
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
 var vv=v.xyz+(f0.xyz+fr.xyz+aL)*p.DT;if(rho>p.RHO1*0.05){vv*=p.vdamp;}let sp=length(vv);if(sp>p.VMAX){vv*=p.VMAX/sp;}
 ps=vec4<f32>(ps.xyz+vv*p.DT,dn.w);
 var un=u+du*p.DT;let met=1.0+p.metK*(1.0-A.x-A.y);let re=rho/(1.0+(rho/p.rhoThick)*(rho/p.rhoThick));
 let cool=p.lam*re*met*max(0.0,un-p.UMIN)*sqrt(max(un,1e-8))*p.DT;un-=min(cool,(un-p.UMIN)*0.5);u=clamp(un,p.UMIN,p.UMAX);
 if(snc>0.0){snc-=1.0;}
 // morte della stella: nebulosa planetaria con nana bianca, oppure supernova con stella di neutroni, buco nero o solo gas
 if(snc<=0.0&&(B.z>p.feSN||(rho>p.RHO1&&A.x+A.y<p.zSN))){let rr=rnd(i,p.step,31u);
  if(rr<p.fWD){b1.w=2.0;D.w=2.0;C.x+=p.Ks2*(B.z/p.FeSun+0.02);wadd(39u,1u);}
  else{b1.w=1.0;C.y+=p.Kr;let zp=A.z+B.x+B.y+B.z;A.z=0.18*zp;B.x=0.55*zp;B.y=0.20*zp;B.z=0.07*zp;wadd(16u,1u);wadd(25u,1u);
   if(rr<p.fWD+p.fNS){D.w=3.0;}else if(rr<p.fWD+p.fNS+p.fBH){D.w=4.0;}else{D.w=0.0;}}}
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
 v=vec4<f32>(vv,u);
 if(lum>p.lumStar){wadd(0u,1u);}if(b0.z>0.0){wadd(1u,1u);wadd(28u,1u);if(b0.z>=273.0&&b0.z<=373.0){wadd(2u,1u);wadd(29u,1u);}}if(b0.x>0.0){wadd(3u,1u);}
 wadd(4u,u32(A.x*1e7));wadd(5u,u32(A.y*1e7));wadd(6u,u32(A.z*1e7));wadd(7u,u32(A.w*1e7));wadd(8u,u32(B.x*1e7));wadd(9u,u32(B.y*1e7));wadd(10u,u32(B.z*1e7));
 wadd(11u,u32(u*1e5));wadd(32u,u32(min(C.x,4.0)*1e6));wadd(33u,u32(min(C.y,4.0)*1e6));wadd(34u,u32(min(C.z,4.0)*1e6));wadd(95u,1u);
 } else if(ty<4.5){
  // materia oscura e resti compatti: solo gravità
  var vv=v.xyz+(f0.xyz+fr.xyz+aL)*p.DT;let sp=length(vv);if(sp>p.VMAX){vv*=p.VMAX/sp;}ps=vec4<f32>(ps.xyz+vv*p.DT,ps.w);v=vec4<f32>(vv,v.w);
  if(ty==2.0){wadd(15u,1u);if(rnd(i,p.step,53u)<p.pIa){b1.w=3.0;B.z+=0.02;B.y+=0.006;B.x+=0.003;A.x=max(0.0,A.x-0.029);wadd(36u,1u);}}
  else if(ty==3.0){wadd(99u,1u);if(rnd(i,p.step,59u)<p.pKN){b1.w=4.0;C.y+=p.KrKN;A=vec4<f32>(0.0,0.0,0.0,0.0);B=vec4<f32>(0.0,0.0,0.0,0.0);wadd(19u,1u);}}
  else if(ty==4.0){if(f3.y>0.5){ty=5.0;D.y=0.0;}else{D.y+=f3.x;D.z=D.z*0.97+f3.x;if(f3.z>0.5){wadd(37u,u32(f3.z));}wadd(100u,1u);atomicMax(&ws[101],u32(D.y*1e4));wadd(102u,u32(D.z*1e6));}}
 }
 if(ty>4.5){v=vec4<f32>(0.0,0.0,0.0,v.w);}
 B.w=lum;D.x=ty;b0.w=snc;
 pos[i]=ps;vel[i]=v;comp[4u*i]=A;comp[4u*i+1u]=B;comp[4u*i+2u]=C;comp[4u*i+3u]=D;bio[2u*i]=b0;bio[2u*i+1u]=b1;
 wadd(12u,bitcast<u32>(i32(round(ps.x*0.5))));wadd(13u,bitcast<u32>(i32(round(ps.y*0.5))));wadd(14u,bitcast<u32>(i32(round(ps.z*0.5))));
 if(ty<4.5){let rr=length(ps.xyz-cen);wadd(40u+u32(clamp(floor(log2(max(rr,1.0))*3.0),0.0,47.0)),1u);wadd(103u,1u);}
 }
 workgroupBarrier();
 for(var k=l;k<${NST}u;k+=64u){let v=atomicLoad(&ws[k]);if(v!=0u){
  if(k>=20u&&k<32u){atomicMax(&st[k],1u);}
  else if(k==101u){atomicMax(&st[k],v);}
  else if((k>=4u&&k<=10u)||(k>=32u&&k<=34u)){let old=atomicAdd(&st[k],v);if(old>0xffffffffu-v){atomicAdd(&st[select(84u+k,k+64u,k>=32u)],1u);}}
  else{atomicAdd(&st[k],v);}}}}`;
const WG_STCLR=COMMON+`
@group(0) @binding(1) var<storage,read_write> st:array<atomic<u32>>;
@compute @workgroup_size(${NST}) fn main(@builtin(local_invocation_index) l:u32){if(p.N==0u){return;}if(l<16u||(l>=32u&&l<36u)||l>=40u){atomicStore(&st[l],0u);}}`;
const WG_FARSW=COMMON+`
@group(0) @binding(1) var<storage,read_write> facc:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read_write> far:array<vec4<f32>>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}far[i]=facc[i];facc[i]=vec4<f32>(0.0);}`;
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
fn rampB(t:f32)->vec3<f32>{var c=array<vec3<f32>,6>(vec3(1.0,0.42,0.16),vec3(1.0,0.66,0.38),vec3(1.0,0.88,0.70),vec3(1.0,0.97,0.93),vec3(0.80,0.87,1.0),vec3(0.58,0.70,1.0));
 let x=clamp(t,0.0,0.9999)*5.0;let k=u32(floor(x));return mix(c[k],c[k+1u],fract(x));}
fn pl(lam:f32,T:f32)->f32{let x=14388.0/(lam*max(T,100.0));return 1.5399*pow(x,4.0)/(exp(min(x,80.0))-1.0+1e-9);}
// banda: 2 visibile, 3 infrarosso, 4 raggi X, 5 gamma, 6 radio. Gas: brillanza superficiale fisica (HDR). Stelle: colore x frazione di luce nella banda.
fn bandCol(md:u32,u:f32,A:vec4<f32>,B:vec4<f32>,D:vec4<f32>,b0:vec4<f32>,b1:vec4<f32>,rho:f32,h:f32)->vec3<f32>{
 let t=(log2(max(u,1e-5))*0.30103+5.0)/3.6;let zm=clamp(sqrt(max(0.0,1.0-A.x-A.y)/0.15),0.0,1.0);let fe=clamp(B.z/0.0026,0.0,1.0);
 if(D.x==0.0&&B.w>p.lumStar){let Ts=select(clamp(5772.0*pow(B.w/0.004,0.13),2500.0,40000.0),3500.0,A.x<0.35);
  if(md==2u){var x=clamp(log2(B.w/p.lumStar)/10.0,0.0,1.0);if(A.x<0.35){x*=0.25;}return rampB(x);}
  if(md==3u){return vec3<f32>(1.0,0.55,0.3)*min(4.0,pl(2.2,Ts)/pl(2.2,5772.0))*0.5;}
  if(md==4u){return vec3<f32>(0.6,0.6,1.0)*0.002*(1.0-smoothstep(5000.0,7000.0,Ts));}
  return vec3<f32>(0.0);}
 if(D.x==0.0&&b0.z>0.0){if(md==3u){return vec3<f32>(1.0,0.6,0.35)*clamp(b0.z/300.0,0.1,3.0)*0.06;}if(md==2u){return select(vec3<f32>(0.55,0.6,0.7),vec3<f32>(0.35,0.85,0.45),b0.x>0.0)*0.02;}return vec3<f32>(0.0);}
 let xi=smoothstep(0.45,0.62,t);let fl=select(0.0,(b0.w-250.0)/50.0,b0.w>250.0);let em=rho*rho*h;
 if(md==2u){let hii=mix(vec3<f32>(0.95,0.22,0.42),vec3<f32>(0.22,0.85,0.78),zm*0.8);return hii*0.012*em*xi*(1.0-smoothstep(0.82,0.95,t))+vec3<f32>(1.0,0.85,0.7)*fl*2.0;}
 if(md==3u){let dm=rho*h*(0.04+zm)*(1.0-smoothstep(0.4,0.62,t));return mix(vec3<f32>(0.7,0.18,0.06),vec3<f32>(1.0,0.75,0.45),clamp(t*2.2,0.0,1.0))*dm*0.06;}
 if(md==4u){let xr=mix(vec3<f32>(0.45,0.55,1.0),vec3<f32>(0.95,0.55,1.0),fe);return xr*0.004*em*smoothstep(0.7,0.9,t)*sqrt(max(t,0.1)*1.5)+vec3<f32>(0.7,0.7,1.0)*fl*1.5;}
 if(md==5u){return vec3<f32>(1.0,0.35,0.9)*(fl*4.0+0.0004*rho*h);}
 let hi=rho*h*(1.0-xi);return vec3<f32>(1.0,0.55,0.2)*hi*0.025+vec3<f32>(0.9,0.4,0.6)*0.003*rho*h*smoothstep(0.65,0.85,t);}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g:vec3<u32>){let i=g.x;if(i>=p.N){return;}
 let ps=pos[i];let u=vel[i].w;let A=comp[4u*i];let B=comp[4u*i+1u];let D=comp[4u*i+3u];let b0=bio[2u*i];let b1=bio[2u*i+1u];
 var col:vec3<f32>;if(p.mode>=2u){col=bandCol(p.mode,u,A,B,D,b0,b1,min(dens[i].x,1e4),ps.w);}else if(p.mode==0u){col=rampT((log2(max(u,1e-5))*0.30103+5.0)/3.6);}else{col=rampZ(sqrt(max(0.0,1.0-A.x-A.y)/0.15));}
 var ring=0.0;if(D.x==0.0){if(b0.z>0.0){ring=select(1.0,2.0,b0.z>=273.0&&b0.z<=373.0);}if(b0.x>0.0){ring=3.0;}}
 var fl=0.0;if(b0.w>250.0){fl=(b0.w-250.0)/50.0;}
 rb[5u*i]=vec4<f32>(ps.xyz,ps.w);rb[5u*i+1u]=vec4<f32>(col,select(0.0,B.w,B.w>p.lumStar&&D.x==0.0));rb[5u*i+2u]=vec4<f32>(ring,b0.y,b0.x,min(dens[i].x,1e4));
 rb[5u*i+3u]=vec4<f32>(b0.z,max(0.0,1.0-A.x-A.y),b1.x,b1.y);let C=comp[4u*i+2u];let fv=p.fw0*A.x+p.fw1*A.y+p.fw2*A.z+p.fw3*A.w+p.fw4*B.x+p.fw5*B.y+p.fw6*B.z+p.fw7*C.x+p.fw8*C.y+p.fw9*C.z;
 let tq=(log2(max(u,1e-5))*0.30103+5.0)/3.6;let zq=clamp(sqrt(max(0.0,1.0-A.x-A.y)/0.15),0.0,1.0);let dust=select(0.0,(1.0-smoothstep(0.2,0.45,tq))*(0.08+zq*2.5+b1.z*40.0)*min(dens[i].x,1e4)*ps.w*0.25,p.mode==2u&&D.x==0.0&&B.w<=p.lumStar&&b0.z<=0.0);
 let mt=select(dust,select(-1.0,fv,D.x==0.0),p.fon>0.5);
 rb[5u*i+4u]=vec4<f32>(D.x,D.y/max(p.mGas,1e-9),D.z/max(p.mGas,1e-9),mt);}`;
const RS=`
struct V{vp:mat4x4<f32>,vw:f32,vh:f32,px:f32,cloudA:f32,cloudK:f32,cloudMax:f32,ptA:f32,dm:f32,fon:f32,q1:f32,q2:f32,q3:f32};
@group(0) @binding(0) var<uniform> v:V;
struct O{@builtin(position) pos:vec4<f32>,@location(0) uv:vec2<f32>,@location(1) col:vec4<f32>,@location(2) ex:vec4<f32>};
fn corner(k:u32)->vec2<f32>{var c=array<vec2<f32>,6>(vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));return c[k];}
fn place(c:vec4<f32>,uv:vec2<f32>,rpx:f32)->vec4<f32>{return vec4<f32>(c.xy+uv*vec2<f32>(rpx*2.0/v.vw,rpx*2.0/v.vh)*c.w,c.zw);}
const OFF=vec4<f32>(2.,2.,2.,1.);
@vertex fn vcloud(@builtin(vertex_index) vi:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>,@location(3) t:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 let rpx=min(a.w*v.cloudK*v.vh*0.5/max(c.w,1e-4),v.cloudMax);
 if(t.x!=0.0||c.w<=0.0||rpx<0.6||v.fon>0.5||(v.q2>0.5&&(b.w>0.0||e.x>=1.0))){o.pos=OFF;return o;}
 if(v.q2>0.5){let mx=max(b.r,max(b.g,b.b));if(mx<1e-4){o.pos=OFF;return o;}o.pos=place(c,uv,rpx);o.uv=uv;o.col=vec4<f32>(b.rgb*min(1.0,rpx/2.0),1.0);o.ex=vec4<f32>(0.);return o;}
 o.pos=place(c,uv,rpx);o.uv=uv;let dens=clamp(0.6/sqrt(1.0+e.w*0.5),0.12,0.6);let lu=dot(b.rgb,vec3<f32>(0.3,0.6,0.1));o.col=vec4<f32>(b.rgb,v.cloudA*dens*min(1.0,rpx/3.0)/(1.0+lu*lu*4.0));o.ex=vec4<f32>(0.);return o;}
@vertex fn vdust(@builtin(vertex_index) vi:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>,@location(3) t:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 let rpx=min(a.w*v.cloudK*v.vh*0.5/max(c.w,1e-4),v.cloudMax*1.4);
 if(t.x!=0.0||c.w<=0.0||rpx<1.0||v.fon>0.5||t.w<0.02){o.pos=OFF;return o;}
 o.pos=place(c,uv,rpx);o.uv=uv;o.col=vec4<f32>(0.,0.,0.,(1.0-exp(-t.w))*0.85*min(1.0,rpx/4.0));o.ex=vec4<f32>(0.);return o;}
@fragment fn fdust(i:O)->@location(0) vec4<f32>{let r2=dot(i.uv,i.uv);if(r2>1.0){discard;}let a=i.col.a*exp(-r2*3.0);return vec4<f32>(0.,0.,0.,a);}
@fragment fn fcloud(i:O)->@location(0) vec4<f32>{let r2=dot(i.uv,i.uv);if(r2>1.0){discard;}let a=i.col.a*exp(-r2*3.5);return vec4<f32>(i.col.rgb*a,a);}
@vertex fn vpt(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>,@location(3) t:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 if(c.w<=0.0||t.x>4.5){o.pos=OFF;return o;}
 var rpx=v.px;var col=vec4<f32>(b.rgb,v.ptA);var star=0.0;
 if(v.fon>0.5){if(t.w<=v.q1){o.pos=OFF;return o;}o.pos=place(c,uv,v.px*2.6);o.uv=uv;o.col=vec4<f32>(1.0,0.84,0.48,1.0);o.ex=vec4<f32>(1.0,0.,0.,0.);return o;}
 if(v.q2>0.5){let bd=u32(v.q2+0.5)-1u;let dd=pow(v.q3/max(c.w,1e-3),2.0);var Bf=0.0;var cc=vec3<f32>(1.0);
  let ph=fract(sin(f32(ii)*12.9898)*43758.5)*6.2831;let per=0.4+fract(f32(ii)*0.618)*1.6;let fla=pow(max(0.0,sin(v.q1*6.2831/per+ph)),24.0);
  var pal=array<vec3<f32>,5>(vec3<f32>(1.0,0.8,0.6),vec3<f32>(1.0,0.5,0.25),vec3<f32>(0.6,0.6,1.0),vec3<f32>(1.0,0.35,0.9),vec3<f32>(1.0,0.55,0.2));
  if(t.x==1.0){o.pos=OFF;return o;}
  if(t.x==4.0){let ac=clamp(log2(1.0+t.z*400.0)*0.3,0.0,1.0);var m=array<f32,5>(0.6,1.0,8.0,3.0,5.0);Bf=ac*m[bd]*dd*0.2;if(bd==3u&&ac<0.5){Bf=0.0;}cc=pal[bd];}
  else if(t.x==3.0){var m=array<f32,5>(0.05,0.02,1.5,0.0,0.0);var f=array<f32,5>(2.0,0.0,6.0,60.0,80.0);Bf=(m[bd]+f[bd]*fla)*dd*0.05;cc=select(pal[bd],vec3<f32>(0.6,0.8,1.0),bd==0u);}
  else if(t.x==2.0){var m=array<f32,5>(0.08,0.02,0.15,0.0,0.0);Bf=m[bd]*dd;cc=select(pal[bd],vec3<f32>(0.8,0.88,1.0),bd==0u);}
  else if(b.w>0.0){Bf=min(2e4,(b.w/0.004)*dd*0.5);cc=b.rgb;}
  else{let mx=max(b.r,max(b.g,b.b));if(mx<2e-3){o.pos=OFF;return o;}o.pos=place(c,uv,v.px*1.3);o.uv=uv;o.col=vec4<f32>(b.rgb*0.35,1.0);o.ex=vec4<f32>(0.);return o;}
  if(Bf*max(cc.r,max(cc.g,cc.b))<1e-3){o.pos=OFF;return o;}
  let sz=clamp(2.0+2.2*log2(1.0+Bf),2.0,16.0);o.pos=place(c,uv,v.px*sz);o.uv=uv;o.col=vec4<f32>(cc*min(Bf,2e4),1.0);o.ex=vec4<f32>(3.0,Bf,sz,0.);return o;}
 if(t.x==4.0&&v.q2>0.5){let ac=clamp(log2(1.0+t.z*400.0)*0.3,0.0,1.0);if(ac<0.02){o.pos=OFF;return o;}let Bf=ac*3.0*pow(v.q3/max(c.w,1e-3),2.0)*0.2;let sz=clamp(2.0+2.0*log2(1.0+Bf),2.0,10.0);o.pos=place(c,uv,v.px*sz);o.uv=uv;o.col=vec4<f32>(vec3<f32>(1.0,0.75,0.5)*Bf,1.0);o.ex=vec4<f32>(3.0,Bf,sz,0.);return o;}
 if(t.x==4.0){rpx=v.px*clamp(3.0+log2(1.0+t.y)*1.6,3.0,22.0);o.pos=place(c,uv,rpx);o.uv=uv;o.col=vec4<f32>(1.0,0.62,0.25,clamp(0.35+log2(1.0+t.z*200.0)*0.25,0.35,1.0));o.ex=vec4<f32>(2.0,0.,0.,0.);return o;}
 if(t.x==1.0){if(v.dm<0.5){o.pos=OFF;return o;}col=vec4<f32>(0.55,0.42,1.0,0.28);}
 else if(t.x==2.0){rpx=v.px*2.2;col=vec4<f32>(0.78,0.88,1.0,1.0);star=1.0;}
 else if(t.x==3.0){if(v.q2>0.5){let ph=fract(sin(f32(ii)*12.9898)*43758.5)*6.2831;let per=0.4+fract(f32(ii)*0.618)*1.6;let fl=pow(max(0.0,sin(v.q1*6.2831/per+ph)),24.0);
  let Bf=(0.15+60.0*fl)*pow(v.q3/max(c.w,1e-3),2.0)*0.05+0.05;let sz=clamp(2.0+2.2*log2(1.0+Bf),2.0,14.0);o.pos=place(c,uv,v.px*sz);o.uv=uv;o.col=vec4<f32>(vec3<f32>(0.6,0.8,1.0)*Bf,1.0);o.ex=vec4<f32>(3.0,Bf,sz,0.);return o;}
  rpx=v.px*2.0;col=vec4<f32>(0.45,1.0,0.95,1.0);star=1.0;}
 else if(b.w>0.0&&v.q2>0.5){let Bf=min(2e4,(b.w/0.004)*pow(v.q3/max(c.w,1e-3),2.0)*0.5);let sz=clamp(2.0+2.2*log2(1.0+Bf),2.0,16.0);o.pos=place(c,uv,v.px*sz);o.uv=uv;o.col=vec4<f32>(b.rgb*Bf,1.0);o.ex=vec4<f32>(3.0,Bf,sz,0.);return o;}
 else if(b.w>0.0){rpx=v.px*clamp(2.0+sqrt(b.w)*14.0,2.0,6.0);col=select(vec4<f32>(1.0,0.93,0.75,1.0),vec4<f32>(b.rgb,1.0),v.q2>0.5);star=1.0;}
 o.pos=place(c,uv,rpx);o.uv=uv;o.col=col;o.ex=vec4<f32>(star,0.,0.,0.);return o;}
@fragment fn fpt(i:O)->@location(0) vec4<f32>{let r2=dot(i.uv,i.uv);if(r2>1.0){discard;}
 if(i.ex.x>2.5){let r=sqrt(r2);let q=r*i.ex.z*1.9;let core=exp(-q*q*0.5);let halo=0.05*exp(-q*0.8)*min(1.0,i.ex.y*0.3);var spk=0.0;
  if(i.ex.y>4.0){let ax=abs(i.uv.x)*i.ex.z*1.9;let ay=abs(i.uv.y)*i.ex.z*1.9;spk=(exp(-ay*ay*1.5)*exp(-ax*0.45)+exp(-ax*ax*1.5)*exp(-ay*0.45))*0.18*min(1.0,i.ex.y/40.0);}
  let fade=1.0-smoothstep(0.75,1.0,r);return vec4<f32>(i.col.rgb*(core+halo+spk)*fade,0.0);}
 var a=i.col.a;if(i.ex.x>1.5){let r=sqrt(r2);a=0.8*i.col.a*exp(-pow((r-0.36)*5.0,2.0))*(1.0-r);}else if(i.ex.x>0.5){a=0.9*exp(-r2*16.0)+0.05*exp(-r2*3.0);}else{a*=1.0-smoothstep(0.55,1.0,sqrt(r2));}
 return vec4<f32>(i.col.rgb*a,a);}
@vertex fn vring(@builtin(vertex_index) vi:u32,@location(0) a:vec4<f32>,@location(1) b:vec4<f32>,@location(2) e:vec4<f32>,@location(3) t:vec4<f32>)->O{var o:O;let uv=corner(vi);let c=v.vp*vec4<f32>(a.xyz,1.0);
 if(c.w<=0.0){o.pos=OFF;return o;}
 if(t.x==4.0&&v.fon<0.5){let rpx=v.px*clamp(3.0+log2(1.0+t.y)*1.6,3.0,22.0);o.pos=place(c,uv,rpx);o.uv=uv;o.col=vec4<f32>(1.0,0.62,0.25,clamp(0.35+log2(1.0+t.z*200.0)*0.25,0.35,1.0));o.ex=vec4<f32>(1.0,0.,0.,0.);return o;}
 o.pos=OFF;return o;}
@fragment fn fring(i:O)->@location(0) vec4<f32>{let r=length(i.uv);
 if(i.ex.x>0.5){if(r>0.32){discard;}return vec4<f32>(0.0,0.0,0.0,1.0);}
 let a=i.col.a*(1.0-smoothstep(0.0,0.18,abs(r-0.78)));if(a<0.01){discard;}return vec4<f32>(i.col.rgb*a,a);}
`;
const PS=`
@group(0) @binding(0) var src:texture_2d<f32>;@group(0) @binding(1) var smp:sampler;@group(0) @binding(2) var<uniform> pu:vec4<f32>;@group(0) @binding(3) var blm:texture_2d<f32>;
struct VO{@builtin(position) p:vec4<f32>,@location(0) uv:vec2<f32>};
@vertex fn vfs(@builtin(vertex_index) i:u32)->VO{var o:VO;let q=vec2<f32>(f32((i<<1u)&2u),f32(i&2u));o.p=vec4<f32>(q*2.0-1.0,0.,1.);o.uv=vec2<f32>(q.x,1.0-q.y);return o;}
@fragment fn fdown(i:VO)->@location(0) vec4<f32>{let ts=1.0/vec2<f32>(textureDimensions(src));var c=vec3<f32>(0.);for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){c+=textureSampleLevel(src,smp,i.uv+vec2<f32>(f32(x),f32(y))*ts*1.5,0.).rgb;}}c/=9.0;let l=max(c.r,max(c.g,c.b));return vec4<f32>(c*max(l-pu.w,0.)/max(l,1e-4),1.);}
@fragment fn fblur(i:VO)->@location(0) vec4<f32>{let ts=pu.xy/vec2<f32>(textureDimensions(src));var w=array<f32,5>(0.227,0.194,0.121,0.054,0.016);var c=textureSampleLevel(src,smp,i.uv,0.).rgb*w[0];for(var k=1;k<5;k++){let o=ts*f32(k)*1.6;c+=(textureSampleLevel(src,smp,i.uv+o,0.).rgb+textureSampleLevel(src,smp,i.uv-o,0.).rgb)*w[k];}return vec4<f32>(c,1.);}
@fragment fn fcomp(i:VO)->@location(0) vec4<f32>{var c=(textureSampleLevel(src,smp,i.uv,0.).rgb+textureSampleLevel(blm,smp,i.uv,0.).rgb*0.15)*pu.z;
 c=clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),vec3<f32>(0.),vec3<f32>(1.));let n=fract(sin(dot(i.p.xy,vec2<f32>(12.9898,78.233)))*43758.5453)/255.0;return vec4<f32>(c+vec3<f32>(0.012,0.015,0.03)*(1.0-c)+n,1.);}`;
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
  const d=this.dev,mk=(code)=>d.createShaderModule({code});
  const src={clear:WG_CLEAR,hash:WG_HASH,dens:WG_DENS,force:WG_FORCE,far:WG_FAR,integ:WG_INTEG,stclr:WG_STCLR,farsw:WG_FARSW,prep:WG_PREP};
  this.pipes={};for(const k in src){this.pipes[k]=d.createComputePipeline({layout:'auto',compute:{module:mk(src[k]),entryPoint:'main'}});}
  if(canvas){const rm=mk(RS);const vb=[{arrayStride:80,stepMode:'instance',attributes:[0,1,2,4].map((s,k)=>({shaderLocation:k,offset:s*16,format:'float32x4'}))}];
   const add={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}};
   const over={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
   const rp=(vs,fs,bl,dw)=>d.createRenderPipeline({layout:'auto',vertex:{module:rm,entryPoint:vs,buffers:vb},fragment:{module:rm,entryPoint:fs,targets:[{format:this.fmt,blend:bl}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:dw,depthCompare:'less'}});
   this.rp={cloud:rp('vcloud','fcloud',add,false),pt:rp('vpt','fpt',add,false),ring:rp('vring','fring',over,true)};
   const mul={color:{srcFactor:'zero',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}};
   const rpH=(vs,fs,bl,dw)=>d.createRenderPipeline({layout:'auto',vertex:{module:rm,entryPoint:vs,buffers:vb},fragment:{module:rm,entryPoint:fs,targets:[{format:'rgba16float',blend:bl}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:dw,depthCompare:'less'}});
   this.rpH={cloud:rpH('vcloud','fcloud',add,false),pt:rpH('vpt','fpt',add,false),ring:rpH('vring','fring',over,true),dust:rpH('vdust','fdust',mul,false)};
   const pm=mk(PS);const pp=(fs,fmt)=>d.createRenderPipeline({layout:'auto',vertex:{module:pm,entryPoint:'vfs'},fragment:{module:pm,entryPoint:fs,targets:[{format:fmt}]},primitive:{topology:'triangle-list'}});
   this.pp={down:pp('fdown','rgba16float'),blur:pp('fblur','rgba16float'),comp:pp('fcomp',this.fmt)};this.smp=d.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
   this.pub=[0,1,2].map(()=>d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
   this.vub=d.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   this.rbg={};for(const k in this.rp)this.rbg[k]=d.createBindGroup({layout:this.rp[k].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.vub}}]});
   this.rbgH={};for(const k in this.rpH)this.rbgH[k]=d.createBindGroup({layout:this.rpH[k].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.vub}}]});}
  const ub=Math.ceil(PWORDS*4/16)*16;this.ub=d.createBuffer({size:ub,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.uarr=new ArrayBuffer(ub);this.u32=new Uint32Array(this.uarr);this.f32=new Float32Array(this.uarr);
 }
 setU(k,val){const i=UF.indexOf(k);if(i>=0){this.u32[i]=val>>>0;return;}const j=FF.indexOf(k);if(j<0)throw new Error(k);this.f32[UF.length+j]=val;}
 setLam(on){this.lamOn=on;this.setU('Lam',on?this.lamVal:0);}
 reset(N,o){o=o||{};const d=this.dev;this.N=N;this.TB=1<<Math.max(16,Math.ceil(Math.log2(N*2)));
  const fDMn=o.fDMn!=null?o.fDMn:0.5,fb=o.fb||0.16;const Ndm=Math.round(N*fDMn),Ng=N-Ndm;this.Ng=Ng;this.Ndm=Ndm;
  const MTOT=o.nref||2000,MP=MTOT/Ng,LS=Math.cbrt(MP);this.MP=MP;this.LS=LS;const R0=o.R0||100,G=o.G||0.0015;
  const mGas=(Ndm>0?fb:1)*MTOT/Ng,mDM=Ndm>0?(1-fb)*MTOT/Ndm:0;this.mGas=mGas;this.lamVal=o.Lam!=null?o.Lam:1.5e-7;if(this.lamOn===undefined)this.lamOn=true;
  const prm={G,EPS2:((o.eps||2.5)*LS)**2,MP,LS,CS:(o.cs||4)*LS,RN2:((o.rn||4)*LS)**2,HMIN:(o.hmin||1.2)*LS,NGB:o.ngb||32,DT:o.dt||1,VMAX:o.vmax||3,UMIN:o.umin||1e-5,UMAX:o.umax||0.03,
   T1:o.T1||0.0018,T2:o.T2||0.006,T3:o.T3||0.012,T4:o.T4||0.02,K1:o.K1||0.001,RHO1:o.rho1||0.5,QS:o.Q||0.003,FH:o.fh||0.1,lam:o.lam||1.2,rhoThick:o.rhoThick||3,metK:o.metK||300,vdamp:o.vdamp||0.9997,
   mix:o.mix||0.002,snk:o.snk||0.06,snu:o.snu||0.01,snCool:o.snCool||200,feSN:o.feSN||0.005,zSN:o.zSN||0.6,Tmol:o.Tmol||0.004,Tdust:o.Tdust||0.008,dustP:o.dustP||0.00002,lumStar:o.lumStar||2e-5,T0:o.T0||278,F0:o.F0||2e-5,
   watMin:o.watMin||0.0003,orgMin:o.orgMin||0.00005,orgK:o.orgK||0.001,gr:o.gr||0.05,spread:o.spread||0.03,pAbio:o.pAbio||0.03,cx:0,cy:0,cz:0,rsMin:3*LS,Ks:o.Ks||400,Kr:o.Kr||5,Kl:o.Kl||3e-3,FeSun:SOLAR.fePeak,CNOsun:SOLAR.cno,
   Lam:this.lamOn?this.lamVal:0,pIa:o.pIa||4e-4,pKN:o.pKN||6e-4,KrKN:o.KrKN||600,kAGN:o.kAGN||0.02,Ks2:o.Ks2||10,fWD:o.fWD!=null?o.fWD:0.25,fNS:o.fNS!=null?o.fNS:0.12,fBH:o.fBH!=null?o.fBH:0.04,
   mWD:0.3,mNS:0.15,mBH:0.4,mGas,racMax:(o.racMax||0.6)*(o.cs||4)*LS,bondi:o.bondi||150,rMerge:(o.rMerge||0.6)*LS,nsKick:o.nsKick||0.15,sp5:o.kh||4,sp6:o.ign||1.6};
  this.u32.fill(0);for(const k in prm)this.setU(k,prm[k]);this.setU('N',N);this.setU('TB',this.TB);
  this.K=o.K||Math.max(N<=16384?4:N<=65536?6:8,Math.ceil(N*N/2e9));this.chunk=Math.ceil(N/this.K/256)*256;
  // condizioni iniziali: sfera di gas H/He 75/25 e materia oscura, fluttuazioni di densità, flusso di Hubble
  let _s=(o.seed>>>0)||1;const R=()=>{_s=(_s+0x6D2B79F5)>>>0;let t=_s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};this.seed=o.seed>>>0;const pos=new Float32Array(N*4),vel=new Float32Array(N*4),comp=new Float32Array(N*16),bio=new Float32Array(N*8);
  const rdir=()=>{const c=R()*2-1,a=R()*6.2832,s=Math.sqrt(1-c*c);return[s*Math.cos(a),s*Math.sin(a),c];};
  const seeds=[];for(let k=0;k<(o.seeds||30);k++){const dd=rdir(),r=R0*.85*Math.cbrt(R());seeds.push([dd[0]*r,dd[1]*r,dd[2]*r]);}
  const vesc=Math.sqrt(2*G*MTOT/R0),H0=(o.fH||0.85)*vesc/R0;
  const isDM=new Uint8Array(N);for(let k=0;k<Ndm;k++)isDM[k]=1;for(let k=N-1;k>0;k--){const j=(R()*(k+1))|0;const t=isDM[k];isDM[k]=isDM[j];isDM[j]=t;}
  for(let i=0;i<N;i++){let q;if(R()<(o.clump||0.6)){const s=seeds[(R()*seeds.length)|0],dd=rdir(),r=(o.sr||9)*(isDM[i]?(o.dmSr||0.6):1)*Math.cbrt(R());q=[s[0]+dd[0]*r,s[1]+dd[1]*r,s[2]+dd[2]*r];}
   else{do{q=[(R()*2-1)*R0,(R()*2-1)*R0,(R()*2-1)*R0];}while(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]>R0*R0);}
   pos.set([q[0],q[1],q[2],6*LS],i*4);vel.set([H0*q[0]+(R()-.5)*.02,H0*q[1]+(R()-.5)*.02,H0*q[2]+(R()-.5)*.02,o.u0||0.0005],i*4);
   if(isDM[i]){comp[i*16+12]=1;comp[i*16+13]=mDM;}else{comp[i*16]=0.75;comp[i*16+1]=0.25;comp[i*16+12]=0;comp[i*16+13]=mGas;}bio[i*8+1]=-1;}
  for(const b of Object.values(this.b||{}))b.destroy();
  const S=GPUBufferUsage.STORAGE,CD=GPUBufferUsage.COPY_DST,CS=GPUBufferUsage.COPY_SRC,VX=GPUBufferUsage.VERTEX;
  const mkb=(bytes,us,data)=>{const b=d.createBuffer({size:bytes,usage:us,mappedAtCreation:!!data});if(data){new Float32Array(b.getMappedRange()).set(data);b.unmap();}return b;};
  this.b={pos:mkb(N*16,S|CD|CS,pos),vel:mkb(N*16,S|CD|CS,vel),comp:mkb(N*64,S|CD|CS,comp),bio:mkb(N*32,S|CD|CS,bio),dens:mkb(N*16,S|CS),fout:mkb(N*80,S),
   far:mkb(N*16,S|CD),facc:mkb(N*16,S|CD),grid:mkb((this.TB+N)*4,S),st:mkb(NST*4,S|CS|CD),rb:mkb(N*80,S|VX|CS),
   stRead:d.createBuffer({size:NST*4,usage:GPUBufferUsage.MAP_READ|CD}),pick:d.createBuffer({size:N*80,usage:GPUBufferUsage.MAP_READ|CD}),fol:d.createBuffer({size:144,usage:GPUBufferUsage.MAP_READ|CD})};
  const bg=(pipe,list)=>d.createBindGroup({layout:this.pipes[pipe].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.ub}},...list.map((n,k)=>({binding:k+1,resource:{buffer:this.b[n]}}))]});
  this.bg={clear:bg('clear',['grid']),hash:bg('hash',['pos','grid','comp']),dens:bg('dens',['pos','vel','grid','dens','comp']),force:bg('force',['pos','vel','grid','dens','comp','bio','fout']),
   far:bg('far',['pos','comp','facc']),integ:bg('integ',['pos','vel','comp','dens','bio','fout','far','st']),stclr:bg('stclr',['st']),farsw:bg('farsw',['facc','far']),prep:bg('prep',['pos','vel','comp','bio','dens','rb'])};
  this.t=0;this.farChunk=0;this.stats=null;this.statBusy=false;this.pickBusy=false;this.folBusy=false;this.cm=[0,0,0];
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
 render(vp,o){const d=this.dev,W=this.canvas.width,H=this.canvas.height;const f=new Float32Array(28);f.set(vp,0);f[16]=W;f[17]=H;f[18]=o.px;f[19]=o.cloudA;f[20]=o.cloudK;f[21]=o.cloudMax;f[22]=o.ptA;f[23]=o.dm?1:0;f[24]=o.fon?1:0;f[25]=o.fon?(o.fth||0):(performance.now()/1000)%1000;f[26]=o.real?(o.band||1):0;f[27]=o.camD||1;
  d.queue.writeBuffer(this.vub,0,f);const e=d.createCommandEncoder();
  const tex=o.view?null:this.ctx.getCurrentTexture();const tw=o.view?(o.w||W):tex.width,th=o.view?(o.h||H):tex.height;
  if(!this.depth||this.depth.width!==tw||this.depth.height!==th){if(this.depth)this.depth.destroy();this.depth=d.createTexture({size:[tw,th],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});}
  if(o.real&&this.rpH){this.renderHDR(e,o,tex,tw,th);d.queue.submit([e.finish()]);return;}
  const rp=e.beginRenderPass({colorAttachments:[{view:o.view||tex.createView(),clearValue:(this.clear||{r:0.016,g:0.02,b:0.04,a:1}),loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
  rp.setVertexBuffer(0,this.b.rb);
  // prima i buchi neri (scrivono la profondità): il gas davanti li vela, quello dietro viene nascosto
  rp.setPipeline(this.rp.ring);rp.setBindGroup(0,this.rbg.ring);rp.draw(6,this.N);
  if(o.cloudA>0){rp.setPipeline(this.rp.cloud);rp.setBindGroup(0,this.rbg.cloud);rp.draw(6,this.N);}
  rp.setPipeline(this.rp.pt);rp.setBindGroup(0,this.rbg.pt);rp.draw(6,this.N);
  rp.end();d.queue.submit([e.finish()]);}
 ensurePost(tw,th){const d=this.dev;if(this.post&&this.post.w===tw&&this.post.h===th)return this.post;if(this.post){this.post.hdr.destroy();this.post.a.destroy();this.post.b.destroy();}
  const U=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;const qw=Math.max(1,tw>>2),qh=Math.max(1,th>>2);
  const P={w:tw,h:th,hdr:d.createTexture({size:[tw,th],format:'rgba16float',usage:U}),a:d.createTexture({size:[qw,qh],format:'rgba16float',usage:U}),b:d.createTexture({size:[qw,qh],format:'rgba16float',usage:U})};
  const bg=(pl,srcT,ub,blT)=>{const en=[{binding:0,resource:srcT.createView()},{binding:1,resource:this.smp}];const lay=pl.getBindGroupLayout(0);if(ub)en.push({binding:2,resource:{buffer:ub}});if(blT)en.push({binding:3,resource:blT.createView()});return d.createBindGroup({layout:lay,entries:en});};
  P.gDown=bg(this.pp.down,P.hdr,this.pub[0]);P.gH=bg(this.pp.blur,P.a,this.pub[1]);P.gV=bg(this.pp.blur,P.b,this.pub[2]);P.gComp=bg(this.pp.comp,P.hdr,this.pub[0],P.a);
  return this.post=P;}
 renderHDR(e,o,tex,tw,th){const d=this.dev,P=this.ensurePost(tw,th);const ex=o.exposure||1;
  d.queue.writeBuffer(this.pub[0],0,new Float32Array([0,0,ex,1.5]));d.queue.writeBuffer(this.pub[1],0,new Float32Array([1,0,0,0]));d.queue.writeBuffer(this.pub[2],0,new Float32Array([0,1,0,0]));
  const rp=e.beginRenderPass({colorAttachments:[{view:P.hdr.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
  rp.setVertexBuffer(0,this.b.rb);rp.setPipeline(this.rpH.ring);rp.setBindGroup(0,this.rbgH.ring);rp.draw(6,this.N);
  rp.setPipeline(this.rpH.pt);rp.setBindGroup(0,this.rbgH.pt);rp.draw(6,this.N);
  if(o.cloudA>0){rp.setPipeline(this.rpH.dust);rp.setBindGroup(0,this.rbgH.dust);rp.draw(6,this.N);rp.setPipeline(this.rpH.cloud);rp.setBindGroup(0,this.rbgH.cloud);rp.draw(6,this.N);}
  rp.end();
  const pass=(view,pl,g)=>{const r=e.beginRenderPass({colorAttachments:[{view,clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});r.setPipeline(pl);r.setBindGroup(0,g);r.draw(3);r.end();};
  pass(P.a.createView(),this.pp.down,P.gDown);pass(P.b.createView(),this.pp.blur,P.gH);pass(P.a.createView(),this.pp.blur,P.gV);pass(o.view||tex.createView(),this.pp.comp,P.gComp);}
 async readStats(){if(this.statBusy)return null;this.statBusy=true;const d=this.dev,e=d.createCommandEncoder();e.copyBufferToBuffer(this.b.st,0,this.b.stRead,0,NST*4);d.queue.submit([e.finish()]);
  try{await this.b.stRead.mapAsync(GPUMapMode.READ);}catch(err){this.statBusy=false;return null;}
  const a=new Uint32Array(this.b.stRead.getMappedRange().slice(0));this.b.stRead.unmap();this.statBusy=false;
  const N=this.N,ng=Math.max(1,a[95]),na=Math.max(1,a[103]),i32=new Int32Array(a.buffer);
  const s={t:this.t,stars:a[0],planets:a[1],habit:a[2],lifeP:a[3],tot:[4,5,6,7,8,9,10].map(k=>(a[84+k]*4294967296+a[k])/1e7/ng),temp:a[11]/1e5/ng,
   cm:[i32[12]*2/N,i32[13]*2/N,i32[14]*2/N],trac:[32,33,34].map(k=>(a[k+64]*4294967296+a[k])/1e6/ng),sn:a[16],lin:a[17],efus:a[18]/1e6,
   first:{fus:a[20],c:a[21],o:a[22],mg:a[23],fe:a[24],sn:a[25],h2o:a[26],org:a[27],planet:a[28],hz:a[29],life:a[30],spread:a[31]},
   gas:a[95],dm:this.Ndm,wd:a[15],ns:a[99],bh:a[100],bhMax:a[101]/1e4/this.mGas,bhAcc:a[102]/1e6/this.mGas,ia:a[36],kn:a[19],merges:a[37],eaten:a[38],pn:a[39]};
  let c=0,med=0;for(let b=0;b<48;b++){const nb=a[40+b];if(c+nb>=na/2){med=Math.pow(2,(b+(na/2-c)/Math.max(1,nb))/3);break;}c+=nb;}s.R=med;this.cm=s.cm;this.stats=s;return s;}
 async readPick(){if(this.pickBusy)return null;this.pickBusy=true;const d=this.dev,e=d.createCommandEncoder();e.copyBufferToBuffer(this.b.rb,0,this.b.pick,0,this.N*80);d.queue.submit([e.finish()]);
  try{await this.b.pick.mapAsync(GPUMapMode.READ);}catch(e){this.pickBusy=false;return null;}const a=new Float32Array(this.b.pick.getMappedRange().slice(0));this.b.pick.unmap();this.pickBusy=false;return a;}
 async readOne(i){if(this.folBusy)return null;this.folBusy=true;const d=this.dev,e=d.createCommandEncoder();if(i>=this.N){this.folBusy=false;return null;}e.copyBufferToBuffer(this.b.pos,i*16,this.b.fol,0,16);e.copyBufferToBuffer(this.b.comp,i*64,this.b.fol,16,64);e.copyBufferToBuffer(this.b.bio,i*32,this.b.fol,80,32);e.copyBufferToBuffer(this.b.vel,i*16,this.b.fol,112,16);e.copyBufferToBuffer(this.b.dens,i*16,this.b.fol,128,16);d.queue.submit([e.finish()]);
  try{await this.b.fol.mapAsync(GPUMapMode.READ);}catch(e){this.folBusy=false;return null;}const a=new Float32Array(this.b.fol.getMappedRange().slice(0));this.b.fol.unmap();this.folBusy=false;return a;}
 async done(){await this.dev.queue.onSubmittedWorkDone();}
}
if(typeof window!=='undefined')window.GenesisGPU=GenesisGPU;
