/**
 * ActivityEngine Confetti & Particle Effects (Pure Canvas)
 */
class ParticleEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animId = null;
    this.init();
  }

  init() {
    let existing = document.getElementById('engine-particle-canvas');
    if (existing) {
      this.canvas = existing;
      this.ctx = this.canvas.getContext('2d');
      return;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'engine-particle-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '99999';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  confettiBurst(originX, originY, count = 70) {
    const x = originX !== undefined ? originX : window.innerWidth / 2;
    const y = originY !== undefined ? originY : window.innerHeight / 2;
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#eab308'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 12;
      this.particles.push({
        type: 'confetti',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        gravity: 0.25,
        drag: 0.96,
        life: 1
      });
    }

    if (!this.animId) this.animate();
  }

  floatingText(x, y, text, color = '#10b981') {
    this.particles.push({
      type: 'text',
      x: x || window.innerWidth / 2,
      y: y || window.innerHeight / 2,
      text: text,
      color: color,
      vy: -2.5,
      opacity: 1,
      scale: 1.2,
      life: 1
    });
    if (!this.animId) this.animate();
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'confetti') {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= 0.012;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.life);
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        this.ctx.restore();
      } else if (p.type === 'text') {
        p.y += p.vy;
        p.life -= 0.02;

        this.ctx.save();
        this.ctx.font = 'bold 24px "Inter", system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
        this.ctx.shadowBlur = 4;
        this.ctx.globalAlpha = Math.max(0, p.life);
        this.ctx.fillText(p.text, p.x, p.y);
        this.ctx.restore();
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.animId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

window.ParticleEngine = ParticleEngine;
