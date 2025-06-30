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
