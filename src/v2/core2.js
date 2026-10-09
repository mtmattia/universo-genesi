function makeSim2(o){
o=o||{};
const N=o.n||550,L=o.L||370,HMAX=o.hmax||28,HMIN=o.hmin||2.5,NGB=o.ngb||28,G=o.G??0.06,EPS=o.eps||2.5,GAM=5/3;
const DT=o.dt||0.6,VMAX=o.vmax||4,UMIN=o.umin||0.002,UMAX=o.umax||3;
const NS=7,SP=[{s:'H',n:'Idrogeno',c:'#cfe3ff'},{s:'He',n:'Elio',c:'#f2d16b'},{s:'C',n:'Carbonio',c:'#bdb6aa'},{s:'N',n:'Azoto',c:'#6e93ff'},{s:'O',n:'Ossigeno',c:'#ff6a5c'},{s:'Mg',n:'Metalli',c:'#c98a4b'},{s:'Fe',n:'Ferro',c:'#e0562a'}];
const x=new Float64Array(N),y=new Float64Array(N),z=new Float64Array(N),vx=new Float64Array(N),vy=new Float64Array(N),vz=new Float64Array(N);
const u=new Float64Array(N),h=new Float64Array(N),rho=new Float64Array(N),P=new Float64Array(N),cnt=new Float64Array(N);
const ax=new Float64Array(N),ay=new Float64Array(N),az=new Float64Array(N),du=new Float64Array(N),gx=new Float64Array(N),gy=new Float64Array(N),gz=new Float64Array(N);
const X=new Float64Array(N*NS),lum=new Float64Array(N),bio=new Float64Array(N),hue=new Float64Array(N),dust=new Float64Array(N),org=new Float64Array(N),wat=new Float64Array(N),snc=new Float64Array(N),dX=new Float64Array(N*NS),planet=new Uint8Array(N);
const R=Math.random;
const S={t:0,N,L,SP,x,y,z,u,rho,X,lum,bio,hue,dust,org,wat,planet,h,log:[],seen:{},fx:[],sn:0,lin:0,E:{fus:0,rad:0},stars:0,planets:0,lifeP:0};
const note=(k,m)=>{if(!S.seen[k]){S.seen[k]=1;S.log.push({t:S.t,msg:m});}};
// condizioni iniziali: dopo la nucleosintesi primordiale (75% H, 25% He in massa), con fluttuazioni di densità
const seeds=[];for(let k=0;k<(o.seeds||10);k++)seeds.push([R()*L,R()*L,R()*L]);
for(let i=0;i<N;i++){let px,py,pz;if(R()<(o.clump||0.55)){const s=seeds[(R()*seeds.length)|0],r=(o.sr||55)*Math.cbrt(R());const a=R()*6.2832,c=R()*2-1,sn=Math.sqrt(1-c*c);px=s[0]+r*sn*Math.cos(a);py=s[1]+r*sn*Math.sin(a);pz=s[2]+r*c;}else{px=R()*L;py=R()*L;pz=R()*L;}
 x[i]=(px%L+L)%L;y[i]=(py%L+L)%L;z[i]=(pz%L+L)%L;vx[i]=(R()-.5)*.3;vy[i]=(R()-.5)*.3;vz[i]=(R()-.5)*.3;u[i]=o.u0||0.08;h[i]=HMAX*.7;X[i*NS]=0.75;X[i*NS+1]=0.25;hue[i]=-1;}
note('bang','Big Bang: gas di idrogeno ed elio (75/25), caldo e quasi uniforme');
const GN=Math.max(3,Math.floor(L/HMAX)),CS=L/GN,head=new Int32Array(GN*GN*GN),next=new Int32Array(N);
const half=L/2;
function grid(){head.fill(-1);for(let i=0;i<N;i++){const c=((Math.floor(z[i]/CS)%GN)*GN+Math.floor(y[i]/CS)%GN)*GN+Math.floor(x[i]/CS)%GN;next[i]=head[c];head[c]=i;}}
function W(r,hh){const q=r/hh;if(q>=1)return 0;const s=8/(Math.PI*hh*hh*hh);return q<.5?s*(1-6*q*q+6*q*q*q):s*2*(1-q)*(1-q)*(1-q);}
function dW(r,hh){const q=r/hh;if(q>=1)return 0;const s=8/(Math.PI*hh*hh*hh*hh);return q<.5?s*(-12*q+18*q*q):s*(-6*(1-q)*(1-q));}
function forNb(i,fn){const gx0=Math.floor(x[i]/CS),gy0=Math.floor(y[i]/CS),gz0=Math.floor(z[i]/CS);
 for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){const cell=(((gz0+a+GN)%GN)*GN+(gy0+b+GN)%GN)*GN+(gx0+c+GN)%GN;
  for(let j=head[cell];j>=0;j=next[j]){if(j===i)continue;let dx=x[j]-x[i],dy=y[j]-y[i],dz=z[j]-z[i];
   if(dx>half)dx-=L;else if(dx<-half)dx+=L;if(dy>half)dy-=L;else if(dy<-half)dy+=L;if(dz>half)dz-=L;else if(dz<-half)dz+=L;
   const r2=dx*dx+dy*dy+dz*dz;if(r2<HMAX*HMAX)fn(j,dx,dy,dz,Math.sqrt(r2));}}}
