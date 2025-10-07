// script.js (updated)
document.addEventListener('DOMContentLoaded', () => {
    const backgroundMusic = document.getElementById('backgroundMusic');

    // Elements
    const giftContainer = document.getElementById('giftContainer');
    const storybookContainer = document.getElementById('storybookContainer');
    const book = document.getElementById('book');
    const bookCover = document.getElementById('bookCover');
    const pages = Array.from(document.querySelectorAll('.page'));
    const stepsSections = {
        gift: document.getElementById('step-gift'),
        book: document.getElementById('step-book'),
        finale: document.getElementById('step-finale'),
    };

    // Record initial z-index (so we can restore when un-flipping)
    const initialZIndices = pages.map(p => {
        const z = window.getComputedStyle(p).zIndex;
        p.dataset.initialZ = (z && z !== 'auto') ? z : '';
        return p.dataset.initialZ;
    });

    /* Sequence build (no off-by-one)
       0 -> gift
       1 -> book-show
       2 -> book-open
       3 -> page-0 (first page)
       4 -> page-1 (second page)
       ...
       last -> finale
    */
    const sequence = [];
    sequence.push({ name: 'gift' });
    sequence.push({ name: 'book-show' });
    sequence.push({ name: 'book-open' });

    const totalPages = pages.length - 1;
    for (let i = -1; i < totalPages; i++) sequence.push({ name: `page-${i}` });

    sequence.push({ name: 'finale' });

    let seqIndex = 0;
    let busy = false; // throttle
    const THROTTLE = 600; // ms

    // Helper: show/hide top-level sections
    function showSectionForScene(sceneName) {
        if (sceneName === 'gift') activateSection(stepsSections.gift);
        else if (sceneName.startsWith('book') || sceneName.startsWith('page')) activateSection(stepsSections.book);
        else if (sceneName === 'finale') activateSection(stepsSections.finale);
    }

    function activateSection(sectionEl) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        sectionEl.classList.add('active');
    }

    // Only change classes that need changing (avoid re-triggering animations)
    function updatePagesFlip(targetCount) {
        // targetCount = number of pages that should be flipped (e.g., pageIndex + 1)
        pages.forEach((p, i) => {
            const shouldFlip = i < targetCount;
            const isFlipped = p.classList.contains('flipped');

            if (shouldFlip && !isFlipped) {
                // new flip -> add class (this will animate only newly flipped page)
                p.classList.add('flipped');
            } else if (!shouldFlip && isFlipped) {
                // un-flip (when rewinding)
                p.classList.remove('flipped');
            }

            // Visual stacking: make flipped pages stack by their index so later pages are above earlier ones
            if (shouldFlip) {
                p.style.zIndex = 1000 + i; // higher i -> higher z-index
            } else {
                // restore initial z (or clear inline style)
                p.style.zIndex = p.dataset.initialZ || '';
            }
        });
    }

    // Utility: try to play music on first interaction
    function ensureMusicPlays() {
        if (backgroundMusic && backgroundMusic.paused) {
            backgroundMusic.play().catch(() => { /* ignore autoplay restrictions */ });
            backgroundMusic.volume = 0.6; // lower volume
        }
    }
    ensureMusicPlays();
    // Apply visuals for a particular sequence index
    function applySequenceState(index) {
        const item = sequence[index];

        // Preserve page flip state when possible (don't blindly remove .flipped)
        // Reset top-level UI flags that are scene-specific
        giftContainer.classList.remove('open');
        storybookContainer.classList.remove('visible', 'opening', 'open');
        bookCover.classList.remove('flipped');

        if (item.name === 'gift') {
            showSectionForScene('gift');
            updatePagesFlip(0); // no pages flipped
        } else if (item.name === 'book-show') {
            showSectionForScene('book');
            storybookContainer.classList.add('visible');
            updatePagesFlip(0);
            ensureMusicPlays();
        } else if (item.name === 'book-open') {
            showSectionForScene('book');
            storybookContainer.classList.add('visible', 'opening');
            // flip the cover after a short delay for nice timing
            setTimeout(() => bookCover.classList.add('flipped'), 300);
            updatePagesFlip(0);
            ensureMusicPlays();
        } else if (item.name.startsWith('page-')) {
            showSectionForScene('book');
            storybookContainer.classList.add('visible', 'opening', 'open');
            // ensure cover looks opened
            bookCover.classList.add('flipped');

            const pageIndex = parseInt(item.name.split('-')[1], 10);
            const targetCount = pageIndex + 1; // flip pages 0..pageIndex
            updatePagesFlip(targetCount);
            ensureMusicPlays();
        } else if (item.name === 'finale') {
            showSectionForScene('finale');
            updatePagesFlip(pages.length);
            ensureMusicPlays();
        }

        // Accessibility hint: focus book when appropriate
        if (item.name === 'book-show' || item.name.startsWith('page-') || item.name === 'book-open') {
            book.setAttribute('tabindex', '-1');
            book.focus({ preventScroll: true });
        }
    }

    // Initialize
    applySequenceState(seqIndex);

    // Advance / rewind sequence
    function go(delta) {
        if (busy) return;
        if (delta > 0) {
            if (seqIndex < sequence.length - 1) {
                seqIndex++;
                busy = true;
                applySequenceState(seqIndex);
                setTimeout(() => busy = false, THROTTLE);
            }
        } else if (delta < 0) {
            if (seqIndex > 0) {
                seqIndex--;
                busy = true;
                applySequenceState(seqIndex);
                setTimeout(() => busy = false, THROTTLE);
            }
        }
    }

    // WHEEL handling (invert so scroll up -> forward)
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        const raw = e.deltaY;
        if (Math.abs(raw) < 2) return;
        const normalized = raw > 0 ? -1 : 1; // up -> 1
        go(normalized);
    }, { passive: false });

    // TOUCH support: vertical swipe
    let touchStartY = null;
    window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
        if (touchStartY === null) return;
        const endY = (e.changedTouches && e.changedTouches[0].clientY) || touchStartY;
        const diff = touchStartY - endY;
        if (Math.abs(diff) > 30) {
            const direction = diff > 0 ? 1 : -1; // up = 1 (next)
            go(direction);
        }
        touchStartY = null;
    }, { passive: true });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') go(1);
        if (e.key === 'ArrowDown') go(-1);
    });

    // Gift click (fallback / accessibility)
    giftContainer.addEventListener('click', () => {
        if (sequence[seqIndex] && sequence[seqIndex].name === 'gift') {
            go(1);
        } else {
            giftContainer.classList.toggle('open');
            backgroundMusic.play().catch(() => { });
        }
    });
});
