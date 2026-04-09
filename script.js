import { emblemOptions } from './emblemoptions.js';

const BASE_WIDTH = 2000;
const BASE_HEIGHT = 415;
const MAX_TEXT_LENGTH = 50;

// Layout tuning
const BASE_LOGO_SCALE_MULTIPLIER = 1.08;
const WORDMARK_LEFT = 430;
const DEFAULT_WORDMARK_RIGHT = 1190;
const WORDMARK_TO_EMBLEM_GAP = 18;
const SECONDARY_PADDING_RIGHT = 14;
const SECONDARY_GRAPHIC_OFFSET_LEFT = 340;
const SUBORDINATE_TARGET_FILL_RATIO = 0.985;
const SUBORDINATE_MAX_TEXT_HEIGHT = 70;

// Visible bounds detection
const VISIBLE_BOUNDS_ALPHA_THRESHOLD = 16;
const VISIBLE_BOUNDS_WHITE_THRESHOLD = 245;
const VISIBLE_BOUNDS_PADDING = 2;

let canvas;
let ctx;
let capFont;
let emblemDropdown = null;

let secondaryGraphicImage = null;
let secondaryGraphicSource = null; // 'upload' | 'dropdown' | null
let secondaryGraphicOriginalUpload = null;

document.addEventListener('DOMContentLoaded', async () => {
	canvas = document.getElementById('canvas');
	if (!canvas) return;

	ctx = canvas.getContext('2d');

	const subordinateTextInput = document.getElementById('subordinateText');
	const logoStyleSelect = document.getElementById('logoStyle');
	const secondaryInput = document.getElementById('secondaryGraphic');
	const clearButton = document.getElementById('clearSecondaryGraphic');
	const transparencyToggle = document.getElementById('secondaryGraphicTransparency');
	const downloadButton = document.getElementById('download');
	const emblemSelect = document.getElementById('emblemSelect');

	populateEmblemSelect();
	initializeSearchableDropdown();
	updateCharacterCounter();

	try {
		await loadFont();
		await renderGraphic();
	} catch (error) {
		console.error('Initialization failed:', error);
	}

	subordinateTextInput?.addEventListener('input', handleSubordinateTextInput);
	logoStyleSelect?.addEventListener('change', renderGraphic);
	secondaryInput?.addEventListener('change', handleSecondaryGraphicUpload);
	clearButton?.addEventListener('click', clearSecondaryGraphic);
	downloadButton?.addEventListener('click', downloadGraphic);
	transparencyToggle?.addEventListener('change', handleTransparencyToggleChange);
	emblemSelect?.addEventListener('change', handleEmblemSelection);
});

function populateEmblemSelect() {
	const emblemSelect = document.getElementById('emblemSelect');
	if (!emblemSelect) return;

	if (emblemDropdown) {
		emblemDropdown.destroy();
		emblemDropdown = null;
	}

	emblemSelect.innerHTML = '';

	const noneOption = document.createElement('option');
	noneOption.value = '';
	noneOption.textContent = 'None';
	emblemSelect.appendChild(noneOption);

	const groupOrder = ['NCSA', 'Region', 'Wing', 'Group', 'Squadron'];
	const groupLabels = {
		NCSA: 'NCSA',
		Region: 'Regions',
		Wing: 'Wings',
		Group: 'Groups',
		Squadron: 'Squadrons'
	};

	const groups = {};

	for (const type of groupOrder) {
		const optgroup = document.createElement('optgroup');
		optgroup.label = groupLabels[type];
		groups[type] = optgroup;
	}

	for (const item of emblemOptions) {
		if (!item?.value || !item?.label || !item?.type) continue;
		if (!groups[item.type]) continue;

		const option = document.createElement('option');
		option.value = item.value;
		option.textContent = item.available
			? item.label
			: `${item.label} (unavailable)`;
		option.disabled = !item.available;

		groups[item.type].appendChild(option);
	}

	for (const type of groupOrder) {
		if (groups[type].children.length > 0) {
			emblemSelect.appendChild(groups[type]);
		}
	}
}

function initializeSearchableDropdown() {
	const select = document.getElementById('emblemSelect');
	if (!select) return;

	if (typeof TomSelect === 'undefined') {
		console.warn('TomSelect is not loaded.');
		return;
	}

	emblemDropdown = new TomSelect(select, {
		create: false,
		allowEmptyOption: true,
		placeholder: 'Search emblems...',
		maxOptions: 500,
		searchField: ['text'],
		optgroupField: 'optgroup'
	});
}