function gravity(){gx.fill(0);gy.fill(0);gz.fill(0);const e2=EPS*EPS,cut=(o.gcut||180)**2;
 for(let i=0;i<N;i++){const xi=x[i],yi=y[i],zi=z[i];let fx=0,fy=0,fz=0;
  for(let j=i+1;j<N;j++){let dx=x[j]-xi,dy=y[j]-yi,dz=z[j]-zi;if(dx>half)dx-=L;else if(dx<-half)dx+=L;if(dy>half)dy-=L;else if(dy<-half)dy+=L;if(dz>half)dz-=L;else if(dz<-half)dz+=L;
   const r2=dx*dx+dy*dy+dz*dz;if(r2>cut)continue;const q=r2+e2,f=G/(q*Math.sqrt(q));fx+=f*dx;fy+=f*dy;fz+=f*dz;gx[j]-=f*dx;gy[j]-=f*dy;gz[j]-=f*dz;}
  gx[i]+=fx;gy[i]+=fy;gz[i]+=fz;}}
// energie nucleari reali: differenza di energia di legame per nucleone (MeV): H→He 7.07, He→C 0.61, C→O 0.30, O→Mg 0.28, Mg→Fe 0.53
const QS=o.Q||1.0;
const T1=o.T1||0.25,T2=o.T2||0.6,T3=o.T3||1.0,T4=o.T4||1.4,K1=o.K1||0.0005,RHO1=o.rho1||0.02;
function burn(i){
 const T=u[i],r=rho[i];lum[i]=0;if(T<T1||r<RHO1)return;const b=i*NS,dtr=DT*r/RHO1;let e=0;
 const f1=Math.pow(T/T1,4);let d=Math.min(X[b],K1*dtr*X[b]*X[b]*f1*.25);X[b]-=d;X[b+1]+=d;e+=d*7.07;
 if(X[b+2]>0){const dc=Math.min(X[b+2],d*4*X[b+2]);X[b+2]-=dc;X[b+3]+=dc;}
 if(T>T2){const f=Math.pow(T/T2,8);d=Math.min(X[b+1],K1*dtr*X[b+1]*X[b+1]*X[b+1]*f*.5);X[b+1]-=d;X[b+2]+=d;e+=d*.61;note('c','Nasce il carbonio: l\'elio brucia nel nucleo di una stella');
  const d2=Math.min(X[b+2],K1*dtr*X[b+2]*X[b+1]*f*.5);X[b+2]-=d2;X[b+4]+=d2;e+=d2*.3;if(d2>0)note('o','Nasce l\'ossigeno');}
 if(T>T3){const f=Math.pow(T/T3,8);d=Math.min(X[b+4],K1*dtr*X[b+4]*X[b+4]*f);X[b+4]-=d;X[b+5]+=d;e+=d*.28;if(d>1e-4)note('mg','Nascono i metalli (Mg, Si)');}
 if(T>T4){const f=Math.pow(T/T4,8);d=Math.min(X[b+5],K1*dtr*X[b+5]*f);X[b+5]-=d;X[b+6]+=d;e+=d*.53;if(d>1e-4)note('fe','Nasce il ferro: la stella è alla fine');}
 if(e>0){du[i]+=e*QS/DT;lum[i]=e;S.E.fus+=e*QS;note('fus','Prima stella: il gas collassa, si scalda e fonde idrogeno in elio');}
}
function supernova(i){
 S.sn++;note('sn','Prima supernova: la stella esplode e semina gli elementi pesanti');
 const b=i*NS,ej=[];for(let k=0;k<NS;k++)ej.push(X[b+k]);const nb=[];
 const rs=Math.min(HMAX,h[i]*(o.snR||2));forNb(i,(j,dx,dy,dz,r)=>{if(r<rs)nb.push([j,dx,dy,dz,r]);});
 const share=nb.length?0.6/nb.length:0;
 for(const [j,dx,dy,dz,r] of nb){const jb=j*NS;for(let k=0;k<NS;k++){const m=ej[k]*share;X[jb+k]=X[jb+k]*(1-share)+m;}
  const kk=(o.snk||1.5)/(1+r/6);vx[j]+=dx/(r||1)*kk;vy[j]+=dy/(r||1)*kk;vz[j]+=dz/(r||1)*kk;u[j]=Math.min(UMAX,u[j]+(o.snu||0.5));bio[j]*=.1;}
 // il nucleo collassa (stella di neutroni): il resto del ferro viene espulso, la particella torna gas caldo ricco di metalli
 X[b+6]*=.4;X[b+5]*=.6;let s=0;for(let k=0;k<NS;k++)s+=X[b+k];X[b]+=1-s;u[i]=UMAX;bio[i]=0;snc[i]=200;
 S.fx.push({x:x[i],y:y[i],z:z[i],r:2,max:70,c:'255,190,110'});
}
function chem(i){
 const T=u[i],b=i*NS;const cold=T<(o.Tmol||0.06);
 wat[i]=cold?Math.min(X[b]*.5,X[b+4]):0;
 org[i]=cold?Math.min(X[b+2],X[b+4]*.6,X[b+3]*4,X[b]*.2):0;
 dust[i]=T<(o.Tdust||0.1)?Math.min(X[b+5]+X[b+6],X[b+4]*.8):0;
 if(wat[i]>.002)note('h2o','Prima acqua: in una nube fredda H e O formano molecole di H₂O');
 if(org[i]>.0005)note('org','Prime molecole organiche (C, H, N, O) nelle nubi fredde');
}
function step(){
 S.t++;grid();
 for(let i=0;i<N;i++){let s=W(0,h[i]),c=0;const hi=h[i];forNb(i,(j,dx,dy,dz,r)=>{const hh=(hi+h[j])*.5;if(r<hh){s+=W(r,hh);c++;}});rho[i]=s;cnt[i]=c;}
 for(let i=0;i<N;i++){P[i]=(GAM-1)*rho[i]*u[i];h[i]=Math.max(HMIN,Math.min(HMAX,h[i]*Math.pow((NGB+1)/(cnt[i]+1),.12)));}
 ax.fill(0);ay.fill(0);az.fill(0);du.fill(0);dX.fill(0);
 const mixk=o.mix||0.002;
 for(let i=0;i<N;i++){const pi=P[i]/(rho[i]*rho[i]),ci=Math.sqrt(GAM*(GAM-1)*u[i]),hi=h[i];
  forNb(i,(j,dx,dy,dz,r)=>{if(j<i)return;const hh=(hi+h[j])*.5;if(r>=hh||r===0)return;
   const g=dW(r,hh)/r,pj=P[j]/(rho[j]*rho[j]);const vdx=vx[i]-vx[j],vdy=vy[i]-vy[j],vdz=vz[i]-vz[j];
   const vr=-(vdx*dx+vdy*dy+vdz*dz);let pv=0;
   if(vr<0){const mu=hh*vr/(r*r+.01*hh*hh),cb=(ci+Math.sqrt(GAM*(GAM-1)*u[j]))*.5,rb=(rho[i]+rho[j])*.5;pv=(-1*cb*mu+2*mu*mu)/rb;}
   const f=(pi+pj+pv)*g;
   ax[i]+=f*dx;ay[i]+=f*dy;az[i]+=f*dz;ax[j]-=f*dx;ay[j]-=f*dy;az[j]-=f*dz;
   const w=vr*g;du[i]+=(pi+pv*.5)*w;du[j]+=(pj+pv*.5)*w;
   const wm=mixk*W(r,hh)/Math.max(rho[i],rho[j]);const ib=i*NS,jb=j*NS;for(let k=0;k<NS;k++){const d=(X[jb+k]-X[ib+k])*wm;dX[ib+k]+=d;dX[jb+k]-=d;}
  });}
 for(let k=0;k<N*NS;k++)X[k]+=dX[k];
 if(S.t%2===1)gravity();
 for(let i=0;i<N;i++)burn(i);
 const lam=o.lam||0.02,cmb=UMIN;let rad=0;
 for(let i=0;i<N;i++){
  vx[i]+=(ax[i]+gx[i])*DT;vy[i]+=(ay[i]+gy[i])*DT;vz[i]+=(az[i]+gz[i])*DT;
  const vd=o.vdamp||0.9992;vx[i]*=vd;vy[i]*=vd;vz[i]*=vd;const v=Math.hypot(vx[i],vy[i],vz[i]);if(v>VMAX){vx[i]*=VMAX/v;vy[i]*=VMAX/v;vz[i]*=VMAX/v;}
  x[i]=((x[i]+vx[i]*DT)%L+L)%L;y[i]=((y[i]+vy[i]*DT)%L+L)%L;z[i]=((z[i]+vz[i]*DT)%L+L)%L;
  let un=u[i]+du[i]*DT;const met=1+(o.metK||300)*(1-X[i*NS]-X[i*NS+1]);
  const rt=o.rhoThick||0.05,re=rho[i]/(1+(rho[i]/rt)*(rho[i]/rt));const cool=lam*re*met*Math.max(0,un-cmb)*Math.sqrt(Math.max(un,1e-6))*DT;const ce=(o.cexp||0.0015)*Math.max(0,un-cmb)*DT/(1+rho[i]/(o.rhoShield||0.02));un-=Math.min(cool+ce,(un-cmb)*.5);rad+=Math.max(0,cool);
  u[i]=Math.max(UMIN,Math.min(UMAX,un));if(snc[i]>0)snc[i]--;
  if(X[i*NS+6]>(o.feSN||0.08)&&snc[i]<=0)supernova(i);
 }
 S.E.rad+=rad;
 let st=0;for(let i=0;i<N;i++)if(lum[i]>(o.lumStar||1e-4))st++;S.stars=st;
 if(S.t%4===0){for(let i=0;i<N;i++)chem(i);life();}
 for(const f of S.fx)f.r+=f.max/16;S.fx=S.fx.filter(f=>f.r<f.max);
}
// pianeti: gas freddo, denso e ricco di polveri; vita: biomassa che cresce dove c'è acqua liquida e molecole organiche
function life(){
 let pl=0,lp=0;const Tlo=o.Tlo||0.004,Thi=o.Thi||0.06,rP=o.rhoP||0.01;
 for(let i=0;i<N;i++){
  let near=0;if(dust[i]>(o.dustP||0.0003)&&u[i]<(o.Tdust||0.1)&&lum[i]===0)forNb(i,(j,dx,dy,dz,r)=>{if(lum[j]>(o.lumStar||1e-4)&&r<HMAX)near=1;});
  planet[i]=near;if(near){pl++;note('planet','Primo sistema planetario: polveri fredde attorno a una stella formano pianeti rocciosi');}
  const hab=planet[i]&&u[i]>Tlo&&u[i]<Thi&&wat[i]>(o.watMin||0.0005)&&org[i]>(o.orgMin||0.0001);
  if(bio[i]>0){const K=Math.min(1,org[i]/(o.orgK||0.002));if(hab)bio[i]+=(o.gr||0.04)*bio[i]*(1-bio[i]/Math.max(K,.05));else bio[i]-=bio[i]*(u[i]>Thi*3?.4:.008);
   if(bio[i]<.001){bio[i]=0;hue[i]=-1;}else{lp++;
    if(bio[i]>.4)forNb(i,(j,dx,dy,dz,r)=>{if(r<h[i]&&bio[j]===0&&R()<(o.spread||0.02)){bio[j]=.01;hue[j]=(hue[i]+(R()-.5)*30+360)%360;note('spread','La vita si diffonde e muta: nascono varianti');}});}}
  else if(hab&&R()<(o.pAbio||0.01)){bio[i]=.01;hue[i]=R()*360;S.lin++;lp++;note('life','Prima forma di vita: chimica organica in acqua liquida diventa autoreplicante');}
 }
 S.planets=pl;S.lifeP=lp;
}
S.step=step;
S.totals=()=>{const t=new Array(NS).fill(0);for(let i=0;i<N;i++)for(let k=0;k<NS;k++)t[k]+=X[i*NS+k];return t.map(v=>v/N);};
S.temp=()=>{let s=0;for(let i=0;i<N;i++)s+=u[i];return s/N;};
S.biomass=()=>{let s=0;for(let i=0;i<N;i++)s+=bio[i];return s;};
return S;
}
if(typeof module!=='undefined')module.exports=makeSim2;
