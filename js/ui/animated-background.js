(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "fondo-animado";
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "45",
    opacity: "0.16"
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ancho = 0;
  let alto = 0;
  let escala = 1;
  let particulas = [];
  const colores = ["11,79,113", "13,120,159", "187,30,57", "68,146,176"];

  function redimensionar() {
    escala = Math.min(window.devicePixelRatio || 1, 2);
    ancho = window.innerWidth;
    alto = window.innerHeight;
    canvas.width = Math.floor(ancho * escala);
    canvas.height = Math.floor(alto * escala);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    const cantidad = Math.max(16, Math.min(36, Math.floor(ancho / 42)));
    particulas = Array.from({ length: cantidad }, (_, i) => ({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      r: 2 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 0.34,
      vy: (Math.random() - 0.5) * 0.34,
      color: colores[i % colores.length],
      fase: Math.random() * Math.PI * 2
    }));
  }

  function dibujar(tiempo = 0) {
    ctx.clearRect(0, 0, ancho, alto);
    particulas.forEach((p, indice) => {
      if (!reducir) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = ancho + 20;
        if (p.x > ancho + 20) p.x = -20;
        if (p.y < -20) p.y = alto + 20;
        if (p.y > alto + 20) p.y = -20;
      }
      const pulso = reducir ? 1 : 1 + Math.sin(tiempo / 1300 + p.fase) * 0.22;
      const radio = p.r * pulso;
      const gradiente = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radio * 4.8);
      gradiente.addColorStop(0, `rgba(${p.color},0.82)`);
      gradiente.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = gradiente;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radio * 4.8, 0, Math.PI * 2);
      ctx.fill();
      for (let j = indice + 1; j < particulas.length; j++) {
        const q = particulas[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const distancia = Math.hypot(dx, dy);
        if (distancia < 150) {
          ctx.strokeStyle = `rgba(11,79,113,${0.13 * (1 - distancia / 150)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    });
    if (!reducir) requestAnimationFrame(dibujar);
  }

  window.addEventListener("resize", redimensionar);
  redimensionar();
  if (reducir) dibujar();
  else requestAnimationFrame(dibujar);
})();
