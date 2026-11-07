/* videos de recorrido: se cargan al acercarse y solo reproducen los más visibles */
(function(){
  var vs=[].slice.call(document.querySelectorAll('video[data-src]')).filter(function(v){return !v.closest('.reel');});
  if(!vs.length)return;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window))return; /* queda el poster */
  var ratio=new Map(),MAX=4;
  function update(){
    var mid=innerHeight/2,d=new Map();
    var vis=vs.filter(function(v){
      if((ratio.get(v)||0)<=0.2)return false;
      var r=v.getBoundingClientRect();d.set(v,Math.abs(r.top+r.height/2-mid));return true;
    }).sort(function(a,b){return d.get(a)-d.get(b);});
    var on=vis.slice(0,MAX);
    vs.forEach(function(v){
      if(on.indexOf(v)>-1){
        if(!v.getAttribute('src')){v.src=v.getAttribute('data-src');v.load();}
        if(v.paused){var p=v.play();if(p&&p.catch)p.catch(function(){});}
      }else if(!v.paused){try{v.pause();}catch(_){}}
    });
  }
  var io=new IntersectionObserver(function(es){es.forEach(function(e){ratio.set(e.target,e.isIntersecting?e.intersectionRatio:0);});update();},{threshold:[0,.2,.4,.6,.8,1],rootMargin:'80px 0px'});
  vs.forEach(function(v){io.observe(v);});
  var tick=false;addEventListener('scroll',function(){if(tick)return;tick=true;requestAnimationFrame(function(){tick=false;update();});},{passive:true});
})();
