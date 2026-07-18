/* =============================================================
   Scroll-reveal for sections
   ============================================================= */
const sections = document.querySelectorAll('.section');

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.08
});

sections.forEach(section => revealObserver.observe(section));

/* =============================================================
   Navigation: scroll shadow + mobile menu
   ============================================================= */
const nav = document.getElementById('nav');
const navBurger = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');

if (nav) {
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

if (navBurger && navLinks) {
  navBurger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navBurger.setAttribute('aria-expanded', String(open));
  });
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navBurger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* =============================================================
   Accent rail: thin gradient bar on the right bezel. Click to
   expand (liquid-glass morph) into a hue track with two
   draggable dots; the dots' positions pick the two accent
   colours used everywhere. Click anywhere outside to collapse.
   ============================================================= */
(function initAccentRail() {
  const rail = document.getElementById('accent-rail');
  const bar = document.getElementById('accent-bar');
  const panel = document.getElementById('accent-panel');
  const closeBtn = document.getElementById('accent-close');
  const track = document.getElementById('accent-track');
  const handleA = document.getElementById('accent-handle-a');
  const handleB = document.getElementById('accent-handle-b');
  if (!rail || !bar || !panel || !track || !handleA || !handleB) return;

  // Positions along the track (0..1). 0 = white, 1 = black, spectrum between.
  const state = { a: 0, b: 1 };

  function hslToHex(h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to255 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${to255(f(0))}${to255(f(8))}${to255(f(4))}`;
  }

  // White at the very top, black at the very bottom, hues in between,
  // easing through light tints / dark shades near the ends.
  function posToColor(pos) {
    if (pos <= 0.03) return '#ffffff';
    if (pos >= 0.97) return '#000000';
    const t = (pos - 0.03) / 0.94;
    const hue = t * 360;
    let saturation = 0.85;
    let lightness = 0.62;
    if (t < 0.1) {
      const k = t / 0.1;
      lightness = 0.95 - (0.95 - 0.62) * k;
      saturation = 0.85 * k;
    } else if (t > 0.9) {
      const k = (1 - t) / 0.1;
      lightness = 0.62 * k + 0.06 * (1 - k);
      saturation = 0.85 * k + 0.3 * (1 - k);
    }
    return hslToHex(hue, saturation, lightness);
  }

  // Paint the track to exactly match the pos -> colour mapping
  const trackStops = [];
  for (let i = 0; i <= 20; i += 1) {
    const p = i / 20;
    trackStops.push(`${posToColor(p)} ${Math.round(p * 100)}%`);
  }
  track.style.background = `linear-gradient(180deg, ${trackStops.join(', ')})`;

  function render() {
    const colorA = posToColor(state.a);
    const colorB = posToColor(state.b);
    document.documentElement.style.setProperty('--accent-a', colorA);
    document.documentElement.style.setProperty('--accent-b', colorB);
    handleA.style.top = `${state.a * 100}%`;
    handleB.style.top = `${state.b * 100}%`;
    handleA.style.background = colorA;
    handleB.style.background = colorB;
    document.dispatchEvent(new CustomEvent('accentchange'));
  }

  function setOpen(open) {
    rail.classList.toggle('is-open', open);
    bar.setAttribute('aria-expanded', String(open));
  }

  bar.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(true);
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(false);
    });
  }

  // Click anywhere outside the rail collapses it
  document.addEventListener('click', (event) => {
    if (rail.classList.contains('is-open') && !rail.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  function startDrag(handle, key) {
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);

      const move = (ev) => {
        const rect = track.getBoundingClientRect();
        state[key] = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
        render();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  startDrag(handleA, 'a');
  startDrag(handleB, 'b');

  // Clicking the track jumps the nearest dot there
  track.addEventListener('pointerdown', (event) => {
    if (event.target === handleA || event.target === handleB) return;
    const rect = track.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const key = Math.abs(pos - state.a) <= Math.abs(pos - state.b) ? 'a' : 'b';
    state[key] = pos;
    render();
  });

  render();
})();

/* =============================================================
   Gallery slideshow: one full-res photo at a time with an
   auto-advance timer, prev/next arrows, and dots.
   ============================================================= */
(function initSlideshow() {
  const image = document.getElementById('slideshow-image');
  const link = document.getElementById('slideshow-link');
  const caption = document.getElementById('slideshow-caption');
  const progressBar = document.getElementById('slideshow-progress-bar');
  const prevBtn = document.getElementById('slideshow-prev');
  const nextBtn = document.getElementById('slideshow-next');
  const dotsEl = document.getElementById('slideshow-dots');
  const slideshow = document.getElementById('slideshow');
  if (!image || !link || !caption || !slideshow) return;

  const PHOTOS = [
    { src: 'apps/portfolio/images/me/bscs_panel.jpeg', caption: '2026 BSCS Computer Science Career Panel', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7444428489061076993/' },
    { src: 'apps/portfolio/images/me/ieom_society_2nd_world_congress.jpeg', caption: 'IEOM Society 2nd World Congress Panel - The Future of AI', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7423061230975795200/' },
    { src: 'apps/portfolio/images/me/oden_forge_gdg_2025.jpg', caption: 'Oden Forge and MCP at GDG 2025', url: 'https://www.linkedin.com/posts/kayode-babalola-5a8304109_windsorgdg2025-ai-machinelearning-activity-7393791535739252736-MX0y/' },
    { src: 'apps/portfolio/images/me/gdg_devfest_2024.jpg', caption: 'ProcessAI at GDG 2024, representing Oden Technologies', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7259986985165979656/' },
    { src: 'apps/portfolio/images/me/thelogic_conference_2024.jpg', caption: "The Logic's 2024 Panel Discussion on Responsible AI in Toronto", url: 'https://www.linkedin.com/posts/the-logic_last-night-the-logic-convened-subscribers-activity-7192256992453824512-iFOe/' },
    { src: 'apps/portfolio/images/me/yls_2023.jpg', caption: 'Delegate for the 2023 CUTA Young Leaders Summit', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7129889897162670080/' },
    { src: 'apps/portfolio/images/me/gdg_devfest_crowd_2023.jpg', caption: 'Google Developers Group DevFest 2023', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7128048902661931008/' },
    { src: 'apps/portfolio/images/me/odsc_west_2023.jpg', caption: 'The Preteckt Data Science team at ODSC West 2023', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7128046865287184384/' },
    { src: 'apps/portfolio/images/me/gdg_devfest_clustering_2022.jpg', caption: 'Google Developers Group DevFest 2022', url: 'https://www.linkedin.com/feed/update/urn:li:activity:6997615522980790272/' }
  ];

  const DELAY_MS = 12000;
  document.documentElement.style.setProperty('--slideshow-delay', `${DELAY_MS}ms`);

  let index = 0;
  let timer = null;
  let paused = false;
  let fadeToken = 0;
  const FADE_MS = 600; // keep in sync with .slideshow__image transition

  // Second stacked image layer for true crossfades
  const imageB = image.cloneNode(false);
  imageB.removeAttribute('id');
  imageB.style.opacity = '0';
  image.insertAdjacentElement('afterend', imageB);
  let front = image; // currently visible layer
  let back = imageB; // hidden layer the next photo loads into

  // Build dots
  const dots = PHOTOS.map((photo, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show photo ${i + 1}: ${photo.caption}`);
    dot.addEventListener('click', () => show(i, true));
    dotsEl.appendChild(dot);
    return dot;
  });

  function restartProgress() {
    if (!progressBar) return;
    progressBar.classList.remove('is-running');
    // Force a reflow so the animation restarts from zero
    void progressBar.offsetWidth;
    if (!paused) progressBar.classList.add('is-running');
  }

  function scheduleNext() {
    if (timer) clearTimeout(timer);
    timer = paused ? null : setTimeout(() => show(index + 1), DELAY_MS);
    restartProgress();
  }

  function show(nextIndex, fromUser) {
    index = ((nextIndex % PHOTOS.length) + PHOTOS.length) % PHOTOS.length;
    const photo = PHOTOS[index];

    // Crossfade: load the photo into the hidden layer, then dissolve it
    // in on top of the current one
    fadeToken += 1;
    const token = fadeToken;
    const incoming = back;
    const outgoing = front;
    incoming.src = photo.src;
    incoming.alt = photo.caption;

    const decoded = incoming.decode ? incoming.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => {
      if (token !== fadeToken) return; // superseded by a newer transition
      incoming.style.zIndex = '2';
      outgoing.style.zIndex = '1';
      requestAnimationFrame(() => {
        if (token !== fadeToken) return;
        incoming.style.opacity = '1';
        setTimeout(() => {
          if (token !== fadeToken) return;
          // Crossfade complete: the incoming layer fully covers the old one
          outgoing.style.opacity = '0';
          front = incoming;
          back = outgoing;
        }, FADE_MS);
      });
    });

    link.href = photo.url;
    caption.textContent = photo.caption;
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));

    // Preload the following image
    const upcoming = new Image();
    upcoming.src = PHOTOS[(index + 1) % PHOTOS.length].src;

    if (fromUser || !paused) scheduleNext();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => show(index - 1, true));
  if (nextBtn) nextBtn.addEventListener('click', () => show(index + 1, true));

  // Pause while hovering, while the tab is hidden, or when off-screen
  function setPaused(next) {
    if (next === paused) return;
    paused = next;
    if (paused) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (progressBar) progressBar.classList.remove('is-running');
    } else {
      scheduleNext();
    }
  }

  slideshow.addEventListener('mouseenter', () => setPaused(true));
  slideshow.addEventListener('mouseleave', () => setPaused(false));
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
  new IntersectionObserver((entries) => {
    setPaused(!entries.some((entry) => entry.isIntersecting) || document.hidden);
  }).observe(slideshow);

  document.addEventListener('keydown', (event) => {
    const tagName = document.activeElement?.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    if (event.key === 'ArrowRight') show(index + 1, true);
    else if (event.key === 'ArrowLeft') show(index - 1, true);
  });

  show(0);
})();

