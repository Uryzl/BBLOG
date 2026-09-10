(function () {
  const fonts = window.FONTS || [];
  const postId = window.POST_ID;

  // ---- Font picker ----
  const fontPicker = document.getElementById('font-picker');
  const titleFontInput = document.getElementById('title-font');
  const titleInput = document.getElementById('title');

  function applyTitlePreviewFont(fontId) {
    const font = fonts.find(function (f) { return f.id === fontId; });
    titleInput.style.fontFamily = font ? font.family : '';
  }

  function renderFontPicker() {
    const groups = { script: 'Script & Calligraphy', clean: 'Clean & Modern' };
    Object.keys(groups).forEach(function (groupKey) {
      const label = document.createElement('div');
      label.className = 'font-group-label';
      label.textContent = groups[groupKey];
      fontPicker.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'font-picker';
      fonts.filter(function (f) { return f.category === groupKey; }).forEach(function (font) {
        const btn = document.createElement('div');
        btn.className = 'font-option' + (titleFontInput.value === font.id ? ' selected' : '');
        btn.style.fontFamily = font.family;
        btn.dataset.fontId = font.id;
        btn.innerHTML = 'Aa<div class="font-option-label">' + font.label + '</div>';
        btn.addEventListener('click', function () {
          document.querySelectorAll('.font-option').forEach(function (o) { o.classList.remove('selected'); });
          btn.classList.add('selected');
          titleFontInput.value = font.id;
          applyTitlePreviewFont(font.id);
        });
        grid.appendChild(btn);
      });
      fontPicker.appendChild(grid);
    });
  }

  renderFontPicker();
  if (titleFontInput.value) applyTitlePreviewFont(titleFontInput.value);

  // ---- Quill rich text editor ----
  const quill = new Quill('#quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline'],
          ['link', 'image'],
          [{ header: [2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean']
        ],
        handlers: {
          image: imageHandler
        }
      }
    }
  });

  function imageHandler() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async function () {
      const file = input.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await fetch('/api/upload?type=inline', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', data.previewUrl, 'user');
        quill.setSelection(range.index + 1);
        quill.root.querySelectorAll('img[src="' + data.previewUrl + '"]').forEach(function (img) {
          img.dataset.publishPath = data.path;
        });
      } catch (e) {
        alert(e.message);
      }
    });
    input.click();
  }

  // ---- Thumbnail upload ----
  const dropzone = document.getElementById('thumb-dropzone');
  const thumbInput = document.getElementById('thumb-input');
  const thumbPathInput = document.getElementById('thumbnail-path');
  const thumbPreview = document.getElementById('thumb-preview');
  const thumbPlaceholder = document.getElementById('thumb-placeholder-text');

  dropzone.addEventListener('click', function () { thumbInput.click(); });

  thumbInput.addEventListener('change', async function () {
    const file = thumbInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload?type=thumb', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      thumbPathInput.value = data.path;
      thumbPreview.src = data.previewUrl;
      thumbPreview.style.display = 'block';
      if (thumbPlaceholder) thumbPlaceholder.style.display = 'none';
      dropzone.classList.add('has-image');
    } catch (e) {
      alert(e.message);
    }
  });

  // ---- Save ----
  function bodyHtmlForSave() {
    // Rewrite inline image src from the admin preview URL (/uploads/inline/...)
    // to the storage-relative path (inline/...) that the generator expects.
    // The generator recognizes this exact "inline/<file>" form and rewrites it
    // to a public /images/... URL at publish time; anything else (e.g. a
    // pasted external http(s) image URL) is left untouched.
    const clone = quill.root.cloneNode(true);
    clone.querySelectorAll('img').forEach(function (img) {
      const publishPath = img.dataset.publishPath;
      if (publishPath) {
        img.setAttribute('src', publishPath);
      } else {
        const src = img.getAttribute('src') || '';
        const match = src.match(/\/uploads\/(inline\/[^"']+)/);
        if (match) img.setAttribute('src', match[1]);
      }
      img.removeAttribute('data-publish-path');
    });
    return clone.innerHTML;
  }

  document.getElementById('save-btn').addEventListener('click', async function () {
    const btn = this;
    const title = document.getElementById('title').value.trim();
    const categoryId = document.getElementById('category').value;
    if (!title) return alert('Please give your post a title.');
    if (!categoryId) return alert('Please choose a category.');

    const payload = {
      title: title,
      titleFont: titleFontInput.value,
      categoryId: categoryId,
      excerpt: document.getElementById('excerpt').value.trim(),
      thumbnail: thumbPathInput.value,
      bodyHtml: bodyHtmlForSave(),
      status: document.getElementById('status').value
    };

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const url = postId ? '/api/posts/' + postId : '/api/posts';
      const method = postId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save post.');
      window.location.href = '/posts';
    } catch (e) {
      alert(e.message);
      btn.disabled = false;
      btn.textContent = 'Save Post';
    }
  });
})();