function updateCharacterCounter() {
	const subordinateTextInput = document.getElementById('subordinateText');
	const charCounter = document.getElementById('charCounter');

	if (!subordinateTextInput || !charCounter) return;

	const remaining = MAX_TEXT_LENGTH - subordinateTextInput.value.length;
	charCounter.textContent = `${remaining} characters remaining`;
}

async function loadFont() {
	if (capFont) return;

	const fontSource = new FontFace('Rajdhani', 'url(font.woff2)');
	capFont = await fontSource.load();
	document.fonts.add(capFont);
}

function loadImage(imagePath) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = imagePath;
	});
}

function createCanvasFromImage(img) {
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d');

	tempCanvas.width = img.width;
	tempCanvas.height = img.height;
	tempCtx.drawImage(img, 0, 0);

	return { tempCanvas, tempCtx };
}

function getVisibleImageBounds(img) {
	const { tempCanvas, tempCtx } = createCanvasFromImage(img);
	const { width, height } = tempCanvas;
	const imageData = tempCtx.getImageData(0, 0, width, height);
	const data = imageData.data;

	let top = height;
	let bottom = -1;
	let left = width;
	let right = -1;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const a = data[i + 3];

			const isVisible =
				a > VISIBLE_BOUNDS_ALPHA_THRESHOLD &&
				!(
					r > VISIBLE_BOUNDS_WHITE_THRESHOLD &&
					g > VISIBLE_BOUNDS_WHITE_THRESHOLD &&
					b > VISIBLE_BOUNDS_WHITE_THRESHOLD
				);

			if (!isVisible) continue;

			if (x < left) left = x;
			if (x > right) right = x;
			if (y < top) top = y;
			if (y > bottom) bottom = y;
		}
	}

	if (right === -1 || bottom === -1) {
		return {
			left: 0,
			top: 0,
			right: width - 1,
			bottom: height - 1,
			width,
			height
		};
	}

	left = Math.max(0, left - VISIBLE_BOUNDS_PADDING);
	top = Math.max(0, top - VISIBLE_BOUNDS_PADDING);
	right = Math.min(width - 1, right + VISIBLE_BOUNDS_PADDING);
	bottom = Math.min(height - 1, bottom + VISIBLE_BOUNDS_PADDING);

	return {
		left,
		top,
		right,
		bottom,
		width: right - left + 1,
		height: bottom - top + 1
	};
}

async function getBaseLogoLayout(imagePath) {
	const img = await loadImage(imagePath);

	const scale = (BASE_HEIGHT / img.height) * BASE_LOGO_SCALE_MULTIPLIER;
	const drawWidth = img.width * scale;
	const drawHeight = img.height * scale;
	const offsetY = (BASE_HEIGHT - drawHeight) / 2;

	const visibleBounds = getVisibleImageBounds(img);

	return {
		drawWidth,
		drawHeight,
		offsetY,
		visibleTop: offsetY + (visibleBounds.top * scale),
		visibleBottom: offsetY + ((visibleBounds.bottom + 1) * scale),
		visibleLeft: visibleBounds.left * scale,
		visibleRight: (visibleBounds.right + 1) * scale
	};
}

async function drawBaseLogo(imagePath) {
	const layout = await getBaseLogoLayout(imagePath);
	const img = await loadImage(imagePath);

	ctx.drawImage(img, 0, layout.offsetY, layout.drawWidth, layout.drawHeight);

	return layout;
}

function removeNearWhiteBackground(img) {
	const { tempCanvas, tempCtx } = createCanvasFromImage(img);
	const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];

		if (a !== 0 && r > 240 && g > 240 && b > 240) {
			data[i + 3] = 0;
		}
	}

	tempCtx.putImageData(imageData, 0, 0);
	return tempCanvas;
}

function canvasToImage(sourceCanvas) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.src = sourceCanvas.toDataURL('image/png');
	});
}

async function processUploadedSecondaryGraphic() {
	if (!secondaryGraphicOriginalUpload) {
		secondaryGraphicImage = null;
		await renderGraphic();
		return;
	}

	const transparencyToggle = document.getElementById('secondaryGraphicTransparency');
	const transparencyEnabled = Boolean(transparencyToggle?.checked);

	secondaryGraphicImage = transparencyEnabled
		? await canvasToImage(removeNearWhiteBackground(secondaryGraphicOriginalUpload))
		: secondaryGraphicOriginalUpload;

	await renderGraphic();
}

async function handleTransparencyToggleChange() {
	if (secondaryGraphicSource !== 'upload' || !secondaryGraphicOriginalUpload) {
		return;
	}

	await processUploadedSecondaryGraphic();
}

