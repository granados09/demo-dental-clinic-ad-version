/**
 * Agenda de reuniones de la demo dental (Granados AI).
 *
 * Esta aplicación web corre con la cuenta de Google que la publica
 * (contact@granadosai.net) y hace dos cosas:
 *   1. GET  ?action=busy&from=ISO&to=ISO  -> devuelve los periodos ocupados del calendario.
 *   2. POST {action:"book", ...}          -> crea la reunión con enlace de Google Meet.
 *
 * Requisito: activar el servicio avanzado "Google Calendar API" (Servicios > +).
 * Instrucciones completas en CONEXION-CALENDARIO.md.
 */
var CALENDAR_ID = 'primary';
var TZ = 'America/Guatemala';
var GT_OFFSET_MIN = 360;                 // Guatemala es UTC-6 todo el año
var SLOT_MIN = 30;
var ALLOWED = [480, 540, 600, 660, 720, 960, 1020];   // 8, 9, 10, 11, 12, 4 y 5
var MAX_DAYS = 40;
var MIN_NOTICE_MIN = 60;
// Correos que reciben el aviso de cada reunión nueva. Vacío = la cuenta dueña del script.
var NOTIFY_EMAILS = [];

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'busy') {
    var from = new Date(p.from), to = new Date(p.to);
    if (isNaN(from) || isNaN(to) || to <= from || (to - from) > MAX_DAYS * 86400000) return out({ ok: false, code: 'invalid' });
    return out({ ok: true, busy: busyPeriods(from, to) });
  }
  return out({ ok: true, service: 'agenda demo dental' });
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, code: 'invalid' }); }
  if (!d || d.action !== 'book') return out({ ok: false, code: 'invalid' });

  var name = clean(d.name, 80), clinic = clean(d.clinic, 120), phone = clean(d.phone, 30), email = clean(d.email, 160).toLowerCase();
  var start = new Date(d.start);
  if (!name || !clinic || phone.replace(/\D/g, '').length < 8 || isNaN(start)) return out({ ok: false, code: 'invalid' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out({ ok: false, code: 'invalid' });

  // El horario debe ser uno de los permitidos, de lunes a viernes, en el futuro cercano.
  var local = new Date(start.getTime() - GT_OFFSET_MIN * 60000);
  var wd = local.getUTCDay(), minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  var now = Date.now();
  if (wd < 1 || wd > 5 || ALLOWED.indexOf(minutes) < 0 || local.getUTCSeconds() !== 0) return out({ ok: false, code: 'invalid' });
  if (start.getTime() < now + MIN_NOTICE_MIN * 60000 || start.getTime() > now + MAX_DAYS * 86400000) return out({ ok: false, code: 'taken' });
  var end = new Date(start.getTime() + SLOT_MIN * 60000);

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return out({ ok: false, code: 'error' }); }
  try {
    if (busyPeriods(start, end).length) return out({ ok: false, code: 'taken' });
    var resource = {
      summary: 'Reunión demo dental: ' + clinic,
      description: ['Nombre: ' + name, 'Clínica: ' + clinic, 'WhatsApp: ' + phone, email ? 'Correo: ' + email : 'Correo: no lo dio', 'Origen: ' + clean(d.source, 60), '', 'Antes de la reunión: personalizar la demo con el nombre y logo de la clínica.'].join('\n'),
      start: { dateTime: start.toISOString(), timeZone: TZ },
      end: { dateTime: end.toISOString(), timeZone: TZ },
      conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 60 }, { method: 'popup', minutes: 10 }] }
    };
    if (email) resource.attendees = [{ email: email, displayName: name }];
    var ev = Calendar.Events.insert(resource, CALENDAR_ID, { conferenceDataVersion: 1, sendUpdates: email ? 'all' : 'none' });
    try { notify(name, clinic, phone, email, start, ev); } catch (mailErr) { console.error(mailErr); }
    return out({ ok: true, meet: ev.hangoutLink || '', id: ev.id });
  } catch (err) {
    console.error(err);
    return out({ ok: false, code: 'error' });
  } finally {
    lock.releaseLock();
  }
}

function busyPeriods(from, to) {
  var r = Calendar.Freebusy.query({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TZ, items: [{ id: CALENDAR_ID }] });
  var list = [];
  Object.keys(r.calendars || {}).forEach(function (k) {
    (r.calendars[k].busy || []).forEach(function (b) { list.push([new Date(b.start).getTime(), new Date(b.end).getTime()]); });
  });
  return list;
}

function notify(name, clinic, phone, email, start, ev) {
  var to = NOTIFY_EMAILS.length ? NOTIFY_EMAILS.join(',') : Session.getEffectiveUser().getEmail();
  var when = Utilities.formatDate(start, TZ, "EEEE d 'de' MMMM, h:mm a");
  var digits = phone.replace(/\D/g, '');
  var wa = 'https://wa.me/' + digits;
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">' +
    '<h2 style="margin:0 0 12px">Nueva reunión agendada desde la demo dental</h2>' +
    '<p style="margin:0 0 4px"><b>Cuándo:</b> ' + esc(when) + ' (hora de Guatemala)</p>' +
    '<p style="margin:0 0 4px"><b>Nombre:</b> ' + esc(name) + '</p>' +
    '<p style="margin:0 0 4px"><b>Clínica:</b> ' + esc(clinic) + '</p>' +
    '<p style="margin:0 0 4px"><b>WhatsApp:</b> ' + esc(phone) + ' &middot; <a href="' + wa + '">Abrir chat</a></p>' +
    '<p style="margin:0 0 4px"><b>Correo:</b> ' + esc(email || 'no lo dio') + '</p>' +
    (ev.hangoutLink ? '<p style="margin:0 0 4px"><b>Google Meet:</b> <a href="' + ev.hangoutLink + '">' + ev.hangoutLink + '</a></p>' : '') +
    '<p style="margin:12px 0 0"><a href="' + ev.htmlLink + '">Ver en el calendario</a></p>' +
    '<p style="margin:16px 0 0;padding:10px 12px;background:#f2f5fb;border-radius:8px">Pendiente: confirmar por WhatsApp hoy y personalizar la demo con el nombre y logo de la clínica antes de la reunión.</p>' +
    '</div>';
  MailApp.sendEmail({
    to: to,
    subject: 'Nueva reunión: ' + clinic + ', ' + when,
    htmlBody: html,
    body: 'Nueva reunión agendada. ' + when + '. ' + name + ', ' + clinic + ', WhatsApp ' + phone + ' (' + wa + ').'
  });
}

/** Ejecute esta función una vez desde el editor para dar el permiso de enviar correos. Le llega un correo de prueba. */
function probarCorreo() {
  var fake = { hangoutLink: 'https://meet.google.com/prueba', htmlLink: 'https://calendar.google.com' };
  notify('Prueba', 'Clínica de prueba', '+502 30503672', '', new Date(Date.now() + 86400000), fake);
}

function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Ejecute esta función una vez desde el editor para dar los permisos. No crea nada. */
function probar() {
  var now = new Date();
  Logger.log(JSON.stringify(busyPeriods(now, new Date(now.getTime() + 7 * 86400000))));
}
