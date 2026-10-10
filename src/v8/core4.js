function makeSim4(o){
o=o||{};
const N=o.n||8000,MP=(o.nref||2000)/N,LS=Math.cbrt(MP),R0=o.R0||100,G=(o.G||0.0015)*MP,EPS=(o.eps||2.5)*LS,GAM=5/3,THETA2=(o.theta||0.6)**2;
const DT=o.dt||1,VMAX=o.vmax||3,UMIN=o.umin||1e-5,UMAX=o.umax||0.03,HMIN=(o.hmin||1.2)*LS,NGB=o.ngb||32;
const NS=7,SP=[{s:'H',c:'#cfe3ff'},{s:'He',c:'#f2d16b'},{s:'C',c:'#bdb6aa'},{s:'N',c:'#6e93ff'},{s:'O',c:'#ff6a5c'},{s:'Mg',c:'#c98a4b'},{s:'Fe',c:'#e0562a'}];
const F=()=>new Float64Array(N);
const x=F(),y=F(),z=F(),vx=F(),vy=F(),vz=F(),u=F(),h=F(),rho=F(),P=F(),cnt=F(),ax=F(),ay=F(),az=F(),du=F(),gx=F(),gy=F(),gz=F(),lum=F(),bio=F(),hue=F(),dust=F(),org=F(),wat=F(),snc=F(),teq=F();
const X=new Float64Array(N*NS),dX=new Float64Array(N*NS),planet=new Uint8Array(N);
const R=Math.random;
const S={t:0,time:0,N,SP,x,y,z,u,rho,X,lum,bio,hue,dust,org,wat,planet,teq,h,log:[],seen:{},fx:[],sn:0,lin:0,E:{fus:0,rad:0},stars:0,planets:0,habit:0,lifeP:0,
 Rview:R0*2,rescales:0,a:1,R90:R0,R90_0:0,cm:[0,0,0],phase:'expansion'};
const note=(k,m)=>{if(!S.seen[k]){S.seen[k]=1;S.log.push({t:S.t,msg:m});}};
function rdir(){const c=R()*2-1,a=R()*6.2832,s=Math.sqrt(1-c*c);return[s*Math.cos(a),s*Math.sin(a),c];}
// condizioni iniziali: sfera di gas H/He (75/25) con fluttuazioni di densità e flusso di Hubble v = H·r
const seeds=[];for(let k=0;k<(o.seeds||30);k++){const d=rdir(),r=R0*.85*Math.cbrt(R());seeds.push([d[0]*r,d[1]*r,d[2]*r]);}
for(let i=0;i<N;i++){let p;
 if(R()<(o.clump||0.6)){const s=seeds[(R()*seeds.length)|0],d=rdir(),r=(o.sr||9)*Math.cbrt(R());p=[s[0]+d[0]*r,s[1]+d[1]*r,s[2]+d[2]*r];}
 else{do{p=[(R()*2-1)*R0,(R()*2-1)*R0,(R()*2-1)*R0];}while(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]>R0*R0);}
 x[i]=p[0];y[i]=p[1];z[i]=p[2];u[i]=o.u0||0.0005;h[i]=6*LS;X[i*NS]=0.75;X[i*NS+1]=0.25;hue[i]=-1;}
const vesc=Math.sqrt(2*G*N/R0),H0=(o.fH||0.85)*vesc/R0;S.H0=H0;
for(let i=0;i<N;i++){vx[i]=H0*x[i]+(R()-.5)*.02;vy[i]=H0*y[i]+(R()-.5)*.02;vz[i]=H0*z[i]+(R()-.5)*.02;}
note('bang','Big Bang: una sfera di idrogeno ed elio (75/25) inizia a espandersi');
// griglia hash senza confini
const TB=16384,head=new Int32Array(TB),next=new Int32Array(N);let CS=(o.cs||4)*LS;
const key=(a,b,c)=>((a*73856093)^(b*19349663)^(c*83492791))&(TB-1);
function grid(){head.fill(-1);for(let i=0;i<N;i++){const k=key(Math.floor(x[i]/CS),Math.floor(y[i]/CS),Math.floor(z[i]/CS));next[i]=head[k];head[k]=i;}}
function forNb(i,rmax,fn){const ix=Math.floor(x[i]/CS),iy=Math.floor(y[i]/CS),iz=Math.floor(z[i]/CS),r2m=rmax*rmax;
 for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){const k=key(ix+a,iy+b,iz+c);
  for(let j=head[k];j>=0;j=next[j]){if(j===i)continue;const dx=x[j]-x[i],dy=y[j]-y[i],dz=z[j]-z[i],r2=dx*dx+dy*dy+dz*dz;if(r2<r2m)fn(j,dx,dy,dz,Math.sqrt(r2));}}}
