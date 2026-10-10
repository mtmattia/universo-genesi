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
// ---------------- buco nero ----------------
vec4 hole(vec2 p0){float r=length(p0);vec2 pn2=uBN.xy;float pl=length(pn2);pn2=pl>1e-3?pn2/pl:vec2(0.,1.);vec2 p=vec2(pn2.y*p0.x-pn2.x*p0.y,pn2.x*p0.x+pn2.y*p0.y);if(uBN.z<0.)p.y=-p.y;float t=max(abs(uBN.z),.04);vec2 d=vec2(p.x,p.y/t);float dr=length(d);float ang=atan(d.y,d.x);
 float om=uT*1.6/pow(max(dr,1.),1.5);float tb=fbm(vec3(cos(ang+om)*dr*1.6,sin(ang+om)*dr*1.6,dr*2.5));
 float band=smoothstep(1.45,1.7,dr)*smoothstep(4.8,3.,dr);float I=band*pow(1.6/max(dr,1.6),1.8)*(.35+1.3*tb*tb);
 float bo=pow(clamp(1.+.55*(-d.x/max(dr,1e-3)),.2,2.),3.);
 vec3 dcol=mix(vec3(1.,.96,.9),vec3(1.,.42,.1),smoothstep(1.6,4.,dr))*I*bo*uAcc*1.6;
 float rl=length(vec2(p.x*.96,p.y*1.08));float upper=smoothstep(-.1,.5,p.y);float al=atan(p.y,p.x);
 float Il=smoothstep(1.12,1.28,rl)*smoothstep(2.1,1.5,rl)*(.35+fbm(vec3(cos(al-uT*.4)*3.,sin(al-uT*.4)*3.,rl*5.)));
 float bl=pow(clamp(1.+.45*(-p.x/max(rl,1e-3)),.2,2.),2.);
 vec3 lens=vec3(1.,.7,.4)*Il*bl*uAcc*mix(upper*1.1+(1.-upper)*.35,.75,t*t);
 vec3 ring=vec3(1.,.85,.65)*exp(-pow((r-1.04)/.022,2.))*(.4+uAcc);
 vec3 c=vec3(0.);float a=0.;
 if(r<1.){a=1.;}else{c+=lens+ring;if(p.y>0.)c+=dcol;}
 if(p.y<=0.)c+=dcol;
 if(uAcc>.7){float jy=p.y/max(pl,.08);float jx=abs(p.x)/(.06+abs(jy)*.06);float jet=exp(-jx*jx)*smoothstep(1.,1.6,abs(p.y))*exp(-abs(jy)*.25)*pl*(.6+.6*fbm(vec3(p.x*4.,jy*1.5-sign(p.y)*uT*2.,1.)));c+=vec3(.55,.7,1.)*jet*(uAcc-.7)*3.;}
 c+=vec3(1.,.6,.3)*exp(-max(r-1.,0.)*1.2)*.05*uAcc;
 c=tm(c*1.3);a=max(a,clamp(max(c.r,max(c.g,c.b)),0.,1.));return vec4(c,a);}
void main(){vec2 p=vp*uExt;int K=int(uKind+.5);
 if(K==0){float pr=1.+uPulse;vec2 q=p/pr;float r=length(q);float px=uPx/pr;vec3 ci=vec3(0.),co=vec3(0.);float cov=clamp((1.-r)/px*.5+.5,0.,1.);
  if(r<1.+px)ci=starIn(q/max(r,1.)*min(r,1.));if(r>1.-px)co=starOut(q/max(r,1e-4)*max(r,1.));
  vec3 m=mix(co,ci,cov);float mx=max(m.r,max(m.g,m.b));vec3 c=m*((1.-exp(-mx*1.4))/max(mx,1e-4));float a=mix(clamp(max(c.r,max(c.g,c.b)),0.,1.),1.,cov);o=vec4(c,a);}
 else if(K==1)o=planet(p);else o=hole(p);}`;
function pgInit(){if(PG.gl!==null)return PG.gl;const c=document.createElement('canvas');c.width=c.height=8;
 const gl=c.getContext('webgl2',{premultipliedAlpha:true,alpha:true,antialias:false});if(!gl){PG.gl=false;return false;}
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error('probe shader',gl.getShaderInfoLog(o));return null;}return o;};
 const vs=sh(gl.VERTEX_SHADER,PG_VS),fs=sh(gl.FRAGMENT_SHADER,PG_FS);if(!vs||!fs){PG.gl=false;return false;}
 const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.error('probe link',gl.getProgramInfoLog(pr));PG.gl=false;return false;}
 gl.useProgram(pr);gl.bindVertexArray(gl.createVertexArray());
 for(const n of['uT','uExt','uKind','uSeed','uGiant','uAct','uDim','uPulse','uPx','uPT','uWat','uBio','uTeq','uAtm','uAcc','uIce','uCol','uAtmCol','uL','uBN','uCam'])PG.u[n]=gl.getUniformLocation(pr,n);
 PG.c=c;PG.gl=gl;return gl;}
function pgRender(size,U){const gl=pgInit();if(!gl)return null;size=Math.max(16,Math.min(720,Math.round(size)));
 if(PG.c.width!==size){PG.c.width=PG.c.height=size;}gl.viewport(0,0,size,size);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 const d={uT:0,uExt:1,uKind:0,uSeed:0,uGiant:0,uAct:0.3,uDim:1,uPulse:0,uPx:0.01,uPT:2,uWat:0,uBio:0,uTeq:300,uAtm:0,uAcc:0.5,uIce:0,uL:[-.65,.45,.62],uBN:[0,.98,.2],uCam:[1,0,0,0,1,0,0,0,1],...U};d.uPx=2*d.uExt/size*1.5;
 for(const k in d){const l=PG.u[k];if(!l)continue;const v=d[k];if(Array.isArray(v)){if(v.length===9)gl.uniformMatrix3fv(l,false,v);else gl.uniform3fv(l,v);}else gl.uniform1f(l,v);}
 gl.drawArrays(gl.TRIANGLES,0,3);return PG.c;}
function bbRGB(T){T/=100;let r,g,b;if(T<=66){r=255;g=99.47*Math.log(T)-161.12;b=T<=19?0:138.52*Math.log(T-10)-305.04;}else{r=329.7*Math.pow(T-60,-0.1332);g=288.12*Math.pow(T-60,-0.0755);b=255;}
 const c=[r,g,b].map(v=>Math.max(0,Math.min(255,v))/255);const m=Math.max(...c);return c.map(v=>v/m);}
function pgHash(i){let x=(i+1)*2654435761>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;return (x>>>0)/4294967296;}
