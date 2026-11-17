const sections = document.querySelectorAll('main > section');
const links = document.querySelectorAll('nav a');

function showSection() {
  const active = location.hash === '#contact' ? 'contact' : 'about';
  for (const section of sections) section.hidden = section.id !== active;
  for (const link of links) {
    if (link.hash === '#' + active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', showSection);
showSection();