function clearSecondaryGraphic() {
	secondaryGraphicImage = null;
	secondaryGraphicSource = null;
	secondaryGraphicOriginalUpload = null;

	const secondaryGraphicInput = document.getElementById('secondaryGraphic');
	if (secondaryGraphicInput) secondaryGraphicInput.value = '';

	if (emblemDropdown) {
		emblemDropdown.clear(true);
	} else {
		const emblemSelect = document.getElementById('emblemSelect');
		if (emblemSelect) emblemSelect.value = '';
	}

	renderGraphic();
}

function handleSecondaryGraphicUpload(event) {
	const file = event.target.files?.[0];
	if (!file) return;

	const reader = new FileReader();

	reader.onload = (e) => {
		const img = new Image();

		img.onload = async () => {
			secondaryGraphicOriginalUpload = img;
			secondaryGraphicSource = 'upload';

			if (emblemDropdown) {
				emblemDropdown.clear(true);
			} else {
				const emblemSelect = document.getElementById('emblemSelect');
				if (emblemSelect) emblemSelect.value = '';
			}

			await processUploadedSecondaryGraphic();
		};

		img.src = e.target.result;
	};

	reader.readAsDataURL(file);
}

async function handleEmblemSelection(event) {
	const selectedValue = event.target.value;

	if (!selectedValue) {
		secondaryGraphicImage = null;
		secondaryGraphicSource = null;
		secondaryGraphicOriginalUpload = null;
		await renderGraphic();
		return;
	}

	const selectedItem = emblemOptions.find((item) => item.value === selectedValue);
	if (!selectedItem?.available || !selectedItem.path) return;

	try {
		secondaryGraphicImage = await loadImage(selectedItem.path);
		secondaryGraphicSource = 'dropdown';
		secondaryGraphicOriginalUpload = null;

		const secondaryGraphicInput = document.getElementById('secondaryGraphic');
		if (secondaryGraphicInput) secondaryGraphicInput.value = '';

		await renderGraphic();
	} catch (error) {
		console.error('Could not load emblem:', error);
	}
}

function handleSubordinateTextInput(event) {
	const input = event.target;
	if (!input) return;

	if (input.value.length > MAX_TEXT_LENGTH) {
		input.value = input.value.slice(0, MAX_TEXT_LENGTH);
	}

	updateCharacterCounter();
	renderGraphic();
}

function measureTrackedText(text, tracking) {
	let width = 0;

	for (let i = 0; i < text.length; i++) {
		width += ctx.measureText(text[i]).width;
		if (i < text.length - 1) {
			width += tracking;
		}
	}

	return width;
}

function drawTrackedText(text, startX, baselineY, tracking) {
	let x = startX;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		ctx.strokeText(char, x, baselineY);
		ctx.fillText(char, x, baselineY);
		x += ctx.measureText(char).width + tracking;
	}
}

function getResponsiveFontSize(text, options) {
	const {
		fontFamily,
		fontWeight,
		tracking,
		availableWidth,
		targetFillRatio,
		maxFontSize,
		minFontSize,
		maxTextHeight
	} = options;

	const referenceFontSize = 100;
	ctx.font = `${fontWeight} ${referenceFontSize}px ${fontFamily}`;

	const referenceWidth = measureTrackedText(text, tracking);
	if (!referenceWidth) return maxFontSize;

	const targetWidth = availableWidth * targetFillRatio;
	const widthScaledSize = Math.floor((targetWidth / referenceWidth) * referenceFontSize);

	const metrics = ctx.measureText('H');
	const referenceHeight =
		(metrics.actualBoundingBoxAscent || referenceFontSize * 0.8) +
		(metrics.actualBoundingBoxDescent || referenceFontSize * 0.2);

	const heightScale = maxTextHeight / referenceHeight;
	const heightScaledSize = Math.floor(referenceFontSize * heightScale);

	return Math.max(
		minFontSize,
		Math.min(maxFontSize, widthScaledSize, heightScaledSize)
	);
}

function getSecondaryLayout(img, referenceTop, referenceBottom) {
	if (!img) {
		return {
			sourceX: 0,
			sourceY: 0,
			sourceWidth: 0,
			sourceHeight: 0,
			drawX: 0,
			drawY: 0,
			drawWidth: 0,
			drawHeight: 0
		};
	}

	const visibleBounds = getVisibleImageBounds(img);
	const referenceHeight = Math.max(1, referenceBottom - referenceTop);
	const scale = referenceHeight / visibleBounds.height;

	const drawWidth = visibleBounds.width * scale;
	const drawHeight = visibleBounds.height * scale;

	const drawX =
		BASE_WIDTH -
		SECONDARY_PADDING_RIGHT -
		drawWidth -
		SECONDARY_GRAPHIC_OFFSET_LEFT;

	const drawY = referenceTop;

	return {
		sourceX: visibleBounds.left,
		sourceY: visibleBounds.top,
		sourceWidth: visibleBounds.width,
		sourceHeight: visibleBounds.height,
		drawX,
		drawY,
		drawWidth,
		drawHeight
	};
}

