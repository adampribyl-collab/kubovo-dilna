/* ==========================================================================
   Poptávkový formulář
   --------------------------------------------------------------------------
   Odesílání přes Formspree (https://formspree.io):
   1. Založte formulář na formspree.io a zkopírujte jeho endpoint.
   2. Vložte ho do konstanty FORMSPREE_ENDPOINT níže.
   Přílohy (fotky) Formspree přijímá jen v placeném tarifu – na free tarifu
   je smažte z FormData, nebo počítejte s tím, že dorazí jen text.

   Jak přepojit jinam: funkce sendForm() dostane hotová FormData (jmeno,
   telefon, sluzby[], zprava, fotky[]). Stačí změnit URL v FORMSPREE_ENDPOINT
   na vlastní skript (např. PHP mailer na hostingu, Netlify Forms, Getform,
   Web3Forms…) – musí přijmout multipart/form-data přes POST a vrátit
   HTTP 2xx při úspěchu. Pokud služba chce JSON, upravte sendForm().
   ========================================================================== */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/VAS_ID_FORMULARE';

const MAX_FILES = 8;
const MAX_FILE_MB = 10;

const isConfigured = () => !FORMSPREE_ENDPOINT.includes('VAS_ID_FORMULARE');

async function sendForm(formData) {
  if (!isConfigured()) {
    if (import.meta.env.DEV) {
      // Při vývoji bez endpointu jen simulujeme úspěšné odeslání.
      console.warn('[formulář] FORMSPREE_ENDPOINT není nastavený – odeslání je pouze simulované.');
      await new Promise((r) => setTimeout(r, 1200));
      return;
    }
    throw new Error('Formulář zatím není napojený. Zavolejte prosím na +420 777 123 456.');
  }

  const res = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.errors?.map((e) => e.message).join(', ');
    throw new Error(detail ? `Odeslání se nepovedlo: ${detail}` : 'Odeslání se nepovedlo. Zkuste to prosím znovu, nebo zavolejte.');
  }
}

export function initForm() {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const success = document.querySelector('[data-form-success]');
  const submit = form.querySelector('[data-submit]');
  const submitLabel = submit.querySelector('.form__submit-label');
  const status = form.querySelector('[data-form-status]');
  const dropzone = form.querySelector('[data-dropzone]');
  const fileInput = form.querySelector('[data-file-input]');
  const previews = form.querySelector('[data-previews]');
  const fileError = form.querySelector('#f-fotky-err');
  const fields = [...form.querySelectorAll('input[required], textarea[required]')];

  /* --- validace -------------------------------------------------------- */
  function validate(input) {
    const value = input.value.trim();
    let msg = '';
    if (input.required && !value) {
      msg = input.dataset.msgRequired || 'Toto pole je povinné.';
    } else if (input.type === 'tel' && value && !/^\+?\d{9,15}$/.test(value.replace(/[\s\-().]/g, ''))) {
      msg = 'Zadejte telefon ve tvaru +420 777 123 456.';
    } else if (input.name === 'jmeno' && value.length < 2) {
      msg = 'Jméno je nějak krátké.';
    }
    const field = input.closest('.field');
    const error = document.getElementById(`${input.id}-err`);
    field.classList.toggle('is-invalid', Boolean(msg));
    input.setAttribute('aria-invalid', String(Boolean(msg)));
    if (error) error.textContent = msg;
    return !msg;
  }

  fields.forEach((input) => {
    input.addEventListener('blur', () => input.value && validate(input));
    input.addEventListener('input', () => input.getAttribute('aria-invalid') === 'true' && validate(input));
  });

  /* --- fotky: drag & drop, výběr, náhledy ------------------------------- */
  let files = [];

  function renderPreviews() {
    previews.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
    previews.replaceChildren(
      ...files.map((file, i) => {
        const li = document.createElement('li');
        li.className = 'preview';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'preview__remove';
        remove.setAttribute('aria-label', `Odebrat fotku ${file.name}`);
        remove.textContent = '✕';
        remove.addEventListener('click', () => {
          files.splice(i, 1);
          renderPreviews();
          fileError.textContent = '';
          fileInput.focus();
        });
        li.append(img, remove);
        return li;
      }),
    );
  }

  function addFiles(list) {
    const problems = [];
    for (const file of list) {
      if (!file.type.startsWith('image/')) {
        problems.push(`${file.name} není obrázek`);
      } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
        problems.push(`${file.name} má víc než ${MAX_FILE_MB} MB`);
      } else if (files.length >= MAX_FILES) {
        problems.push(`maximálně ${MAX_FILES} fotek`);
        break;
      } else if (!files.some((f) => f.name === file.name && f.size === file.size)) {
        files.push(file);
      }
    }
    fileError.textContent = problems.length ? `Nepřidáno: ${problems.join(', ')}.` : '';
    renderPreviews();
  }

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = ''; // ať jde stejný soubor vybrat znovu
  });

  ['dragenter', 'dragover'].forEach((type) =>
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    }),
  );
  ['dragleave', 'dragend', 'drop'].forEach((type) =>
    dropzone.addEventListener(type, (e) => {
      if (type === 'dragleave' && dropzone.contains(e.relatedTarget)) return;
      dropzone.classList.remove('is-dragover');
    }),
  );
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  /* --- odeslání ------------------------------------------------------------ */
  function setSending(sending) {
    submit.disabled = sending;
    submit.classList.toggle('is-sending', sending);
    submit.setAttribute('aria-busy', String(sending));
    submitLabel.textContent = sending ? 'Odesílám…' : 'Odeslat poptávku';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');

    const invalid = fields.filter((input) => !validate(input));
    if (invalid.length) {
      invalid[0].focus();
      status.textContent = 'Zkontrolujte prosím zvýrazněná pole.';
      status.classList.add('is-error');
      return;
    }

    const formData = new FormData(form);
    formData.delete('fotky');
    files.forEach((file) => formData.append('fotky', file, file.name));
    formData.append('_subject', `Nová poptávka z webu – ${formData.get('jmeno')}`);

    setSending(true);
    try {
      await sendForm(formData);
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (err) {
      status.textContent = err.message || 'Odeslání se nepovedlo. Zkuste to prosím znovu.';
      status.classList.add('is-error');
    } finally {
      setSending(false);
    }
  });

  document.querySelector('[data-form-reset]')?.addEventListener('click', () => {
    form.reset();
    files = [];
    renderPreviews();
    fields.forEach((input) => {
      input.removeAttribute('aria-invalid');
      input.closest('.field').classList.remove('is-invalid');
    });
    success.hidden = true;
    form.hidden = false;
    form.querySelector('input')?.focus();
  });
}
