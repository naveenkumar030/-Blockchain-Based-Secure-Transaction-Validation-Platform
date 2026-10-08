/* ---------- Shared behaviour for Login + Register ---------- */

(function(){
  const blobLayer = document.getElementById('blobLayer');
  const blob = document.getElementById('blob');
  const stage = document.getElementById('stage');
  const card = document.querySelector('.glass-card');
  const fieldCanvas = document.getElementById('fieldCanvas');

  /* ---- Magnetic field lines: faint curves that bend toward the cursor,
     as if the blob's glow has a gentle gravitational pull on the space around it ---- */
  let rawX = window.innerWidth / 2, rawY = window.innerHeight / 2;
  let pullX = rawX, pullY = rawY;

  if(fieldCanvas){
    const ctx = fieldCanvas.getContext('2d');
    let w, h;

    function resizeCanvas(){
      w = fieldCanvas.width = window.innerWidth;
      h = fieldCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('mousemove', (e) => {
      rawX = e.clientX;
      rawY = e.clientY;
    });

    const ROWS = 7, COLS = 11;

    function drawField(){
      pullX += (rawX - pullX) * 0.04;
      pullY += (rawY - pullY) * 0.04;

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(162,213,198,0.5)';
      ctx.lineWidth = 1;

      const stepX = w / COLS;
      const stepY = h / ROWS;

      for(let r = 0; r <= ROWS; r++){
        ctx.beginPath();
        for(let c = 0; c <= COLS; c++){
          const baseX = c * stepX;
          const baseY = r * stepY;
          const dx = pullX - baseX;
          const dy = pullY - baseY;
          const dist = Math.sqrt(dx*dx + dy*dy) + 1;
          const pull = Math.min(2200 / dist, 26);
          const px = baseX + (dx / dist) * pull;
          const py = baseY + (dy / dist) * pull;
          if(c === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      requestAnimationFrame(drawField);
    }
    drawField();
  }

  /* ---- Ambient mouse parallax (idle atmosphere, gently offsets the blob layer) ---- */
  let mouseX = 0, mouseY = 0, curX = 0, curY = 0;
  let focusOverride = false;

  window.addEventListener('mousemove', (e) => {
    if(focusOverride) return;
    mouseX = (e.clientX / window.innerWidth - 0.5) * 36;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 36;
  });

  function ambientLoop(){
    if(!focusOverride){
      curX += (mouseX - curX) * 0.05;
      curY += (mouseY - curY) * 0.05;
      blobLayer.style.transform = `translate(${curX}px, ${curY}px)`;
    }
    requestAnimationFrame(ambientLoop);
  }
  ambientLoop();

  window.setBlobState = function(stateClass){
    blobLayer.classList.remove('focus-a','focus-b','focus-c','focus-btn');
    if(stateClass){
      focusOverride = true;
      blobLayer.style.transform = '';
      blobLayer.classList.add(stateClass);
    } else {
      focusOverride = false;
    }
  };

  /* ---- Success particle burst: small dots fling outward from the blob ---- */
  window.fireParticleBurst = function(){
    const burst = document.createElement('div');
    burst.className = 'particle-burst';
    document.querySelector('.stage').appendChild(burst);

    const count = 14;
    for(let i = 0; i < count; i++){
      const p = document.createElement('span');
      p.className = 'particle';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = 90 + Math.random() * 110;
      p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
      p.style.background = i % 2 === 0 ? 'var(--sage)' : 'var(--mint)';
      p.style.animationDelay = (Math.random() * 0.1) + 's';
      burst.appendChild(p);
    }
    setTimeout(() => burst.remove(), 1100);
  };

  /* ---- Floating label wiring: call on every text input ---- */
  window.wireFloatingField = function(input, focusState){
    const field = input.closest('.field');

    const syncVal = () => field.classList.toggle('has-val', input.value.length > 0);

    input.addEventListener('focus', () => window.setBlobState(focusState));
    input.addEventListener('blur', () => window.setBlobState(null));
    input.addEventListener('input', syncVal);

    // Catches browser/password-manager autofill, which often fills
    // a value without firing a real 'input' event.
    input.addEventListener('animationstart', (e) => {
      if(e.animationName === 'onAutoFillStart' || e.animationName === 'onAutoFillCancel'){
        syncVal();
      }
    });

    // Catches values already present on attach (e.g. back/forward
    // navigation restoring a filled form, or autofill that landed
    // before this listener was wired up).
    syncVal();
    // Autofill in some browsers (esp. Chrome) can land a tick after
    // the page is considered "loaded" — re-check shortly after too.
    setTimeout(syncVal, 400);
  };

  /* ---- Caps lock detection ---- */
  window.wireCapsHint = function(input, hintEl){
    input.addEventListener('keyup', (e) => {
      const caps = e.getModifierState && e.getModifierState('CapsLock');
      hintEl.classList.toggle('show', !!caps);
    });
    input.addEventListener('blur', () => hintEl.classList.remove('show'));
  };

  /* ---- Password show/hide toggle ---- */
  window.wirePasswordToggle = function(btn, input, iconEl){
    let visible = false;
    btn.addEventListener('click', () => {
      visible = !visible;
      input.type = visible ? 'text' : 'password';
      iconEl.innerHTML = visible
        ? '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.6 18.6 0 0 1 4.22-5.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
    });
  };

  /* ---- Ripple on submit button ---- */
  window.wireRipple = function(btn){
    btn.addEventListener('click', function(e){
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  };

  /* ---- Shake helper for invalid fields ---- */
  window.shakeField = function(field){
    field.classList.add('shake');
    setTimeout(() => field.classList.remove('shake'), 450);
  };

  /* ---- Smooth cross-page navigation (fade/scale out, then go) ---- */
  window.navigateTo = function(url){
    stage.classList.add('leaving');
    if(card) card.classList.add('exiting');
    setTimeout(() => { window.location.href = url; }, 420);
  };

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.navigateTo(link.getAttribute('data-nav'));
    });
  });

  /* ---- Generic success-morph submit sequence ----
     formEl: the <form>
     fields: array of {input, field} required fields to validate
     onSuccess: callback fired once button reaches success state (e.g. navigate away)
  */
  window.wireSubmit = function({ formEl, btn, btnLabel, requiredFields, successText, onSuccess }){
    formEl.addEventListener('submit', async function(e){
      e.preventDefault();
      let valid = true;
      requiredFields.forEach(({ input, field }) => {
        if(input.value.trim() === ''){
          window.shakeField(field);
          valid = false;
        }
      });
      if(!valid){ window.setBlobState(null); return; }

      window.setBlobState('focus-btn');
      btn.disabled = true;
      const originalText = btnLabel.textContent;
      btnLabel.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';

      if (onSuccess) {
        try {
          const isOk = await onSuccess();
          if (isOk) {
            btn.classList.add('is-success');
            window.fireParticleBurst();
            await new Promise(r => setTimeout(r, 800));
          } else {
            btnLabel.textContent = originalText;
            btn.classList.remove('is-success');
            btn.disabled = false;
            window.setBlobState(null);
          }
        } catch (err) {
          btnLabel.textContent = originalText;
          btn.classList.remove('is-success');
          btn.disabled = false;
          window.setBlobState(null);
        }
      } else {
        setTimeout(() => {
          btn.classList.add('is-success');
          window.fireParticleBurst();
        }, 900);

        setTimeout(() => {
          btnLabel.textContent = successText || 'Done';
          btn.classList.remove('is-success');
          btn.disabled = false;
          window.setBlobState(null);
        }, 1700);
      }
    });
  };

})();