const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = resolvedTheme;

  if (!themeToggle) return;

  const isDark = resolvedTheme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(!isDark));
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');

  const icon = themeToggle.querySelector('i');
  if (icon) {
    icon.classList.toggle('bi-sun-fill', isDark);
    icon.classList.toggle('bi-moon-stars-fill', !isDark);
  }
}

function initializeTheme() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = prefersDark ? 'dark' : 'light';
  applyTheme(initialTheme);

  if (!themeToggle) return;
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

initializeTheme();

// Fade-In Animation
const sections = document.querySelectorAll('.section, .solid-line');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
	if (entry.isIntersecting) {
	  entry.target.classList.add('fade-in');
	  observer.unobserve(entry.target); // Stop observing once faded in
	}
  });
}, {
  threshold: 0.08 // Adjust this threshold value as needed
});

sections.forEach(section => {
  observer.observe(section);
});

const photoCarousel = document.getElementById('photo-carousel');

if (photoCarousel && typeof EmblaCarousel === 'function') {
  const photoEmbla = document.getElementById('photo-glide');
  const viewport = photoEmbla.querySelector('.embla__viewport');
  const shell = photoEmbla.querySelector('.photo-carousel__shell');
  const caption = document.getElementById('photo-carousel-caption');
  const track = photoEmbla.querySelector('.photo-carousel__track');
  const baseSlides = Array.from(photoEmbla.querySelectorAll('.photo-slide'));
  const duplicateGroups = 31;
  const centerGroupIndex = Math.floor(duplicateGroups / 2);
  track.innerHTML = Array.from({ length: duplicateGroups }, (_, groupIndex) =>
    baseSlides.map((slide) => {
      const clone = slide.cloneNode(true);
      clone.dataset.groupIndex = String(groupIndex);
      clone.dataset.sourceIndex = slide.dataset.photoIndex || '';
      return clone.outerHTML;
    }).join('')
  ).join('');

  const slides = Array.from(photoEmbla.querySelectorAll('.photo-slide'));
  const controls = Array.from(photoEmbla.querySelectorAll('.photo-carousel__control'));
  const baseImageSources = baseSlides
    .map((slide) => slide.querySelector('.photo-slide__image')?.getAttribute('src'))
    .filter(Boolean);
  const preloadRadius = 50;
  const preloadedImageSources = new Set();
  const preloadedImageCache = new Map();
  let tweenFrame = null;
  let suppressClickUntil = 0;

  const embla = EmblaCarousel(viewport, {
    loop: true,
    align: 'center',
    containScroll: false,
    duration: 28,
    dragFree: false,
    skipSnaps: true,
    watchDrag: true,
    startIndex: baseSlides.length * centerGroupIndex
  });

  function preloadImageSource(src) {
    if (!src || preloadedImageSources.has(src)) return;

    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.src = src;
    preloadedImageSources.add(src);
    preloadedImageCache.set(src, image);
    if (image.decode) image.decode().catch(() => {});
  }

  function preloadAroundSnap(snapIndex) {
    if (!baseImageSources.length) return;

    const centerIndex = ((snapIndex % baseImageSources.length) + baseImageSources.length) % baseImageSources.length;
    for (let offset = -preloadRadius; offset <= preloadRadius; offset += 1) {
      const sourceIndex = ((centerIndex + offset) % baseImageSources.length + baseImageSources.length) % baseImageSources.length;
      preloadImageSource(baseImageSources[sourceIndex]);
    }
  }

  function updateCaptionAndLabels() {
    const selectedIndex = embla.selectedScrollSnap();
    const selectedSlide = slides[selectedIndex];
    caption.textContent = selectedSlide?.dataset.caption || '';

    slides.forEach((slide, index) => {
      const button = slide.querySelector('.photo-slide__button');
      if (!button) return;
      button.setAttribute('aria-label', `${index === selectedIndex ? 'Open' : 'Focus'} ${slide.dataset.caption || 'photo'}`);
    });
  }

  function tweenSlides() {
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.left + viewportRect.width / 2;
    const normalizer = Math.max(viewportRect.width * 0.18, 1);

    slides.forEach((slide) => {
      const slideRect = slide.getBoundingClientRect();
      const slideCenter = slideRect.left + slideRect.width / 2;
      const distance = (slideCenter - viewportCenter) / normalizer;
      const absDistance = Math.abs(distance);
      const sign = distance === 0 ? 0 : distance > 0 ? 1 : -1;

      const translateX = sign * Math.min(absDistance * 10, 38);
      const translateY = Math.min(absDistance * 6, 18);
      const translateZ = -Math.min(absDistance * 82, 300);
      const rotateY = -sign * Math.min(absDistance * 14, 56);
      const scale = Math.max(0.68, 2.72 - absDistance * 0.78);
      const blur = absDistance < 0.55 ? absDistance * 1.1 : 0.6 + (absDistance - 0.55) * 3.4;
      const opacity = Math.max(0.08, 1 - absDistance * 0.3);
      const saturate = Math.max(0.68, 1 - absDistance * 0.08);
      const brightness = Math.max(0.78, 1 - absDistance * 0.09);
      const zIndex = String(Math.max(1, 100 - Math.round(absDistance * 16)));

      slide.style.transform = `perspective(1800px) translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
      slide.style.filter = `blur(${blur}px) saturate(${saturate}) brightness(${brightness})`;
      slide.style.opacity = String(opacity);
      slide.style.zIndex = zIndex;
    });
  }

  function scheduleTween() {
    if (tweenFrame !== null) cancelAnimationFrame(tweenFrame);
    tweenFrame = requestAnimationFrame(() => {
      tweenFrame = null;
      tweenSlides();
    });
  }

  function scrollNext() {
    embla.scrollNext();
  }

  function scrollPrev() {
    embla.scrollPrev();
  }

  controls.forEach((control) => {
    control.addEventListener('click', () => {
      if (control.dataset.carouselDir === 'next') {
        scrollNext();
      } else {
        scrollPrev();
      }
    });
  });

  photoEmbla.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) {
      event.preventDefault();
      return;
    }

    const button = event.target.closest('.photo-slide__button');
    if (!button) return;
    const slide = button.closest('.photo-slide');
    if (!slide) return;

    const selectedIndex = embla.selectedScrollSnap();
    const targetIndex = slides.indexOf(slide);

    if (targetIndex === selectedIndex) {
      const targetUrl = slide.dataset.url;
      if (targetUrl) window.open(targetUrl, '_blank', 'noopener');
      return;
    }

    embla.scrollTo(targetIndex);
  });

  photoEmbla.querySelectorAll('.photo-slide__button, .photo-slide__image').forEach((element) => {
    element.setAttribute('draggable', 'false');
  });

  shell.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });

  shell.addEventListener('pointerdown', () => {
    shell.classList.add('is-dragging');
  });

  function finishPointer() {
    shell.classList.remove('is-dragging');
    suppressClickUntil = Date.now() + 120;
  }

  shell.addEventListener('pointerup', finishPointer);
  shell.addEventListener('pointercancel', finishPointer);
  shell.addEventListener('pointerleave', finishPointer);

  function handleCarouselKeydown(event) {
    const tagName = document.activeElement?.tagName;
    const isTypingTarget =
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      document.activeElement?.isContentEditable;

    if (isTypingTarget) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollPrev();
    } else if (event.key === 'Enter' || event.key === ' ') {
      const selectedIndex = embla.selectedScrollSnap();
      const targetUrl = slides[selectedIndex]?.dataset.url;
      if (targetUrl) {
        event.preventDefault();
        window.open(targetUrl, '_blank', 'noopener');
      }
    }
  }

  embla.on('init', () => {
    preloadAroundSnap(embla.selectedScrollSnap());
    updateCaptionAndLabels();
    scheduleTween();
  });
  embla.on('reInit', () => {
    preloadAroundSnap(embla.selectedScrollSnap());
    updateCaptionAndLabels();
    scheduleTween();
  });
  embla.on('select', () => {
    preloadAroundSnap(embla.selectedScrollSnap());
    updateCaptionAndLabels();
  });
  embla.on('scroll', scheduleTween);
  embla.on('settle', scheduleTween);
  embla.on('resize', scheduleTween);

  document.addEventListener('keydown', handleCarouselKeydown);
  preloadAroundSnap(embla.selectedScrollSnap());
  updateCaptionAndLabels();
  scheduleTween();
}


// Helper: scroll so the solid line is at the very top when navigating to a section
function scrollToSectionWithLine(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  // Find the first .solid-line inside or before this section
  let line = section.querySelector('.solid-line');
  if (!line) {
    // Look for previous sibling .solid-line
    let prev = section.previousElementSibling;
    while (prev && !prev.classList.contains('solid-line')) prev = prev.previousElementSibling;
    line = prev;
  }
  if (line) {
    // Account for fixed navbar height if present
    const navbar = document.querySelector('.navbar.fixed-top');
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const y = line.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: y, behavior: 'smooth' });
  } else {
    // Fallback: scroll to section top
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Intercept navbar clicks to use custom scroll
let navbar = document.querySelector("#home");
navbar.addEventListener("click", (e) => {
  if (e.target.classList.length === 1 && e.target.classList.contains("nav-link")) {
    navbar.querySelectorAll(".nav-link.selected").forEach((item) => item.classList.remove("selected"));
    e.target.classList.add("selected");
    const href = e.target.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const sectionId = href.slice(1);
      scrollToSectionWithLine(sectionId);
    }
  }
});
