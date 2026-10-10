// Vista da sonda: rendering per-pixel su WebGL2 (stella, pianeta, buco nero)
const PG={c:null,gl:null,u:{}};
const PG_VS=`#version 300 es
out vec2 vp;void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vp=q*2.-1.;gl_Position=vec4(vp,0.,1.);}`;
const PG_FS=`#version 300 es
precision highp float;in vec2 vp;out vec4 o;
uniform float uT,uExt,uKind,uSeed,uGiant,uAct,uDim,uPulse,uPx,uPT,uWat,uBio,uTeq,uAtm,uAcc,uIce;uniform vec3 uCol,uAtmCol,uL,uBN;uniform mat3 uCam;
uvec3 pcg3(uvec3 v){v=v*1664525u+1013904223u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;v^=v>>16u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;return v;}
vec3 h3(vec3 p){return vec3(pcg3(uvec3(ivec3(floor(p))+32768)))*(1./4294967295.);}
float h1(vec3 p){return h3(p).x;}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vn(p);p=p*2.07+vec3(5.1,1.3,7.7);a*=.5;}return s/.875;}
vec2 wor(vec3 p,float t){vec3 i=floor(p),f=fract(p);float d1=8.,d2=8.;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(x,y,z);vec3 h=h3(i+g);h=.5+.42*sin(t+6.2831*h);vec3 r=g+h-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
 return vec2(sqrt(d1),sqrt(d2));}
mat3 rY(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
vec3 tm(vec3 c){return 1.-exp(-c);}
// ---------------- stella ----------------
vec3 starIn(vec2 p){float r2=dot(p,p);float z=sqrt(max(0.,1.-r2));vec3 n=vec3(p,z);
 vec3 q=rY(uT*.03+uSeed)*(rX(.35)*(uCam*n));float lat=asin(clamp(q.y,-1.,1.));
 float fr=mix(60.,3.2,uGiant);
 vec3 qd=q*fr+uSeed*7.+uGiant*1.6*vec3(fbm3(q*2.+1.),fbm3(q*2.+5.),fbm3(q*2.+9.));vec2 w=wor(qd,uT*mix(.5,.12,uGiant));float gran=smoothstep(.0,mix(.38,.6,uGiant),w.y-w.x);
 vec2 w2=wor(q*fr*2.6+3.3,uT*.8);float g2=smoothstep(.0,.3,w2.y-w2.x);
 float I=mix(mix(.86,.72,uGiant),1.,gran)*mix(mix(.95,.85,uGiant),1.,g2);
 I*=.88+.24*fbm3(q*2.5+uT*.01);
 float band=exp(-pow((abs(lat)-.32)/.16,2.))*(1.-uGiant)+uGiant*.8;
 float sn=fbm(q*mix(9.,2.5,uGiant)+uSeed*3.);float th=.68-.12*uAct;
 float pen=smoothstep(th,th+.05,sn)*band;float umb=smoothstep(th+.05,th+.09,sn)*band;
 I*=1.-.4*pen-.45*umb;
 float mu=z;float ld=1.-.62*(1.-mu)-.22*(1.-mu)*(1.-mu);
 float fac=smoothstep(.55,.72,fbm3(q*10.+7.))*pow(1.-mu,1.5)*.9*uAct;
 vec3 sc=pow(uCol,vec3(1.8));vec3 c=sc*I*ld*(1.+fac);c*=mix(vec3(1.),vec3(1.,.7,.48),pow(1.-mu,1.6)*.65);
 return c*1.25*uDim;}
vec3 starOut(vec2 p){float r=length(p);float h=r-1.;float ang=atan(p.y,p.x);vec2 dir=p/r;
 float cor=exp(-h*mix(4.5,2.6,uGiant))*.45;vec3 wd=uCam*vec3(dir,0.);float st=fbm(wd*2.5+vec3(uSeed,0.,h*1.5-uT*.03));cor*=.45+1.1*st*st;
 vec3 c=mix(uCol,vec3(1.),.3)*cor*uDim;
 c+=vec3(1.,.32,.22)*exp(-h*70.)*.9*uDim*(1.-.6*uGiant);
 float pn=fbm(wd*6.+vec3(uSeed*2.,0.,h*9.-uT*.12));
 float pr=smoothstep(.66,.74,pn)*exp(-h*mix(20.,8.,uGiant))*smoothstep(0.,.015,h)*(.3+uAct)*1.4;
 c+=vec3(1.,.28,.18)*pr*uDim;return c;}
// ---------------- pianeta ----------------
vec3 surf(vec3 q,out float spec,out vec3 emis,out float cloud){spec=0.;emis=vec3(0.);cloud=0.;float lat=q.y;int T=int(uPT+.5);
 if(T==6){float tw=fbm(q*3.+vec3(uT*.015,0,0));float b=sin(lat*16.+tw*4.)*.5+.5;float b2=sin(lat*41.+tw*7.)*.5+.5;
  vec3 A=mix(vec3(.88,.78,.62),vec3(.6,.82,.95),uIce),B=mix(vec3(.62,.42,.28),vec3(.3,.5,.85),uIce);vec3 c=mix(B,A,b)*mix(.88,1.06,b2);
  vec2 s=vec2((atan(q.x,q.z)-1.2)*.9,(lat+.33)*3.);float sd=length(s);c=mix(c,mix(vec3(.75,.32,.2),vec3(.2,.3,.7),uIce),smoothstep(.35,.15,sd)*(.6+.4*sin(sd*25.-uT)));return c;}
 float hg=fbm(q*2.2+uSeed)*.75+fbm(q*8.+uSeed*2.)*.25;
 vec2 w=wor(q*4.+uSeed,0.);float crat=1.-.35*smoothstep(.25,.05,w.x)+.2*smoothstep(.3,.25,w.x)*smoothstep(.2,.25,w.x);
 vec3 c;
 if(T==2){float sea=mix(.48,.6,clamp(uWat*1500.,0.,1.));
  if(hg<sea){c=mix(vec3(.01,.05,.2),vec3(.04,.22,.45),smoothstep(sea-.15,sea,hg));spec=1.;}
  else{float m=fbm3(q*5.+11.);vec3 dry=mix(vec3(.55,.45,.3),vec3(.42,.36,.3),m);vec3 veg=mix(vec3(.12,.32,.1),vec3(.25,.4,.15),m);c=mix(dry,veg,uBio*smoothstep(.35,.6,m)*(1.-smoothstep(.6,.75,abs(lat))));c*=mix(.85,1.15,(hg-sea)*4.);}
  cloud=smoothstep(.52,.74,fbm(q*vec3(3.,7.,3.)+vec3(uT*.02,0,0)+9.));}
 else if(T==3){c=mix(vec3(.82,.58,.34),vec3(.55,.3,.18),hg)*crat;}
 else if(T==4){c=mix(vec3(.6,.62,.66),vec3(.33,.34,.38),hg)*crat;}
 else if(T==5){c=mix(vec3(.9,.95,1.),vec3(.65,.78,.92),hg);float rl=1.-abs(vn(q*7.+uSeed)*2.-1.);c=mix(c,vec3(.6,.42,.3),smoothstep(.92,.985,rl)*.8);spec=.4;}
 else if(T==1){c=mix(vec3(.5,.4,.32),vec3(.28,.22,.2),hg)*crat;cloud=.55+.4*fbm(q*vec3(2.,6.,2.)+vec3(uT*.03,0,0));}
 else{c=vec3(.11,.09,.08)*(.7+.6*hg);float lk=1.-abs(vn(q*5.+vec3(0,0,uT*.02))*2.-1.);float lk2=1.-abs(vn(q*13.+4.)*2.-1.);
  emis=vec3(1.,.32,.04)*(smoothstep(.86,.97,lk)*1.8+smoothstep(.9,.98,lk2)*.8);}
 if(T!=6&&T!=0&&T!=1){float cap=mix(.97,.5,clamp((300.-uTeq)/90.,0.,1.));c=mix(c,vec3(.93,.96,1.),smoothstep(cap,cap+.06,abs(lat)+(hg-.5)*.25));}
 return c;}
vec4 planet(vec2 p){float r=length(p);vec3 L=normalize(uL);
 float px=uPx;float cov=clamp((1.-r)/px*.5+.5,0.,1.);vec3 outc=vec3(0.);float oa=0.;
 if(r>1.-px){float h=max(r-1.,0.);vec2 d=p/max(r,1e-4);float lit=clamp(dot(d,normalize(L.xy))*.8+.35,0.,1.);
  outc=uAtmCol*exp(-h*22.)*uAtm*lit*.9;oa=clamp(max(outc.r,max(outc.g,outc.b)),0.,1.);}
 if(r>=1.)return vec4(outc,oa);
 vec2 pp=p/max(r,1.);float z=sqrt(max(0.,1.-dot(pp,pp)));vec3 n=vec3(pp,z);vec3 q=rY(uT*.035+uSeed)*(rX(.3)*(uCam*n));
 float spec;vec3 emis;float cloud;vec3 c=surf(q,spec,emis,cloud);
 float nl=dot(n,L);float dif=max(nl,0.);float term=smoothstep(-.08,.2,nl);
 vec3 h=normalize(L+vec3(0,0,1));float sp=pow(max(dot(n,h),0.),60.)*spec*.7*term;
 vec3 col=c*(dif*1.15+.02)+sp;
 if(cloud>0.){vec3 qc=rY(uT*.012)*q;float sh=smoothstep(.52,.74,fbm(qc*vec3(3.,7.,3.)+vec3(uT*.02,0,0)+9.03));col*=1.-.35*sh*dif;col=mix(col,vec3(1.)*(dif*1.1+.02),cloud*.9*(int(uPT+.5)==1?.85:1.));}
 col+=emis*(.4+.6*(1.-term));
 float fr=pow(1.-z,2.5);col+=uAtmCol*fr*uAtm*term*.9;
 col=tm(col*1.25);return vec4(mix(outc,col,cov),mix(oa,1.,cov));}
// ---------------- buco nero: ray tracing nella metrica di Schwarzschild (Rs=1) ----------------
vec3 bbc(float T){T=clamp(T,1000.,40000.)/100.;vec3 c;
 c.r=T<=66.?1.:clamp(1.292936*pow(T-60.,-.1332047),0.,1.);
 c.g=T<=66.?clamp(.3900816*log(T)-.6318414,0.,1.):clamp(1.129891*pow(T-60.,-.0755148),0.,1.);
 c.b=T>=66.?1.:(T<=19.?0.:clamp(.5432068*log(T-10.)-1.1962541,0.,1.));return c;}
vec3 sky(vec3 d){vec3 q=d*90.;vec3 ce=floor(q);vec3 h=h3(ce);vec3 c=vec3(0.);
 if(h.x>.97){vec3 o=fract(q)-.5-(h.yzx-.5)*.6;float dd=length(o);c+=bbc(3000.+h.z*9000.)*smoothstep(.16,.0,dd)*(.4+1.6*h.y*h.y);}
 vec3 q2=d*260.;vec3 h2=h3(floor(q2));if(h2.x>.985){float dd=length(fract(q2)-.5);c+=vec3(.8,.85,1.)*smoothstep(.2,.0,dd)*.5;}
 float band=exp(-pow(dot(d,normalize(vec3(.3,1.,.2)))*3.5,2.));c+=vec3(.55,.5,.6)*band*fbm(d*4.)*.12;return c;}
vec4 hole(vec2 p){vec3 N=normalize(uBN);vec3 e1=normalize(abs(N.y)<.9?cross(N,vec3(0,1,0)):cross(N,vec3(1,0,0)));vec3 e2=cross(N,e1);
 float Do=40.;vec3 pos=vec3(0.,0.,Do);vec3 v=normalize(vec3(p*2.6/sqrt(1.-1./Do),-Do));vec3 L=cross(pos,v);float h2=dot(L,L);
 vec3 col=vec3(0.);float tr=1.;bool cap=false;float sp=dot(pos,N);float T0=mix(2600.,5200.,uAcc);float Rin=3.,Rout=13.;
 for(int i=0;i<320;i++){float r=length(pos);float dt=clamp(.06*r*r/(r+2.),.015,2.);
  vec3 a1=-1.5*h2*pos/pow(r,5.);vec3 vh=v+a1*dt*.5;vec3 np=pos+vh*dt;float nr=length(np);vec3 a2=-1.5*h2*np/pow(nr,5.);v=vh+a2*dt*.5;
  float s=dot(np,N);
  if(s*sp<0.){float f=sp/(sp-s);vec3 hp=mix(pos,np,f);float rr=length(hp);
   if(rr>Rin&&rr<Rout){float x=sqrt(Rin/rr);float Tr=pow(rr/Rin,-.75)*pow(max(1.-x,0.),.25)*2.2;
    vec3 tg=normalize(cross(N,hp));float be=min(sqrt(.5/(rr-1.)),.75);float ga=1./sqrt(1.-be*be);vec3 no=-normalize(v);
    float g=sqrt(max(1.-1./rr,0.))/(ga*(1.-be*dot(tg,no)));
    float ph=atan(dot(hp,e2),dot(hp,e1));float om=uT*3./pow(rr,1.5);
    float tb=fbm(vec3(cos(ph-om)*rr*.9,sin(ph-om)*rr*.9,rr*.7));float st=.6+.8*tb*tb;
    float T=T0*Tr*g;vec3 e=bbc(T)*pow(Tr,4.)*pow(g,4.)*st*2.2*(.35+uAcc);
    float al=clamp(.92*smoothstep(Rin,Rin+.4,rr)*smoothstep(Rout,Rout-6.,rr)*(.5+.5*tb),0.,1.);
    col+=tr*e*al;tr*=1.-al;if(tr<.02)break;}}
  pos=np;sp=s;if(nr<1.01){cap=true;break;}if(nr>Do*1.2&&dot(pos,v)>0.)break;}
 float pr=length(p);float skyA=cap?1.:1.-smoothstep(3.2,uExt*.98,pr);vec3 sk=cap?vec3(0.):sky(normalize(v));
 vec2 pn2=uBN.xy;float pl=length(pn2);pn2=pl>1e-3?pn2/pl:vec2(0.,1.);vec2 q=vec2(pn2.y*p.x-pn2.x*p.y,pn2.x*p.x+pn2.y*p.y);
 if(uAcc>.7&&!cap){float jy=q.y/max(pl,.08);float jx=abs(q.x)/(.05+abs(jy)*.05);col+=tr*vec3(.55,.7,1.)*exp(-jx*jx)*smoothstep(1.5,2.5,abs(q.y))*exp(-abs(jy)*.2)*pl*(.5+.7*fbm(vec3(q.x*4.,jy*1.5-sign(q.y)*uT*2.,1.)))*(uAcc-.7)*2.5;}
 vec3 c=col+tr*sk*skyA;float mx=max(c.r,max(c.g,c.b));c*=(1.-exp(-mx*1.5))/max(mx,1e-4);
 float a=clamp((1.-tr)+tr*skyA,0.,1.);a=max(a,clamp(mx,0.,1.));return vec4(c,a);}
// ---------------- pulsar: stella di neutroni con asse magnetico inclinato che ruota ----------------
vec4 pulsar(vec2 p){mat3 iv=transpose(uCam);float ph=uT*6.2831/max(uAct,.05);float al=.55;
 vec3 mw=vec3(sin(al)*cos(ph),cos(al),sin(al)*sin(ph));vec3 m=iv*mw;vec3 c=vec3(0.);float a=0.;float r=length(p);
 for(int k=0;k<2;k++){vec3 A=m*(k==0?1.:-1.);vec2 a2=A.xy;float la=length(a2);vec2 an=la>1e-3?a2/la:vec2(0.,1.);
  float u=dot(p,an);float w=abs(an.x*p.y-an.y*p.x);float cone=.12+max(u,0.)*.16/max(la,.15)*la;
  float beam=step(0.,u)*exp(-pow(w/cone,2.))*exp(-u*.09/max(la,.2))*smoothstep(.8,1.6,u)*la;
  float fl=pow(max(A.z,0.),12.);c+=vec3(.55,.75,1.)*beam*(.35+2.5*fl);
  c+=vec3(.7,.85,1.)*fl*exp(-r*.35)*1.6;}
 c+=vec3(.5,.7,1.)*exp(-max(r-1.,0.)*1.1)*.25;
 if(r<1.){float z=sqrt(1.-r*r);vec3 n=vec3(p,z);float pole=max(pow(max(dot(n,m),0.),40.),pow(max(dot(n,-m),0.),40.));
  c=mix(vec3(.75,.85,1.),vec3(1.),pole)*(.55+.45*z)*1.4+vec3(.6,.8,1.)*pole*2.;a=1.;}
 float mx=max(c.r,max(c.g,c.b));c*=(1.-exp(-mx*1.4))/max(mx,1e-4);a=max(a,clamp(mx,0.,1.));return vec4(c,a);}
void main(){vec2 p=vp*uExt;int K=int(uKind+.5);
 if(K==0){float pr=1.+uPulse;vec2 q=p/pr;float r=length(q);float px=uPx/pr;vec3 ci=vec3(0.),co=vec3(0.);float cov=clamp((1.-r)/px*.5+.5,0.,1.);
  if(r<1.+px)ci=starIn(q/max(r,1.)*min(r,1.));if(r>1.-px)co=starOut(q/max(r,1e-4)*max(r,1.))*smoothstep(uExt/pr,uExt/pr*.75,r);
  vec3 m=mix(co,ci,cov);float mx=max(m.r,max(m.g,m.b));vec3 c=m*((1.-exp(-mx*1.4))/max(mx,1e-4));float a=mix(clamp(max(c.r,max(c.g,c.b)),0.,1.),1.,cov);o=vec4(c,a);}
 else if(K==1)o=planet(p);else if(K==3)o=pulsar(p);else o=hole(p);}`;