// gravità Barnes-Hut (octree)
const MAXN=N*24,ncx=new Float64Array(MAXN),ncy=new Float64Array(MAXN),ncz=new Float64Array(MAXN),nhs=new Float64Array(MAXN),nm=new Float64Array(MAXN),mx=new Float64Array(MAXN),my=new Float64Array(MAXN),mz=new Float64Array(MAXN),nch=new Int32Array(MAXN),npt=new Int32Array(MAXN);let nn=0;
function newNode(cx,cy,cz,hs){const k=nn++;ncx[k]=cx;ncy[k]=cy;ncz[k]=cz;nhs[k]=hs;nm[k]=0;mx[k]=0;my[k]=0;mz[k]=0;nch[k]=-1;npt[k]=-1;return k;}
function sub(k,px,py,pz){return (px>ncx[k]?1:0)|(py>ncy[k]?2:0)|(pz>ncz[k]?4:0);}
function split(k){const hs=nhs[k]/2,b=nn;for(let c=0;c<8;c++)newNode(ncx[k]+(c&1?hs:-hs),ncy[k]+(c&2?hs:-hs),ncz[k]+(c&4?hs:-hs),hs);nch[k]=b;}
function build(){nn=0;let mxr=0;for(let i=0;i<N;i++)mxr=Math.max(mxr,Math.abs(x[i]),Math.abs(y[i]),Math.abs(z[i]));const root=newNode(0,0,0,mxr*1.01+1);
 for(let i=0;i<N;i++){let k=root,d=0;
  for(;;){nm[k]+=1;mx[k]+=x[i];my[k]+=y[i];mz[k]+=z[i];
   if(nch[k]<0){if(npt[k]<0&&nm[k]===1){npt[k]=i;break;}
    if(d>40||nn+8>MAXN)break;const j=npt[k];npt[k]=-2;split(k);if(j>=0){const c=nch[k]+sub(k,x[j],y[j],z[j]);nm[c]+=1;mx[c]+=x[j];my[c]+=y[j];mz[c]+=z[j];npt[c]=j;}}
   k=nch[k]+sub(k,x[i],y[i],z[i]);d++;
   if(nch[k]<0&&nm[k]===0){nm[k]=1;mx[k]=x[i];my[k]=y[i];mz[k]=z[i];npt[k]=i;break;}}}
 for(let k=0;k<nn;k++)if(nm[k]>0){mx[k]/=nm[k];my[k]/=nm[k];mz[k]/=nm[k];}}
const stack=new Int32Array(4096);
const fx_=F(),fy_=F(),fz_=F(),nx_=F(),ny_=F(),nz_=F();const RN=(o.rn||4)*LS;
function nearGrav(ox,oy,oz){ox.fill(0);oy.fill(0);oz.fill(0);const e2=EPS*EPS,rn2=RN*RN;
 for(let i=0;i<N;i++){const xi=x[i],yi=y[i],zi=z[i],ix=Math.floor(xi/CS),iy=Math.floor(yi/CS),iz=Math.floor(zi/CS);let fx=0,fy=0,fz=0;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){const k=key(ix+a,iy+b,iz+c);
   for(let j=head[k];j>=0;j=next[j]){if(j<=i)continue;const dx=x[j]-xi,dy=y[j]-yi,dz=z[j]-zi,r2=dx*dx+dy*dy+dz*dz;if(r2>=rn2)continue;const q=r2+e2,f=G/(q*Math.sqrt(q));fx+=f*dx;fy+=f*dy;fz+=f*dz;ox[j]-=f*dx;oy[j]-=f*dy;oz[j]-=f*dz;}}
  ox[i]+=fx;oy[i]+=fy;oz[i]+=fz;}}
