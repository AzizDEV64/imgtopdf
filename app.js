/* ============================================================
   Lab Photo → PDF  |  Core Application Logic
   ============================================================ */

(function () {
    'use strict';

    // --- Theme Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    function applyTheme(theme) {
        if (theme === 'dark') {
            htmlEl.setAttribute('data-theme', 'dark');
        } else {
            htmlEl.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
    }

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // --- State ---
    let images = []; // Array of { id, file, name, dataUrl }

    // --- DOM Refs ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const gallerySection = document.getElementById('gallery-section');
    const galleryGrid = document.getElementById('gallery-grid');
    const generateSection = document.getElementById('generate-section');
    const generateBtn = document.getElementById('generate-btn');
    const generateDesc = document.getElementById('generate-desc');
    const addMoreBtn = document.getElementById('add-more-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const filenameInput = document.getElementById('filename-input');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const imageCountBadge = document.getElementById('image-count-badge');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const toastContainer = document.getElementById('toast-container');

    // --- Drag state ---
    let dragSrcIndex = null;

    // --- Utils ---
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 300ms ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function updateUI() {
        const count = images.length;
        imageCountBadge.textContent = `${count} fotoğraf`;

        if (count > 0) {
            gallerySection.style.display = '';
            generateSection.style.display = '';
            generateDesc.textContent = `${count} fotoğraf → ${count} sayfa A4 PDF oluşturulacak.`;
        } else {
            gallerySection.style.display = 'none';
            generateSection.style.display = 'none';
        }
    }

    // --- Image Reading ---
    function readImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function addFiles(fileList) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const newFiles = Array.from(fileList).filter(f => validTypes.includes(f.type));

        if (newFiles.length === 0) {
            showToast('Desteklenen format: JPG, PNG, WEBP', 'error');
            return;
        }

        let added = 0;
        for (const file of newFiles) {
            try {
                const dataUrl = await readImageFile(file);
                images.push({
                    id: generateId(),
                    file: file,
                    name: file.name,
                    dataUrl: dataUrl,
                });
                added++;
            } catch (err) {
                console.error('Error reading file:', err);
            }
        }

        if (added > 0) {
            showToast(`${added} fotoğraf eklendi`, 'success');
        }

        renderGallery();
        updateUI();
    }

    // --- Gallery Rendering ---
    function renderGallery() {
        galleryGrid.innerHTML = '';

        images.forEach((img, index) => {
            const card = document.createElement('div');
            card.className = 'thumb-card';
            card.draggable = true;
            card.dataset.index = index;
            card.style.animationDelay = `${index * 40}ms`;

            card.innerHTML = `
                <div class="thumb-img-wrap">
                    <img src="${img.dataUrl}" alt="${img.name}" loading="lazy">
                    <div class="thumb-overlay">
                        <button class="thumb-preview-btn" data-action="preview" data-index="${index}">
                            Önizle
                        </button>
                    </div>
                </div>
                <div class="thumb-info">
                    <span class="thumb-index">${index + 1}</span>
                    <span class="thumb-name" title="${img.name}">${img.name}</span>
                    <button class="thumb-delete" data-action="delete" data-index="${index}" title="Sil" aria-label="Sil">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `;

            // Drag events for reordering
            card.addEventListener('dragstart', onDragStart);
            card.addEventListener('dragover', onDragOver);
            card.addEventListener('dragenter', onDragEnter);
            card.addEventListener('dragleave', onDragLeave);
            card.addEventListener('drop', onDrop);
            card.addEventListener('dragend', onDragEnd);

            galleryGrid.appendChild(card);
        });
    }

    // --- Drag & Drop Reorder ---
    function onDragStart(e) {
        dragSrcIndex = parseInt(e.currentTarget.dataset.index);
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSrcIndex);
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function onDragEnter(e) {
        e.preventDefault();
        const card = e.currentTarget;
        card.classList.add('drag-target');
    }

    function onDragLeave(e) {
        e.currentTarget.classList.remove('drag-target');
    }

    function onDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-target');
        const targetIndex = parseInt(e.currentTarget.dataset.index);

        if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
            // Reorder
            const movedItem = images.splice(dragSrcIndex, 1)[0];
            images.splice(targetIndex, 0, movedItem);
            renderGallery();
            updateUI();
        }

        dragSrcIndex = null;
    }

    function onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('drag-target'));
        dragSrcIndex = null;
    }

    // --- Gallery Click Actions ---
    galleryGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        if (action === 'delete') {
            images.splice(index, 1);
            renderGallery();
            updateUI();
            showToast('Fotoğraf silindi', 'info');
        } else if (action === 'preview') {
            openLightbox(index);
        }
    });

    // --- Lightbox ---
    function openLightbox(index) {
        const img = images[index];
        if (!img) return;
        lightboxImg.src = img.dataUrl;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.style.display = 'none';
        lightboxImg.src = '';
        document.body.style.overflow = '';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.style.display !== 'none') {
            closeLightbox();
        }
    });

    // --- File Drop Zone ---
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addFiles(e.target.files);
        }
        fileInput.value = '';
    });

    // --- Add More / Clear All ---
    addMoreBtn.addEventListener('click', () => fileInput.click());

    clearAllBtn.addEventListener('click', () => {
        if (images.length === 0) return;
        images = [];
        renderGallery();
        updateUI();
        showToast('Tüm fotoğraflar temizlendi', 'info');
    });

    // --- PDF Preview Modal Refs ---
    const pdfPreviewModal = document.getElementById('pdf-preview-modal');
    const pdfPreviewIframe = document.getElementById('pdf-preview-iframe');
    const pdfPreviewDownload = document.getElementById('pdf-preview-download');
    const pdfPreviewCloseBtn = document.getElementById('pdf-preview-close-btn');

    let currentPdf = null;
    let currentFilename = '';
    let currentBlobUrl = null;

    function openPdfPreview(pdf, filename) {
        currentPdf = pdf;
        currentFilename = filename;
        // Create blob with proper type
        const blob = pdf.output('blob');
        currentBlobUrl = URL.createObjectURL(blob);
        // Hide Chrome's PDF toolbar so user uses our İndir button (correct filename)
        pdfPreviewIframe.src = currentBlobUrl + '#toolbar=0';
        pdfPreviewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closePdfPreview() {
        pdfPreviewModal.style.display = 'none';
        pdfPreviewIframe.src = '';
        document.body.style.overflow = '';
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = null;
        }
        currentPdf = null;
        currentFilename = '';
    }

    pdfPreviewCloseBtn.addEventListener('click', closePdfPreview);
    pdfPreviewModal.addEventListener('click', (e) => {
        if (e.target === pdfPreviewModal) closePdfPreview();
    });

    pdfPreviewDownload.addEventListener('click', () => {
        if (currentPdf && currentFilename) {
            // Use a temporary link to force correct filename
            const blob = currentPdf.output('blob');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`${currentFilename} başarıyla indirildi!`, 'success');
            closePdfPreview();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pdfPreviewModal.style.display !== 'none') {
            closePdfPreview();
        }
    });

    // --- PDF Generation ---
    generateBtn.addEventListener('click', async () => {
        if (images.length === 0) {
            showToast('Önce fotoğraf ekleyin!', 'error');
            return;
        }

        generateBtn.disabled = true;
        progressContainer.style.display = '';
        progressFill.style.width = '0%';
        progressText.textContent = 'PDF hazırlanıyor...';

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const A4_W = 210; // mm
            const A4_H = 297; // mm
            const PADDING = 3; // mm — padding on all 4 sides
            const PAGE_NUM_AREA = 5; // mm — reserved at bottom for page number

            const usableW = A4_W - 2 * PADDING;
            const usableH = A4_H - 2 * PADDING - PAGE_NUM_AREA;

            for (let i = 0; i < images.length; i++) {
                if (i > 0) pdf.addPage();

                // Update progress
                const pct = Math.round(((i + 1) / images.length) * 100);
                progressFill.style.width = `${pct}%`;
                progressText.textContent = `Sayfa ${i + 1} / ${images.length}`;

                // White background
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, A4_W, A4_H, 'F');

                // Load image to get natural dimensions
                const imgData = images[i].dataUrl;
                const dims = await getImageDimensions(imgData);

                // Always fill horizontally (width-first)
                const imgRatio = dims.width / dims.height;
                let drawW = usableW;
                let drawH = drawW / imgRatio;

                // If image is too tall, scale down to fit usable height
                if (drawH > usableH) {
                    drawH = usableH;
                    drawW = drawH * imgRatio;
                }

                const offsetX = PADDING + (usableW - drawW) / 2;
                const offsetY = PADDING + (usableH - drawH) / 2;

                // Determine image format
                let format = 'JPEG';
                if (images[i].name.toLowerCase().endsWith('.png')) {
                    format = 'PNG';
                }

                pdf.addImage(imgData, format, offsetX, offsetY, drawW, drawH, undefined, 'FAST');

                // Page number at the bottom center
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(120, 120, 120);
                const pageText = `${i + 1} / ${images.length}`;
                const textWidth = pdf.getTextWidth(pageText);
                pdf.text(pageText, (A4_W - textWidth) / 2, A4_H - PADDING);

                // Allow UI to update
                await new Promise(r => setTimeout(r, 30));
            }

            progressFill.style.width = '100%';
            progressText.textContent = 'Önizleme hazır!';

            const filename = (filenameInput.value.trim() || 'lab_raporu') + '.pdf';

            // Show preview instead of direct download
            openPdfPreview(pdf, filename);

            setTimeout(() => {
                progressContainer.style.display = 'none';
                generateBtn.disabled = false;
            }, 1000);

        } catch (err) {
            console.error('PDF generation error:', err);
            showToast('PDF oluşturulurken bir hata oluştu.', 'error');
            progressContainer.style.display = 'none';
            generateBtn.disabled = false;
        }
    });

    function getImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 1, height: 1 });
            img.src = dataUrl;
        });
    }

    // --- Init ---
    updateUI();

})();
