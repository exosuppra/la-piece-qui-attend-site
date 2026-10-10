/* La Piece qui attend : le peu de script du site.
   - l'eclat de la facade peut etre coupe (et le choix est retenu) : il clignote en noir et blanc ;
   - le menu des petits ecrans ;
   - la bande-annonce se charge au clic seulement (rien ne part avant). */
(function () {
  var cle = 'lpqa-site-sans-eclat';
  var bouton = document.querySelector('.eclat-bouton');
  function appliquer(sans) {
    document.body.classList.toggle('sans-eclat', sans);
    if (bouton) bouton.textContent = sans ? bouton.dataset.remettre : bouton.dataset.couper;
  }
  var sans = false;
  try { sans = localStorage.getItem(cle) === '1'; } catch (e) {}
  appliquer(sans);
  if (bouton) bouton.addEventListener('click', function () {
    sans = !sans; appliquer(sans);
    try { localStorage.setItem(cle, sans ? '1' : '0'); } catch (e) {}
  });

  var menu = document.querySelector('.menu-bouton'), liste = document.querySelector('.nav ul');
  if (menu && liste) menu.addEventListener('click', function () {
    var ouvert = liste.classList.toggle('ouvert');
    menu.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  });

  /* L'inscription n'est reliee a aucun service tant que la page Steam n'existe pas : on le dit, rien ne part. */
  var lettre = document.querySelector('form.lettre');
  if (lettre) lettre.addEventListener('submit', function (e) {
    e.preventDefault();
    var note = lettre.querySelector('.lettre-note'); if (note) note.hidden = false;
  });

  /* LES SOLUTIONS, RESERVEES AUX JOUEURS. Le guide est chiffre a la construction ; le code (dans le carnet de pause
     du jeu) donne la cle. Retenu dans ce navigateur seulement, pour ne pas le retaper. */
  var verrou = document.getElementById('verrou'), boite = document.getElementById('solutions');
  var paquet = document.getElementById('solutions-chiffre'), fermer = document.getElementById('verrou-fermer');
  function b64(s) { var x = atob(s), u = new Uint8Array(x.length); for (var i = 0; i < x.length; i++) u[i] = x.charCodeAt(i); return u; }
  function ouvrir(code) {
    var p = JSON.parse(paquet.textContent), enc = new TextEncoder();
    var propre = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.subtle.importKey('raw', enc.encode(propre), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(p.sel), iterations: p.iter, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (cle) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.iv) }, cle, b64(p.donnees)); })
      .then(function (clair) {
        boite.innerHTML = new TextDecoder().decode(clair);
        boite.hidden = false; verrou.hidden = true; if (fermer) fermer.hidden = false;
        try { localStorage.setItem('lpqa-code-solutions', propre); } catch (e) {}
        var vise = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));   // un lien partage vers une piece ou une etape
        if (vise && boite.contains(vise)) {
          for (var d = vise; d && d !== boite; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
          vise.scrollIntoView({ block: 'start' });
        }
      });
  }
  if (verrou && boite && paquet && window.crypto && crypto.subtle) {
    var note = verrou.querySelector('.verrou-note');
    verrou.addEventListener('submit', function (e) {
      e.preventDefault();
      note.textContent = verrou.dataset.calcul;
      ouvrir(verrou.querySelector('input').value).catch(function () { note.textContent = verrou.dataset.faux; });
    });
    var garde = null; try { garde = localStorage.getItem('lpqa-code-solutions'); } catch (e) {}
    if (garde) ouvrir(garde).catch(function () { try { localStorage.removeItem('lpqa-code-solutions'); } catch (e) {} });
    /* Les renvois internes des solutions (sommaire, pièce par pièce -> étape) visent souvent un bloc replié :
       on ouvre ses <details> parents avant de faire défiler, sinon le lien ne mène nulle part. */
    /* LE GUIDE VIDEO : chaque video est chiffree ; la cle est dans le contenu dechiffre. On ne telecharge et ne
       dechiffre une video qu'au clic, pour ne pas faire venir 32 videos a l'ouverture. */
    boite.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.sol-video-lire') : null;
      if (!b) return;
      var bloc = b.parentElement, cleEl = document.getElementById('cle-videos');
      if (!cleEl || bloc.dataset.charge) return;
      bloc.dataset.charge = '1'; b.disabled = true; b.classList.add('attend');
      crypto.subtle.importKey('raw', b64(cleEl.dataset.cle), 'AES-GCM', false, ['decrypt'])
        .then(function (cle) {
          return fetch(bloc.dataset.src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(function (buf) { var u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, cle, u.slice(12)); });
        })
        .then(function (clair) {
          var v = document.createElement('video');
          v.src = URL.createObjectURL(new Blob([clair], { type: 'video/mp4' }));
          v.controls = true; v.playsInline = true; v.preload = 'auto';
          bloc.innerHTML = ''; bloc.appendChild(v);
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        })
        .catch(function () { delete bloc.dataset.charge; b.disabled = false; b.classList.remove('attend'); });
    });
    boite.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var cible = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (!cible || !boite.contains(cible)) return;
      e.preventDefault();
      for (var d = cible; d && d !== boite; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
      cible.scrollIntoView({ block: 'start' });
      cible.classList.add('vise'); setTimeout(function () { cible.classList.remove('vise'); }, 1800);
      try { history.replaceState(null, '', '#' + cible.id); } catch (err) {}
    });
    if (fermer) fermer.addEventListener('click', function () {
      try { localStorage.removeItem('lpqa-code-solutions'); } catch (e) {}
      boite.innerHTML = ''; boite.hidden = true; verrou.hidden = false; fermer.hidden = true;
      verrou.querySelector('input').value = ''; note.textContent = '';
    });
  }

  /* LE PROCES-VERBAL : un mot caviarde se lit en le touchant (pas tous). */
  document.querySelectorAll('.caviar:not(.fixe)').forEach(function (c) {
    c.addEventListener('click', function () { c.classList.toggle('lu'); });
  });

  /* L'AMBIANCE SONORE : celle du jeu, seulement apres un geste du visiteur. */
  var son = document.querySelector('.son-bouton'), audio = null;
  if (son) son.addEventListener('click', function () {
    if (!audio) { audio = new Audio(son.dataset.src); audio.loop = true; audio.volume = 0.55; }
    var on = son.getAttribute('aria-pressed') !== 'true';
    if (on) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } else audio.pause();
    son.setAttribute('aria-pressed', on ? 'true' : 'false');
    son.setAttribute('aria-label', on ? son.dataset.on : son.dataset.off);
  });

  /* LA LAMPE : le noir couvre la piece, le faisceau suit la souris ou le doigt. La pile se vide quand on eclaire ;
     vide, le faisceau se reduit a une lueur qui tremble, jusqu'a ce qu'on change la pile. Au repos, le faisceau
     balaie lentement la piece (sauf si le visiteur a demande moins d'animations). */
  var torche = document.querySelector('.torche');
  if (torche) {
    var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var jauge = torche.querySelector('.jauge i'), pc = torche.querySelector('.pc'), recharger = torche.querySelector('.torche-recharger');
    var pile = 1, actif = false, dernier = 0, t0 = performance.now(), rayonPlein = 0;
    function rayon() { return torche.clientWidth < 700 ? 130 : 190; }
    function poser(x, y) { torche.style.setProperty('--x', x + 'px'); torche.style.setProperty('--y', y + 'px'); }
    function afficher() {
      torche.style.setProperty('--pile', pile.toFixed(3));
      pc.textContent = Math.round(pile * 100) + ' %';
      torche.classList.toggle('faible', pile < 0.25);
    }
    torche.addEventListener('pointermove', function (e) {
      var r = torche.getBoundingClientRect(); poser(e.clientX - r.left, e.clientY - r.top); actif = true; dernier = performance.now();
    });
    torche.addEventListener('pointerleave', function () { actif = false; });
    recharger.addEventListener('click', function () { pile = 1; recharger.hidden = true; torche.classList.remove('vide'); afficher(); });
    function boucle(t) {
      var dt = Math.min(0.05, (t - (boucle.t || t)) / 1000); boucle.t = t;
      var r = rayon();
      if (actif && t - dernier < 1500 && pile > 0) pile = Math.max(0, pile - dt / 14);     // 14 s de lumiere par pile
      if (pile <= 0) {
        if (recharger.hidden) { recharger.hidden = false; torche.classList.add('vide'); }
        r = reduit ? 34 : 26 + Math.random() * 20;                                        // une lueur qui tremble
      } else if (pile < 0.25 && !reduit && Math.random() < 0.08) r *= 0.55;               // la pile faiblit : le faisceau hoquette
      torche.style.setProperty('--r', r + 'px');
      if (!actif && !reduit) {                                                             // au repos : un balayage lent
        var k = (t - t0) / 1000, w = torche.clientWidth, h = torche.clientHeight;
        poser(w * (0.5 + 0.28 * Math.sin(k * 0.35)), h * (0.55 + 0.12 * Math.sin(k * 0.5)));
      }
      afficher();
      requestAnimationFrame(boucle);
    }
    afficher();
    requestAnimationFrame(boucle);
  }

  var lecture = document.querySelector('.ecran .lecture');
  if (lecture) lecture.addEventListener('click', function () {
    var src = lecture.dataset.video;
    if (!src) return;
    var v = document.createElement('video');
    v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true;
    var ecran = lecture.parentNode; ecran.innerHTML = ''; ecran.appendChild(v);
  });
})();
