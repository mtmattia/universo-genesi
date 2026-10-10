const { chromium,devices } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:true,args:['--headless=new']});
 const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width,initial-scale=1';document.head.appendChild(m);});});
 await p.goto('file:///home/claude/v4/universo4.html');await p.waitForTimeout(50000);
 for(const [kind,test] of [['star',"a[i*S+16]===0&&a[i*S+7]>0"],['planet',"a[i*S+16]===0&&a[i*S+8]>=1&&a[i*S+7]<=0"]]){
  const r=await p.evaluate(async(test)=>{const g=window.__genesi;const a=await g.pickData();const S=20,N=a.length/S;let bi=-1;for(let i=0;i<N;i++)if(eval(test)){bi=i;break;}if(bi<0)return'none';g.selectObject(a,bi);return bi;},test);
  await p.waitForTimeout(2500);console.log(kind,r);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('#selcard button')].find(b=>b.dataset.a==='real');b&&b.click();});await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>document.querySelector('#selcard').innerText.replace(/\n/g,' ')));
  await p.screenshot({path:'/home/claude/v4/real_'+kind+'.png'});}
 console.log(errs.join('\n'));await b.close();})();
