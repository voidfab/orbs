
    const canvas = document.getElementById('orbCanvas');
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      canvas.width = Math.round(innerWidth * DPR);
      canvas.height = Math.round(innerHeight * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    addEventListener('resize', resize);
    resize();

    window.isRemoteSpeaking = false;
    window.isUserSpeaking = false;
    window.isDisconnected = false;
    window.remoteColor = null;

    const lerp = (a, b, t) => (1 - t) * a + t * b;
    const particles = Array.from({ length: 60 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 40 + 20,
      speed: Math.random() * 0.02 + 0.01,
      size: Math.random() * 3 + 1,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.05 + 0.02
    }));

    let currentR1 = 0, currentG1 = 240, currentB1 = 255;
    let currentR2 = 0, currentG2 = 90, currentB2 = 158;
    let currentScale = 1, currentSpeedMult = 1, corePulse = 0;
    let activeStyle = 'pulse';

    function resolveTarget() {
      const now = performance.now();
      if (window.isDisconnected) {
        return { c1:{r:255,g:77,b:77}, c2:{r:138,g:0,b:0}, scale:0.8, speedMult:1, particleColor:'rgba(255,100,100,0.5)' };
      }
      if (window.isRemoteSpeaking && window.isUserSpeaking) {
        return { c1:{r:255,g:215,b:0}, c2:{r:180,g:100,b:0}, scale:1.4 + Math.sin(now/50)*0.15, speedMult:4, particleColor:'rgba(255,215,0,0.8)' };
      }
      if (window.isRemoteSpeaking) {
        return { c1:{r:255,g:0,b:255}, c2:{r:115,g:0,b:140}, scale:1.3 + Math.sin(now/100)*0.1, speedMult:3, particleColor:'rgba(255,0,255,0.6)' };
      }
      if (window.isUserSpeaking) {
        return { c1:{r:0,g:255,b:255}, c2:{r:0,g:100,b:255}, scale:1.2 + Math.sin(now/150)*0.05, speedMult:2, particleColor:'rgba(100,255,255,0.8)' };
      }
      return { c1:{r:0,g:200,b:100}, c2:{r:0,g:90,b:50}, scale:1.0, speedMult:1, particleColor:'rgba(100,255,150,0.3)' };
    }

    const STYLES = {
      aurora(ctx, cx, cy, minDim, S) {
        const coreSize = minDim * 0.15 * S.scale;
        const maxRadius = (minDim / 2) * 0.95;
        const aura = ctx.createRadialGradient(cx, cy, coreSize * 0.5, cx, cy, maxRadius);
        aura.addColorStop(0, `rgba(${S.r1},${S.g1},${S.b1},0.6)`);
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, innerWidth, innerHeight);
        const scaleFactor = minDim / 100;
        for (const p of particles) {
          p.angle += p.speed * S.speedMult;
          p.wobble += p.wobbleSpeed * S.speedMult;
          let r = p.radius * scaleFactor * 0.8;
          if (window.isUserSpeaking) r += 10 * scaleFactor;
          if (window.isRemoteSpeaking) r += Math.sin(p.wobble) * 10 * scaleFactor;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(p.angle) * r + Math.cos(p.wobble) * 5, cy + Math.sin(p.angle) * r + Math.sin(p.wobble) * 5, p.size * (window.isRemoteSpeaking ? 1.5 : 1), 0, Math.PI * 2);
          ctx.fillStyle = S.particleColor;
          ctx.fill();
        }
        const core = ctx.createRadialGradient(cx-coreSize*0.3, cy-coreSize*0.3, 0, cx, cy, coreSize);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.2, `rgb(${S.r1},${S.g1},${S.b1})`);
        core.addColorStop(1, `rgb(${S.r2},${S.g2},${S.b2})`);
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize + Math.sin(S.breathe)*0.5, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      },
      minimal(ctx, cx, cy, minDim, S) {
        const coreSize = minDim * 0.20 * S.scale;
        const halo = ctx.createRadialGradient(cx, cy, coreSize * 0.4, cx, cy, coreSize * 2.2);
        halo.addColorStop(0, `rgba(${S.r1},${S.g1},${S.b1},0.55)`);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize * 2.2, 0, Math.PI * 2);
        ctx.fill();
        const core = ctx.createRadialGradient(cx-coreSize*0.3, cy-coreSize*0.3, 0, cx, cy, coreSize);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(1, `rgb(${S.r1},${S.g1},${S.b1})`);
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize + Math.sin(S.breathe), 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      },
      pulse(ctx, cx, cy, minDim, S) {
        const base = minDim * 0.10;
        const maxR = (minDim / 2) * 0.9;
        for (let i = 0; i < 4; i++) {
          const phase = (S.t / 900 + i / 4) % 1;
          const r = base + phase * (maxR - base);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${S.r1},${S.g1},${S.b1},${(1 - phase) * 0.5 * S.scale})`;
          ctx.lineWidth = 2 * (1 - phase) + 0.5;
          ctx.stroke();
        }
        const core = ctx.createRadialGradient(cx-base*0.3, cy-base*0.3, 0, cx, cy, base * S.scale);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(1, `rgb(${S.r1},${S.g1},${S.b1})`);
        ctx.beginPath();
        ctx.arc(cx, cy, base * S.scale, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      }
    };

    function frame(now) {
      const target = resolveTarget();
      const k = 0.04;
      currentR1 = lerp(currentR1, target.c1.r, k);
      currentG1 = lerp(currentG1, target.c1.g, k);
      currentB1 = lerp(currentB1, target.c1.b, k);
      currentR2 = lerp(currentR2, target.c2.r, k);
      currentG2 = lerp(currentG2, target.c2.g, k);
      currentB2 = lerp(currentB2, target.c2.b, k);
      currentScale = lerp(currentScale, target.scale, k * 1.5);
      currentSpeedMult = lerp(currentSpeedMult, target.speedMult, 0.05);
      corePulse += 0.05;
      const S = {
        r1: Math.round(currentR1), g1: Math.round(currentG1), b1: Math.round(currentB1),
        r2: Math.round(currentR2), g2: Math.round(currentG2), b2: Math.round(currentB2),
        scale: currentScale, speedMult: currentSpeedMult,
        particleColor: target.particleColor, breathe: Math.sin(corePulse) * 2, t: now
      };
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const minDim = Math.min(innerWidth, innerHeight) * 0.65;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      STYLES[activeStyle](ctx, cx, cy, minDim, S);
      requestAnimationFrame(frame);
    }
    frame(performance.now());
    requestAnimationFrame(frame);

    const styleEl = document.getElementById('style');
    styleEl.addEventListener('change', () => { activeStyle = styleEl.value; });
    function setTalk(user, remote, dead) {
      window.isUserSpeaking = user;
      window.isRemoteSpeaking = remote;
      window.isDisconnected = dead;
      for (const id of ['user','remote','both','idle','drop']) document.getElementById(id).classList.remove('on');
      if (dead) document.getElementById('drop').classList.add('on');
      else if (user && remote) document.getElementById('both').classList.add('on');
      else if (user) document.getElementById('user').classList.add('on');
      else if (remote) document.getElementById('remote').classList.add('on');
      else document.getElementById('idle').classList.add('on');
    }
    document.getElementById('user').onclick = () => setTalk(true, false, false);
    document.getElementById('remote').onclick = () => setTalk(false, true, false);
    document.getElementById('both').onclick = () => setTalk(true, true, false);
    document.getElementById('idle').onclick = () => setTalk(false, false, false);
    document.getElementById('drop').onclick = () => setTalk(false, false, true);
  