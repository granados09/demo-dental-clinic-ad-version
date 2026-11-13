/* =====================================================================
   CAPA GRANADOS AI: versión de la demo para el anuncio.
   No toca el código del sistema de ejemplo. Solo agrega encima:
   bienvenida, recorrido, agenda de reuniones, notas de precio y protección.
   ===================================================================== */
(function(){
'use strict';

/* ---------- CONFIGURACIÓN (lo único que se edita) ---------- */
var CFG = {
  // URL de la aplicación web de Google Apps Script que guarda las reuniones
  // en el calendario de contact@granadosai.net. Ver CONEXION-CALENDARIO.md.
  bookingUrl: 'https://script.google.com/macros/s/AKfycbzzCWrUWBkiA9CYI0LReMorvQbUlF1FLUtNKGRnYmyiPIghAhBxA-l8GXuwqiQL6FtK/exec',
  // ID del Pixel de Meta. Vacío = no se carga.
  pixelId: '',
  // Horarios de reunión, de lunes a viernes, hora de Guatemala (minutos desde medianoche).
  slots: [480, 540, 600, 660, 720, 960, 1020],
  slotMin: 30,
  // Cuántos horarios por día se muestran como ocupados (varía entre uno menos y uno más).
  takenPerDay: 3,
  // Cuántos días hábiles se pueden elegir.
  days: 10,
  // Un horario deja de estar disponible si falta menos de este tiempo (minutos).
  leadMin: 120,
  email: 'contact@granadosai.net'
};

/* ---------- utilidades ---------- */
var $ = function(s, el){ return (el || document).querySelector(s); };
var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
var GT = 6 * 60; // Guatemala es UTC-6 todo el año
var WD = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
var WDL = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
var MO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var MOL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function gtTodayIso(){ return new Date(Date.now() - GT * 60000).toISOString().slice(0, 10); }
function parts(iso){ var a = iso.split('-').map(Number); return {y:a[0], m:a[1]-1, d:a[2], wd:new Date(Date.UTC(a[0], a[1]-1, a[2])).getUTCDay()}; }
function addDays(iso, n){ var p = parts(iso); return new Date(Date.UTC(p.y, p.m, p.d + n)).toISOString().slice(0, 10); }
function slotStart(iso, min){ var p = parts(iso); return Date.UTC(p.y, p.m, p.d) + (min + GT) * 60000; }
function hhmm(min){ var h = Math.floor(min/60), m = min % 60, h12 = ((h + 11) % 12) + 1; return h12 + ':' + String(m).padStart(2,'0') + (h < 12 ? ' a.m.' : ' p.m.'); }
function longDate(iso){ var p = parts(iso); return WDL[p.wd] + ' ' + p.d + ' de ' + MOL[p.m]; }
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
var IC = {
  cal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/></svg>',
  x:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  info:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/></svg>'
};

/* ---------- textos ---------- */
var T = {
  custom: 'Esto es solo una demostración. Su sistema se hace a la medida de su clínica: agregamos lo que necesite y quitamos lo que no use. Todo eso va incluido en el precio.',
  cta: 'Quiero este sistema en mi clínica',
  ctaSub: 'Reunión gratis de 30 minutos por Google Meet.',
  whatsapp: 'WhatsApp es opcional. Si lo quiere, nosotros configuramos todo y la bandeja de conversaciones va incluida en su sistema. Lo único aparte es el uso de WhatsApp, que usted le paga directo a Meta.',
  gpt: 'Su sistema se conecta con ChatGPT o con Claude, el que usted prefiera. La conexión va incluida. Cada persona usa su propio plan de ChatGPT o Claude, de unos $20 al mes.',
  ai: 'El asistente de IA dentro del sistema es un extra opcional: Q2,000 de instalación y desde Q168 al mes, según lo que use.'
};

/* ---------- Pixel de Meta ---------- */
function track(ev, data){ try{ if(window.fbq) window.fbq('track', ev, data || {}); }catch(e){} }
(function pixel(){
  if(!CFG.pixelId) return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', CFG.pixelId); window.fbq('track', 'PageView');
})();

/* ---------- estructura base ---------- */
document.body.classList.add('gx-on');
var root = document.createElement('div'); root.id = 'gx-root';
root.innerHTML = '<div class="gx-wm" aria-hidden="true"></div>' +
  '<div class="gx-cta" id="gx-cta"><button type="button" class="gx-btn gx-pri" data-gx="book">' + IC.cal + '<span>' + T.cta + '</span></button><button type="button" class="gx-btn gx-quiet" data-gx="info">Qué incluye</button></div>' +
  '<div id="gx-layer"></div><div id="gx-tour"></div>' +
  '<div class="gx-shield" id="gx-shield" role="status"><div><b>Demostración protegida</b><span>Toque la pantalla para seguir viendo el sistema.</span></div></div>';
document.body.appendChild(root);
var layer = $('#gx-layer'), tourEl = $('#gx-tour');
function busy(on){ document.body.classList.toggle('gx-busy', on); }
function closeLayer(){ layer.innerHTML = ''; document.body.style.overflow = ''; busy(!!tourEl.innerHTML); }
function openLayer(html, wide, label){
  layer.innerHTML = '<div class="gx-ov" data-gx-ov><div class="gx-sheet' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div></div>';
  document.body.style.overflow = 'hidden'; busy(true);
  var f = $('[data-autofocus]', layer); if(f) setTimeout(function(){ try{ f.focus({preventScroll:true}); }catch(e){} }, 60);
}
var xBtn = '<button type="button" class="gx-x" data-gx="close" aria-label="Cerrar">' + IC.x + '</button>';

/* ---------- bienvenida ---------- */
function welcome(){
  openLayer(
    '<div class="gx-by"><i></i>Demostración de Granados AI</div>' +
    '<h1 class="gx-h1">Pruebe el sistema para su clínica dental. Es gratis.</h1>' +
    '<p class="gx-p">Esta es una clínica de ejemplo. Vea las citas con recordatorio por WhatsApp, los pacientes y los cobros en un solo lugar. Toque lo que quiera, nada se rompe.</p>' +
    '<p class="gx-note">' + T.custom + '</p>' +
    '<div class="gx-row"><button type="button" class="gx-btn gx-pri" data-gx="tour">Ver recorrido de 1 minuto</button><button type="button" class="gx-btn gx-sec" data-gx="explore">Explorar por mi cuenta</button></div>',
    false, 'Bienvenida');
}

/* ---------- recorrido ---------- */
var firstPatient = 1;
var STEPS = [
  {go:'agenda', h:'Su agenda del día', p:'Cada doctor y cada sillón en una sola pantalla. El paciente confirma su cita por WhatsApp, así ya no se le olvida.'},
  {go:'conversaciones', h:'Todos sus mensajes en un lugar', p:'Los WhatsApp de sus pacientes llegan aquí. Cada conversación tiene un responsable, así ninguna se queda sin respuesta.'},
  {go:function(){ return 'paciente-' + firstPatient; }, h:'El expediente completo', p:'Odontograma, recetas, consentimientos firmados, archivos y pagos de cada paciente. Todo junto.'},
  {go:'presupuestos', h:'Presupuestos que sí se cierran', p:'Vea qué paciente no ha respondido y dele seguimiento hasta que acepte.'},
  {go:'caja', h:'Cobre y facture en un solo paso', p:'Cobra, sale la factura FEL y al final del día cierra caja. Ningún cobro se pierde.'},
  {go:'ventas', h:'Cuánto vendió y cuánto ganó', p:'Hoy, esta semana y este mes. Lo ve desde su celular.'},
  {go:'inicio', h:'Así se vería en su clínica', p:T.custom, last:true}
];
var step = -1;
function tourRender(){
  var s = STEPS[step], n = STEPS.length;
  tourEl.innerHTML = '<div class="gx-tour" role="dialog" aria-label="Recorrido guiado">' +
    '<div class="gx-tour-top"><span>Paso ' + (step + 1) + ' de ' + n + '</span><button type="button" class="gx-link" data-gx="tour-end">Salir del recorrido</button></div>' +
    '<div class="gx-bar"><i style="width:' + Math.round((step + 1) / n * 100) + '%"></i></div>' +
    '<h3>' + s.h + '</h3><p>' + s.p + '</p>' +
    '<div class="gx-tour-nav">' + (step > 0 ? '<button type="button" class="gx-btn gx-sec" data-gx="tour-prev">Atrás</button>' : '') +
    (s.last ? '<button type="button" class="gx-btn gx-pri" data-gx="book">' + IC.cal + '<span>' + T.cta + '</span></button>' : '<button type="button" class="gx-btn gx-pri" data-gx="tour-next">Siguiente</button>') + '</div></div>';
}
function tourGo(i){
  step = i; var s = STEPS[i], h = typeof s.go === 'function' ? s.go() : s.go;
  document.body.classList.add('gx-touring'); busy(true);
  if(decodeURIComponent(location.hash.replace(/^#/, '')) !== h) location.hash = h; else window.scrollTo(0, 0);
  tourRender();
}
function tourEnd(){ step = -1; tourEl.innerHTML = ''; document.body.classList.remove('gx-touring'); busy(!!layer.innerHTML); }

/* ---------- agenda de reuniones ---------- */
var B = {day:null, slot:null, busyReal:[], loaded:false, sending:false, err:'', form:{name:'', clinic:'', phone:'', email:''}};
function dayList(){
  var out = [], d = gtTodayIso(), guard = 0;
  while(out.length < CFG.days && guard++ < 40){ var wd = parts(d).wd; if(wd >= 1 && wd <= 5) out.push(d); d = addDays(d, 1); }
  return out;
}
function fakeTaken(iso){
  var r = rng(+iso.replace(/-/g, '')), idx = CFG.slots.map(function(_, i){ return i; });
  for(var i = idx.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  // Entre uno menos y uno más que takenPerDay, para que los días no se vean todos iguales.
  var n = CFG.takenPerDay + Math.floor(r() * 3) - 1;
  return idx.slice(0, Math.max(1, Math.min(CFG.slots.length - 2, n)));
}
function isTaken(iso, i){
  var st = slotStart(iso, CFG.slots[i]), en = st + CFG.slotMin * 60000;
  if(st < Date.now() + CFG.leadMin * 60000) return true;
  if(fakeTaken(iso).indexOf(i) >= 0) return true;
  return B.busyReal.some(function(b){ return st < b[1] && b[0] < en; });
}
function freeCount(iso){ var n = 0; CFG.slots.forEach(function(_, i){ if(!isTaken(iso, i)) n++; }); return n; }
function loadBusy(){
  if(!CFG.bookingUrl || B.loaded) return;
  var ds = dayList(), from = new Date(slotStart(ds[0], 0)).toISOString(), to = new Date(slotStart(addDays(ds[ds.length - 1], 1), 0)).toISOString();
  fetch(CFG.bookingUrl + '?action=busy&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to))
    .then(function(r){ return r.json(); })
    .then(function(j){ if(j && j.ok && Array.isArray(j.busy)){ B.busyReal = j.busy; B.loaded = true; if($('.gx-book', layer)){ if(B.day && B.slot != null && isTaken(B.day, B.slot)) B.slot = null; bookRender(); } } })
    .catch(function(){});
}
function bookOpen(){
  var ds = dayList();
  if(!B.day || ds.indexOf(B.day) < 0) B.day = ds.filter(function(d){ return freeCount(d) > 0; })[0] || ds[0];
  B.err = ''; bookRender(true); loadBusy(); track('Lead', {content_name:'abrir agenda'});
}
function capture(){ ['name','clinic','phone','email'].forEach(function(k){ var el = $('#gx-' + k, layer); if(el) B.form[k] = el.value; }); }
function bookRender(first){
  if(!first) capture();
  var ds = dayList(), sel = B.day, chosen = B.slot != null && !isTaken(sel, B.slot);
  if(!chosen) B.slot = null;
  var days = ds.map(function(d){ var p = parts(d), n = freeCount(d);
    return '<button type="button" class="gx-day' + (d === sel ? ' on' : '') + '" data-gx="day" data-d="' + d + '" aria-pressed="' + (d === sel) + '"><span>' + WD[p.wd] + '</span><b>' + p.d + '</b><em>' + (n ? n + (n === 1 ? ' libre' : ' libres') : 'Lleno') + '</em></button>'; }).join('');
  var slots = CFG.slots.map(function(m, i){
    if(isTaken(sel, i)) return '<button type="button" class="gx-slot taken" disabled aria-label="' + hhmm(m) + ', ocupado"><s>' + hhmm(m) + '</s><small>Ocupado</small></button>';
    return '<button type="button" class="gx-slot' + (B.slot === i ? ' on' : '') + '" data-gx="slot" data-i="' + i + '" aria-pressed="' + (B.slot === i) + '">' + hhmm(m) + '</button>'; }).join('');
  var f = B.form, when = chosen ? longDate(sel) + ', ' + hhmm(CFG.slots[B.slot]) : '';
  var form = !chosen ? '<p class="gx-fine">Elija una hora libre para continuar.</p>' :
    '<div class="gx-lbl">Sus datos</div><div class="gx-form">' +
    '<div class="gx-f"><label for="gx-name">Su nombre</label><input class="gx-in" id="gx-name" autocomplete="name" value="' + esc(f.name) + '"></div>' +
    '<div class="gx-f"><label for="gx-clinic">Nombre de su clínica</label><input class="gx-in" id="gx-clinic" autocomplete="organization" value="' + esc(f.clinic) + '"></div>' +
    '<div class="gx-f"><label for="gx-phone">Su WhatsApp</label><div class="gx-tel"><span>+502</span><input class="gx-in" id="gx-phone" inputmode="tel" autocomplete="tel-national" placeholder="5555 5555" value="' + esc(f.phone) + '"></div></div>' +
    '<div class="gx-f"><label for="gx-email">Su correo (opcional, para el enlace de Meet)</label><input class="gx-in" id="gx-email" type="email" inputmode="email" autocomplete="email" placeholder="nombre@correo.com" value="' + esc(f.email) + '"></div>' +
    '<input class="gx-hp" id="gx-web" tabindex="-1" autocomplete="off" aria-hidden="true"></div>' +
    (B.err ? '<div class="gx-err" role="alert">' + B.err + '</div>' : '') +
    '<button type="button" class="gx-btn gx-pri gx-go" data-gx="send"' + (B.sending ? ' disabled' : '') + '>' + (B.sending ? 'Guardando su reunión' : 'Confirmar reunión: ' + when) + '</button>' +
    '<p class="gx-fine">Si otra persona decide la compra con usted, invítela a la reunión. <button type="button" class="gx-link" data-gx="info">Ver qué incluye el precio</button></p>';
  var html = xBtn + '<div class="gx-book"><h2 class="gx-h2">Agende su reunión gratis</h2><p class="gx-sub">30 minutos por Google Meet. Sin compromiso.</p>' +
    '<div class="gx-lbl">Elija un día</div><div class="gx-days" id="gx-days">' + days + '</div>' +
    '<div class="gx-lbl">Elija una hora<small>Hora de Guatemala</small></div><div class="gx-slots">' + slots + '</div>' + form + '</div>';
  var open = $('.gx-book', layer), sh = $('.gx-sheet', layer);
  if(open && sh){
    var top = sh.scrollTop, dl = $('#gx-days', layer), left = dl ? dl.scrollLeft : 0, act = document.activeElement && document.activeElement.id;
    sh.innerHTML = html; sh.scrollTop = top; dl = $('#gx-days', layer); if(dl) dl.scrollLeft = left;
    if(act && /^gx-(name|clinic|phone|email)$/.test(act)){ var el = document.getElementById(act); if(el) el.focus(); }
  } else {
    openLayer(html, true, 'Agendar reunión');
    var on = $('.gx-day.on', layer), dl2 = $('#gx-days', layer); if(on && dl2) dl2.scrollLeft = Math.max(0, on.offsetLeft - dl2.offsetLeft - 4);
  }
}
function bookSend(){
  capture();
  var f = B.form, name = f.name.trim(), clinic = f.clinic.trim(), phone = f.phone.replace(/[^\d]/g, ''), email = f.email.trim(), bad = '';
  if(!name) bad = 'name'; else if(!clinic) bad = 'clinic'; else if(phone.length < 8 || phone.length > 12) bad = 'phone'; else if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad = 'email';
  if(bad){ B.err = {name:'Escriba su nombre.', clinic:'Escriba el nombre de su clínica.', phone:'Escriba su número de WhatsApp con 8 dígitos.', email:'Revise su correo, parece incompleto.'}[bad]; bookRender(); var el = $('#gx-' + bad, layer); if(el){ el.classList.add('bad'); el.focus(); } return; }
  if($('#gx-web', layer) && $('#gx-web', layer).value) return;
  if(B.slot == null || isTaken(B.day, B.slot)){ B.slot = null; B.err = 'Ese horario ya no está libre. Elija otro.'; bookRender(); return; }
  if(!CFG.bookingUrl){ B.err = 'La agenda todavía no está conectada al calendario, así que esta reunión no se guardó. Escríbanos a <a href="mailto:' + CFG.email + '">' + CFG.email + '</a> y la agendamos.'; bookRender(); return; }
  var day = B.day, min = CFG.slots[B.slot], st = slotStart(day, min);
  B.sending = true; B.err = ''; bookRender();
  fetch(CFG.bookingUrl, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'book', name:name, clinic:clinic, phone:'+502 ' + phone, email:email, start:new Date(st).toISOString(), source:'demo dental, anuncio'})})
    .then(function(r){ return r.json(); })
    .then(function(j){
      B.sending = false;
      if(j && j.ok){ track('Schedule', {content_name:'reunión agendada'}); bookDone(day, min, !!email); return; }
      if(j && j.code === 'taken'){ B.busyReal.push([st, st + CFG.slotMin * 60000]); B.slot = null; B.err = 'Ese horario acaba de ocuparse. Elija otro de la lista.'; }
      else B.err = 'No pudimos guardar su reunión. Inténtelo de nuevo o escríbanos a <a href="mailto:' + CFG.email + '">' + CFG.email + '</a>.';
      bookRender();
    })
    .catch(function(){ B.sending = false; B.err = 'No pudimos guardar su reunión. Revise su internet e inténtelo de nuevo, o escríbanos a <a href="mailto:' + CFG.email + '">' + CFG.email + '</a>.'; bookRender(); });
}
function bookDone(day, min, hasEmail){
  B.busyReal.push([slotStart(day, min), slotStart(day, min) + CFG.slotMin * 60000]); B.slot = null;
  var w = longDate(day); w = w.charAt(0).toUpperCase() + w.slice(1);
  openLayer(xBtn + '<div class="gx-ok"><div class="gx-tick">' + IC.check + '</div><h2 class="gx-h2" style="padding:0">Su reunión quedó agendada</h2>' +
    '<div class="gx-when">' + w + ', ' + hhmm(min) + '</div>' +
    '<p class="gx-p">Le escribiremos por WhatsApp para confirmar.' + (hasEmail ? ' También le llegará a su correo la invitación con el enlace de Google Meet.' : '') + '</p>' +
    '<p class="gx-p">Si otra persona decide la compra con usted, invítela a la reunión.</p>' +
    '<div class="gx-row" style="justify-content:center"><button type="button" class="gx-btn gx-pri" data-gx="close" style="flex:0 1 280px">Seguir viendo el sistema</button></div></div>', false, 'Reunión agendada');
}

/* ---------- qué incluye ---------- */
function info(){
  openLayer(xBtn + '<h2 class="gx-h2">Qué incluye su sistema</h2><div class="gx-inc">' +
    '<div><h4>Hecho a la medida de su clínica</h4><p>' + T.custom + '</p></div>' +
    '<div><h4>WhatsApp</h4><p>' + T.whatsapp + '</p></div>' +
    '<div><h4>ChatGPT o Claude</h4><p>' + T.gpt + '</p></div>' +
    '<div><h4>Asistente de IA dentro del sistema</h4><p>' + T.ai + '</p></div></div>' +
    '<div class="gx-row"><button type="button" class="gx-btn gx-pri" data-gx="book">' + IC.cal + '<span>' + T.cta + '</span></button></div>', true, 'Qué incluye');
}

/* ---------- notas dentro de las pantallas ---------- */
var TIPS = {conversaciones:T.whatsapp, bandeja:T.whatsapp, asistente:T.ai + ' La conexión con ChatGPT o Claude sí va incluida.'};
var view = document.getElementById('view');
function tip(){
  if(!view) return;
  var h = decodeURIComponent(location.hash.replace(/^#/, '')), txt = TIPS[h], cur = $('.gx-tip', view);
  if(!txt){ if(cur) cur.remove(); return; }
  if(cur && cur.dataset.k === h) return;
  if(cur) cur.remove();
  var el = document.createElement('div'); el.className = 'gx-tip'; el.dataset.k = h; el.innerHTML = IC.info + '<span>' + txt + '</span>';
  view.insertBefore(el, view.firstChild);
}
if(view){ new MutationObserver(function(){ tip(); }).observe(view, {childList:true}); tip(); }

/* ---------- protección contra copias ---------- */
var shield = $('#gx-shield'), fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches, shT = null;
function shieldOn(ms){ shield.classList.add('on'); clearTimeout(shT); if(ms) shT = setTimeout(shieldOff, ms); }
function shieldOff(){ shield.classList.remove('on'); clearTimeout(shT); }
var editable = function(t){ return t && t.closest && t.closest('input,textarea,select'); };
document.addEventListener('contextmenu', function(e){ if(!editable(e.target)) e.preventDefault(); });
['copy','cut','dragstart'].forEach(function(ev){ document.addEventListener(ev, function(e){ if(!editable(e.target)) e.preventDefault(); }); });
document.addEventListener('keyup', function(e){ if(e.key === 'PrintScreen'){ shieldOn(1600); try{ navigator.clipboard && navigator.clipboard.writeText(''); }catch(_){} } });
document.addEventListener('keydown', function(e){
  var k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if(e.key === 'PrintScreen'){ shieldOn(1600); return; }
  if(mod && (k === 'p' || k === 's' || k === 'u')){ e.preventDefault(); return; }
  if(e.metaKey && e.shiftKey && (k === '3' || k === '4' || k === '5' || k === 's')){ shieldOn(2500); return; }
  if(e.key === 'Escape' && layer.innerHTML){ if($('.gx-book', layer) || $('.gx-inc', layer) || $('.gx-ok', layer)) closeLayer(); else { closeLayer(); try{ sessionStorage.setItem('gx-seen','1'); }catch(_){} } }
}, true);
if(fine){ window.addEventListener('blur', function(){ shieldOn(); }); window.addEventListener('focus', shieldOff); }
document.addEventListener('visibilitychange', function(){ if(document.hidden) shieldOn(); else shieldOff(); });
shield.addEventListener('pointerdown', shieldOff);
window.addEventListener('pageshow', shieldOff);

/* ---------- acciones ---------- */
document.addEventListener('click', function(e){
  if(e.target.hasAttribute && e.target.hasAttribute('data-gx-ov')){ var bk = $('.gx-book', layer) || $('.gx-inc', layer) || $('.gx-ok', layer); if(bk) closeLayer(); return; }
  var el = e.target.closest && e.target.closest('[data-gx]'); if(!el) return;
  var a = el.dataset.gx;
  if(a === 'book'){ if(step >= 0) tourEnd(); bookOpen(); }
  else if(a === 'info'){ capture(); info(); }
  else if(a === 'close'){ closeLayer(); }
  else if(a === 'tour'){ closeLayer(); try{ sessionStorage.setItem('gx-seen','1'); }catch(_){} track('ViewContent', {content_name:'recorrido'}); tourGo(0); }
  else if(a === 'explore'){ closeLayer(); try{ sessionStorage.setItem('gx-seen','1'); }catch(_){} }
  else if(a === 'tour-next'){ if(step < STEPS.length - 1) tourGo(step + 1); }
  else if(a === 'tour-prev'){ if(step > 0) tourGo(step - 1); }
  else if(a === 'tour-end'){ tourEnd(); }
  else if(a === 'day'){ capture(); B.day = el.dataset.d; B.slot = null; B.err = ''; bookRender(); }
  else if(a === 'slot'){ capture(); B.slot = +el.dataset.i; B.err = ''; bookRender(); var n = $('#gx-name', layer); if(n && !B.form.name && fine) n.focus(); }
  else if(a === 'send'){ if(!B.sending) bookSend(); }
});

/* ---------- inicio ---------- */
(function findPatient(){ try{ var a = document.querySelector('a[href^="#paciente-"]'); if(a) firstPatient = +a.getAttribute('href').replace('#paciente-', '') || 1; }catch(e){} })();
var seen = false; try{ seen = sessionStorage.getItem('gx-seen') === '1'; }catch(e){}
if(!seen) welcome();
})();