function farGrav(){build();const e2=EPS*EPS;
 for(let i=0;i<N;i++){let sp=0,fx=0,fy=0,fz=0;stack[sp++]=0;const xi=x[i],yi=y[i],zi=z[i];
  while(sp>0){const k=stack[--sp];if(nm[k]===0)continue;const dx=mx[k]-xi,dy=my[k]-yi,dz=mz[k]-zi,r2=dx*dx+dy*dy+dz*dz;
   if(nch[k]<0||4*nhs[k]*nhs[k]<THETA2*r2){if(npt[k]===i&&nm[k]===1)continue;const q=r2+e2,f=G*nm[k]/(q*Math.sqrt(q));fx+=f*dx;fy+=f*dy;fz+=f*dz;}
   else{const b=nch[k];for(let c=0;c<8;c++)if(nm[b+c]>0&&sp<4090)stack[sp++]=b+c;}}
  fx_[i]=fx;fy_[i]=fy;fz_[i]=fz;}
 nearGrav(nx_,ny_,nz_);for(let i=0;i<N;i++){fx_[i]-=nx_[i];fy_[i]-=ny_[i];fz_[i]-=nz_[i];}}
function gravity(full){if(full)farGrav();nearGrav(gx,gy,gz);for(let i=0;i<N;i++){gx[i]+=fx_[i];gy[i]+=fy_[i];gz[i]+=fz_[i];}}
function W(r,hh){const q=r/hh;if(q>=1)return 0;const s=8/(Math.PI*hh*hh*hh);return q<.5?s*(1-6*q*q+6*q*q*q):s*2*(1-q)**3;}
function dW(r,hh){const q=r/hh;if(q>=1)return 0;const s=8/(Math.PI*hh*hh*hh*hh);return q<.5?s*(-12*q+18*q*q):s*(-6*(1-q)*(1-q));}
// combustione nucleare: energie di legame reali per nucleone (MeV) H→He 7.07, He→C 0.61, C→O 0.30, O→Mg 0.28, Mg→Fe 0.53
const T1=o.T1||0.0018,T2=o.T2||0.006,T3=o.T3||0.012,T4=o.T4||0.02,K1=o.K1||0.0006,RHO1=o.rho1||0.5,QS=o.Q||0.003;
function burn(i){const T=u[i],r=rho[i];lum[i]=0;if(T<T1||r<RHO1||snc[i]>0)return;const b=i*NS,dtr=DT*Math.min(20,r/RHO1);let e=0,d;
 d=Math.min(X[b],K1*dtr*X[b]*X[b]*Math.pow(T/T1,4)*.25);X[b]-=d;X[b+1]+=d;e+=d*7.07;
 if(X[b+2]>0){const dc=Math.min(X[b+2],d*4*X[b+2]);X[b+2]-=dc;X[b+3]+=dc;}
 if(T>T2){const f=Math.pow(T/T2,4);d=Math.min(X[b+1],K1*dtr*X[b+1]**3*f*.5);X[b+1]-=d;X[b+2]+=d;e+=d*.61;if(d>1e-6)note('c','Nasce il carbonio: l\'elio brucia nel nucleo di una stella');
  const d2=Math.min(X[b+2],K1*dtr*X[b+2]*X[b+1]*f*.5);X[b+2]-=d2;X[b+4]+=d2;e+=d2*.3;if(d2>1e-6)note('o','Nasce l\'ossigeno');}
 if(T>T3){const f=Math.pow(T/T3,4);d=Math.min(X[b+4],K1*.1*dtr*X[b+4]**2*f);X[b+4]-=d;X[b+5]+=d;e+=d*.28;if(d>1e-5)note('mg','Nascono i metalli (Mg, Si)');}
 if(T>T4){const f=Math.pow(T/T4,4);d=Math.min(X[b+5],K1*.3*dtr*X[b+5]*f);X[b+5]-=d;X[b+6]+=d;e+=d*.53;if(d>1e-5)note('fe','Nasce il ferro: la stella è alla fine');}
 if(e>0){const tc=1.25*(T>T4?T4:T>T3?T3:T>T2?T2:T1);du[i]+=Math.max(0,Math.min(e*QS*(o.fh||0.1),tc-u[i]))/DT;S.E.rad+=e*QS*MP;lum[i]=e;S.E.fus+=e*QS*MP;note('fus','Prima stella: il gas collassa, si scalda e fonde idrogeno in elio');}}
