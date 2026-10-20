/* ==========================================================================
   Poptávkový formulář
   --------------------------------------------------------------------------
   Odesílání přes Formspree (https://formspree.io):
   1. Založte formulář na formspree.io a zkopírujte jeho adresu (https://formspree.io/f/…).
   2. Vložte ji v redakci do Firma a kontakty → „Formspree adresa formuláře“
      (do HTML se propíše jako data-endpoint na <form>).

   Jak přepojit jinam: sendForm() dostane hotová FormData (jmeno, telefon,
   sluzby[], zprava). Stačí jako adresu zadat vlastní skript (PHP mailer na
   hostingu, Getform, Web3Forms…) – musí přijmout POST a vrátit HTTP 2xx
   při úspěchu. Pokud služba chce JSON, upravte sendForm().
   Texty hlášek se berou z data-msg-* atributů (redakce → Kontakt a formulář).
   ========================================================================== */

async function sendForm(endpoint, formData, msg) {
  if (!endpoint) {
    if (import.meta.env.DEV) {
      // Při vývoji bez adresy jen simulujeme úspěšné odeslání.
      console.warn('[formulář] Adresa pro odesílání není nastavená – odeslání je pouze simulované.');
      await new Promise((r) => setTimeout(r, 1200));
      return;
    }
    throw new Error(msg.unconfigured);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.errors?.map((e) => e.message).join(', ');
    throw new Error(detail ? `${msg.error} (${detail})` : msg.error);
  }
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
  const endpoint = form.dataset.endpoint?.trim();
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

    const formData = new FormData(form);
    formData.append('_subject', `Nová poptávka z webu – ${formData.get('jmeno')}`);

    setSending(true);
    try {
      await sendForm(endpoint, formData, msg);
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
