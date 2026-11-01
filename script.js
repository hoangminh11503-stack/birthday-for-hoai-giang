/**
 * ===================================================================
 * HAPPY BIRTHDAY HOÀI GIANG - LUXURY GREETING CARD
 * Chức năng:
 * 1. Cánh hoa hồng 3D & Hoa hồng nở bay lượn trên Canvas
 * 2. Đàn bươm bướm 3D ngũ sắc vỗ cánh lượn quanh màn hình
 * 3. Bụi sao & Bokeh vàng lấp lánh (kèm vệt lấp lánh khi rê chuột/chạm)
 * 4. Pháo hoa Confetti hoàng gia chúc mừng
 * 5. Bánh sinh nhật tương tác (thổi nến, khói bay & ước nguyện)
 * 6. Âm thanh du dương (ưu tiên file assets/birthday.wav, fallback synth)
 * ===================================================================
 */

(function () {
  'use strict';

  // --- CÁC PHẦN TỬ DOM ---
  const coverScreen = document.getElementById('coverScreen');
  const mainCardContainer = document.getElementById('mainCardContainer');
  const openCardBtn = document.getElementById('openCardBtn');
  const teaserBox = document.getElementById('teaserBox');
  const cardWrapper = document.getElementById('cardWrapper');
  
  const petalCanvas = document.getElementById('petalCanvas');
  const sparkleCanvas = document.getElementById('sparkleCanvas');
  const butterflyGarden = document.getElementById('butterflyGarden');

  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const bgMusic = document.getElementById('bgMusic');

  const cakeSection = document.getElementById('cakeSection');
  const blowCandleBtn = document.getElementById('blowCandleBtn');
  const blowCandleText = document.getElementById('blowCandleText');
  const wishToast = document.getElementById('wishToast');
  const flames = [
    document.getElementById('flame1'),
    document.getElementById('flame2'),
    document.getElementById('flame3')
  ];
  const smokes = [
    document.getElementById('smoke1'),
    document.getElementById('smoke2'),
    document.getElementById('smoke3')
  ];

  const moreButterfliesBtn = document.getElementById('moreButterfliesBtn');
  const fireConfettiBtn = document.getElementById('fireConfettiBtn');
  const replayBtn = document.getElementById('replayBtn');

  // --- BIẾN TRẠNG THÁI ---
  let isCardOpened = false;
  let isMusicPlaying = false;
  let candlesLit = true;
  let audioContext = null;
  let synthTimeout = null;

  // ===================================================================
  // 1. ÂM THANH & WEB AUDIO API DỰ PHÒNG
  // ===================================================================
  function initAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  // Âm thanh chuông gió huyền diệu khi mở thiệp hoặc bấm nút
  function playMagicalChime() {
    initAudioContext();
    if (!audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    const now = audioContext.currentTime;

    notes.forEach((freq, idx) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 1.2);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 1.3);
    });
  }

  // Tiếng phù gió khi thổi nến
  function playBlowingSound() {
    initAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.5);

    setTimeout(() => {
      playMagicalChime();
    }, 250);
  }

  // Khởi động phát nhạc nền
  function startMusic() {
    initAudioContext();
    if (bgMusic) {
      bgMusic.volume = 0.75;
      const playPromise = bgMusic.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isMusicPlaying = true;
          updateMusicButtonUI();
        }).catch(err => {
          console.log("Audio file autoplay note:", err);
          startSynthesizedMusic();
        });
      }
    } else {
      startSynthesizedMusic();
    }
  }

  function pauseMusic() {
    if (bgMusic && !bgMusic.paused) {
      bgMusic.pause();
    }
    if (synthTimeout) {
      clearTimeout(synthTimeout);
      synthTimeout = null;
    }
    isMusicPlaying = false;
    updateMusicButtonUI();
  }

  function toggleMusic() {
    if (isMusicPlaying) {
      pauseMusic();
    } else {
      if (bgMusic && bgMusic.paused) {
        bgMusic.play().then(() => {
          isMusicPlaying = true;
          updateMusicButtonUI();
        }).catch(() => {
          startSynthesizedMusic();
        });
      } else {
        startSynthesizedMusic();
      }
    }
  }

  function updateMusicButtonUI() {
    if (isMusicPlaying) {
      musicToggleBtn.classList.add('playing');
      musicToggleBtn.title = "Đang phát nhạc - Nhấn để tắt";
    } else {
      musicToggleBtn.classList.remove('playing');
      musicToggleBtn.title = "Đã tắt nhạc - Nhấn để bật";
    }
  }

  // Nhạc hộp âm nhạc dự phòng (Happy Birthday Music Box)
  function startSynthesizedMusic() {
    initAudioContext();
    if (!audioContext) return;
    isMusicPlaying = true;
    updateMusicButtonUI();

    const melody = [
      { f: 261.63, d: 0.38 }, { f: 261.63, d: 0.38 }, { f: 293.66, d: 0.75 }, { f: 261.63, d: 0.75 }, { f: 349.23, d: 0.75 }, { f: 329.63, d: 1.3 },
      { f: 261.63, d: 0.38 }, { f: 261.63, d: 0.38 }, { f: 293.66, d: 0.75 }, { f: 261.63, d: 0.75 }, { f: 392.00, d: 0.75 }, { f: 349.23, d: 1.3 },
      { f: 261.63, d: 0.38 }, { f: 261.63, d: 0.38 }, { f: 523.25, d: 0.75 }, { f: 440.00, d: 0.75 }, { f: 349.23, d: 0.75 }, { f: 329.63, d: 0.75 }, { f: 293.66, d: 1.1 },
      { f: 466.16, d: 0.38 }, { f: 466.16, d: 0.38 }, { f: 440.00, d: 0.75 }, { f: 349.23, d: 0.75 }, { f: 392.00, d: 0.75 }, { f: 349.23, d: 1.5 }
    ];

    let noteIdx = 0;
    function playNextNote() {
      if (!isMusicPlaying) return;
      const note = melody[noteIdx];
      const now = audioContext.currentTime;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f * 1.5, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now);
      osc.stop(now + note.d);

      noteIdx = (noteIdx + 1) % melody.length;
      synthTimeout = setTimeout(playNextNote, note.d * 1000 * 0.92);
    }
    playNextNote();
  }

  musicToggleBtn.addEventListener('click', toggleMusic);

  // ===================================================================
  // 2. CÁNH HOA HỒNG & HOA HỒNG 3D TRÊN CANVAS (3D PETALS & ROSES)
  // ===================================================================
  const petalCtx = petalCanvas.getContext('2d');
  let petals = [];
  const MAX_PETALS = 42;

  const petalColors = [
    { inner: '#ff2d60', outer: '#b30938', shadow: '#6b001e' }, // Velvet Crimson
    { inner: '#ff6ea7', outer: '#e02874', shadow: '#99114b' }, // Rose Pink
    { inner: '#ff9ebb', outer: '#ff4d8b', shadow: '#b81452' }, // Soft Blush
    { inner: '#ffd285', outer: '#e65c00', shadow: '#8a2b00' }, // Gold Rose
    { inner: '#f06292', outer: '#ad1457', shadow: '#6a0033' }  // Deep Magenta
  ];

  class FloatingRoseItem {
    constructor(isBurst = false) {
      this.reset(isBurst);
    }

    reset(isBurst = false) {
      // 1 trong 5 hạt sẽ là cả đóa hoa hồng nhỏ nở rực rỡ, còn lại là cánh hoa hồng
      this.isWholeRose = Math.random() < 0.22;

      this.x = isBurst 
        ? window.innerWidth * 0.5 + (Math.random() - 0.5) * 220 
        : Math.random() * window.innerWidth;
      this.y = isBurst 
        ? window.innerHeight * 0.5 + (Math.random() - 0.5) * 120 
        : -60 - Math.random() * 200;
      
      this.size = this.isWholeRose 
        ? (14 + Math.random() * 12) 
        : (12 + Math.random() * 18);

      this.speedY = isBurst ? -(Math.random() * 7 + 4) : (1.1 + Math.random() * 1.8);
      this.speedX = isBurst ? (Math.random() - 0.5) * 12 : ((Math.random() - 0.5) * 1.5);
      
      // Xoay 3D
      this.angleX = Math.random() * Math.PI * 2;
      this.angleY = Math.random() * Math.PI * 2;
      this.angleZ = Math.random() * Math.PI * 2;

      this.rotSpeedX = 0.012 + Math.random() * 0.025;
      this.rotSpeedY = 0.012 + Math.random() * 0.025;
      this.rotSpeedZ = 0.008 + Math.random() * 0.02;

      this.swayAngle = Math.random() * Math.PI * 2;
      this.swaySpeed = 0.02 + Math.random() * 0.03;
      this.swayAmplitude = 0.8 + Math.random() * 1.4;

      this.opacity = 0.75 + Math.random() * 0.25;
      this.color = petalColors[Math.floor(Math.random() * petalColors.length)];
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.swayAngle) * this.swayAmplitude;
      this.swayAngle += this.swaySpeed;

      this.angleX += this.rotSpeedX;
      this.angleY += this.rotSpeedY;
      this.angleZ += this.rotSpeedZ;

      if (this.speedY < 1.1) {
        this.speedY += 0.15;
      }
      this.speedX *= 0.98;

      if (this.y > window.innerHeight + 60 || this.x < -100 || this.x > window.innerWidth + 100) {
        this.reset(false);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const scaleX = Math.cos(this.angleX);
      const scaleY = Math.sin(this.angleY);
      ctx.rotate(this.angleZ);
      ctx.scale(scaleX, scaleY);

      ctx.globalAlpha = Math.max(0.18, Math.abs(this.opacity * scaleY));

      if (this.isWholeRose) {
        this.drawBloomingRose(ctx);
      } else {
        this.drawSinglePetal(ctx);
      }

      ctx.restore();
    }

    // Vẽ cánh hoa hồng đơn cong lượn tự nhiên
    drawSinglePetal(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.bezierCurveTo(this.size * 0.8, -this.size * 0.8, this.size * 1.1, this.size * 0.4, 0, this.size);
      ctx.bezierCurveTo(-this.size * 1.1, this.size * 0.4, -this.size * 0.8, -this.size * 0.8, 0, -this.size);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, this.size * 0.1, 0, 0, this.size);
      grad.addColorStop(0, this.color.inner);
      grad.addColorStop(0.7, this.color.outer);
      grad.addColorStop(1, this.color.shadow);
      ctx.fillStyle = grad;
      ctx.fill();

      // Viền cánh hoa nhẹ
      ctx.strokeStyle = 'rgba(255, 235, 200, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Vẽ đóa hoa hồng nở tròn nhiều lớp
    drawBloomingRose(ctx) {
      const r = this.size;
      
      // Lớp cánh ngoài cùng
      ctx.fillStyle = this.color.shadow;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Các cánh hoa xoắn ốc xếp tầng
      const petalsCount = 5;
      for (let i = 0; i < petalsCount; i++) {
        const a = (i * (Math.PI * 2) / petalsCount);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (r * 0.45), Math.sin(a) * (r * 0.45), r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = this.color.outer;
        ctx.fill();
      }

      // Lớp giữa
      for (let i = 0; i < 4; i++) {
        const a = (i * (Math.PI * 2) / 4) + 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (r * 0.25), Math.sin(a) * (r * 0.25), r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = this.color.inner;
        ctx.fill();
      }

      // Nhụy hoa hồng trung tâm phát sáng
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe082';
      ctx.fill();
    }
  }

  function initPetals() {
    petals = [];
    for (let i = 0; i < MAX_PETALS; i++) {
      const item = new FloatingRoseItem(false);
      item.y = Math.random() * window.innerHeight;
      petals.push(item);
    }
  }

  function spawnPetalBurst(count = 25) {
    for (let i = 0; i < count; i++) {
      petals.push(new FloatingRoseItem(true));
    }
  }

  // ===================================================================
  // 3. CANVAS BỤI SAO & BOKEH LẤP LÁNH (SPARKLES & DUST)
  // ===================================================================
  const sparkleCtx = sparkleCanvas.getContext('2d');
  let sparkles = [];
  let mouseTrail = [];

  class SparkleParticle {
    constructor(isCursor = false, x = 0, y = 0) {
      this.isCursor = isCursor;
      this.reset(isCursor, x, y);
    }

    reset(isCursor = false, x = 0, y = 0) {
      if (isCursor) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y + (Math.random() - 0.5) * 20;
        this.size = 2 + Math.random() * 4;
        this.speedX = (Math.random() - 0.5) * 3;
        this.speedY = (Math.random() - 0.5) * 3;
        this.life = 1;
        this.decay = 0.03 + Math.random() * 0.03;
      } else {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.size = 1.2 + Math.random() * 3.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -0.3 - Math.random() * 0.5;
        this.life = Math.random();
        this.decay = 0.008 + Math.random() * 0.012;
      }
      this.rotation = Math.random() * Math.PI;
      this.rotSpeed = 0.02 + Math.random() * 0.04;
      this.color = Math.random() > 0.4 ? '#ffd777' : (Math.random() > 0.5 ? '#ff7eb3' : '#ffffff');
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotSpeed;
      this.life -= this.decay;

      if (this.life <= 0) {
        if (!this.isCursor) {
          this.reset(false);
          this.y = window.innerHeight + 10;
        }
      }
    }

    draw(ctx) {
      if (this.life <= 0) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = Math.max(0, this.life);

      const r = this.size;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(Math.cos(i * Math.PI / 2) * r * 2.2, Math.sin(i * Math.PI / 2) * r * 2.2);
        ctx.lineTo(Math.cos(i * Math.PI / 2 + Math.PI / 4) * (r * 0.45), Math.sin(i * Math.PI / 2 + Math.PI / 4) * (r * 0.45));
      }
      ctx.closePath();
      ctx.fill();

      // Tâm phát sáng
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  }

  function initSparkles() {
    sparkles = [];
    const count = Math.min(50, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < count; i++) {
      sparkles.push(new SparkleParticle(false));
    }
  }

  function addCursorSparkle(x, y) {
    for (let i = 0; i < 2; i++) {
      if (mouseTrail.length < 40) {
        mouseTrail.push(new SparkleParticle(true, x, y));
      }
    }
  }

  window.addEventListener('mousemove', (e) => {
    addCursorSparkle(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      addCursorSparkle(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    petalCanvas.width = w * dpr;
    petalCanvas.height = h * dpr;
    petalCtx.scale(dpr, dpr);

    sparkleCanvas.width = w * dpr;
    sparkleCanvas.height = h * dpr;
    sparkleCtx.scale(dpr, dpr);
  }

  function animateCanvases() {
    petalCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    sparkleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = 0; i < sparkles.length; i++) {
      sparkles[i].update();
      sparkles[i].draw(sparkleCtx);
    }

    for (let i = mouseTrail.length - 1; i >= 0; i--) {
      mouseTrail[i].update();
      mouseTrail[i].draw(sparkleCtx);
      if (mouseTrail[i].life <= 0) {
        mouseTrail.splice(i, 1);
      }
    }

    for (let i = petals.length - 1; i >= 0; i--) {
      petals[i].update();
      petals[i].draw(petalCtx);
      if (petals.length > MAX_PETALS + 45 && petals[i].y > window.innerHeight) {
        petals.splice(i, 1);
      }
    }

    requestAnimationFrame(animateCanvases);
  }

  // ===================================================================
  // 4. BƯƠM BƯỚM 3D ĐỘNG (3D ANIMATED BUTTERFLIES)
  // ===================================================================
  const butterflyPalettes = [
    {
      name: 'rose-morpho',
      wing1: '#ff3377',
      wing2: '#ffa3c8',
      glow: 'rgba(255, 51, 119, 0.6)'
    },
    {
      name: 'golden-emperor',
      wing1: '#ffb300',
      wing2: '#fff275',
      glow: 'rgba(255, 179, 0, 0.65)'
    },
    {
      name: 'violet-fairy',
      wing1: '#9c27b0',
      wing2: '#e1bee7',
      glow: 'rgba(156, 39, 176, 0.6)'
    },
    {
      name: 'cyan-jewel',
      wing1: '#00e5ff',
      wing2: '#b2ebf2',
      glow: 'rgba(0, 229, 255, 0.6)'
    },
    {
      name: 'sunset-ruby',
      wing1: '#ff1744',
      wing2: '#ff8a80',
      glow: 'rgba(255, 23, 68, 0.6)'
    }
  ];

  function createButterflyElement(palette, id) {
    const el = document.createElement('div');
    el.className = 'butterfly';

    // Cánh trái: gốc cánh tại x = 50 (gặp mép phải cánh trái)
    const wingSvgLeft = `
      <svg viewBox="0 0 50 80" class="b-wing-svg">
        <defs>
          <linearGradient id="bgrad-l-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.wing1}"/>
            <stop offset="100%" stop-color="${palette.wing2}"/>
          </linearGradient>
        </defs>
        <path d="M50,40 C50,15 35,0 15,2 C-2,4 0,35 15,45 C2,50 -2,70 12,78 C25,84 45,65 50,40 Z" 
              fill="url(#bgrad-l-${id})" 
              stroke="#ffffff" stroke-width="1.2" opacity="0.95"/>
        <circle cx="22" cy="22" r="3" fill="#ffffff" opacity="0.85"/>
        <circle cx="24" cy="62" r="2.5" fill="#ffffff" opacity="0.85"/>
      </svg>
    `;

    // Cánh phải: gốc cánh tại x = 0 (gặp mép trái cánh phải)
    const wingSvgRight = `
      <svg viewBox="0 0 50 80" class="b-wing-svg">
        <defs>
          <linearGradient id="bgrad-r-${id}" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${palette.wing1}"/>
            <stop offset="100%" stop-color="${palette.wing2}"/>
          </linearGradient>
        </defs>
        <path d="M0,40 C0,15 15,0 35,2 C52,4 50,35 35,45 C48,50 52,70 38,78 C25,84 5,65 0,40 Z" 
              fill="url(#bgrad-r-${id})" 
              stroke="#ffffff" stroke-width="1.2" opacity="0.95"/>
        <circle cx="28" cy="22" r="3" fill="#ffffff" opacity="0.85"/>
        <circle cx="26" cy="62" r="2.5" fill="#ffffff" opacity="0.85"/>
      </svg>
    `;

    el.innerHTML = `
      <div class="butterfly-wings-wrap">
        <div class="b-antennae">
          <span class="antenna antenna-left"></span>
          <span class="antenna antenna-right"></span>
        </div>
        <div class="b-wing b-wing-left">${wingSvgLeft}</div>
        <div class="b-body"></div>
        <div class="b-wing b-wing-right">${wingSvgRight}</div>
      </div>
    `;

    el.style.filter = `drop-shadow(0 0 10px ${palette.glow})`;
    return el;
  }

  let butterflyIdCounter = 0;

  class FlyingButterfly {
    constructor(startBurst = false) {
      butterflyIdCounter++;
      this.id = butterflyIdCounter;
      this.palette = butterflyPalettes[Math.floor(Math.random() * butterflyPalettes.length)];
      this.element = createButterflyElement(this.palette, this.id);
      butterflyGarden.appendChild(this.element);

      this.scale = 0.55 + Math.random() * 0.55;
      this.element.style.transform = `scale(${this.scale})`;

      this.reset(startBurst);
    }

    reset(startBurst = false) {
      if (startBurst) {
        this.x = window.innerWidth * 0.5 + (Math.random() - 0.5) * 140;
        this.y = window.innerHeight * 0.55 + (Math.random() - 0.5) * 90;
        this.targetAngle = Math.random() * Math.PI * 2;
        this.speed = 3.2 + Math.random() * 4.2;
      } else {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
          this.x = Math.random() * window.innerWidth;
          this.y = window.innerHeight + 50;
        } else if (edge === 1) {
          this.x = -60;
          this.y = Math.random() * window.innerHeight;
        } else if (edge === 2) {
          this.x = window.innerWidth + 60;
          this.y = Math.random() * window.innerHeight;
        } else {
          this.x = Math.random() * window.innerWidth;
          this.y = -60;
        }
        this.speed = 1.4 + Math.random() * 1.8;
        this.targetAngle = Math.random() * Math.PI * 2;
      }

      this.angle = this.targetAngle;
      this.wave = Math.random() * Math.PI;
      this.waveSpeed = 0.05 + Math.random() * 0.05;
      this.turnSpeed = 0.03 + Math.random() * 0.03;
      this.timeToTurn = Math.floor(60 + Math.random() * 120);
    }

    update() {
      this.timeToTurn--;
      if (this.timeToTurn <= 0) {
        this.targetAngle += (Math.random() - 0.5) * 1.8;
        this.timeToTurn = Math.floor(60 + Math.random() * 120);
      }

      const diff = this.targetAngle - this.angle;
      this.angle += diff * this.turnSpeed;

      this.wave += this.waveSpeed;
      const waveOffsetX = Math.sin(this.wave) * 1.2;
      const waveOffsetY = Math.cos(this.wave * 1.3) * 1.5;

      this.x += Math.cos(this.angle) * this.speed + waveOffsetX;
      this.y += Math.sin(this.angle) * this.speed + waveOffsetY;

      const deg = (this.angle * 180 / Math.PI) + 90;
      this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) rotate(${deg}deg) scale(${this.scale})`;

      if (
        this.x < -140 ||
        this.x > window.innerWidth + 140 ||
        this.y < -140 ||
        this.y > window.innerHeight + 140
      ) {
        this.reset(false);
      }
    }

    destroy() {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }
  }

  let butterflies = [];

  function initButterflies() {
    butterflies.forEach(b => b.destroy());
    butterflies = [];

    const count = window.innerWidth < 600 ? 5 : 8;
    for (let i = 0; i < count; i++) {
      const b = new FlyingButterfly(false);
      b.x = Math.random() * window.innerWidth;
      b.y = Math.random() * window.innerHeight;
      butterflies.push(b);
    }
  }

  function spawnButterflyBurst(count = 6) {
    for (let i = 0; i < count; i++) {
      butterflies.push(new FlyingButterfly(true));
    }
  }

  function animateButterflies() {
    for (let i = 0; i < butterflies.length; i++) {
      butterflies[i].update();
    }
    requestAnimationFrame(animateButterflies);
  }

  // ===================================================================
  // 5. PHÁO HOA CONFETTI HOÀNG GIA (CELEBRATION CONFETTI ENGINE)
  // ===================================================================
  function fireConfettiExplosion() {
    const count = 75;
    const colors = ['#ffd700', '#ff3377', '#ff6ea7', '#ffffff', '#ba55d3', '#00e5ff'];
    const originX = window.innerWidth * 0.5;
    const originY = window.innerHeight * 0.65;

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';

      const isStar = Math.random() > 0.6;
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];

      confetti.style.position = 'fixed';
      confetti.style.zIndex = '99';
      confetti.style.pointerEvents = 'none';
      confetti.style.left = `${originX}px`;
      confetti.style.top = `${originY}px`;
      confetti.style.width = `${size}px`;
      confetti.style.height = `${isStar ? size : size * 1.5}px`;
      confetti.style.backgroundColor = color;
      confetti.style.borderRadius = isStar ? '50%' : '2px';
      confetti.style.boxShadow = `0 0 10px ${color}`;

      document.body.appendChild(confetti);

      const angle = (Math.random() * Math.PI) + Math.PI;
      const velocity = 8 + Math.random() * 14;
      let vx = Math.cos(angle) * velocity + (Math.random() - 0.5) * 8;
      let vy = Math.sin(angle) * velocity;
      let rotX = 0;
      let rotY = 0;
      let rotZ = 0;
      let posX = originX;
      let posY = originY;
      let life = 1;

      function updateConfetti() {
        posX += vx;
        posY += vy;
        vy += 0.35;
        vx *= 0.98;

        rotX += 12;
        rotY += 15;
        rotZ += 8;
        life -= 0.015;

        confetti.style.transform = `translate3d(${posX - originX}px, ${posY - originY}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
        confetti.style.opacity = life;

        if (life > 0 && posY < window.innerHeight + 100) {
          requestAnimationFrame(updateConfetti);
        } else {
          confetti.remove();
        }
      }
      requestAnimationFrame(updateConfetti);
    }
  }

  // ===================================================================
  // 6. TRẢI NGHIỆM MỞ THIỆP (OPEN CARD EXPERIENCE)
  // ===================================================================
  function openBirthdayCard() {
    if (isCardOpened) return;
    isCardOpened = true;

    playMagicalChime();
    startMusic();

    fireConfettiExplosion();
    spawnPetalBurst(30);
    spawnButterflyBurst(8);

    coverScreen.classList.add('fade-out');

    setTimeout(() => {
      coverScreen.style.display = 'none';
      mainCardContainer.classList.remove('hidden');

      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        fireConfettiExplosion();
      }, 700);
    }, 600);
  }

  openCardBtn.addEventListener('click', openBirthdayCard);
  teaserBox.addEventListener('click', openBirthdayCard);

  // ===================================================================
  // 7. BÁNH SINH NHẬT: THỔI NẾN & ƯỚC NGUYỆN
  // ===================================================================
  function handleCandleInteraction() {
    if (candlesLit) {
      candlesLit = false;
      playBlowingSound();

      flames.forEach(flame => {
        flame.classList.add('extinguished');
      });

      smokes.forEach(smoke => {
        smoke.classList.add('puff');
      });

      fireConfettiExplosion();
      spawnPetalBurst(20);

      blowCandleText.textContent = "✨ Nến Đã Tắt - Chạm để Thắp Lại";
      wishToast.classList.remove('hidden');

      setTimeout(() => {
        smokes.forEach(smoke => {
          smoke.classList.remove('puff');
        });
      }, 1500);

    } else {
      candlesLit = true;
      playMagicalChime();

      flames.forEach(flame => {
        flame.classList.remove('extinguished');
      });

      blowCandleText.textContent = "Nhấn để Thổi Nến & Ước Nguyện";
      wishToast.classList.add('hidden');
    }
  }

  cakeSection.addEventListener('click', handleCandleInteraction);
  blowCandleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCandleInteraction();
  });

  // ===================================================================
  // 8. CÁC NÚT TƯƠNG TÁC PHỤ
  // ===================================================================
  moreButterfliesBtn.addEventListener('click', () => {
    playMagicalChime();
    spawnButterflyBurst(4);
    spawnPetalBurst(25);
  });

  fireConfettiBtn.addEventListener('click', () => {
    playMagicalChime();
    fireConfettiExplosion();
  });

  replayBtn.addEventListener('click', () => {
    isCardOpened = false;
    mainCardContainer.classList.add('hidden');
    coverScreen.style.display = 'flex';
    void coverScreen.offsetWidth;
    coverScreen.classList.remove('fade-out');
  });

  // ===================================================================
  // 9. HIỆU ỨNG TILT 3D TRÊN MÁY TÍNH KHI RÊ CHUỘT
  // ===================================================================
  if (window.matchMedia('(min-width: 768px)').matches) {
    document.addEventListener('mousemove', (e) => {
      if (!isCardOpened || !cardWrapper) return;
      const xAxis = (window.innerWidth / 2 - e.pageX) / 45;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 45;
      cardWrapper.style.transform = `rotateY(${xAxis}deg) rotateX(${-yAxis}deg)`;
    });

    document.addEventListener('mouseleave', () => {
      if (cardWrapper) {
        cardWrapper.style.transform = `rotateY(0deg) rotateX(0deg)`;
      }
    });
  }

  // Chạm màn hình bất kỳ đâu để tạo bướm bay nhẹ
  document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.interactive-cake') || e.target.closest('#teaserBox')) return;
    if (Math.random() > 0.7) {
      spawnButterflyBurst(1);
    }
  });

  // ===================================================================
  // 10. KHỞI TẠO TỔNG THỂ
  // ===================================================================
  window.addEventListener('resize', () => {
    resizeCanvases();
  });

  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvases();
    initPetals();
    initSparkles();
    initButterflies();

    animateCanvases();
    animateButterflies();
  });

})();
