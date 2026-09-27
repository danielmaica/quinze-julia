const CONFIG = {
  eventDate: "2026-11-14T19:30:00-03:00",
  pixKey: "861.431.150-87",
  driveUrl: "https://drive.google.com/drive/folders/1w6TrI6lPbCf_KE2UjEZvBWXwojF_fYAE?usp=sharing",
};

const $ = (selector) => document.querySelector(selector);

const toast = $("#toast");
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function setupMusic() {
  const audio = $("#backgroundMusic");
  const button = $("#musicToggle");
  const openingGate = $("#openingGate");
  const openInvitation = $("#openInvitation");
  let musicActive = false;
  let ambientContext;
  let ambientTimer;

  audio.volume = 0.42;

  function updateMusicButton(isPlaying) {
    musicActive = isPlaying;
    button.setAttribute("aria-pressed", String(isPlaying));
    button.setAttribute("aria-label", isPlaying ? "Pausar música" : "Tocar música");
  }

  function showOpeningGate() {
    openingGate.classList.remove("opening", "closing");
    openingGate.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeOpeningGate() {
    openingGate.classList.add("closing");
    document.body.style.overflow = "";
    window.setTimeout(() => {
      openingGate.hidden = true;
      openingGate.classList.remove("opening", "closing");
      document.body.classList.remove("entering-invitation");
      openInvitation.disabled = false;
    }, 680);
  }

  function scheduleAmbientPhrase() {
    if (!ambientContext || ambientContext.state !== "running") return;

    const master = ambientContext.createGain();
    master.gain.value = 0.035;
    master.connect(ambientContext.destination);

    const start = ambientContext.currentTime + 0.05;
    const notes = [392, 493.88, 587.33, 493.88, 659.25, 587.33];

    notes.forEach((frequency, index) => {
      const oscillator = ambientContext.createOscillator();
      const gain = ambientContext.createGain();
      const noteStart = start + index * 0.7;
      const noteEnd = noteStart + 1.8;

      oscillator.type = index % 2 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.34, noteStart + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.05);
    });
  }

  async function startAmbientFallback() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) throw new Error("Áudio não suportado");

    if (!ambientContext) {
      ambientContext = new AudioEngine();
      scheduleAmbientPhrase();
      ambientTimer = window.setInterval(scheduleAmbientPhrase, 5200);
    } else {
      await ambientContext.resume();
    }

    updateMusicButton(true);
  }

  async function playMusic({ allowFallback = true } = {}) {
    try {
      const timeout = new Promise((_, reject) =>
        window.setTimeout(() => reject(new Error("Tempo de carregamento excedido")), 1200),
      );
      await Promise.race([audio.play(), timeout]);
      updateMusicButton(true);
      return true;
    } catch {
      audio.pause();
      if (allowFallback) {
        try {
          await startAmbientFallback();
          return true;
        } catch {
          showToast("Não foi possível iniciar a música neste navegador.");
        }
      }
      updateMusicButton(false);
      return false;
    }
  }

  function pauseMusic() {
    audio.pause();
    updateMusicButton(false);
    if (ambientContext?.state === "running") {
      ambientContext.suspend().catch(() => {});
    }
  }

  button.addEventListener("click", () => {
    if (!musicActive) playMusic();
    else pauseMusic();
  });

  openInvitation.addEventListener("click", async () => {
    openInvitation.disabled = true;
    openingGate.classList.add("opening");
    document.body.classList.add("entering-invitation");
    const animationStartedAt = performance.now();
    const started = await playMusic({ allowFallback: true });

    if (!started) {
      openingGate.classList.remove("opening");
      document.body.classList.remove("entering-invitation");
      openInvitation.disabled = false;
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const entranceDuration = prefersReducedMotion ? 250 : 2200;
    const elapsed = performance.now() - animationStartedAt;
    window.setTimeout(closeOpeningGate, Math.max(0, entranceDuration - elapsed));
  });

  // Tenta iniciar sozinho. Em celulares que bloqueiam som sem gesto, mostra a abertura.
  playMusic({ allowFallback: false }).then((started) => {
    if (!started) showOpeningGate();
  });
}

function setupDrive() {
  const button = $("#driveButton");
  const status = $("#driveStatus");

  if (CONFIG.driveUrl) {
    status.textContent = "Adicionar fotos no Google Drive";
  }

  button.addEventListener("click", () => {
    if (!CONFIG.driveUrl) {
      showToast("O link do álbum será disponibilizado em breve.");
      return;
    }

    window.open(CONFIG.driveUrl, "_blank", "noopener,noreferrer");
  });
}

function setupRsvp() {
  const button = $("#rsvpButton");
  const message = "Olá! Confirmo minha presença nos 15 anos da Júlia em 14/11/2026. 🩵";
  button.href = `https://wa.me/555191368325?text=${encodeURIComponent(message)}`;
}