function supernova(i){S.sn++;note('sn','Prima supernova: la stella esplode e semina gli elementi pesanti');
 const b=i*NS,ej=[];for(let k=0;k<NS;k++)ej.push(X[b+k]);const nb=[],rs=Math.max(h[i]*2,3*LS);
 forNb(i,rs,(j,dx,dy,dz,r)=>nb.push([j,dx,dy,dz,r]));const share=nb.length?.6/nb.length:0;
 for(const [j,dx,dy,dz,r] of nb){const jb=j*NS;for(let k=0;k<NS;k++)X[jb+k]=X[jb+k]*(1-share)+ej[k]*share;
  const kk=(o.snk||0.06)/(1+r/3);vx[j]+=dx/(r||1)*kk;vy[j]+=dy/(r||1)*kk;vz[j]+=dz/(r||1)*kk;u[j]=Math.min(UMAX,u[j]+(o.snu||0.01));bio[j]*=.1;snc[j]=Math.max(snc[j],o.snCool||200);}
 X[b+6]*=.4;X[b+5]*=.6;let s=0;for(let k=0;k<NS;k++)s+=X[b+k];X[b]+=1-s;u[i]=Math.min(UMAX,u[i]+(o.snu||0.01)*2);bio[i]=0;snc[i]=300;
 S.fx.push({x:x[i],y:y[i],z:z[i],r:1,max:Math.max(25,S.Rview*.25),c:'255,190,110'});}
function chem(i){const T=u[i],b=i*NS,cold=T<(o.Tmol||0.004);
 wat[i]=cold?Math.min(X[b]*.5,X[b+4]):0;org[i]=cold?Math.min(X[b+2],X[b+4]*.6,X[b+3]*4,X[b]*.2):0;dust[i]=T<(o.Tdust||0.008)?Math.min(X[b+5]+X[b+6],X[b+4]*.8):0;
 if(wat[i]>.001)note('h2o','Prima acqua: in una nube fredda H e O formano H₂O');if(org[i]>.0003)note('org','Prime molecole organiche (C, H, N, O)');}
// pianeti e zona abitabile: temperatura di equilibrio T = T0·(L/d²)^(1/4), acqua liquida tra 273 e 373 K
function life(){let pl=0,hz=0,lp=0;const starIdx=[];for(let i=0;i<N;i++)if(lum[i]>(o.lumStar||2e-5))starIdx.push(i);const T0=o.T0||278,F0=o.F0||2e-5;
 for(let i=0;i<N;i++){planet[i]=0;teq[i]=0;
  if(dust[i]>(o.dustP||0.00002)&&lum[i]===0){let Fl=0;for(const j of starIdx){const dx=x[j]-x[i],dy=y[j]-y[i],dz=z[j]-z[i],d2=dx*dx+dy*dy+dz*dz;if(d2<400)Fl+=MP*lum[j]/(d2+.25);}
   if(Fl>F0*.02){planet[i]=1;pl++;teq[i]=T0*Math.pow(Fl/F0,.25);note('planet','Primo sistema planetario: polveri fredde in orbita attorno a una stella');
    if(teq[i]>=273&&teq[i]<=373){hz++;note('hz','Primo pianeta nella zona abitabile: acqua liquida in superficie');}}}
  const hab=planet[i]&&teq[i]>=273&&teq[i]<=373&&wat[i]>(o.watMin||0.0003)&&org[i]>(o.orgMin||0.00005);
  if(bio[i]>0){const K=Math.min(1,org[i]/(o.orgK||0.001));if(hab)bio[i]+=(o.gr||0.05)*bio[i]*(1-bio[i]/Math.max(K,.05));else bio[i]-=bio[i]*(teq[i]>500||u[i]>.05?.4:.01);
   if(bio[i]<.001){bio[i]=0;hue[i]=-1;}else{lp++;if(bio[i]>.4)forNb(i,h[i],(j)=>{if(bio[j]===0&&planet[j]&&R()<(o.spread||0.03)){bio[j]=.01;hue[j]=(hue[i]+(R()-.5)*30+360)%360;note('spread','La vita si diffonde su un pianeta vicino');}});}}
  else if(hab&&R()<(o.pAbio||0.03)){bio[i]=.01;hue[i]=R()*360;S.lin++;lp++;note('life','Prima forma di vita: chimica organica in acqua liquida diventa autoreplicante');}}
 S.planets=pl;S.habit=hz;S.lifeP=lp;}
