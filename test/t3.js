const m=require('../src/v4/core4.js');const a=JSON.parse(process.argv[2]||'{}');const S=m(a);const t0=Date.now();const ev=a.every||500;
for(let i=1;i<=(a.steps||3000);i++){S.step();if(i%ev===0){const t=S.totals();let arr=[];for(let k=0;k<S.N;k++)arr.push([S.rho[k],S.u[k]]);arr.sort((p,q)=>q[0]-p[0]);
console.log(i,'Z',(1-t[0]-t[1]).toFixed(4),'He',t[1].toFixed(3),'T',S.temp().toFixed(4),'R90',S.R90.toFixed(0),'Rv',S.Rview.toFixed(0),S.phase,'st',S.stars,'sn',S.sn,'pl',S.planets,'hz',S.habit,'life',S.lifeP,'top',arr.slice(0,3).map(v=>v[0].toFixed(2)+'/'+v[1].toFixed(4)).join(' '));}}
console.log('ms/step',((Date.now()-t0)/(a.steps||3000)).toFixed(2));S.log.forEach(l=>console.log(l.t,l.msg));
