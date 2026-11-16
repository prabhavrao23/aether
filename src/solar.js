(() => {
  const get = id => document.getElementById(id);
  const solar = get('solar'), map = get('orbit-map'), orbitView = get('orbit-view');
  const detail = get('world-view'), photo = get('world-photo'), clouds = get('world-clouds');
  const cutaway = get('world-cutaway'), layers = get('world-layers'), credit = get('world-credit');
  const sound = get('solar-sound'), main = document.querySelector('main');
  const motionOff = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nasa = 'https://science.nasa.gov/';
  const world = (name, type, days, size, color, description, source, visual) =>
    ({ name, type, days, size, color, description, source: nasa + source, ...visual });

  const bodies = {
    sun: world('Sun', 'STAR · PHOTOSPHERE', 0, 48, '#ffad50',
      'The photosphere is the glowing layer we see as the Sun’s surface. The Sun is made of hot plasma, so there is no solid ground.',
      'sun/facts/', { photo: 'sun-hmi.jpg', credit: 'NASA/SDO · visible-light image' }),
    mercury: world('Mercury', 'ROCKY PLANET · SURFACE', 87.97, 9, '#aaa198',
      'Impact craters cover Mercury. This close-up shows the rolling hills on the inner wall of a large impact basin, photographed by MESSENGER.',
      'photojournal/the-rolling-hills-of-mercury/', { photo: 'mercury.jpg', credit: 'NASA/Johns Hopkins APL/Carnegie Institution' }),
    venus: world('Venus', 'ROCKY PLANET · RADAR TERRAIN MODEL', 224.70, 13, '#e5b774',
      'Thick clouds hide the ground from orbit. Radar reveals volcanic plains and mountains below, where the air is dense and the ground is hot enough to melt lead.',
      'image-detail/pia00107-venus/', { photo: 'venus.jpg', credit: 'NASA/JPL · Magellan radar visualization' }),
    earth: world('Earth', 'ROCKY PLANET · GLOBE', 365.26, 17, '#59a5e7',
      'From orbit you can see oceans, continents, and cloud systems. Follow the descent to the New York region, then into Manhattan.',
      'earth/facts/', { photo: 'earth.jpg', credit: 'NASA · Earth from space' }),
    moon: world('Moon', 'EARTH’S MOON · SURFACE', 27.32, 8, '#d4d3cb',
      'Apollo 17 astronauts photographed this rocky landscape. With almost no atmosphere, the Moon has a black sky even in sunlight.',
      'resource/apollo-17-astronaut-and-united-states-flag-on-lunar-surface/', { photo: 'moon.jpg', credit: 'NASA · Apollo 17 photograph' }),
    mars: world('Mars', 'ROCKY PLANET · SURFACE', 686.98, 12, '#ca6245',
      'Follow Perseverance’s view toward the rim of Jezero Crater. The rust-colored dust contains iron oxides.',
      'resource/perseverance-rovers-view-up-crater/', { photo: 'mars.jpg', credit: 'NASA/JPL-Caltech/ASU/MSSS · rover panorama' }),
    jupiter: world('Jupiter', 'GAS GIANT', 4332.59, 32, '#dbaf90',
      'Cloud bands swirl above a deep hydrogen and helium atmosphere. Pressure rises as you descend, and there is no solid surface to land on.',
      'jupiter/jupiter-facts/', { atmosphere: ['#ead7c0','#543140','#a9625eaa','#ad482c'],
        layers: [['#e6c8ab','Hydrogen and helium atmosphere'],['#bf7752','Compressed fluid hydrogen'],['#8f56bb','Electrically conducting metallic hydrogen'],['#ffeab3','Possible diffuse core rich in heavier elements']] }),
    saturn: world('Saturn', 'GAS GIANT', 10759.22, 27, '#ddc18a',
      'Pale bands and storms mark the upper clouds. Beneath them, hydrogen becomes a dense fluid as pressure increases. There is no solid surface.',
      'saturn/facts/', { atmosphere: ['#f5dfa1','#625441','#d9b57899','#be873e'],
        layers: [['#dec58a','Hydrogen and helium atmosphere'],['#ab884f','Liquid hydrogen'],['#7471c4','Liquid metallic hydrogen'],['#ffe8b7','Central region rich in rock, ice, and metals']] }),
    uranus: world('Uranus', 'ICE GIANT', 30688.5, 19, '#95d9df',
      'Methane absorbs red light, giving Uranus its blue-green color. Beneath the atmosphere is a hot, dense mixture rich in water, methane, and ammonia.',
      'uranus/facts/', { atmosphere: ['#b9eee4','#15425d','#568bb73d','#94d9d9'],
        layers: [['#a9ebe0','Hydrogen, helium, and methane atmosphere'],['#5187b8','Hot, dense fluid rich in water, methane, and ammonia'],['#ffd8a5','Possible small rocky core']] }),
    neptune: world('Neptune', 'ICE GIANT', 60182, 19, '#678eda',
      'Neptune’s atmosphere has fast winds and dark storms. Far below the clouds, pressure compresses materials into a hot, water-rich fluid.',
      'neptune/neptune-facts/', { atmosphere: ['#8ec4e3','#1a2659','#3f65ad80','#344e8e'],
        layers: [['#86b8e3','Hydrogen, helium, and methane atmosphere'],['#4e66b3','Hot, dense fluid rich in water, methane, and ammonia'],['#e9b9a9','Possible Earth-sized rocky core']] })
  };

  const planets = Object.keys(bodies).filter(id => id !== 'sun' && id !== 'moon');
  const markers = new Map(), rings = new Map(), positions = new Map();
  const phase = [4.1, 2.6, .33, 5.4, 2.95, 5.85, 1.2, 4.25];
  const earthStages = [
    bodies.earth,
    { name: 'New York Harbor', type: 'EARTH · REGIONAL APPROACH', photo: 'region.jpg',
      description: 'The Hudson River opens into New York Harbor. Manhattan lies between the Hudson and East Rivers.',
      source: nasa + 'earth/earth-observatory/new-york-and-new-jersey-151056/', credit: 'NASA Earth Observatory · ISS astronaut photograph' },
    { name: 'New York City', type: 'EARTH · MANHATTAN', photo: 'nyc.jpg',
      description: 'From above Manhattan, you can see its street grid, the rivers on either side, and bridges connecting the city.',
      source: nasa + 'earth/earth-observatory/new-york-city-83828/', credit: 'NASA Earth Observatory · ISS039-E-18538' }
  ];
  let open = false, frame = 0, lastTime = 0, days = 0, orbitsPaused = motionOff;
  let destination = '', generation = 0, earthTimer, flyAnimation;
  const button = (label, handler) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.onclick = handler;
    return element;
  };
  const paint = body => `radial-gradient(circle at 34% 30%, #fff9, ${body.color} 37%, #080a19 110%)`;
  for (const [id, body] of Object.entries(bodies)) {
    if (planets.includes(id) || id === 'moon') {
      const ring = document.createElement('div');
      ring.className = 'orbit-ring';
      map.append(ring);
      rings.set(id, ring);
    }
    const marker = button('', () => flyTo(id));
    marker.className = 'orbit-point';
    marker.dataset.world = id;
    marker.style.setProperty('--orb-size', body.size + 'px');
    marker.style.setProperty('--orb-paint', paint(body));
    marker.style.setProperty('--orb-glow', body.color + '60');
    const name = document.createElement('span');
    name.textContent = body.name;
    marker.append(name);
    map.append(marker);
    markers.set(id, marker);
    get('world-list').append(button(body.name, () => flyTo(id)));
  }

  function position(id, x, y) {
    positions.set(id, { x, y });
    const marker = markers.get(id);
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
  }

  function drawOrbits() {
    const cx = map.clientWidth / 2, cy = map.clientHeight / 2;
    const flatten = .64;
    const outer = Math.max(65, Math.min(cx - 24, (cy - 25) / flatten));
    position('sun', cx, cy);
    planets.forEach((id, i) => {
      const r = outer * (.22 + .78 * i / 7);
      const a = phase[i] + days / bodies[id].days * Math.PI * 2;
      const ring = rings.get(id);
      ring.style.width = r * 2 + 'px';
      ring.style.height = r * 2 * flatten + 'px';
      position(id, cx + Math.cos(a) * r, cy + Math.sin(a) * r * flatten);
    });
    const earth = positions.get('earth');
    const a = days / bodies.moon.days * Math.PI * 2 + 1;
    const lunarOrbit = rings.get('moon');
    lunarOrbit.style.cssText = `left:${earth.x}px;top:${earth.y}px;width:52px;height:32px;border-style:dashed`;
    position('moon', earth.x + 26 * Math.cos(a), earth.y + 16 * Math.sin(a));
  }

  function tick(time) {
    if (!open) return;
    if (lastTime && !orbitsPaused) days += Math.min(.05, (time - lastTime) / 1000) * Number(get('orbit-speed').value);
    lastTime = time;
    if (!orbitView.hidden) drawOrbits();
    frame = requestAnimationFrame(tick);
  }

  function syncPause() {
    get('orbit-pause').textContent = orbitsPaused ? 'Play orbits' : 'Pause orbits';
    get('orbit-pause').setAttribute('aria-pressed', String(orbitsPaused));
  }

  function syncSound() {
    sound.textContent = musicEnabled ? '♪ Sound on' : '♪ Sound off';
    sound.setAttribute('aria-pressed', String(musicEnabled));
  }

  function cancelJourney() {
    generation++;
    clearTimeout(earthTimer);
    flyAnimation?.cancel();
  }

  function showOrbit() {
    cancelJourney();
    destination = '';
    orbitView.hidden = false;
    detail.hidden = true;
    get('solar-back').textContent = '← Galaxy';
    solar.scrollTop = 0;
    drawOrbits();
    get('orbit-title').focus({ preventScroll: true });
  }

  function showScene(scene, stage, keepFocus = false) {
    const wasHidden = detail.hidden;
    orbitView.hidden = true;
    detail.hidden = false;
    get('solar-back').textContent = '← Solar System';
    get('world-type').textContent = scene.type;
    get('world-title').textContent = scene.name;
    get('world-description').textContent = scene.description;
    credit.href = scene.source;
    credit.textContent = scene.credit + ' ↗';
    photo.hidden = !scene.photo;
    clouds.hidden = !scene.atmosphere;
    cutaway.hidden = !scene.interior;
    layers.hidden = !scene.interior;
    if (scene.photo) {
      photo.src = 'assets/solar/' + scene.photo;
      photo.dataset.stage = stage;
    }
    if (scene.atmosphere) {
      const visual = document.createElement('div');
      visual.className = 'cloud-bands';
      ['--top','--deep','--cloud','--storm'].forEach((v, i) => visual.style.setProperty(v, scene.atmosphere[i]));
      clouds.replaceChildren(visual);
    }
    if (scene.interior) {
      layers.replaceChildren(...scene.layers.map(([color, label]) => {
        const li = document.createElement('li');
        li.style.setProperty('--key', color);
        li.textContent = label;
        return li;
      }));
      const globe = document.createElement('div');
      globe.className = 'cutaway-orb';
      const band = 100 / scene.layers.length;
      const stops = [...scene.layers].reverse().map(([color], i) =>
        `${color} ${band * i}% ${band * (i + 1)}%`);
      globe.style.setProperty('--layers', `radial-gradient(circle closest-side, ${stops.join(', ')})`);
      globe.style.setProperty('--orb-glow', scene.color + '30');
      cutaway.replaceChildren(globe);
    }
    const visual = scene.photo ? photo : scene.interior ? cutaway : clouds;
    visual.classList.remove('scene-change');
    void visual.offsetWidth;
    visual.classList.add('scene-change');
    if (wasHidden || !keepFocus) get('world-title').focus({ preventScroll: true });
  }

  function steps(labels, current, choose) {
    get('world-steps').replaceChildren(...labels.map((label, i) => {
      const el = button(label, () => { choose(i); get('world-steps').children[i].focus(); });
      el.setAttribute('aria-pressed', String(i === current));
      return el;
    }));
  }

  function earthScene(i, auto, keepFocus = false) {
    clearTimeout(earthTimer);
    showScene(earthStages[i], i === 0 ? 'earth' : 'earth-descent', keepFocus);
    steps(['Earth', 'New York Harbor', 'Manhattan'], i, next => earthScene(next, false, true));
    if (auto && i < 2) {
      earthTimer = setTimeout(() => {
        if (open && destination === 'earth') earthScene(i + 1, true, true);
      }, 1550);
    }
  }

  function giantScene(id, interior, keepFocus = false) {
    const body = bodies[id];
    showScene({
      ...body, type: body.type + (interior ? ' · INTERIOR MODEL' : ' · CLOUDS'),
      atmosphere: interior ? null : body.atmosphere, interior,
      description: interior
        ? 'This cutaway shows what scientists infer from measurements and models. The layer sizes are illustrative.'
        : body.description,
      credit: interior ? 'Source: NASA · interior research' : 'Illustration based on NASA research'
    }, id, keepFocus);
    steps(['Cloud view', 'Explore inside'], Number(interior), next => giantScene(id, Boolean(next), true));
  }

  async function flyTo(id) {
    cancelJourney();
    const ticket = generation;
    const body = bodies[id];
    if (!motionOff) {
      const origin = markers.get(id).getBoundingClientRect();
      const globe = document.createElement('div');
      globe.className = 'fly-globe';
      globe.style.cssText = `left:0;top:0;--orb-size:${body.size}px;--orb-paint:${paint(body)};--orb-glow:${body.color}`;
      document.body.append(globe);
      flyAnimation = globe.animate([
        { transform: `translate(${origin.x + origin.width / 2 - body.size / 2}px,${origin.y + origin.height / 2 - body.size / 2}px) scale(1)` },
        { transform: `translate(${(innerWidth - body.size) / 2}px,${(innerHeight - body.size) / 2}px) scale(${Math.max(innerWidth, innerHeight) / body.size * 1.2})`, opacity: 0.25 }
      ], { duration: 900, easing: 'cubic-bezier(.45,.08,.23,1)', fill: 'forwards' });
      try { await flyAnimation.finished; } catch { /* Superseded by navigation. */ }
      finally { globe.remove(); }
    }
    if (!open || ticket !== generation) return;
    destination = id;
    get('world-steps').replaceChildren();
    if (id === 'earth') earthScene(0, !motionOff);
    else if (body.atmosphere) giantScene(id, false);
    else showScene(body, id);
  }

  function closeSolar() {
    cancelJourney();
    open = false;
    cancelAnimationFrame(frame);
    solar.hidden = true;
    main.inert = false;
    document.body.classList.remove('solar-open');
    get('solar-launch').focus({ preventScroll: true });
  }

  get('solar-launch').onclick = () => {
    if (open) return;
    open = true;
    lastTime = 0;
    main.inert = true;
    solar.hidden = false;
    document.body.classList.add('solar-open');
    solar.classList.remove('solar-arrival');
    void solar.offsetWidth;
    solar.classList.add('solar-arrival');
    showOrbit();
    syncPause();
    syncSound();
    if (musicEnabled && !paused) music.play().catch(() => {});
    frame = requestAnimationFrame(tick);
  };

  get('solar-back').onclick = () => destination ? showOrbit() : closeSolar();
  get('orbit-pause').onclick = () => { orbitsPaused = !orbitsPaused; syncPause(); };
  sound.onclick = async () => { await get('sound').onclick(); syncSound(); };
  addEventListener('keydown', event => {
    if (open && event.key === 'Escape') get('solar-back').click();
  });
})();
