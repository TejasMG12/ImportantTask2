/*********************
 * SCROLL-DRIVEN BOOK *
 *********************/

const ScrollFlipBook = (() => {
	const PHASE_ZOOM_END = 0.45;
	const COMPACT_VIEWPORT_QUERY =
		"(max-width: 768px), ((max-height: 520px) and (orientation: landscape) and (pointer: coarse))";

	const TABLE_POSE_DESKTOP = {
		scale: 0.62,
		rotateX: 28,
		rotateY: 3,
		rotateZ: 8,
		translateX: -12,
		translateY: 2,
	};

	const TABLE_POSE_MOBILE = {
		scale: 0.32,
		rotateX: 28,
		rotateY: 3,
		rotateZ: 8,
		translateX: -6,
		translateY: 0,
	};

	const FLAT_POSE = {
		scale: 1,
		rotateX: 0,
		rotateY: 0,
		rotateZ: 0,
		translateX: 0,
		translateY: 0,
	};

	const FLIP_CHECKBOX_IDS = [
		"cover_checkbox",
		"page1_checkbox",
		"page2_checkbox",
		"page3_checkbox",
		"page4_checkbox",
		"page5_checkbox",
	];

	const scrollContainer = document.querySelector(".scroll-container");
	const zoomBook = document.getElementById("zoomBook");
	const flipCheckboxes = FLIP_CHECKBOX_IDS.map((id) => document.getElementById(id));
	const compactViewportMedia = window.matchMedia(COMPACT_VIEWPORT_QUERY);

	function getTablePose() {
		return compactViewportMedia.matches ? TABLE_POSE_MOBILE : TABLE_POSE_DESKTOP;
	}

	function clamp(value, min = 0, max = 1) {
		return Math.min(max, Math.max(min, value));
	}

	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function lerp(a, b, t) {
		return a + (b - a) * t;
	}

	function lerpPose(from, to, t) {
		return {
			scale: lerp(from.scale, to.scale, t),
			rotateX: lerp(from.rotateX, to.rotateX, t),
			rotateY: lerp(from.rotateY, to.rotateY, t),
			rotateZ: lerp(from.rotateZ, to.rotateZ, t),
			translateX: lerp(from.translateX, to.translateX, t),
			translateY: lerp(from.translateY, to.translateY, t),
		};
	}

	function poseToTransform(pose) {
		const tx =
			pose.translateX === 0
				? "-50%"
				: `calc(-50% + ${pose.translateX}vw)`;
		const ty =
			pose.translateY === 0
				? "-50%"
				: `calc(-50% + ${pose.translateY}vh)`;

		return [
			`translate(${tx}, ${ty})`,
			`scale(${pose.scale})`,
			`rotateX(${pose.rotateX}deg)`,
			`rotateY(${pose.rotateY}deg)`,
			`rotateZ(${pose.rotateZ}deg)`,
		].join(" ");
	}

	function getScrollProgress() {
		if (!scrollContainer) return 0;

		const scrollable = scrollContainer.offsetHeight - window.innerHeight;
		if (scrollable <= 0) return 0;

		return clamp(window.scrollY / scrollable);
	}

	function applyZoomPhase(progress) {
		const zoomT = easeInOutCubic(clamp(progress / PHASE_ZOOM_END));
		const pose = lerpPose(getTablePose(), FLAT_POSE, zoomT);
		zoomBook.style.transform = poseToTransform(pose);
	}

	function applyFlipPhase(flipProgress) {
		const stepCount = FLIP_CHECKBOX_IDS.length;
		// Ceil so the final page flips before scroll hits exactly 100% (floor never reached step 6)
		const activeSteps =
			flipProgress <= 0
				? 0
				: Math.min(stepCount, Math.ceil(flipProgress * stepCount));

		flipCheckboxes.forEach((checkbox, index) => {
			checkbox.checked = index < activeSteps;
		});
	}

	function resetFlipState() {
		flipCheckboxes.forEach((checkbox) => {
			checkbox.checked = false;
		});
	}

	function update() {
		const progress = getScrollProgress();

		if (progress < PHASE_ZOOM_END) {
			resetFlipState();
			applyZoomPhase(progress);
		} else {
			applyZoomPhase(PHASE_ZOOM_END);
			const flipProgress = (progress - PHASE_ZOOM_END) / (1 - PHASE_ZOOM_END);
			applyFlipPhase(flipProgress);
		}
	}

	function init() {
		if (!scrollContainer || !zoomBook) return;

		let ticking = false;

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				update();
				ticking = false;
			});
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		compactViewportMedia.addEventListener("change", onScroll);
		update();
	}

	return { init, getScrollProgress, PHASE_ZOOM_END, FLIP_CHECKBOX_IDS };
})();

ScrollFlipBook.init();

/*************************
 * ROTATE DEVICE OVERLAY *
 *************************/

const RotateDevicePrompt = (() => {
	const overlay = document.getElementById("rotate-device-overlay");
	const MOBILE_MAX = 768;

	function isMobileViewport() {
		return window.innerWidth <= MOBILE_MAX;
	}

	function isPortrait() {
		return window.matchMedia("(orientation: portrait)").matches;
	}

	function update() {
		if (!overlay) return;

		const show = isMobileViewport() && isPortrait();
		overlay.classList.toggle("show", show);
		document.body.classList.toggle("rotate-blocked", show);
	}

	function init() {
		if (!overlay) return;

		window.addEventListener("resize", update);
		window.addEventListener("orientationchange", update);
		update();
	}

	return { init, update };
})();

RotateDevicePrompt.init();

/***********************
 * MODE TOGGLE (opt.)  *
 ***********************/

const toggleModeBtn = document.getElementById("toggle-mode-btn");
const portfolioLink = document.getElementById("portfolio-link");
const responsiveWarning = document.getElementById("responsive-warning");
const body = document.body;

function applyMode(mode) {
	body.classList.remove("light-mode", "dark-mode");
	body.classList.add(mode);

	if (!toggleModeBtn) return;

	if (mode === "dark-mode") {
		toggleModeBtn.style.color = "rgb(245, 245, 245)";
		toggleModeBtn.innerHTML = '<i class="bi bi-sun-fill"></i>';
		if (portfolioLink) portfolioLink.style.color = "rgb(245, 245, 245)";
		if (responsiveWarning) responsiveWarning.style.backgroundColor = "rgb(2, 4, 8)";
	} else {
		toggleModeBtn.style.color = "rgb(2, 4, 8)";
		toggleModeBtn.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
		if (portfolioLink) portfolioLink.style.color = "rgb(2, 4, 8)";
		if (responsiveWarning) responsiveWarning.style.backgroundColor = "rgb(245, 245, 245)";
	}
}

if (toggleModeBtn) {
	let savedMode = localStorage.getItem("mode") ?? "light-mode";
	applyMode(savedMode);

	toggleModeBtn.addEventListener("click", () => {
		const newMode = body.classList.contains("light-mode")
			? "dark-mode"
			: "light-mode";
		applyMode(newMode);
		localStorage.setItem("mode", newMode);
	});
} else {
	body.classList.add("light-mode");
}