// riqualificazione della scala: quando la materia si allontana, la vista e la griglia passano a una scala più grande
function rescale(){let cx=0,cy=0,cz=0;for(let i=0;i<N;i++){cx+=x[i];cy+=y[i];cz+=z[i];}cx/=N;cy/=N;cz/=N;S.cm=[cx,cy,cz];
 const d=new Float64Array(N);for(let i=0;i<N;i++)d[i]=Math.hypot(x[i]-cx,y[i]-cy,z[i]-cz);d.sort();S.R90=d[(N*(o.pct||0.5))|0];if(!S.R90_0)S.R90_0=S.R90;S.a=S.R90/S.R90_0;
 const prev=S._Rp||S.R90;S._Rp=S.R90;const dr=(S.R90-prev)/prev;S._dr=(S._dr||0)*.7+dr*.3;
 const ph=S._dr>0.002?'expansion':S._dr<-0.002?'collapse':'turn';if(ph!==S.phase&&S.t>200){if(ph==='turn'&&S.phase==='expansion')note('turn','L\'espansione rallenta: la gravità sta vincendo');if(ph==='collapse')note('crunch','L\'universo ha iniziato a ricollassare');if(ph==='expansion'&&S.seen.crunch)note('bounce','Rimbalzo: il gas scaldato dal collasso e dalle supernove si riespande');}S.phase=ph;
 if(S.R90>S.Rview*.45){S.Rview*=1.6;S.rescales++;S.log.push({t:S.t,msg:`Riqualificazione: la scala passa a ×${(S.Rview/(R0*2)).toFixed(1)}, l'universo si è espanso`});}
 else if(S.R90<S.Rview*.17&&S.Rview>R0*1.5){S.Rview/=1.6;S.rescales++;S.log.push({t:S.t,msg:`Riqualificazione: la scala torna a ×${(S.Rview/(R0*2)).toFixed(1)}, l'universo si contrae`});}
 CS=(o.cs||4)*LS;}
