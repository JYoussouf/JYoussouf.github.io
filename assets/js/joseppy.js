// Fade-In Animation
const sections = document.querySelectorAll('.section');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
	if (entry.isIntersecting) {
	  entry.target.classList.add('fade-in');
	  observer.unobserve(entry.target); // Stop observing once faded in
	}
  });
}, {
  threshold: 0.2 // Adjust this threshold value as needed
});

sections.forEach(section => {
  observer.observe(section);
});


// select active
let navbar = document.querySelector("#home");
navbar.addEventListener("click", (e) => {
  if (e.target.classList.length === 1 && e.target.classList.contains("nav-link")) {
    navbar.querySelectorAll(".nav-link.selected").forEach((item) => item.classList.remove("selected"));
    e.target.classList.add("selected");
  }
});
