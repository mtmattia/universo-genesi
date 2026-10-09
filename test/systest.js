const { chromium } = require('playwright');
(async()=>{const gpu=process.argv[2]==='gpu';const wait=+(process.argv[3]||40000);
 const args=gpu?['--headless=new','--enable-unsafe-webgpu','--enable-unsafe-swiftshader','--use-angle=swiftshader','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface','--ignore-gpu-blocklist']:['--headless=new'];
 const b=await chromium.launch({headless:true,args});
 const p=await (await b.newContext({viewport:{width:1280,height:1300}})).newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(wait);
 let r='';for(let tries=0;tries<60;tries++){r=await p.evaluate(async()=>{const G=window.__genesi;const a=await G.pickData();const N=a.length/20;let best=-1,bc=-1;
  // stella con più pianeti vicini
  for(let i=0;i<N;i++){if(a[i*20+7]<=0)continue;let c=0;for(let j=0;j<N;j++){if(a[j*20+8]>=1){const d=(a[i*20]-a[j*20])**2+(a[i*20+1]-a[j*20+1])**2+(a[i*20+2]-a[j*20+2])**2;if(d<400)c++;}}if(c>bc){bc=c;best=i;}}
  if(best<0)return 'no star';G.setFollow(best,'stella');G.cam.t=[a[best*20],a[best*20+1],a[best*20+2]];G.cam.ft=G.cam.t.slice();if(bc<1)return 'wait';G.cam.D=0.6;return 'star '+best+' planets near '+bc;});if(r!=='wait'&&r!=='no star')break;await p.waitForTimeout(5000);}
 console.log(r);await p.waitForTimeout(3000);
 console.log(await p.evaluate(()=>{const s=window.__genesi.sys;return 'active '+s.active+' planets '+s.planets.length+' types '+s.planets.map(q=>q.type+':'+Math.round(q.teq)).join(',')+' star '+(s.star&&s.star.cls+' L'+s.star.L.toFixed(2));}));
 await p.screenshot({path:require('path').resolve(__dirname,'sys1.png'),clip:{x:0,y:0,width:920,height:900}});
 await p.evaluate(()=>{const G=window.__genesi;const s=G.sys;if(s.planets.length){let k=s.planets.findIndex(q=>q.type==='ocean');if(k<0)k=s.planets.length-1;s.focus=k;G.setFollow(s.planets[k].i,'pianeta');G.sysPanel();}});
 await p.waitForTimeout(2500);await p.screenshot({path:require('path').resolve(__dirname,'sys2.png'),clip:{x:0,y:0,width:920,height:900}});
 await p.evaluate(()=>{document.getElementById('srcO').click();});await p.waitForTimeout(800);
 await p.screenshot({path:require('path').resolve(__dirname,'pt.png'),clip:{x:0,y:900,width:1280,height:400}});
 console.log(errs.slice(0,6).join('\n'));await b.close();})();
