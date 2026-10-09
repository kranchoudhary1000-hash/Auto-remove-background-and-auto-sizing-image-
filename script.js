(function () {
  'use strict';

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    image: null,               // current image (may be BG-removed)
    originalImage: null,       // original uploaded image
    bgRemoved: false,
    imageLoaded: false,
    quantity: 12,
    photoWidthMm: 35,
    photoHeightMm: 45,
    gapMm: 2,
    borderWidth: 1,
    borderColor: '#cccccc',
    paperWidthMm: 210,
    paperHeightMm: 297,
    marginMm: 10,
    orientation: 'portrait',
    rows: 0,
    cols: 0,
    totalPages: 1,
    isDark: false,
    bgLib: null,               // cached background removal function
  };

  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadError = document.getElementById('uploadError');
  const previewArea = document.getElementById('previewArea');
  const uploadedImage = document.getElementById('uploadedImage');
  const replaceBtn = document.getElementById('replaceBtn');
  const removeBtn = document.getElementById('removeBtn');
  const bgRemoveBtn = document.getElementById('bgRemoveBtn');
  const bgRestoreBtn = document.getElementById('bgRestoreBtn');
  const bgStatus = document.getElementById('bgStatus');
  const quantityInput = document.getElementById('quantityInput');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const totalPhotosDisplay = document.getElementById('totalPhotosDisplay');
  const quantityPresets = document.getElementById('quantityPresets');
  const photoWidthMm = document.getElementById('photoWidthMm');
  const photoHeightMm = document.getElementById('photoHeightMm');
  const gapMm = document.getElementById('gapMm');
  const borderWidth = document.getElementById('borderWidth');
  const borderColor = document.getElementById('borderColor');
  const orientation = document.getElementById('orientation');
  const paperWidthMm = document.getElementById('paperWidthMm');
  const paperHeightMm = document.getElementById('paperHeightMm');
  const marginMm = document.getElementById('marginMm');
  const rowsInput = document.getElementById('rowsInput');
  const colsInput = document.getElementById('colsInput');
  const pageInfo = document.getElementById('pageInfo');
  const sheetCanvas = document.getElementById('sheetCanvas');
  const ctx = sheetCanvas.getContext('2d');
  const previewCount = document.getElementById('previewCount');
  const previewPages = document.getElementById('previewPages');
  const previewDimensions = document.getElementById('previewDimensions');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  const toastContainer = document.getElementById('toastContainer');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadJpegBtn = document.getElementById('downloadJpegBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const printBtn = document.getElementById('printBtn');
  const resetBtn = document.getElementById('resetBtn');

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    if (window.lucide) lucide.createIcons();
    setupEventListeners();
    updateQuantityDisplay();
    renderPreview();
    checkDarkMode();
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function setupEventListeners() {
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    replaceBtn.addEventListener('click', () => fileInput.click());
    removeBtn.addEventListener('click', removeImage);
    bgRemoveBtn.addEventListener('click', removeBackground);
    bgRestoreBtn.addEventListener('click', restoreOriginal);

    qtyMinus.addEventListener('click', () => updateQuantity(state.quantity - 1));
    qtyPlus.addEventListener('click', () => updateQuantity(state.quantity + 1));
    quantityInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val) && val >= 1) updateQuantity(val);
      else quantityInput.value = state.quantity;
    });
    quantityPresets.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        updateQuantity(parseInt(btn.dataset.qty));
        quantityPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('.size-preset-btn[data-size]').forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        document.querySelectorAll('.size-preset-btn[data-size]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (size === '35x45') { photoWidthMm.value = 35; photoHeightMm.value = 45; }
        else if (size === '2x2') { photoWidthMm.value = 50.8; photoHeightMm.value = 50.8; }
        else if (size === '4x6') { photoWidthMm.value = 101.6; photoHeightMm.value = 152.4; }
        updateStateFromInputs();
      });
    });

    document.querySelectorAll('.size-preset-btn[data-paper]').forEach(btn => {
      btn.addEventListener('click', () => {
        const paper = btn.dataset.paper;
        document.querySelectorAll('.size-preset-btn[data-paper]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (paper === 'a4') { paperWidthMm.value = 210; paperHeightMm.value = 297; }
        else if (paper === 'a5') { paperWidthMm.value = 148; paperHeightMm.value = 210; }
        else if (paper === '4x6') { paperWidthMm.value = 101.6; paperHeightMm.value = 152.4; }
        updateStateFromInputs();
      });
    });

    [photoWidthMm, photoHeightMm, gapMm, borderWidth, paperWidthMm, paperHeightMm, marginMm, rowsInput, colsInput].forEach(input => {
      input.addEventListener('input', updateStateFromInputs);
    });
    borderColor.addEventListener('input', updateStateFromInputs);
    orientation.addEventListener('change', updateStateFromInputs);

    themeToggle.addEventListener('click', toggleDarkMode);

    downloadPngBtn.addEventListener('click', () => downloadImage('png'));
    downloadJpegBtn.addEventListener('click', () => downloadImage('jpeg'));
    downloadPdfBtn.addEventListener('click', downloadPDF);
    printBtn.addEventListener('click', printSheet);
    resetBtn.addEventListener('click', resetAll);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderPreview, 150);
    });
  }

  // ============================================================
  // FILE HANDLING
  // ============================================================
  function handleFile(file) {
    uploadError.textContent = '';
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a JPG, PNG, or WEBP image.', 'error');
      uploadError.textContent = 'Invalid file type. Only JPG, PNG, WEBP allowed.';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('File is too large (max 20 MB).', 'error');
      uploadError.textContent = 'File too large. Max 20 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        state.originalImage = img;
        state.bgRemoved = false;
        state.imageLoaded = true;
        uploadedImage.src = e.target.result;
        previewArea.classList.remove('hidden');
        uploadZone.classList.add('hidden');
        bgStatus.textContent = '';
        bgRestoreBtn.classList.add('hidden');
        bgRemoveBtn.classList.remove('hidden');
        bgRemoveBtn.disabled = false;
        renderPreview();
        showToast('Photo uploaded successfully!', 'success');
      };
      img.onerror = () => showToast('Failed to load image.', 'error');
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    state.image = null;
    state.originalImage = null;
    state.bgRemoved = false;
    state.imageLoaded = false;
    uploadedImage.src = '';
    previewArea.classList.add('hidden');
    uploadZone.classList.remove('hidden');
    bgStatus.textContent = '';
    fileInput.value = '';
    renderPreview();
  }

  // ============================================================
  // BACKGROUND REMOVAL — reliable dynamic import from CDN
  // ============================================================
  async function loadBgRemovalLibrary() {
    if (state.bgLib) return state.bgLib;

    // Multiple CDN attempts, in case one fails
    const urls = [
      'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs',
      'https://esm.sh/@imgly/background-removal@1.4.5',
      'https://unpkg.com/@imgly/background-removal@1.4.5/dist/index.mjs'
    ];

    let lastErr = null;
    for (const url of urls) {
      try {
        console.log('Trying to load BG removal from:', url);
        const mod = await import(/* @vite-ignore */ url);
        const fn = mod.default || mod.removeBackground || mod.imglyRemoveBackground;
        if (typeof fn === 'function') {
          console.log('✅ Loaded BG removal from:', url);
          state.bgLib = fn;
          return fn;
        }
      } catch (err) {
        console.warn('Failed loading from', url, err);
        lastErr = err;
      }
    }
    throw lastErr || new Error('Could not load background removal library');
  }

  async function removeBackground() {
    if (!state.imageLoaded || !state.originalImage) {
      showToast('Please upload a photo first.', 'error');
      return;
    }
    if (state.bgRemoved) {
      showToast('Background is already removed.', 'info');
      return;
    }

    bgRemoveBtn.disabled = true;
    bgRemoveBtn.style.opacity = '0.6';
    bgStatus.textContent = '⏳ Loading AI library…';
    showLoading(true);

    try {
      const removeBgFn = await loadBgRemovalLibrary();

      bgStatus.textContent = '⏳ Preparing image…';

      // Convert original image to Blob
      const sourceBlob = await new Promise((resolve) => {
        const c = document.createElement('canvas');
        c.width = state.originalImage.width;
        c.height = state.originalImage.height;
        c.getContext('2d').drawImage(state.originalImage, 0, 0);
        c.toBlob(resolve, 'image/png', 1.0);
      });

      bgStatus.textContent = '🧠 AI is removing background… (first time ~20-40s)';

      const resultBlob = await removeBgFn(sourceBlob, {
        progress: (key, current, total) => {
          const pct = total ? Math.round((current / total) * 100) : 0;
          bgStatus.textContent = `⏳ ${key}: ${pct}%`;
        },
        output: { format: 'image/png', quality: 1.0 },
      });

      const url = URL.createObjectURL(resultBlob);
      const newImg = new Image();
      await new Promise((resolve, reject) => {
        newImg.onload = resolve;
        newImg.onerror = reject;
        newImg.src = url;
      });

      state.image = newImg;
      state.bgRemoved = true;
      uploadedImage.src = url;
      renderPreview();

      bgStatus.textContent = '✅ Background removed!';
      showToast('Background removed successfully!', 'success');

      bgRemoveBtn.classList.add('hidden');
      bgRestoreBtn.classList.remove('hidden');
    } catch (err) {
      console.error('BG removal error:', err);
      bgStatus.textContent = '❌ Failed: ' + (err && err.message ? err.message : 'Try again');
      showToast('Background removal failed.', 'error');
    } finally {
      bgRemoveBtn.disabled = false;
      bgRemoveBtn.style.opacity = '1';
      showLoading(false);
    }
  }

  function restoreOriginal() {
    if (!state.originalImage) return;
    state.image = state.originalImage;
    state.bgRemoved = false;
    uploadedImage.src = state.originalImage.src;
    renderPreview();
    bgStatus.textContent = '↩️ Original photo restored.';
    bgRestoreBtn.classList.add('hidden');
    bgRemoveBtn.classList.remove('hidden');
    showToast('Original photo restored.', 'info');
  }

  // ============================================================
  // QUANTITY
  // ============================================================
  function updateQuantity(val) {
    if (val < 1) val = 1;
    if (val > 200) val = 200;
    state.quantity = val;
    quantityInput.value = val;
    totalPhotosDisplay.textContent = val;
    quantityPresets.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.qty) === val);
    });
    renderPreview();
  }

  function updateQuantityDisplay() {
    quantityInput.value = state.quantity;
    totalPhotosDisplay.textContent = state.quantity;
  }

  // ============================================================
  // STATE SYNC
  // ============================================================
  function updateStateFromInputs() {
    state.photoWidthMm = parseFloat(photoWidthMm.value) || 35;
    state.photoHeightMm = parseFloat(photoHeightMm.value) || 45;
    state.gapMm = parseFloat(gapMm.value) || 0;
    state.borderWidth = parseInt(borderWidth.value) || 0;
    state.borderColor = borderColor.value;
    state.paperWidthMm = parseFloat(paperWidthMm.value) || 210;
    state.paperHeightMm = parseFloat(paperHeightMm.value) || 297;
    state.marginMm = parseFloat(marginMm.value) || 10;
    state.orientation = orientation.value;
    state.rows = parseInt(rowsInput.value) || 0;
    state.cols = parseInt(colsInput.value) || 0;
    renderPreview();
  }

  // ============================================================
  // LAYOUT CALCULATION
  // ============================================================
  function computeLayout() {
    let paperW = state.paperWidthMm;
    let paperH = state.paperHeightMm;
    if (state.orientation === 'landscape') [paperW, paperH] = [paperH, paperW];

    const margin = state.marginMm;
    const photoW = state.photoWidthMm;
    const photoH = state.photoHeightMm;
    const gap = state.gapMm;

    const availableW = paperW - 2 * margin;
    const availableH = paperH - 2 * margin;

    let rows, cols;
    if (state.rows > 0 && state.cols > 0) {
      rows = state.rows;
      cols = state.cols;
    } else {
      cols = Math.floor((availableW + gap) / (photoW + gap));
      rows = Math.floor((availableH + gap) / (photoH + gap));
      if (cols < 1) cols = 1;
      if (rows < 1) rows = 1;
    }

    const perPage = rows * cols;
    const totalPages = Math.ceil(state.quantity / perPage);
    state.totalPages = totalPages;

    return { paperW, paperH, margin, photoW, photoH, gap, rows, cols, perPage, totalPages };
  }

  // ============================================================
  // RENDER PREVIEW
  // ============================================================
  function renderPreview() {
    const layout = computeLayout();
    drawCanvas(layout, !state.imageLoaded);
    updatePreviewStats(layout);
  }

  function updatePreviewStats(layout) {
    previewCount.textContent = `${state.quantity} photo${state.quantity > 1 ? 's' : ''}`;
    previewPages.textContent = `${layout.totalPages} page${layout.totalPages > 1 ? 's' : ''}`;
    previewDimensions.textContent = `${state.photoWidthMm}×${state.photoHeightMm} mm`;
    pageInfo.textContent = `1 of ${layout.totalPages}`;
  }

  // ============================================================
  // CANVAS DRAWING
  // ============================================================
  function drawCanvas(layout, isPlaceholder, pageNum = 1) {
    const { paperW, paperH, photoW, photoH, gap, rows, cols, perPage } = layout;

    const maxDim = 800;
    const scale = Math.min(maxDim / paperW, maxDim / paperH);
    const canvasW = Math.round(paperW * scale);
    const canvasH = Math.round(paperH * scale);

    sheetCanvas.width = canvasW;
    sheetCanvas.height = canvasH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvasW - 1, canvasH - 1);

    if (isPlaceholder) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(12, Math.round(16 * scale))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Upload a photo to see preview', canvasW / 2, canvasH / 2);
      return;
    }

    const totalGridW = cols * photoW + (cols - 1) * gap;
    const totalGridH = rows * photoH + (rows - 1) * gap;
    const offsetX = (paperW - totalGridW) / 2;
    const offsetY = (paperH - totalGridH) / 2;
    const startIndex = (pageNum - 1) * perPage;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = startIndex + r * cols + c;
        if (idx >= state.quantity) break;

        const x = (offsetX + c * (photoW + gap)) * scale;
        const y = (offsetY + r * (photoH + gap)) * scale;
        const w = photoW * scale;
        const h = photoH * scale;

        if (state.borderWidth > 0) {
          ctx.strokeStyle = state.borderColor;
          ctx.lineWidth = Math.max(0.5, state.borderWidth * scale);
          ctx.strokeRect(x, y, w, h);
        }
        drawImageCover(ctx, state.image, x, y, w, h);
      }
      if (startIndex + (r + 1) * cols >= state.quantity) break;
    }

    if (layout.totalPages > 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(9, Math.round(12 * scale))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Page ${pageNum} of ${layout.totalPages}`, canvasW / 2, canvasH - 4);
    }
  }

  function drawImageCover(targetCtx, img, x, y, w, h) {
    const imgAspect = img.width / img.height;
    const targetAspect = w / h;
    let sx, sy, sw, sh;
    if (imgAspect > targetAspect) {
      sh = img.height;
      sw = sh * targetAspect;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / targetAspect;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    targetCtx.save();
    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(x, y, w, h);
    targetCtx.restore();
    targetCtx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  // ============================================================
  // EXPORT — PNG / JPEG
  // ============================================================
  function downloadImage(format) {
    if (!state.imageLoaded) {
      showToast('Please upload a photo first.', 'error');
      return;
    }
    showLoading(true);
    setTimeout(() => {
      try {
        const layout = computeLayout();
        const pxPerMm = 300 / 25.4;
        const exportScale = pxPerMm;
        const pageNum = 1;
        const { paperW, paperH, photoW, photoH, gap, rows, cols, perPage } = layout;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = Math.round(paperW * exportScale);
        exportCanvas.height = Math.round(paperH * exportScale);
        const ectx = exportCanvas.getContext('2d');

        ectx.fillStyle = '#ffffff';
        ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        const totalGridW = cols * photoW + (cols - 1) * gap;
        const totalGridH = rows * photoH + (rows - 1) * gap;
        const offsetX = (paperW - totalGridW) / 2;
        const offsetY = (paperH - totalGridH) / 2;
        const startIndex = (pageNum - 1) * perPage;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = startIndex + r * cols + c;
            if (idx >= state.quantity) break;

            const x = (offsetX + c * (photoW + gap)) * exportScale;
            const y = (offsetY + r * (photoH + gap)) * exportScale;
            const w = photoW * exportScale;
            const h = photoH * exportScale;

            if (state.borderWidth > 0) {
              ectx.strokeStyle = state.borderColor;
              ectx.lineWidth = state.borderWidth * exportScale;
              ectx.strokeRect(x, y, w, h);
            }
            drawImageCover(ectx, state.image, x, y, w, h);
          }
          if (startIndex + (r + 1) * cols >= state.quantity) break;
        }

        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        const ext = format === 'png' ? 'png' : 'jpg';
        const quality = format === 'jpeg' ? 0.95 : undefined;

        exportCanvas.toBlob((blob) => {
          if (!blob) {
            showToast('Export failed.', 'error');
            showLoading(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `photocraft-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1500);

          showToast(`${format.toUpperCase()} downloaded!`, 'success');
          showLoading(false);

          if (layout.totalPages > 1) {
            showToast(`Only page 1 of ${layout.totalPages} exported. Use PDF for all pages.`, 'info');
          }
        }, mime, quality);
      } catch (err) {
        console.error(err);
        showToast('Export failed. Please try again.', 'error');
        showLoading(false);
      }
    }, 50);
  }

  // ============================================================
  // EXPORT — PDF
  // ============================================================
  function downloadPDF() {
    if (!state.imageLoaded) {
      showToast('Please upload a photo first.', 'error');
      return;
    }
    showLoading(true);
    setTimeout(() => {
      try {
        const { jsPDF } = window.jspdf;
        const layout = computeLayout();
        const { paperW, paperH, photoW, photoH, gap, rows, cols, perPage, totalPages } = layout;

        const doc = new jsPDF({
          orientation: paperW > paperH ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [paperW, paperH],
        });

        const imgData = getImageDataURL();

        for (let page = 1; page <= totalPages; page++) {
          if (page > 1) doc.addPage([paperW, paperH], paperW > paperH ? 'landscape' : 'portrait');

          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, paperW, paperH, 'F');

          const totalGridW = cols * photoW + (cols - 1) * gap;
          const totalGridH = rows * photoH + (rows - 1) * gap;
          const offsetX = (paperW - totalGridW) / 2;
          const offsetY = (paperH - totalGridH) / 2;
          const startIndex = (page - 1) * perPage;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const idx = startIndex + r * cols + c;
              if (idx >= state.quantity) break;

              const x = offsetX + c * (photoW + gap);
              const y = offsetY + r * (photoH + gap);

              if (state.borderWidth > 0) {
                const rgb = hexToRgb(state.borderColor);
                doc.setDrawColor(rgb.r, rgb.g, rgb.b);
                doc.setLineWidth(state.borderWidth * 0.264583);
                doc.rect(x, y, photoW, photoH);
              }

              const imgProps = getCoverCrop(state.image, photoW, photoH);
              doc.addImage(
                imgData, 'JPEG',
                x, y, photoW, photoH,
                undefined, 'FAST', 0,
                imgProps.sx, imgProps.sy, imgProps.sw, imgProps.sh
              );
            }
            if (startIndex + (r + 1) * cols >= state.quantity) break;
          }

          if (totalPages > 1) {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${page} of ${totalPages}`, paperW / 2, paperH - 5, { align: 'center' });
          }
        }

        doc.save(`photocraft-${Date.now()}.pdf`);
        showToast('PDF downloaded!', 'success');
        showLoading(false);
      } catch (err) {
        console.error(err);
        showToast('PDF export failed.', 'error');
        showLoading(false);
      }
    }, 50);
  }

  function getImageDataURL() {
    const canvas = document.createElement('canvas');
    canvas.width = state.image.width;
    canvas.height = state.image.height;
    const c2 = canvas.getContext('2d');
    c2.fillStyle = '#ffffff';
    c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.drawImage(state.image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  function getCoverCrop(img, targetW, targetH) {
    const imgAspect = img.width / img.height;
    const targetAspect = targetW / targetH;
    let sx, sy, sw, sh;
    if (imgAspect > targetAspect) {
      sh = img.height;
      sw = sh * targetAspect;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / targetAspect;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    return { sx, sy, sw, sh };
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 200, g: 200, b: 200 };
  }

  // ============================================================
  // PRINT
  // ============================================================
  function printSheet() {
    if (!state.imageLoaded) {
      showToast('Please upload a photo first.', 'error');
      return;
    }
    const layout = computeLayout();
    const { paperW, paperH, photoW, photoH, gap, rows, cols, perPage, totalPages } = layout;

    showLoading(true);
    setTimeout(() => {
      try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showToast('Please allow pop-ups to print.', 'error');
          showLoading(false);
          return;
        }

        const imgData = getImageDataURL();

        let html = `<!DOCTYPE html><html><head><title>Print Photo Sheet</title>
        <style>
          @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
          .page { width: ${paperW}mm; height: ${paperH}mm; position: relative; page-break-after: always; background: white; overflow: hidden; }
          .page:last-child { page-break-after: auto; }
          .photo { position: absolute; object-fit: cover; }
          .border { position: absolute; border: ${state.borderWidth}px solid ${state.borderColor}; box-sizing: border-box; }
        </style></head><body>`;

        for (let page = 1; page <= totalPages; page++) {
          const totalGridW = cols * photoW + (cols - 1) * gap;
          const totalGridH = rows * photoH + (rows - 1) * gap;
          const offsetX = (paperW - totalGridW) / 2;
          const offsetY = (paperH - totalGridH) / 2;
          const startIndex = (page - 1) * perPage;

          html += `<div class="page">`;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const idx = startIndex + r * cols + c;
              if (idx >= state.quantity) break;
              const x = offsetX + c * (photoW + gap);
              const y = offsetY + r * (photoH + gap);
              if (state.borderWidth > 0) {
                html += `<div class="border" style="left:${x}mm; top:${y}mm; width:${photoW}mm; height:${photoH}mm;"></div>`;
              }
              html += `<img class="photo" src="${imgData}" style="left:${x}mm; top:${y}mm; width:${photoW}mm; height:${photoH}mm;" />`;
            }
            if (startIndex + (r + 1) * cols >= state.quantity) break;
          }
          html += `</div>`;
        }

        html += `</body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            showLoading(false);
          }, 300);
        };
      } catch (err) {
        console.error(err);
        showToast('Print failed.', 'error');
        showLoading(false);
      }
    }, 50);
  }

  // ============================================================
  // RESET
  // ============================================================
  function resetAll() {
    state.quantity = 12;
    state.photoWidthMm = 35;
    state.photoHeightMm = 45;
    state.gapMm = 2;
    state.borderWidth = 1;
    state.borderColor = '#cccccc';
    state.paperWidthMm = 210;
    state.paperHeightMm = 297;
    state.marginMm = 10;
    state.orientation = 'portrait';
    state.rows = 0;
    state.cols = 0;

    quantityInput.value = 12;
    totalPhotosDisplay.textContent = 12;
    photoWidthMm.value = 35;
    photoHeightMm.value = 45;
    gapMm.value = 2;
    borderWidth.value = 1;
    borderColor.value = '#cccccc';
    paperWidthMm.value = 210;
    paperHeightMm.value = 297;
    marginMm.value = 10;
    rowsInput.value = 0;
    colsInput.value = 0;
    orientation.value = 'portrait';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-qty="12"]')?.classList.add('active');
    document.querySelectorAll('.size-preset-btn[data-size]').forEach(b => b.classList.remove('active'));
    document.querySelector('.size-preset-btn[data-size="35x45"]')?.classList.add('active');
    document.querySelectorAll('.size-preset-btn[data-paper]').forEach(b => b.classList.remove('active'));
    document.querySelector('.size-preset-btn[data-paper="a4"]')?.classList.add('active');

    renderPreview();
    showToast('Settings reset to defaults.', 'success');
  }

  // ============================================================
  // THEME
  // ============================================================
  function toggleDarkMode() {
    state.isDark = !state.isDark;
    document.body.classList.toggle('dark', state.isDark);
    if (window.lucide) {
      themeIcon.setAttribute('data-lucide', state.isDark ? 'sun' : 'moon');
      themeLabel.textContent = state.isDark ? 'Light' : 'Dark';
      lucide.createIcons();
    }
    localStorage.setItem('photocraft-dark', state.isDark ? '1' : '0');
  }

  function checkDarkMode() {
    const saved = localStorage.getItem('photocraft-dark');
    if (saved === '1') {
      state.isDark = true;
      document.body.classList.add('dark');
      themeIcon.setAttribute('data-lucide', 'sun');
      themeLabel.textContent = 'Light';
      if (window.lucide) lucide.createIcons();
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconName = type === 'success' ? 'check-circle'
                   : type === 'error' ? 'alert-circle'
                   : 'info';
    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function showLoading(show) {
    loadingOverlay.classList.toggle('active', show);
  }

  // ============================================================
  // START
  // ============================================================
  init();
})();
