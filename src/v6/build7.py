s=open('page7.html').read()
el=open('elements.js').read();eng=open('engine3.js').read()
cpu=open('core4.js').read().replace("if(typeof module!=='undefined')module.exports=makeSim4;","")
for t in (el,eng,cpu): assert '</script' not in t
s=s.replace('/*ELEMENTS*/',el).replace('/*ENGINE*/',eng).replace('/*CPU*/',cpu)
open('../../index.html','w').write(s);print(len(s))