function step(){S.t++;S.time+=DT;if(S.t%25===1)rescale();grid();const HM=CS;
 const MNB=o.mnb||160;let nbl=S._nbl;if(!nbl||nbl.length<N*MNB){S._nbl=nbl=new Int32Array(N*MNB);S._nbr=new Float32Array(N*MNB);S._nbx=new Float32Array(N*MNB);S._nby=new Float32Array(N*MNB);S._nbz=new Float32Array(N*MNB);S._nbc=new Int32Array(N);}
 const nbr=S._nbr,nbx=S._nbx,nby=S._nby,nbz=S._nbz,nbc=S._nbc;const PI8=8/Math.PI;
 for(let i=0;i<N;i++){const base=i*MNB;let c=0;const xi=x[i],yi=y[i],zi=z[i],ix=Math.floor(xi/CS),iy=Math.floor(yi/CS),iz=Math.floor(zi/CS),r2m=HM*HM;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let cc=-1;cc<=1;cc++){const k=key(ix+a,iy+b,iz+cc);
   for(let j=head[k];j>=0;j=next[j]){if(j<=i)continue;const dx=x[j]-xi,dy=y[j]-yi,dz=z[j]-zi,r2=dx*dx+dy*dy+dz*dz;const hh=(h[i]+h[j])*.5;if(r2<hh*hh&&c<MNB){nbl[base+c]=j;nbr[base+c]=Math.sqrt(r2);nbx[base+c]=dx;nby[base+c]=dy;nbz[base+c]=dz;c++;}}}
  nbc[i]=c;}
 for(let i=0;i<N;i++){const hi=h[i];rho[i]=PI8/(hi*hi*hi);cnt[i]=0;}
 for(let i=0;i<N;i++){const base=i*MNB,hi=h[i];for(let n=0;n<nbc[i];n++){const j=nbl[base+n],r=nbr[base+n],hh=(hi+h[j])*.5;if(r<hh){const q=r/hh,w=PI8/(hh*hh*hh)*(q<.5?1-6*q*q+6*q*q*q:2*(1-q)**3);rho[i]+=w;rho[j]+=w;cnt[i]++;cnt[j]++;}}}
 for(let i=0;i<N;i++){rho[i]*=MP;P[i]=(GAM-1)*rho[i]*u[i];h[i]=Math.max(HMIN,Math.min(HM,h[i]*Math.pow((NGB+1)/(cnt[i]+1),.15)));}
 ax.fill(0);ay.fill(0);az.fill(0);du.fill(0);dX.fill(0);const mixk=o.mix||0.002,GG=GAM*(GAM-1);
 for(let i=0;i<N;i++){const pi=P[i]/(rho[i]*rho[i]),ci=Math.sqrt(GG*u[i]),hi=h[i],base=i*MNB,ib=i*NS;
  for(let n=0;n<nbc[i];n++){const j=nbl[base+n],r=nbr[base+n],hh=(hi+h[j])*.5;if(r>=hh||r===0)continue;const dx=nbx[base+n],dy=nby[base+n],dz=nbz[base+n];
   const q=r/hh,h4=hh*hh*hh*hh,g=PI8/h4*(q<.5?-12*q+18*q*q:-6*(1-q)*(1-q))/r,pj=P[j]/(rho[j]*rho[j]);
   const vr=-((vx[i]-vx[j])*dx+(vy[i]-vy[j])*dy+(vz[i]-vz[j])*dz);let pv=0;
   if(vr<0){const mu=hh*vr/(r*r+.01*hh*hh),cb=(ci+Math.sqrt(GG*u[j]))*.5,rb=(rho[i]+rho[j])*.5;pv=(-cb*mu+2*mu*mu)/rb;}
   const f=MP*(pi+pj+pv)*g;ax[i]+=f*dx;ay[i]+=f*dy;az[i]+=f*dz;ax[j]-=f*dx;ay[j]-=f*dy;az[j]-=f*dz;
   const w=MP*vr*g;du[i]+=(pi+pv*.5)*w;du[j]+=(pj+pv*.5)*w;
   const wk=PI8/(hh*hh*hh)*(q<.5?1-6*q*q+6*q*q*q:2*(1-q)**3),wm=MP*mixk*wk/Math.max(rho[i],rho[j]),jb=j*NS;for(let k=0;k<NS;k++){const d=(X[jb+k]-X[ib+k])*wm;dX[ib+k]+=d;dX[jb+k]-=d;}}}
 for(let k=0;k<N*NS;k++)X[k]+=dX[k];
 gravity(S.t%(o.gEvery||4)===0||S.t===1);
 for(let i=0;i<N;i++)burn(i);
 const lam=o.lam||0.3,rt=o.rhoThick||3,vd=o.vdamp||0.9997;let rad=0;
 for(let i=0;i<N;i++){vx[i]+=(ax[i]+gx[i])*DT;vy[i]+=(ay[i]+gy[i])*DT;vz[i]+=(az[i]+gz[i])*DT;
  if(rho[i]>RHO1*.05){vx[i]*=vd;vy[i]*=vd;vz[i]*=vd;}
  const v=Math.hypot(vx[i],vy[i],vz[i]);if(v>VMAX){vx[i]*=VMAX/v;vy[i]*=VMAX/v;vz[i]*=VMAX/v;}
  x[i]+=vx[i]*DT;y[i]+=vy[i]*DT;z[i]+=vz[i]*DT;
  let un=u[i]+du[i]*DT;const met=1+(o.metK||300)*(1-X[i*NS]-X[i*NS+1]),re=rho[i]/(1+(rho[i]/rt)**2);
  const cool=lam*re*met*Math.max(0,un-UMIN)*Math.sqrt(Math.max(un,1e-8))*DT;un-=Math.min(cool,(un-UMIN)*.5);rad+=Math.max(0,cool);
  u[i]=Math.max(UMIN,Math.min(UMAX,un));if(snc[i]>0)snc[i]--;if(snc[i]<=0&&(X[i*NS+6]>(o.feSN||0.005)||(rho[i]>RHO1&&X[i*NS]+X[i*NS+1]<(o.zSN||0.6))))supernova(i);}
 S.E.rad+=rad*MP;let st=0;for(let i=0;i<N;i++)if(lum[i]>(o.lumStar||2e-5))st++;S.stars=st;
 if(S.t%5===0){for(let i=0;i<N;i++)chem(i);life();}
 for(const f of S.fx)f.r+=f.max/18;S.fx=S.fx.filter(f=>f.r<f.max);}
S.step=step;
S.totals=()=>{const t=new Array(NS).fill(0);for(let i=0;i<N;i++)for(let k=0;k<NS;k++)t[k]+=X[i*NS+k];return t.map(v=>v/N);};
S.temp=()=>{let s=0;for(let i=0;i<N;i++)s+=u[i];return s/N;};
return S;}
if(typeof module!=='undefined')module.exports=makeSim4;