function pgInit(){if(PG.gl!==null)return PG.gl;const c=document.createElement('canvas');c.width=c.height=8;
 const gl=c.getContext('webgl2',{premultipliedAlpha:true,alpha:true,antialias:false});if(!gl){PG.gl=false;return false;}
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error('probe shader',gl.getShaderInfoLog(o));return null;}return o;};
 const vs=sh(gl.VERTEX_SHADER,PG_VS),fs=sh(gl.FRAGMENT_SHADER,PG_FS);if(!vs||!fs){PG.gl=false;return false;}
 const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.error('probe link',gl.getProgramInfoLog(pr));PG.gl=false;return false;}
 gl.useProgram(pr);gl.bindVertexArray(gl.createVertexArray());
 for(const n of['uT','uExt','uKind','uSeed','uGiant','uAct','uDim','uPulse','uPx','uPT','uWat','uBio','uTeq','uAtm','uAcc','uIce','uCol','uAtmCol','uL','uBN','uCam'])PG.u[n]=gl.getUniformLocation(pr,n);
 PG.c=c;PG.gl=gl;return gl;}
function pgRender(size,U){const gl=pgInit();if(!gl)return null;size=Math.max(16,Math.min(U&&U.uKind===2?1600:2048,Math.round(size)));
 if(PG.c.width!==size){PG.c.width=PG.c.height=size;}gl.viewport(0,0,size,size);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 const d={uT:0,uExt:1,uKind:0,uSeed:0,uGiant:0,uAct:0.3,uDim:1,uPulse:0,uPx:0.01,uPT:2,uWat:0,uBio:0,uTeq:300,uAtm:0,uAcc:0.5,uIce:0,uL:[-.65,.45,.62],uBN:[0,.98,.2],uCam:[1,0,0,0,1,0,0,0,1],...U};d.uPx=2*d.uExt/size*1.5;
 for(const k in d){const l=PG.u[k];if(!l)continue;const v=d[k];if(Array.isArray(v)){if(v.length===9)gl.uniformMatrix3fv(l,false,v);else gl.uniform3fv(l,v);}else gl.uniform1f(l,v);}
 gl.drawArrays(gl.TRIANGLES,0,3);return PG.c;}
function bbRGB(T){T/=100;let r,g,b;if(T<=66){r=255;g=99.47*Math.log(T)-161.12;b=T<=19?0:138.52*Math.log(T-10)-305.04;}else{r=329.7*Math.pow(T-60,-0.1332);g=288.12*Math.pow(T-60,-0.0755);b=255;}
 const c=[r,g,b].map(v=>Math.max(0,Math.min(255,v))/255);const m=Math.max(...c);return c.map(v=>v/m);}
function pgHash(i){let x=(i+1)*2654435761>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;return (x>>>0)/4294967296;}
