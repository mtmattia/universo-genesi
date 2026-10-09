function makeSim(o){
o=o||{};
const L=o.L||520,G=o.G??0.8,EPS2=25,VMAX=8,CS=20,GN=Math.ceil(L/CS);
const EL=[{s:'H',v:1,c:'#cfe3ff',n:'Idrogeno'},{s:'He',v:0,c:'#f2d16b',n:'Elio'},{s:'C',v:4,c:'#bdb6aa',n:'Carbonio'},{s:'N',v:3,c:'#6e93ff',n:'Azoto'},{s:'O',v:2,c:'#ff6a5c',n:'Ossigeno'},{s:'Mg',v:2,c:'#c98a4b',n:'Metalli'},{s:'Fe',v:2,c:'#e0562a',n:'Ferro'}];
const el=A=>A<4?0:A<12?1:A<14?2:A<16?3:A<20?4:A<56?5:6;
const Z=A=>A<4?1:A/2;
function B(A){if(A<=1)return 0;const z=A/2;let b=15.8*A-18.3*Math.pow(A,2/3)-0.714*z*z/Math.cbrt(A);if(A===4)b+=12;return Math.max(0,b);}
const S={t:0,P:[],fx:[],log:[],seen:{},lin:0,births:0,cells:0,rocks:0,mols:0,sn:0,fus:0,EL,L,energy:{kin:0,fus:0,rad:0}};
let uid=0;
const add=(x,y,z,vx,vy,vz,A)=>{const p={id:uid++,x,y,z,vx,vy,vz,A,e:el(A),b:[],life:0,hue:0,dead:false,hot:0};S.P.push(p);return p;};
const note=(k,msg)=>{if(!S.seen[k]){S.seen[k]=1;S.log.push({t:S.t,msg});}};
const wr=d=>d>L/2?d-L:d<-L/2?d+L:d;
const unbond=p=>{for(const q of p.b)q.b=q.b.filter(r=>r!==p);p.b=[];};
const R=Math.random;
function rdir(){const u=R()*2-1,a=R()*6.2832,s=Math.sqrt(1-u*u);return[s*Math.cos(a),s*Math.sin(a),u];}
const n0=o.n||800;
for(let i=0;i<n0;i++){const d=rdir(),r=Math.cbrt(R())*(o.r0||L*0.45),s=(o.s0||1.2)*(0.6+R()*0.8);add(L/2+d[0]*r,L/2+d[1]*r,L/2+d[2]*r,d[0]*s+(R()-.5)*.6,d[1]*s+(R()-.5)*.6,d[2]*s+(R()-.5)*.6,1);}
note('bang','Big Bang: solo idrogeno, caldo e in espansione');
function kickAround(p,rad,k,breakP){for(const q of S.P){if(q===p)continue;const dx=wr(q.x-p.x),dy=wr(q.y-p.y),dz=wr(q.z-p.z),d2=dx*dx+dy*dy+dz*dz;if(d2<rad*rad&&d2>0){const d=Math.sqrt(d2),f=k*(1-d/rad);q.vx+=dx/d*f;q.vy+=dy/d*f;q.vz+=dz/d*f;q.hot=30;if(breakP&&q.b.length&&R()<breakP)unbond(q);}}}
function supernova(p){
 S.sn++;note('sn','Prima supernova: la stella esplode e semina C, N, O e metalli nello spazio');
 let rem=p.A;p.dead=true;unbond(p);const pc=o.pieces||[1,1,1,4,12,12,14,14,16,16,16,24,56];
 while(rem>0){let a=pc[(R()*pc.length)|0];if(a>rem)a=rem;rem-=a;const d=rdir(),s=2.5+R()*3;const q=add(p.x+d[0]*3,p.y+d[1]*3,p.z+d[2]*3,p.vx+d[0]*s,p.vy+d[1]*s,p.vz+d[2]*s,a);q.hot=60;}
 kickAround(p,70,o.snk||5,.6);S.fx.push({x:p.x,y:p.y,z:p.z,r:4,max:80,c:'255,190,110'});
}
function components(){const seen=new Set(),out=[];for(const p of S.P){if(seen.has(p)||!p.b.length)continue;const c=[p];seen.add(p);for(let i=0;i<c.length;i++)for(const q of c[i].b)if(!seen.has(q)){seen.add(q);c.push(q);}out.push(c);}return out;}
const comp=c=>{const k=[0,0,0,0,0,0,0];for(const p of c)k[p.e]++;return k;};
const canLive=(k,n)=>n>=(o.lifeN||6)&&k[2]>=2&&k[3]>=1&&k[4]>=1&&k[0]>=1;
function bio(){
 const cs=components();let cells=0,rocks=0;
 for(const c of cs){const k=comp(c),n=c.length;
  if(n===3&&k[4]===1&&k[0]===2)note('h2o','Prima molecola d\'acqua (H₂O)');
  if(n===5&&k[2]===1&&k[0]===4)note('ch4','Primo metano (CH₄)');
  if(n===4&&k[3]===1&&k[0]===3)note('nh3','Prima ammoniaca (NH₃)');
  const Lc={};let best=0,bl=0;for(const p of c)if(p.life){Lc[p.life]=(Lc[p.life]||0)+1;if(Lc[p.life]>best){best=Lc[p.life];bl=p.life;}}
  if(bl){if(!canLive(k,n)){for(const p of c)p.life=0;continue;}let hue=0;for(const p of c)if(p.life===bl){hue=p.hue;break;}for(const p of c){p.life=bl;p.hue=hue;}cells++;if(n>=(o.splitN||14))split(c,hue);}
  else if(canLive(k,n)&&R()<(o.pAbio||0.05)){S.lin++;const h=R()*360;for(const p of c){p.life=S.lin;p.hue=h;}cells++;note('life','Prima forma di vita: una molecola che cattura atomi e si copia');}
  else if(n>=4&&(k[5]+k[6])*2>=n){rocks++;note('rock','Primo oggetto solido: un granello di roccia');}
 }
 S.cells=cells;S.rocks=rocks;S.mols=cs.length;
}
function split(c,hue){
 const half=new Set([c[0]]),q=[c[0]],h=c.length/2;
 for(let i=0;i<q.length&&half.size<h;i++)for(const r of q[i].b)if(!half.has(r)&&half.size<h){half.add(r);q.push(r);}
 const m=[0,0,0,0,0,0],nh2=(hue+(R()-.5)*50+360)%360;let a=0,b=0;
 for(const p of c){for(const r of [...p.b])if(half.has(p)!==half.has(r)){p.b=p.b.filter(x=>x!==r);r.b=r.b.filter(x=>x!==p);}if(half.has(p)){m[0]+=p.x;m[1]+=p.y;m[2]+=p.z;a++;}else{m[3]+=p.x;m[4]+=p.y;m[5]+=p.z;b++;}}
 if(a&&b){let dx=m[0]/a-m[3]/b,dy=m[1]/a-m[4]/b,dz=m[2]/a-m[5]/b,d=Math.hypot(dx,dy,dz)||1;for(const p of c){const s=half.has(p)?.5:-.5;p.vx+=dx/d*s;p.vy+=dy/d*s;p.vz+=dz/d*s;if(half.has(p))p.hue=nh2;}}
 S.births++;note('rep','Prima replicazione: la vita si divide in due copie, con piccole mutazioni');
}
function step(){
 S.t++;const P=S.P,n=P.length;
 const ax=new Float64Array(n),ay=new Float64Array(n),az=new Float64Array(n);
 if(G>0&&S.t%2===0){const X=new Float64Array(n),Y=new Float64Array(n),Zp=new Float64Array(n),M=new Float64Array(n),h=L/2;
  for(let i=0;i<n;i++){const p=P[i];X[i]=p.x;Y[i]=p.y;Zp[i]=p.z;M[i]=p.A;}
  for(let i=0;i<n;i++){const xi=X[i],yi=Y[i],zi=Zp[i],mi=M[i];let fx=0,fy=0,fz=0;
   for(let j=i+1;j<n;j++){let dx=X[j]-xi,dy=Y[j]-yi,dz=Zp[j]-zi;
    if(dx>h)dx-=L;else if(dx<-h)dx+=L;if(dy>h)dy-=L;else if(dy<-h)dy+=L;if(dz>h)dz-=L;else if(dz<-h)dz+=L;
    const r2=dx*dx+dy*dy+dz*dz+EPS2;if(r2>40000)continue;const f=G/(r2*Math.sqrt(r2)),mj=M[j];
    fx+=f*mj*dx;fy+=f*mj*dy;fz+=f*mj*dz;ax[j]-=f*mi*dx;ay[j]-=f*mi*dy;az[j]-=f*mi*dz;}
   ax[i]+=fx;ay[i]+=fy;az[i]+=fz;}
  for(let i=0;i<n;i++){const p=P[i];p.gx=ax[i];p.gy=ay[i];p.gz=az[i];}}
 else if(G>0)for(let i=0;i<n;i++){const p=P[i];ax[i]=p.gx||0;ay[i]=p.gy||0;az[i]=p.gz||0;}
 const NC=GN*GN*GN,head=new Int32Array(NC).fill(-1),next=new Int32Array(n),cnt=new Int32Array(NC),cell=new Int32Array(n);
 for(let i=0;i<n;i++){const p=P[i];const c=(((p.z/CS)|0)%GN*GN+((p.y/CS)|0)%GN)*GN+((p.x/CS)|0)%GN;cell[i]=c;next[i]=head[c];head[c]=i;cnt[c]++;}
 const fused=new Uint8Array(n),dens=new Float32Array(n),nf=[];
 for(let i=0;i<n;i++){
  const p=P[i],gx=(p.x/CS)|0,gy=(p.y/CS)|0,gz=(p.z/CS)|0;let dn=0;
  for(let oz=-1;oz<=1;oz++)for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const c=(((gz+oz+GN)%GN)*GN+(gy+oy+GN)%GN)*GN+(gx+ox+GN)%GN;dn+=cnt[c];
   for(let j=head[c];j>=0;j=next[j]){if(j<=i)continue;const q=P[j];
    const dx=wr(q.x-p.x),dy=wr(q.y-p.y),dz=wr(q.z-p.z),d2=dx*dx+dy*dy+dz*dz;if(d2>400)continue;const d=Math.sqrt(d2)||.01;
    const vr=Math.hypot(q.vx-p.vx,q.vy-p.vy,q.vz-p.vz),isB=p.b.indexOf(q)>=0;
    if(!isB&&d<5){const k=(5-d)*.06;ax[i]-=dx/d*k;ay[i]-=dy/d*k;az[i]-=dz/d*k;ax[j]+=dx/d*k;ay[j]+=dy/d*k;az[j]+=dz/d*k;}
    if(d<5&&dn>=(o.dmin||20)&&!fused[i]&&!fused[j]&&vr>(o.v0||2.2)*Math.sqrt(Z(p.A)*Z(q.A))&&R()<(o.pf||0.004)){const dE=B(p.A+q.A)-B(p.A)-B(q.A);if(dE>0){fused[i]=fused[j]=1;nf.push([p,q,dE]);}}
    if(!isB&&p.b.length<EL[p.e].v&&q.b.length<EL[q.e].v){const liv=p.life||q.life;if(d<(liv?13:8)&&vr<(liv?2:(o.vb||1.5))){p.b.push(q);q.b.push(p);note('mol','Primo legame chimico: due atomi freddi si uniscono');}}
    if((p.life&&!q.life&&!q.b.length&&q.e!==1&&q.e<5)||(q.life&&!p.life&&!p.b.length&&p.e!==1&&p.e<5)){const s=p.life?1:-1,k=.015*s;ax[i]+=dx/d*k;ay[i]+=dy/d*k;az[i]+=dz/d*k;ax[j]-=dx/d*k;ay[j]-=dy/d*k;az[j]-=dz/d*k;}
   }}
  dens[i]=dn;
 }
 for(let i=0;i<n;i++){const p=P[i];for(const q of p.b){if(q.id<p.id)continue;const j=P.indexOf(q);const dx=wr(q.x-p.x),dy=wr(q.y-p.y),dz=wr(q.z-p.z),d=Math.hypot(dx,dy,dz)||.01;if(d>(p.life?20:15)){p.b=p.b.filter(r=>r!==q);q.b=q.b.filter(r=>r!==p);continue;}const f=(d-7)*.05;ax[i]+=dx/d*f;ay[i]+=dy/d*f;az[i]+=dz/d*f;if(j>=0){ax[j]-=dx/d*f;ay[j]-=dy/d*f;az[j]-=dz/d*f;}const rx=(q.vx-p.vx)*.02,ry=(q.vy-p.vy)*.02,rz=(q.vz-p.vz)*.02;p.vx+=rx;p.vy+=ry;p.vz+=rz;q.vx-=rx;q.vy-=ry;q.vz-=rz;}}
 const cr=o.cool||0.00015,cg=o.coolG||0.004;let rad=0,kin=0;
 for(let i=0;i<n;i++){const p=P[i];const damp=1-cg-cr*dens[i];const v2a=p.vx*p.vx+p.vy*p.vy+p.vz*p.vz;
  p.vx=(p.vx+ax[i])*damp;p.vy=(p.vy+ay[i])*damp;p.vz=(p.vz+az[i])*damp;let v=Math.hypot(p.vx,p.vy,p.vz);if(v>VMAX){p.vx*=VMAX/v;p.vy*=VMAX/v;p.vz*=VMAX/v;v=VMAX;}
  rad+=0.5*p.A*Math.max(0,v2a*(1-damp*damp));kin+=0.5*p.A*v*v;
  p.x=(p.x+p.vx+L)%L;p.y=(p.y+p.vy+L)%L;p.z=(p.z+p.vz+L)%L;if(p.hot>0)p.hot--;}
 S.energy.kin=kin;S.energy.rad+=rad;
 for(const [p,q,dE] of nf){
  if(p.dead||q.dead)continue;const A=p.A+q.A;unbond(p);unbond(q);
  p.vx=(p.vx*p.A+q.vx*q.A)/A;p.vy=(p.vy*p.A+q.vy*q.A)/A;p.vz=(p.vz*p.A+q.vz*q.A)/A;p.x=q.x;p.y=q.y;p.z=q.z;p.A=A;p.e=el(A);q.dead=true;p.hot=40;
  S.fus++;S.energy.fus+=dE;note('fus','Prima fusione nucleare: la gravità comprime il gas e si accende una stella');
  if(p.e===1)note('he','Nasce l\'elio');if(p.e===2)note('c','Nasce il carbonio, la base della chimica organica');if(p.e===3)note('n','Nasce l\'azoto');if(p.e===4)note('o','Nasce l\'ossigeno');if(p.e===5)note('mg','Nascono i metalli (Mg, Si…)');
  const k=Math.min(2.2,Math.sqrt(dE)*(o.fk||.2));kickAround(p,28,k,0);
  S.fx.push({x:p.x,y:p.y,z:p.z,r:2,max:8+k*7,c:'255,230,150'});
  if(A>=(o.snA||16))supernova(p);
 }
 if(nf.length)S.P=S.P.filter(p=>!p.dead);
 const nT=o.nT||n0;for(let k=0;k<(o.inflow||2)&&S.P.length<nT;k++){const q=add(R()*L,R()*L,R()*L,(R()-.5)*.4,(R()-.5)*.4,(R()-.5)*.4,1);q.fresh=1;S.inflow=(S.inflow||0)+1;}
 if(S.t%12===0)bio();
 for(const f of S.fx)f.r+=f.max/16;S.fx=S.fx.filter(f=>f.r<f.max);
}
S.step=step;
S.counts=()=>{const k=[0,0,0,0,0,0,0];for(const p of S.P)k[p.e]++;return k;};
S.temp=()=>{let s=0,c=0;for(const p of S.P)if(!p.b.length){s+=p.vx*p.vx+p.vy*p.vy+p.vz*p.vz;c++;}return s/Math.max(1,c);};
return S;
}
if(typeof module!=='undefined')module.exports=makeSim;
