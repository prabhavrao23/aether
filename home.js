const surfer = document.querySelector('.surf');
const enter = document.querySelector('.enter');
let dragPointer = null;
const limit = value => Math.max(-1, Math.min(1, value));

function pose(event) {
  const bounds = surfer.getBoundingClientRect();
  const x = limit((event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2));
  const y = limit((event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2));
  surfer.style.setProperty('--eye-x', `${x * 4}px`);
  surfer.style.setProperty('--eye-y', `${y * 3}px`);
  surfer.style.setProperty('--head', `${x * 6}deg`);
  surfer.style.setProperty('--tilt', `${x * (dragPointer === null ? 3 : 11)}deg`);
  surfer.style.setProperty('--x', `${x * (dragPointer === null ? 4 : 20)}px`);
  surfer.style.setProperty('--y', `${y * (dragPointer === null ? 3 : 12)}px`);
}

window.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse' || event.pointerId === dragPointer) pose(event);
});
surfer.addEventListener('pointerdown', event => {
  if (dragPointer !== null || event.button !== 0) return;
  dragPointer = event.pointerId;
  surfer.setPointerCapture(event.pointerId);
  pose(event);
});
surfer.addEventListener('lostpointercapture', () => {
  dragPointer = null;
  surfer.removeAttribute('style');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target === document.body && !event.repeat) {
    enter.click();
  }
});
