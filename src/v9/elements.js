// Tavola degli elementi: nome, massa atomica, abbondanza nel Sistema Solare (atomi per Si = 1, Kaye & Laby),
// origine dominante e quota del processo s (resto = processo r) per gli elementi oltre lo zinco.
const ELEM_RAW=`1|H|Idrogeno|1.008|2.8e4
2|He|Elio|4.0026|2.7e3
3|Li|Litio|6.94|5.7e-5
4|Be|Berillio|9.0122|7.0e-7
5|B|Boro|10.81|2.1e-5
6|C|Carbonio|12.011|10
7|N|Azoto|14.007|3.1
8|O|Ossigeno|15.999|24
9|F|Fluoro|18.998|8.5e-4
10|Ne|Neon|20.180|3.0
11|Na|Sodio|22.990|5.7e-2
12|Mg|Magnesio|24.305|1.1
13|Al|Alluminio|26.982|8.5e-2
14|Si|Silicio|28.085|1.0
15|P|Fosforo|30.974|1.0e-2
16|S|Zolfo|32.06|5.2e-1
17|Cl|Cloro|35.45|5.2e-3
18|Ar|Argon|39.948|1.0e-1
19|K|Potassio|39.098|3.8e-3
20|Ca|Calcio|40.078|6.1e-2
21|Sc|Scandio|44.956|3.4e-5
22|Ti|Titanio|47.867|2.4e-3
23|V|Vanadio|50.942|2.9e-4
24|Cr|Cromo|51.996|1.3e-2
25|Mn|Manganese|54.938|9.5e-3
26|Fe|Ferro|55.845|0.9
27|Co|Cobalto|58.933|2.3e-3
28|Ni|Nichel|58.693|5.0e-2
29|Cu|Rame|63.546|5.2e-4
30|Zn|Zinco|65.38|1.3e-3
31|Ga|Gallio|69.723|3.8e-5|0.5
32|Ge|Germanio|72.630|1.2e-4|0.5
33|As|Arsenico|74.922|6.6e-6|0.2
34|Se|Selenio|78.971|6.3e-5|0.1
35|Br|Bromo|79.904|1.2e-5|0.1
36|Kr|Kripton|83.798|4.8e-5|0.4
37|Rb|Rubidio|85.468|7.0e-6|0.3
38|Sr|Stronzio|87.62|2.4e-5|0.85
39|Y|Ittrio|88.906|4.6e-6|0.9
40|Zr|Zirconio|91.224|1.14e-5|0.8
41|Nb|Niobio|92.906|7.0e-7|0.7
42|Mo|Molibdeno|95.95|2.6e-6|0.5
43|Tc|Tecnezio|98|T
44|Ru|Rutenio|101.07|1.9e-6|0.3
45|Rh|Rodio|102.91|3.4e-7|0.15
46|Pd|Palladio|106.42|1.4e-6|0.45
47|Ag|Argento|107.87|4.9e-7|0.2
48|Cd|Cadmio|112.41|1.6e-6|0.5
49|In|Indio|114.82|1.9e-7|0.35
50|Sn|Stagno|118.71|3.9e-6|0.65
51|Sb|Antimonio|121.76|3.1e-7|0.25
52|Te|Tellurio|127.60|4.9e-6|0.2
53|I|Iodio|126.90|9.0e-7|0.05
54|Xe|Xeno|131.29|4.8e-6|0.15
55|Cs|Cesio|132.91|3.7e-7|0.15
56|Ba|Bario|137.33|4.5e-6|0.85
57|La|Lantanio|138.91|4.4e-7|0.75
58|Ce|Cerio|140.12|1.1e-6|0.8
59|Pr|Praseodimio|140.91|1.7e-7|0.5
60|Nd|Neodimio|144.24|8.3e-7|0.55
61|Pm|Promezio|145|T
62|Sm|Samario|150.36|2.6e-7|0.3
63|Eu|Europio|151.96|9.7e-8|0.03
64|Gd|Gadolinio|157.25|3.3e-7|0.15
65|Tb|Terbio|158.93|6.0e-8|0.07
66|Dy|Disprosio|162.50|4.0e-7|0.12
67|Ho|Olmio|164.93|8.9e-8|0.08
68|Er|Erbio|167.26|2.5e-7|0.15
69|Tm|Tulio|168.93|3.8e-8|0.13
70|Yb|Itterbio|173.05|2.5e-7|0.4
71|Lu|Lutezio|174.97|3.7e-8|0.2
72|Hf|Afnio|178.49|1.5e-7|0.55
73|Ta|Tantalio|180.95|3.8e-8|0.4
74|W|Tungsteno|183.84|1.3e-7|0.6
75|Re|Renio|186.21|5.0e-8|0.08
76|Os|Osmio|190.23|6.7e-7|0.1
77|Ir|Iridio|192.22|6.6e-7|0.02
78|Pt|Platino|195.08|1.34e-6|0.05
79|Au|Oro|196.97|1.9e-7|0.05
80|Hg|Mercurio|200.59|3.4e-7|0.6
81|Tl|Tallio|204.38|1.9e-7|0.75
82|Pb|Piombo|207.2|3.1e-6|0.8
83|Bi|Bismuto|208.98|1.4e-7|0.2
84|Po|Polonio|209|T
85|At|Astato|210|T
86|Rn|Radon|222|T
87|Fr|Francio|223|T
88|Ra|Radio|226|T
89|Ac|Attinio|227|T
90|Th|Torio|232.04|4.5e-8|0
91|Pa|Protoattinio|231.04|T
92|U|Uranio|238.03|1.8e-8|0
93|Np|Nettunio|237|T
94|Pu|Plutonio|244|T
95|Am|Americio|243|A
96|Cm|Curio|247|A
97|Bk|Berkelio|247|A
98|Cf|Californio|251|A
99|Es|Einsteinio|252|A
100|Fm|Fermio|257|A
101|Md|Mendelevio|258|A
102|No|Nobelio|259|A
103|Lr|Laurenzio|266|A
104|Rf|Rutherfordio|267|A
105|Db|Dubnio|268|A
106|Sg|Seaborgio|269|A
107|Bh|Bohrio|270|A
108|Hs|Hassio|277|A
109|Mt|Meitnerio|278|A
110|Ds|Darmstadtio|281|A
111|Rg|Roentgenio|282|A
112|Cn|Copernicio|285|A
113|Nh|Nihonio|286|A
114|Fl|Flerovio|289|A
115|Mc|Moscovio|290|A
116|Lv|Livermorio|293|A
117|Ts|Tennesso|294|A
118|Og|Oganesson|294|A`;
const ELEM=[null];
for(const line of ELEM_RAW.split('\n')){const f=line.split('|');const Z=+f[0];const e={Z,s:f[1],n:f[2],m:+f[3],ab:null,sf:null,kind:'nat'};
 if(f[4]==='T')e.kind='trace';else if(f[4]==='A')e.kind='synth';else{e.ab=+f[4];if(f[5]!==undefined)e.sf=+f[5];}
 if(e.kind==='nat'){if(Z<=2)e.ch='bb';else if(Z<=5)e.ch='cr';else if(Z<=9)e.ch='star';else if(Z<=30)e.ch='sn';else e.ch=e.sf>=0.5?'s':'r';}else e.ch=e.kind;
 ELEM.push(e);}