/* =============================================================
   GitHub contributions: interactive per-year graph in GitHub's
   own green palette. Years run from 2021 through the current
   year (auto-updates); click a year to see its grid and total.
   ============================================================= */
(function initGitHubGraph() {
  const yearsEl = document.getElementById('gh-years');
  const totalEl = document.getElementById('gh-total');
  const graphEl = document.getElementById('gh-graph');
  if (!yearsEl || !totalEl || !graphEl) return;

  const USERNAME = 'JYoussouf';
  const START_YEAR = 2021;
  const currentYear = new Date().getFullYear();
  let data = null;
  let selectedYear = currentYear;

  const years = [];
  for (let y = currentYear; y >= START_YEAR; y -= 1) years.push(y);

  const yearButtons = new Map();
  years.forEach((year) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = String(year);
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => select(year));
    yearsEl.appendChild(btn);
    yearButtons.set(year, btn);
  });

  // GitHub-style hover tooltip. Lives on the card (not the scrollable
  // graph wrap) so it is never clipped by the pannable area.
  const card = graphEl.closest('.github-card');
  const tooltip = document.createElement('div');
  tooltip.className = 'gh-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  card.appendChild(tooltip);

  function tooltipLabel(dateString, count) {
    const date = new Date(`${dateString}T00:00:00`);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const dayNum = date.getDate();
    const mod10 = dayNum % 10;
    const mod100 = dayNum % 100;
    const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th';
    const lead = count === 0 ? 'No contributions' : count === 1 ? '1 contribution' : `${count.toLocaleString()} contributions`;
    return `${lead} on ${month} ${dayNum}${suffix}.`;
  }

  graphEl.addEventListener('mouseover', (event) => {
    const cell = event.target.closest('.gh-cell');
    if (!cell || cell.classList.contains('gh-cell--pad') || !cell.dataset.date) return;
    tooltip.textContent = tooltipLabel(cell.dataset.date, Number(cell.dataset.count));
    tooltip.hidden = false;
    // Position relative to the card using on-screen rects (scroll-proof)
    const cardRect = card.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const x = cellRect.left - cardRect.left + cellRect.width / 2;
    tooltip.style.left = `${Math.min(Math.max(x, half + 4), cardRect.width - half - 4)}px`;
    tooltip.style.top = `${cellRect.top - cardRect.top}px`;
  });
  graphEl.addEventListener('mouseleave', () => { tooltip.hidden = true; });
  graphEl.parentElement.addEventListener('scroll', () => { tooltip.hidden = true; }, { passive: true });
  document.addEventListener('touchstart', (event) => {
    if (!graphEl.contains(event.target)) tooltip.hidden = true;
  }, { passive: true });

  function renderYear(year) {
    const days = data.contributions.filter((day) => day.date.startsWith(`${year}-`));
    const total = data.total[year] ?? days.reduce((sum, day) => sum + day.count, 0);

    totalEl.textContent = `${total.toLocaleString()} contributions in ${year}`;

    graphEl.innerHTML = '';
    tooltip.hidden = true;
    // Pad the first week so days land on the right row (Sun = row 0)
    const firstDay = new Date(`${year}-01-01T00:00:00`).getDay();
    // Fluid columns: the grid always stretches the full width of the card
    const weeks = Math.ceil((firstDay + days.length) / 7);
    graphEl.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
    for (let i = 0; i < firstDay; i += 1) {
      const pad = document.createElement('span');
      pad.className = 'gh-cell gh-cell--pad';
      graphEl.appendChild(pad);
    }
    days.forEach((day) => {
      const cell = document.createElement('span');
      cell.className = 'gh-cell';
      cell.dataset.level = String(day.level);
      cell.dataset.date = day.date;
      cell.dataset.count = String(day.count);
      graphEl.appendChild(cell);
    });
  }

  function select(year) {
    selectedYear = year;
    yearButtons.forEach((btn, y) => {
      btn.classList.toggle('is-active', y === year);
      btn.setAttribute('aria-selected', String(y === year));
    });
    if (data) renderYear(year);
  }

  select(currentYear);

  fetch(`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=all`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((json) => {
      data = json;
      renderYear(selectedYear);
    })
    .catch(() => {
      totalEl.textContent = 'Contribution data is unavailable right now.';
    });
})();
