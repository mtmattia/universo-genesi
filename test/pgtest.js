const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:true,args:['--headless=new','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage();const errs=[];p.on('console',m=>errs.push(m.text()));await p.goto('file:///home/claude/v4/pgtest.html');
const r=await p.evaluate(()=>window.go());console.log(r[0].toFixed(0)+'ms',r[1]);require('fs').writeFileSync('/home/claude/v4/pg.png',Buffer.from(r[2].split(',')[1],'base64'));console.log(errs.join('\n').slice(0,2000));await b.close();})();