function setupPix() {
  const pixKey = $("#pixKey");
  const button = $("#copyPix");

  pixKey.textContent = CONFIG.pixKey;

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(CONFIG.pixKey);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = CONFIG.pixKey;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }

    const label = button.querySelector("span");
    label.textContent = "Chave copiada!";
    showToast("Chave Pix copiada com sucesso.");
    window.setTimeout(() => (label.textContent = "Copiar chave Pix"), 2200);
  });
}

function setupCountdown() {
  const eventTime = new Date(CONFIG.eventDate).getTime();
  const fields = {
    days: $("#days"),
    hours: $("#hours"),
    minutes: $("#minutes"),
    seconds: $("#seconds"),
  };

  function update() {
    const distance = eventTime - Date.now();

    if (distance <= 0) {
      fields.days.textContent = "00";
      fields.hours.textContent = "00";
      fields.minutes.textContent = "00";
      fields.seconds.textContent = "00";
      return;
    }

    const day = 86_400_000;
    const hour = 3_600_000;
    const minute = 60_000;

    fields.days.textContent = String(Math.floor(distance / day)).padStart(2, "0");
    fields.hours.textContent = String(Math.floor((distance % day) / hour)).padStart(2, "0");
    fields.minutes.textContent = String(Math.floor((distance % hour) / minute)).padStart(2, "0");
    fields.seconds.textContent = String(Math.floor((distance % minute) / 1000)).padStart(2, "0");
  }

  update();
  window.setInterval(update, 1000);
}

function setupRevealAnimations() {
  const elements = [...document.querySelectorAll(".reveal")];

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px" },
  );

  elements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
    observer.observe(element);
  });
}

function setupSparkleCascade() {
  const canvas = $("#sparkleCascade");
  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let sparkles = [];
  let animationFrame;
  let previousTime = performance.now();

  function createSparkle(startAnywhere = false) {
    const prominent = Math.random() > 0.82;
    return {
      x: Math.random() * width,
      y: startAnywhere ? Math.random() * height : -20 - Math.random() * height * 0.25,
      size: prominent ? 1.5 + Math.random() * 1.7 : 0.55 + Math.random() * 1.15,
      speed: prominent ? 24 + Math.random() * 22 : 12 + Math.random() * 24,
      drift: -5 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      twinkle: 1.1 + Math.random() * 2.4,
      trail: prominent ? 9 + Math.random() * 15 : 3 + Math.random() * 8,
      prominent,
    };
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const density = reduceMotion ? 26 : Math.round(Math.min(92, Math.max(48, width / 7.2)));
    sparkles = Array.from({ length: density }, () => createSparkle(true));
    draw(performance.now(), 0);
  }

  function draw(time, deltaSeconds) {
    context.clearRect(0, 0, width, height);

    sparkles.forEach((sparkle) => {
      if (!reduceMotion) {
        sparkle.y += sparkle.speed * deltaSeconds;
        sparkle.x += sparkle.drift * deltaSeconds;
        if (sparkle.y - sparkle.trail > height || sparkle.x < -24 || sparkle.x > width + 24) {
          Object.assign(sparkle, createSparkle(false));
        }
      }

      const pulse = 0.46 + Math.sin(time * 0.001 * sparkle.twinkle + sparkle.phase) * 0.34;
      const alpha = Math.max(0.1, pulse);

      context.beginPath();
      context.moveTo(sparkle.x, sparkle.y - sparkle.trail);
      context.lineTo(sparkle.x, sparkle.y + sparkle.size);
      context.strokeStyle = `rgba(124, 191, 255, ${alpha * 0.24})`;
      context.lineWidth = Math.max(0.45, sparkle.size * 0.38);
      context.stroke();

      context.beginPath();
      context.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(221, 241, 255, ${alpha})`;
      context.shadowColor = "rgba(112, 185, 255, 0.88)";
      context.shadowBlur = sparkle.prominent ? 12 : 7;
      context.fill();
      context.shadowBlur = 0;

      if (sparkle.prominent) {
        const ray = sparkle.size * 3.5;
        context.beginPath();
        context.moveTo(sparkle.x - ray, sparkle.y);
        context.lineTo(sparkle.x + ray, sparkle.y);
        context.moveTo(sparkle.x, sparkle.y - ray);
        context.lineTo(sparkle.x, sparkle.y + ray);
        context.strokeStyle = `rgba(235, 247, 255, ${alpha * 0.68})`;
        context.lineWidth = 0.65;
        context.stroke();
      }
    });
  }

  function animate(time) {
    const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    draw(time, deltaSeconds);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
      return;
    }
    previousTime = performance.now();
    if (!reduceMotion) animationFrame = window.requestAnimationFrame(animate);
  }

  resize();
  if (!reduceMotion) animationFrame = window.requestAnimationFrame(animate);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

setupMusic();
setupRsvp();
setupDrive();
setupPix();
setupCountdown();
setupRevealAnimations();
setupSparkleCascade();
