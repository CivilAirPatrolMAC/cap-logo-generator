import { emblemOptions } from './emblemoptions.js';

const BASE_WIDTH = 2000;
const BASE_HEIGHT = 415;
const SECONDARY_PADDING_RIGHT = 10;
const SECONDARY_GRAPHIC_OFFSET_LEFT = 350;
const MAX_TEXT_LENGTH = 50;

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

async function drawBaseLogo(imagePath) {
	const img = await loadImage(imagePath);
	const scale = BASE_HEIGHT / img.height;
	const drawWidth = img.width * scale;

	ctx.drawImage(img, 0, 0, drawWidth, BASE_HEIGHT);
}

function createCanvasFromImage(img) {
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d');

	tempCanvas.width = img.width;
	tempCanvas.height = img.height;
	tempCtx.drawImage(img, 0, 0);

	return { tempCanvas, tempCtx };
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

function getTextVerticalBounds(text, fontSize, baselineY) {
	ctx.font = `700 ${fontSize}px Rajdhani`;
	const metrics = ctx.measureText(text || 'H');

	const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
	const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;

	return {
		top: baselineY - ascent,
		bottom: baselineY + descent,
		height: ascent + descent
	};
}

function getSecondaryLayout(img, wordmarkTop, wordmarkBottom) {
	if (!img) {
		return {
			drawX: 0,
			drawY: 0,
			drawWidth: 0,
			drawHeight: 0
		};
	}

	const maxHeight = Math.max(1, wordmarkBottom - wordmarkTop);
	const scale = Math.min(1, maxHeight / img.height);
	const drawWidth = img.width * scale;
	const drawHeight = img.height * scale;
	const drawX =
		BASE_WIDTH -
		SECONDARY_PADDING_RIGHT -
		drawWidth -
		SECONDARY_GRAPHIC_OFFSET_LEFT;
	const drawY = wordmarkTop + (maxHeight - drawHeight) / 2;

	return { drawX, drawY, drawWidth, drawHeight };
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
	const logoFile = isWhiteVersion ? 'WhiteLogo.png' : 'BlueLogo.png';

	canvas.width = BASE_WIDTH;
	canvas.height = BASE_HEIGHT;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	canvas.classList.toggle('white-preview', isWhiteVersion);

	try {
		await drawBaseLogo(logoFile);
	} catch (error) {
		console.error('Could not load base logo:', error);
		return;
	}

	const wordmarkLeft = 380;
	const defaultWordmarkRight = 1125;
	const defaultWordmarkWidth = defaultWordmarkRight - wordmarkLeft;
	const tracking = text.length > 20 ? 1 : 3;
	const baselineY = 220;

	let fontSize = getResponsiveFontSize(text, {
		fontFamily: 'Rajdhani',
		fontWeight: '700',
		tracking,
		availableWidth: defaultWordmarkWidth,
		targetFillRatio: 1,
		maxFontSize: 130,
		minFontSize: 12,
		maxTextHeight: 70
	});

	let wordmarkBounds = getTextVerticalBounds(text, fontSize, baselineY + fontSize);
	let secondaryLayout = getSecondaryLayout(
		secondaryGraphicImage,
		wordmarkBounds.top,
		wordmarkBounds.bottom
	);

	const wordmarkRight = secondaryGraphicImage
		? Math.min(defaultWordmarkRight, secondaryLayout.drawX - 10)
		: defaultWordmarkRight;
	const wordmarkWidth = Math.max(100, wordmarkRight - wordmarkLeft);

	fontSize = getResponsiveFontSize(text, {
		fontFamily: 'Rajdhani',
		fontWeight: '700',
		tracking,
		availableWidth: wordmarkWidth,
		targetFillRatio: 1,
		maxFontSize: 130,
		minFontSize: 12,
		maxTextHeight: 70
	});

	const finalBaselineY = baselineY + fontSize;
	wordmarkBounds = getTextVerticalBounds(text, fontSize, finalBaselineY);
	secondaryLayout = getSecondaryLayout(
		secondaryGraphicImage,
		wordmarkBounds.top,
		wordmarkBounds.bottom
	);

	const textColor = isWhiteVersion ? '#FFFFFF' : '#001871';

	ctx.fillStyle = textColor;
	ctx.strokeStyle = textColor;
	ctx.lineWidth = 1.2;
	ctx.lineJoin = 'round';
	ctx.miterLimit = 2;
	ctx.font = `700 ${fontSize}px Rajdhani`;

	drawTrackedText(text, wordmarkLeft, finalBaselineY, tracking);

	if (secondaryGraphicImage) {
		ctx.drawImage(
			secondaryGraphicImage,
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
