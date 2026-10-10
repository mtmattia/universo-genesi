const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const [N,steps,every,opts]=[+process.argv[2],+process.argv[3],+process.argv[4],process.argv[5]||'{}'];
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:true,args:['--headless=new','--enable-unsafe-webgpu','--enable-unsafe-swiftshader','--use-angle=swiftshader','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface','--ignore-gpu-blocklist']});
 const p=await (await b.newContext()).newPage();p.on('console',m=>{});
 await p.goto('file:///home/claude/v4/harness4.html');
 const r=await p.evaluate(([N,s,e,o])=>window.run(N,s,e,JSON.parse(o)),[N,steps,every,opts]);console.log(r);const img=await p.evaluate(()=>window.__img);if(img){require('fs').writeFileSync('/home/claude/v4/img4_'+(JSON.parse(opts).mode||0)+'.raw',Buffer.from(img));}await b.close();})();