// posizione nella tavola periodica (riga, colonna); lantanidi e attinidi nelle righe 9 e 10
(function(){const P=[[1,1],[1,18]];for(let Z=1;Z<=118;Z++){const e=ELEM[Z];let r,c;
 if(Z===1){r=1;c=1;}else if(Z===2){r=1;c=18;}else if(Z<=4){r=2;c=Z-2;}else if(Z<=10){r=2;c=Z+8;}else if(Z<=12){r=3;c=Z-10;}else if(Z<=18){r=3;c=Z;}
 else if(Z<=36){r=4;c=Z-18;}else if(Z<=54){r=5;c=Z-36;}else if(Z<=56){r=6;c=Z-54;}else if(Z<=71){r=9;c=Z-54;}else if(Z<=86){r=6;c=Z-68;}
 else if(Z<=88){r=7;c=Z-86;}else if(Z<=103){r=10;c=Z-86;}else{r=7;c=Z-100;}e.r=r;e.c=c;}})();
// frazioni di massa solari
const SOLAR=(function(){let tot=0;const x=new Float64Array(119);for(let Z=1;Z<=118;Z++){const e=ELEM[Z];if(e.ab){x[Z]=e.ab*e.m;tot+=x[Z];}}for(let Z=1;Z<=118;Z++)x[Z]/=tot;
 const sum=(a,b)=>{let s=0;for(let Z=a;Z<=b;Z++)s+=x[Z];return s;};
 let sS=0,sR=0;for(let Z=31;Z<=92;Z++){const e=ELEM[Z];if(e.ab){sS+=x[Z]*e.sf;sR+=x[Z]*(1-e.sf);}}
 return{x,alpha:sum(10,22),fePeak:sum(23,30),cno:x[6]+x[7]+x[8],libeb:sum(3,5),sTot:sS,rTot:sR,liPrim:2.6e-9};})();
// abbondanze di tutti gli elementi a partire dai canali seguiti dalla simulazione
// b = {H,He,C,N,O,Mg(gruppo alfa),Fe(picco del ferro),s,r,L} con s, r, L in unità solari
function elementMasses(b){const x=SOLAR.x,out=new Float64Array(119).fill(NaN);
 for(let Z=1;Z<=118;Z++){const e=ELEM[Z];if(e.kind!=='nat')continue;let v=0;
  if(Z===1)v=b.H;else if(Z===2)v=b.He;else if(Z===3)v=SOLAR.liPrim+b.L*x[3];else if(Z<=5)v=b.L*x[Z];
  else if(Z===6)v=b.C;else if(Z===7)v=b.N;else if(Z===8)v=b.O;else if(Z===9)v=b.N*x[9]/x[7];
  else if(Z<=22)v=b.Mg*x[Z]/SOLAR.alpha;else if(Z<=30)v=b.Fe*x[Z]/SOLAR.fePeak;else v=(b.s*e.sf+b.r*(1-e.sf))*x[Z];
  out[Z]=Math.max(0,v);}
 return out;}
if(typeof window!=='undefined'){window.ELEM=ELEM;window.SOLAR=SOLAR;window.elementMasses=elementMasses;}
if(typeof module!=='undefined')module.exports={ELEM,SOLAR,elementMasses};
