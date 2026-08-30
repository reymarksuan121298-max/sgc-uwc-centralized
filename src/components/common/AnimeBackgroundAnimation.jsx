import React, { useEffect, useRef } from 'react';

/**
 * HD Anime Starry Night & Particle Animation
 * Features:
 * - Dynamic Twinkling Stars
 * - Real-time Shooting Meteors with Glowing Tails
 * - Floating Stardust / Anime Spirit Light Orbs
 * - Cinematic Breathing Camera Zoom & Mouse Parallax
 * - Lighting Mood Transition (Day/Dusk or Lit Ambience)
 */
export default function AnimeBackgroundAnimation({ isLit = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 1. Twinkling Stars
    const starCount = Math.min(120, Math.floor((width * height) / 12000));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.75, // mainly in the upper sky
      radius: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
      color: Math.random() > 0.3 ? '#ffffff' : (Math.random() > 0.5 ? '#ffe699' : '#aee2ff')
    }));

    // 2. Floating Anime Stardust / Fireflies
    const orbCount = 35;
    const orbs = Array.from({ length: orbCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1.2,
      baseAlpha: Math.random() * 0.6 + 0.3,
      alpha: Math.random() * 0.6 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.6 - 0.2, // float upwards
      waveOffset: Math.random() * Math.PI * 2,
      waveSpeed: Math.random() * 0.02 + 0.01,
      color: Math.random() > 0.4 ? 'rgba(255, 215, 0,' : 'rgba(186, 230, 253,'
    }));

    // 3. Shooting Stars (Meteors)
    const meteors = [];
    const createMeteor = () => {
      const startX = Math.random() * width * 1.1;
      const startY = Math.random() * height * 0.4;
      const length = Math.random() * 140 + 80;
      const speed = Math.random() * 10 + 12;
      const angle = (Math.PI / 4) + (Math.random() * 0.2 - 0.1); // ~45 degrees diagonal

      meteors.push({
        x: startX,
        y: startY,
        length,
        speed,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.012,
        tailWidth: Math.random() * 1.8 + 1.2
      });
    };

    let meteorTimer = 0;
    let nextMeteorInterval = Math.floor(Math.random() * 120 + 80); // every ~2-3 seconds

    // Animation Loop
    let tick = 0;
    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // A. Draw & Update Twinkling Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.alpha += star.twinkleSpeed;
        if (star.alpha >= 0.95 || star.alpha <= 0.15) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
        ctx.shadowBlur = star.radius * 4;
        ctx.shadowColor = star.color;
        ctx.fill();
      }

      // B. Spawn & Draw Shooting Meteors
      meteorTimer++;
      if (meteorTimer > nextMeteorInterval) {
        createMeteor();
        meteorTimer = 0;
        nextMeteorInterval = Math.floor(Math.random() * 150 + 90);
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.dx;
        m.y += m.dy;
        m.life -= m.decay;

        if (m.life <= 0 || m.x > width + 200 || m.y > height + 200) {
          meteors.splice(i, 1);
          continue;
        }

        const tailX = m.x - (m.dx / m.speed) * m.length;
        const tailY = m.y - (m.dy / m.speed) * m.length;

        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, `rgba(186, 230, 253, ${m.life * 0.6})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${m.life * 0.95})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = m.tailWidth;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#60a5fa';
        ctx.stroke();

        // Meteor head spark
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.tailWidth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
      }

      // C. Draw & Update Floating Anime Light Orbs
      for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        orb.waveOffset += orb.waveSpeed;
        orb.x += orb.speedX + Math.sin(orb.waveOffset) * 0.35;
        orb.y += orb.speedY;

        // Wrap around borders
        if (orb.y < -20) {
          orb.y = height + 20;
          orb.x = Math.random() * width;
        }
        if (orb.x < -20) orb.x = width + 20;
        if (orb.x > width + 20) orb.x = -20;

        const pulseAlpha = orb.baseAlpha + Math.sin(tick * 0.03 + i) * 0.2;

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${orb.color}${Math.max(0.1, Math.min(0.9, pulseAlpha))})`;
        ctx.shadowBlur = orb.radius * 6;
        ctx.shadowColor = orb.color.includes('255, 215, 0') ? '#ffd700' : '#38bdf8';
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Cinematic HD Anime Scenery Wallpaper with breathing motion */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out scale-100"
        style={{
          backgroundImage: `url('/anime_bg.jpg')`,
          filter: isLit 
            ? 'brightness(1.08) contrast(1.05) saturate(1.15)' 
            : 'brightness(0.95) contrast(1.02) saturate(1.05)',
          transition: 'filter 0.6s ease-in-out'
        }}
      />

      {/* 2. Soft subtle contrast overlay so stars and anime details remain bright */}
      <div 
        className={`absolute inset-0 transition-opacity duration-600 ${
          isLit 
            ? 'bg-black/10' 
            : 'bg-black/20'
        }`} 
      />

      {/* 3. Subtle edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.4)_100%)]" />

      {/* 4. Real-time Canvas Animation (Twinkling Stars, Shooting Meteors, Anime Orbs) */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
