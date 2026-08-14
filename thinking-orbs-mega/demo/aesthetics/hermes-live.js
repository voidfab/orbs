function bootHermes() {
  const c = document.getElementById('c');
  const phaseEl = document.getElementById('phase');
  const levelEl = document.getElementById('level');
  const chip = document.getElementById('chip');
  if (!c || !phaseEl || !levelEl || !chip) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const t0 = performance.now();

  function paint(now) {
    const phase = phaseEl.value;
    const lv = Number(levelEl.value);
    const speaking = phase === 'speaking';
    const listening = phase === 'listening';
    const W = Math.round(c.clientWidth || 320);
    const size = Math.round(W * (speaking ? 0.52 : listening ? 0.48 : 0.44));
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(W * dpr);
      c.style.width = W + 'px';
      c.style.height = W + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = ((now || performance.now()) - t0) / 1000;
    let energy = 0.2;
    let speed = 1;
    if (listening) {
      energy = 0.34 + lv * 0.5;
      speed = 1.08;
    } else if (phase === 'thinking') {
      energy = 0.28;
      speed = 1.38;
    } else {
      energy = 0.48 + lv * 0.36;
      speed = 1.18;
    }
    const breathe = 1 + Math.sin(t * 2 * speed) * (0.028 + energy * 0.02);
    const R = size * 0.5 * breathe;
    const cx = W / 2;
    const cy = W / 2;
    ctx.clearRect(0, 0, W, W);
    const wash = ctx.createRadialGradient(cx, cy, R * 0.12, cx, cy, R * 1.75);
    wash.addColorStop(0, `rgba(170,205,255,${0.28 + energy * 0.18})`);
    wash.addColorStop(0.5, `rgba(130,175,250,${0.1 + energy * 0.08})`);
    wash.addColorStop(1, 'rgba(80,120,200,0)');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.75, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.3, R * 0.04, cx, cy + R * 0.08, R);
    body.addColorStop(0, 'rgba(255,255,255,1)');
    body.addColorStop(0.28, 'rgba(235,242,255,0.98)');
    body.addColorStop(0.55, 'rgba(180,210,255,0.95)');
    body.addColorStop(0.82, `rgba(130,175,250,${0.9 + energy * 0.05})`);
    body.addColorStop(1, `rgba(95,145,235,${0.55 + energy * 0.12})`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.2, cy - R * 0.26, R * 0.14, R * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();
    chip.textContent = phase;
    chip.className = 'chip ' + (listening ? 'listen' : phase === 'thinking' ? 'think' : 'speak');
    requestAnimationFrame(paint);
  }

  paint(performance.now());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHermes);
} else {
  bootHermes();
}