async function renderGraphic() {
	if (!ctx || !capFont) return;

	const subordinateTextInput = document.getElementById('subordinateText');
	const logoStyleSelect = document.getElementById('logoStyle');

	const rawInput = (subordinateTextInput?.value || 'Marketing & Communication')
		.slice(0, MAX_TEXT_LENGTH);
	const text = rawInput.toUpperCase();
	const selectedStyle = logoStyleSelect?.value || 'blue';

	const isWhiteVersion = selectedStyle === 'white';
	const displayLogoFile = isWhiteVersion ? 'WhiteLogo.png' : 'BlueLogo.png';
	const referenceLogoFile = 'BlueLogo.png';

	canvas.width = BASE_WIDTH;
	canvas.height = BASE_HEIGHT;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	canvas.classList.toggle('white-preview', isWhiteVersion);

	let referenceLogoLayout;
	try {
		referenceLogoLayout = await getBaseLogoLayout(referenceLogoFile);
		await drawBaseLogo(displayLogoFile);
	} catch (error) {
		console.error('Could not load base logo:', error);
		return;
	}

	const referenceTop = referenceLogoLayout.visibleTop;
	const referenceBottom = referenceLogoLayout.visibleBottom;

	const tracking = text.length > 20 ? 1 : 3;
	const defaultWordmarkWidth = DEFAULT_WORDMARK_RIGHT - WORDMARK_LEFT;
	const baselineAnchorY = 220;

	let fontSize = getResponsiveFontSize(text, {
		fontFamily: 'Rajdhani',
		fontWeight: '700',
		tracking,
		availableWidth: defaultWordmarkWidth,
		targetFillRatio: SUBORDINATE_TARGET_FILL_RATIO,
		maxFontSize: 130,
		minFontSize: 12,
		maxTextHeight: SUBORDINATE_MAX_TEXT_HEIGHT
	});

	let baselineY = baselineAnchorY + fontSize;

	let secondaryLayout = getSecondaryLayout(
		secondaryGraphicImage,
		referenceTop,
		referenceBottom
	);

	const wordmarkRight = secondaryGraphicImage
		? Math.min(DEFAULT_WORDMARK_RIGHT, secondaryLayout.drawX - WORDMARK_TO_EMBLEM_GAP)
		: DEFAULT_WORDMARK_RIGHT;
	const wordmarkWidth = Math.max(100, wordmarkRight - WORDMARK_LEFT);

	fontSize = getResponsiveFontSize(text, {
		fontFamily: 'Rajdhani',
		fontWeight: '700',
		tracking,
		availableWidth: wordmarkWidth,
		targetFillRatio: SUBORDINATE_TARGET_FILL_RATIO,
		maxFontSize: 130,
		minFontSize: 12,
		maxTextHeight: SUBORDINATE_MAX_TEXT_HEIGHT
	});

	baselineY = baselineAnchorY + fontSize;

	secondaryLayout = getSecondaryLayout(
		secondaryGraphicImage,
		referenceTop,
		referenceBottom
	);

	const textColor = isWhiteVersion ? '#FFFFFF' : '#001871';

	ctx.fillStyle = textColor;
	ctx.strokeStyle = textColor;
	ctx.lineWidth = 1.2;
	ctx.lineJoin = 'round';
	ctx.miterLimit = 2;
	ctx.font = `700 ${fontSize}px Rajdhani`;

	drawTrackedText(text, WORDMARK_LEFT, baselineY, tracking);

	if (secondaryGraphicImage) {
		ctx.drawImage(
			secondaryGraphicImage,
			secondaryLayout.sourceX,
			secondaryLayout.sourceY,
			secondaryLayout.sourceWidth,
			secondaryLayout.sourceHeight,
			secondaryLayout.drawX,
			secondaryLayout.drawY,
			secondaryLayout.drawWidth,
			secondaryLayout.drawHeight
		);
	}
}

function downloadGraphic() {
	const link = document.createElement('a');
	link.download = 'Graphic.png';
	link.href = canvas.toDataURL('image/png');
	link.click();
}
