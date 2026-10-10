s=open('page10.html').read()
el=open('elements.js').read();eng=open('engine4.js').read();pg=open('probegl.js').read()
cpu=open('core4.js').read().replace("if(typeof module!=='undefined')module.exports=makeSim4;","")
for t in (el,eng,cpu,pg): assert '</script' not in t
s=s.replace('/*ELEMENTS*/',el).replace('/*ENGINE*/',eng).replace('/*CPU*/',cpu).replace('/*PROBEGL*/',pg)
open('../../index.html','w').write(s);print(len(s))
