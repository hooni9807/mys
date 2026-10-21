/* A choreographed preview using the game's character, clothing, racket and court renderers. */
(() => {
  const duration = .86, serveAt = 1.6;
  const cast = ['yunhwan', 'jongryeong'];
  const outfits = [{top:'studio_arcade',bot:'studio_arcade'}, {top:'studio_club',bot:'studio_club'}];
  const previewView = {tw:.25,persp:.18,base:.61,dh:.24,zh:.31};
  let background = null;
  const mix = (a,b,t) => a+(b-a)*t;
  const swingAt = n => serveAt + n*duration;
  const shot = n => n === 0 ? 'serve' : n%6 === 4 ? 'smash' : n%3 === 2 ? 'back' : 'drive';

  window.drawPrologueMatch = (canvas, seconds) => {
    if (!cast.every(k => FACES[k]?.complete && FACES[k].naturalWidth)) return false;
    const g = canvas.getContext('2d'), d = Math.min(devicePixelRatio || 1, 2);
    const width=960,height=640;
    if(canvas.width!==width*d || canvas.height!==height*d){canvas.width=width*d;canvas.height=height*d;}
    const saved={ctx,W,H,view,time,mode,yaw:{...YAW},tp:VIEWS.tp,arenaCache};
    g.setTransform(d,0,0,d,0,0);g.save();
    try {
      ctx=g;W=width;H=height;view='tp';time=seconds;mode='match';VIEWS.tp=previewView;
      const yaw=-.62;
      Object.assign(YAW,{a:yaw,c:Math.cos(yaw),s:Math.sin(yaw),px:0,py:1.37});
      arenaCache=background;
      g.clearRect(0,0,W,H);g.fillStyle='#0b0818';g.fillRect(0,0,W,H);
      g.drawImage(arenaBg(),0,0,W,H);background=arenaCache;
      const glow=g.createRadialGradient(W*.5,H*.42,10,W*.5,H*.42,W*.6);
      glow.addColorStop(0,'#8971ff18');glow.addColorStop(1,'#07071499');g.fillStyle=glow;g.fillRect(0,0,W,H);
      // A very small camera drift; the projection is identical for the ball and both rackets.
      const zoom=.94+Math.sin(seconds*.23)*.012;
      g.translate(W/2,H*.55);g.scale(zoom,zoom);g.translate(-W/2,-H*.55);
      g.strokeStyle='#c0b6ff18';g.lineWidth=1;
      for(let x=-2;x<=2;x+=.5){const a=project(x,-1,-.76),b=project(x,3.7,-.76);line(a,b,'#b5adff16',1);}
      for(let y=-1;y<=3.7;y+=.5)line(project(-2,y,-.76),project(2,y,-.76),'#b5adff16',1);
      g.font='900 italic 72px Arial';g.textAlign='center';g.fillStyle='#e7e0ff0c';g.fillText('SPP',W*.5,130);

      function athlete(i,t,measure=false,contactIndex=null){
        const n=contactIndex ?? Math.floor((t-serveAt+1e-9)/duration);
        let own=n-((n-i)%2+2)%2;
        const future=own+2, until=swingAt(future)-t;
        let since=t-swingAt(own)+.05, stroke=shot(own), prep=null;
        if(own<0){since=9;stroke='serve';}
        if(until>0 && until<.28){stroke=shot(future);prep=(1-until/.28)*.4;}
        if(contactIndex!==null){since=.05;stroke=shot(contactIndex);prep=null;}
        const step=(t*2.7+i)%2, lateral=.27*Math.sin(t*1.35+i*2), y=i===0?-.54:3.24;
        const feet=project(lateral,y,-.76), scale=figScale(feet), leg=legPx(feet), side=i===0?1:-1;
        const st={x:feet.x,vx:28*Math.cos(t*1.35+i*2),crouch:.24,legLen:leg,tall:BODY_TALL,
          ho:.07*Math.sin(t*3),hn:0,lean:0,holding:i===0&&t<.5,tossing:i===0&&t>=.5&&t<serveAt,
          feet:{'-1':{x:feet.x-24*scale,t:step<1?step:1},'1':{x:feet.x+24*scale,t:step>=1?step-1:1}}};
        const target={x:feet.x+side*44*scale,y:feet.y-leg-30*scale};
        return person(st,feet.y-leg,target,side*.3,withFit(LOOKS[cast[i]],outfits[i]),scale,'shake',i===0?BLACK:RED,side,stroke,since,prep,measure);
      }
      athlete(1,seconds);
      drawTable();
      athlete(0,seconds);
      const n=Math.max(0,Math.floor((seconds-serveAt+1e-9)/duration)),u=Math.max(0,Math.min(1,(seconds-swingAt(n))/duration));
      const a=athlete(n%2,swingAt(n),true,n),b=athlete((n+1)%2,swingAt(n+1),true,n+1);
      const near=n%2===0;
      const bounce=project(.12*Math.sin(n*1.7),near?2.22:.52,0);
      const ownBounce=project(0,.48,0);
      const points=n===0?[[0,a],[.22,ownBounce],[.76,bounce],[1,b]]:[[0,a],[.72,bounce],[1,b]];
      function ballPoint(p){
        const j=points.findIndex((pt,k)=>k<points.length-1&&p<=points[k+1][0]);
        const [lo,A]=points[Math.max(0,j)],[hi,B]=points[Math.max(0,j)+1],v=(p-lo)/(hi-lo);
        const arc=(n===0&&j===1?44:j===0?38:9);
        return {x:mix(A.x,B.x,v),y:mix(A.y,B.y,v)-arc*4*v*(1-v)};
      }
      let p;
      if(seconds<serveAt){p={x:a.x,y:a.y-94*Math.sin(Math.PI*Math.max(0,seconds-.4)/(serveAt-.4))};}
      else{
        p=ballPoint(u);
        for(let j=7;j>0;j--){const q=ballPoint(Math.max(0,u-j*.018));g.beginPath();g.arc(q.x,q.y,4*(1-j/10),0,Math.PI*2);g.fillStyle=`rgba(199,255,132,${(1-j/8)*.38})`;g.fill();}
        if(u<.18){g.beginPath();g.arc(a.x,a.y,10+u*90,0,Math.PI*2);g.strokeStyle=`rgba(207,255,151,${1-u/.18})`;g.lineWidth=2;g.stroke();}
        const bouncePhase=n===0?.76:.72;
        if(Math.abs(u-bouncePhase)<.07){g.beginPath();g.ellipse(bounce.x,bounce.y,13,4,0,0,Math.PI*2);g.strokeStyle='#edffc4';g.lineWidth=2;g.stroke();}
      }
      g.shadowColor='#e5ffd0';g.shadowBlur=14;g.beginPath();g.arc(p.x,p.y,5.8,0,Math.PI*2);g.fillStyle='#fffef3';g.fill();g.shadowBlur=0;
      line({x:p.x-2,y:p.y-2},{x:p.x+2,y:p.y+2},'#9cb682',1.3);
      canvas.dataset.rally=String(seconds<serveAt?0:n+1);
      canvas.dataset.shot=seconds<serveAt?'SERVICE':shot(n).toUpperCase();
      return true;
    } finally {
      ctx=saved.ctx;W=saved.W;H=saved.H;view=saved.view;time=saved.time;mode=saved.mode;
      VIEWS.tp=saved.tp;Object.assign(YAW,saved.yaw);arenaCache=saved.arenaCache;g.restore();
    }
  };
})();
