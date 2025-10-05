// Scroll-driven step controller with book page flips and images
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

    /* SEQUENCE:
       0 -> gift (closed)
       1 -> book cover visible (book front page shown, cover not opened)
       2 -> cover opened (cover flips) [we'll combine 1 & 2: first scroll to 'open cover']
       2 -> page1 flipped (first inside page turned)
       3 -> page2 flipped
       4 -> page3 flipped
       5 -> finale
    */
    const totalPages = pages.length; // number of image pages
    const sequence = [];
    // build sequence array:
    // gift
    sequence.push({ name: 'gift' });
    // book cover (show book)
    sequence.push({ name: 'book-show' });
    // book open (flip cover)
    sequence.push({ name: 'book-open' });
    // each page flip is a step
    for (let i = 0; i < totalPages; i++) sequence.push({ name: `page-${i}` });
    // finale
    sequence.push({ name: 'finale' });

    let seqIndex = 0;
    let busy = false; // simple throttle to prevent rapid changes
    const THROTTLE = 600; // ms

    // Helper: show/hide top-level sections
    function showSectionForScene(sceneName) {
        // Decide which section to make active based on current sequence item
        if (sceneName === 'gift') {
            activateSection(stepsSections.gift);
        } else if (sceneName.startsWith('book') || sceneName.startsWith('page')) {
            activateSection(stepsSections.book);
        } else if (sceneName === 'finale') {
            activateSection(stepsSections.finale);
        }
    }

    function activateSection(sectionEl) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        sectionEl.classList.add('active');
    }

    // Apply visuals for a particular sequence index
    function applySequenceState(index) {
        const item = sequence[index];
        // reset states
        giftContainer.classList.remove('open');
        storybookContainer.classList.remove('visible', 'opening', 'open');
        bookCover.classList.remove('flipped');
        pages.forEach(p => p.classList.remove('flipped'));

        // Show music on the first interaction (play attempt)
        function ensureMusicPlays() {
            if (backgroundMusic && backgroundMusic.paused) {
                backgroundMusic.play().catch(() => { /* ignore autoplay block */ });
            }
        }

        if (item.name === 'gift') {
            showSectionForScene('gift');
            // Nothing else; gift closed
        } else if (item.name === 'book-show') {
            showSectionForScene('book');
            // make the book visible (but cover closed)
            storybookContainer.classList.add('visible');
            ensureMusicPlays();
        } else if (item.name === 'book-open') {
            showSectionForScene('book');
            storybookContainer.classList.add('visible', 'opening');
            // small delayed flip for nicer timing
            setTimeout(() => {
                bookCover.classList.add('flipped');
            }, 300);
            ensureMusicPlays();
        } else if (item.name.startsWith('page-')) {
            showSectionForScene('book');
            // ensure book is open & visible
            storybookContainer.classList.add('visible', 'opening', 'open');
            bookCover.classList.add('flipped');
            // flip all pages up to the current page index
            const pageIndex = parseInt(item.name.split('-')[1], 10);
            for (let i = 0; i <= pageIndex; i++) {
                const p = pages[i];
                if (p) p.classList.add('flipped');
            }
            ensureMusicPlays();
        } else if (item.name === 'finale') {
            showSectionForScene('finale');
            ensureMusicPlays();
        }
    }

    // Initialize state
    applySequenceState(seqIndex);

    // Advance / rewind sequence
    function go(delta) {
        if (busy) return;
        if (delta > 0) {
            // move forward (user scrolled up in your requested convention)
            if (seqIndex < sequence.length - 1) {
                seqIndex++;
                busy = true;
                applySequenceState(seqIndex);
                setTimeout(() => busy = false, THROTTLE);
            }
        } else if (delta < 0) {
            // move backward
            if (seqIndex > 0) {
                seqIndex--;
                busy = true;
                applySequenceState(seqIndex);
                setTimeout(() => busy = false, THROTTLE);
            }
        }
    }

    /* WHEEL handling:
       Many mice/touchpads produce deltaY > 0 when scrolling down, < 0 when scrolling up.
       The user asked "when scrolled up it should go to next step" — to match natural mapping,
       we'll interpret deltaY < 0 (scroll up) as forward/next and deltaY > 0 (scroll down) as back.
       But above go() uses delta > 0 = forward. So we invert the wheel delta here.
    */
    let lastWheel = 0;
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        const raw = e.deltaY;
        const normalized = raw === 0 ? 0 : (raw > 0 ? -1 : 1); // invert: up -> +1
        // Debounce small deltas (touchpads can be noisy)
        if (Math.abs(raw) < 2) return;
        go(normalized);
        lastWheel = Date.now();
    }, { passive: false });

    // TOUCH support: detect vertical swipe
    let touchStartY = null;
    window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
        if (touchStartY === null) return;
        const endY = (e.changedTouches && e.changedTouches[0].clientY) || touchStartY;
        const diff = touchStartY - endY;
        // swipe up -> diff > 30 -> next
        if (Math.abs(diff) > 30) {
            const direction = diff > 0 ? 1 : -1; // up = 1 (next)
            go(direction);
        }
        touchStartY = null;
    }, { passive: true });

    // Also allow keyboard navigation (ArrowUp -> next, ArrowDown -> prev)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') { go(1); }
        if (e.key === 'ArrowDown') { go(-1); }
    });

    // Also allow clicking the gift to open it (for accessibility / fallback)
    giftContainer.addEventListener('click', () => {
        // if we are at gift state, treat click as forward
        if (sequence[seqIndex] && sequence[seqIndex].name === 'gift') {
            go(1);
        } else {
            // toggle open for a nice touch
            giftContainer.classList.toggle('open');
            backgroundMusic.play().catch(()=>{});
        }
    });

    // Small accessibility: when the user reaches the book-show state, focus the book
    // not necessary, but helps screen readers / keyboard users
    function onSequenceChange() {
        const item = sequence[seqIndex];
        if (item.name === 'book-show' || item.name.startsWith('page-') || item.name === 'book-open') {
            book.setAttribute('tabindex', '-1');
            book.focus({ preventScroll: true });
        }
    }

    // Hook into applySequenceState by calling onSequenceChange after each update
    // We'll wrap applySequenceState to call it (simple approach)
    const originalApply = applySequenceState;
    applySequenceState = function(index) {
        originalApply(index);
        onSequenceChange();
    };

    // Ensure initial visible class for book container if sequence starts beyond 0
    if (seqIndex > 0) applySequenceState(seqIndex);
});
