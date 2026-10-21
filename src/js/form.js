/* ==========================================================================
   Poptávkový formulář
   --------------------------------------------------------------------------
   Odesílání e-mailem přes Formspree (https://formspree.io), bez vlastního serveru:
   1. Na formspree.io si založte účet (e-mail účtu = kam chodí poptávky) a nový formulář.
   2. Jeho adresu (https://formspree.io/f/…) nebo jen ID vložte v redakci do
      Firma a kontakty → „Formulář pro poptávky (Formspree)“ (do HTML jako data-formspree).

   Jak přepojit jinam: sendForm() dostane hotová FormData. Stačí jako adresu
   zadat jinou službu nebo vlastní skript (např. PHP mailer na hostingu),
   který přijme POST a při úspěchu vrátí HTTP 2xx.
   Texty hlášek se berou z data-msg-* atributů (redakce → Kontakt a formulář).
   ========================================================================== */

/** „abcd1234“ i „https://formspree.io/f/abcd1234“ → celá adresa formuláře */
function formspreeUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  return /^https?:\/\//.test(v) ? v : `https://formspree.io/f/${v.replace(/^\/?f\//, '')}`;
}

async function sendForm(endpoint, formData, msg) {
  if (!endpoint) {
    if (import.meta.env.DEV) {
      // Při vývoji bez formuláře jen simulujeme úspěšné odeslání.
      console.warn('[formulář] Formulář pro poptávky není nastavený – odeslání je pouze simulované.');
      await new Promise((r) => setTimeout(r, 1200));
      return;
    }
    throw new Error(msg.unconfigured);
  }

  const res = await fetch(endpoint, { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.errors?.map((e) => e.message).join(', ');
    throw new Error(detail ? `${msg.error} (${detail})` : msg.error);
  }
}

/** Data pro e-mail: srozumitelné české názvy polí, vybrané služby v jednom řádku. */
function buildEmail(form) {
  const field = (name) => form.elements[name]?.value.trim() || '';
  const services = [...form.querySelectorAll('input[name="sluzby"]:checked')].map((el) => el.value);
  const data = new FormData();
  data.set('_subject', `Nová poptávka z webu – ${field('jmeno')}`);
  data.set('Jméno', field('jmeno'));
  data.set('Telefon', field('telefon'));
  data.set('Co potřebuje', services.join(', ') || '–');
  data.set('Zpráva', field('zprava') || '–');
  // ochrana proti spamu: vyplněné skryté pole = robot (Formspree takovou zprávu zahodí)
  if (field('_gotcha')) data.set('_gotcha', field('_gotcha'));
  return data;
}

export function initForm() {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const success = document.querySelector('[data-form-success]');
  const submit = form.querySelector('[data-submit]');
  const submitLabel = submit.querySelector('.form__submit-label');
  const submitText = submitLabel.textContent;
  const status = form.querySelector('[data-form-status]');
  const fields = [...form.querySelectorAll('input[required], textarea[required]')];
  const endpoint = formspreeUrl(form.dataset.formspree);
  const msg = {
    phoneFormat: form.dataset.msgPhoneFormat,
    check: form.dataset.msgCheck,
    sending: form.dataset.msgSending,
    error: form.dataset.msgError,
    unconfigured: form.dataset.msgUnconfigured,
  };

  /* --- validace -------------------------------------------------------- */
  function validate(input) {
    const value = input.value.trim();
    let message = '';
    if (input.required && !value) {
      message = input.dataset.msgRequired || 'Toto pole je povinné.';
    } else if (input.type === 'tel' && value && !/^\+?\d{9,15}$/.test(value.replace(/[\s\-().]/g, ''))) {
      message = msg.phoneFormat;
    } else if (input.name === 'jmeno' && value.length < 2) {
      message = input.dataset.msgRequired;
    }
    const field = input.closest('.field');
    const error = document.getElementById(`${input.id}-err`);
    field.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message;
    return !message;
  }

  fields.forEach((input) => {
    input.addEventListener('blur', () => input.value && validate(input));
    input.addEventListener('input', () => input.getAttribute('aria-invalid') === 'true' && validate(input));
  });

  /* --- odeslání ------------------------------------------------------------ */
  function setSending(sending) {
    submit.disabled = sending;
    submit.classList.toggle('is-sending', sending);
    submit.setAttribute('aria-busy', String(sending));
    submitLabel.textContent = sending ? msg.sending : submitText;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');

    const invalid = fields.filter((input) => !validate(input));
    if (invalid.length) {
      invalid[0].focus();
      status.textContent = msg.check;
      status.classList.add('is-error');
      return;
    }

    setSending(true);
    try {
      await sendForm(endpoint, buildEmail(form), msg);
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (err) {
      status.textContent = err.message || msg.error;
      status.classList.add('is-error');
    } finally {
      setSending(false);
    }
  });

  document.querySelector('[data-form-reset]')?.addEventListener('click', () => {
    form.reset();
    fields.forEach((input) => {
      input.removeAttribute('aria-invalid');
      input.closest('.field').classList.remove('is-invalid');
    });
    success.hidden = true;
    form.hidden = false;
    form.querySelector('input')?.focus();
  });
}
