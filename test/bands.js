const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:true,args:['--headless=new','--enable-unsafe-webgpu','--enable-unsafe-swiftshader','--use-angle=swiftshader','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface','--ignore-gpu-blocklist']});
 const p=await (await b.newContext()).newPage();const errs=[];p.on('console',m=>errs.push(m.text()));await p.goto('file:///home/claude/v4/harness4.html');
 const r=await p.evaluate(()=>window.run(2000,2400,800,{mode:2,D:200}).catch(e=>'EXC '+e)) .catch(e=>'x');
 console.log(String(r).split('\n').filter(l=>/ERR|EXC|render/.test(l)).join('\n'));
 const imgs=await p.evaluate(async()=>{const g=window.__g,vp=window.__vp,out={};
  const tex=g.dev.createTexture({size:[384,384],format:g.fmt,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  for(const MD of [2,3,4,5,6]){g.prep(MD);await g.done();await new Promise(r=>setTimeout(r,100));
   const a=await g.readPick();const v=[];const D=200;for(let i=0;i<a.length/20;i++){const k=i*20,ty=a[k+16];if(ty===1||ty>4.5)continue;const m=Math.max(a[k+4],a[k+5],a[k+6]);const w=vp[3]*a[k]+vp[7]*a[k+1]+vp[11]*a[k+2]+vp[15];if(w<=0.01)continue;if(ty===0&&a[k+7]>0){const b=(a[k+7]/0.004)*(D/w)**2*0.5*m;if(b>1e-6)v.push(b);}else if(ty===0&&m>1e-4)v.push(m*0.6);}
   v.sort((x,y)=>x-y);const ref=v.length>2?v[Math.floor(v.length*0.97)]:1;const ex=Math.min(1e4,Math.max(0.02,0.9/Math.max(ref,1e-9)));out['e'+MD]=ex+' n'+v.length;
   g.render(new Float32Array(vp),{exposure:ex,real:true,band:MD-1,camD:200,px:1.25,cloudA:1,cloudK:2.4*2.1445,cloudMax:90,ptA:0.8,view:tex.createView(),w:384,h:384});
   const rbuf=g.dev.createBuffer({size:384*384*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const e=g.dev.createCommandEncoder();e.copyTextureToBuffer({texture:tex},{buffer:rbuf,bytesPerRow:1536},[384,384]);g.dev.queue.submit([e.finish()]);
   await rbuf.mapAsync(GPUMapMode.READ);out[MD]=Array.from(new Uint8Array(rbuf.getMappedRange()));rbuf.unmap();}
  return out;});
 for(const k in imgs){if(k[0]==='e'){console.log(k,imgs[k]);continue;}require('fs').writeFileSync('/home/claude/v4/band'+k+'.raw',Buffer.from(imgs[k]));}
 console.log(errs.filter(t=>/rror|WGSL/.test(t)).slice(0,5).join('\n'));await b.close();})();
