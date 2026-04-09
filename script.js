import { emblemOptions } from './emblemoptions.js';

const BASE_WIDTH = 2000;
const BASE_HEIGHT = 415;
const SECONDARY_PADDING_RIGHT = 10;
const SECONDARY_GRAPHIC_OFFSET_LEFT = 350;

let canvas;
let ctx;
let capFont;

let secondaryGraphicImage = null;
let secondaryGraphicSource = null; // 'upload' | 'dropdown' | null
let secondaryGraphicOriginalUpload = null;

document.addEventListener('DOMContentLoaded', async () => {
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');

	const subordinateTextInput = document.getElementById('subordinateText');
	const logoStyleSelect = document.getElementById('logoStyle');
	const secondaryInput = document.getElementById('secondaryGraphic');
	const clearButton = document.getElementById('clearSecondaryGraphic');
	const emblemSelect = document.getElementById('emblemSelect');
	const transparencyToggle = document.getElementById('secondaryGraphicTransparency');
	const downloadButton = document.getElementById('download');

	populateEmblemSelect();

	try {
		await loadFont();
		await renderGraphic();
	} catch (error) {
		console.error('Initialization failed:', error);
	}

	subordinateTextInput?.addEventListener('input', renderGraphic);
	logoStyleSelect?.addEventListener('change', renderGraphic);
	secondaryInput?.addEventListener('change', handleSecondaryGraphicUpload);
	clearButton?.addEventListener('click', clearSecondaryGraphic);
	emblemSelect?.addEventListener('change', handleEmblemSelection);
	downloadButton?.addEventListener('click', downloadGraphic);
	transparencyToggle?.addEventListener('change', handleTransparencyToggleChange);
});

function populateEmblemSelect() {
	const emblemSelect = document.getElementById('emblemSelect');
	if (!emblemSelect) return;

	emblemSelect.innerHTML = '';

	const noneOption = document.createElement('option');
	noneOption.value = '';
	noneOption.textContent = 'None';
	emblemSelect.appendChild(noneOption);

	const regionGroup = document.createElement('optgroup');
	regionGroup.label = 'Regions';

	const stateGroup = document.createElement('optgroup');
	stateGroup.label = 'States';

	for (const item of emblemOptions) {
		const option = document.createElement('option');
		option.value = item.value;
		option.textContent = item.available ? item.label : `${item.label} (unavailable)`;
		option.disabled = !item.available;

		if (item.type === 'Region') {
			regionGroup.appendChild(option);
		} else {
			stateGroup.appendChild(option);
		}
	}

	emblemSelect.appendChild(regionGroup);
	emblemSelect.appendChild(stateGroup);
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
	const emblemSelect = document.getElementById('emblemSelect');

	if (secondaryGraphicInput) secondaryGraphicInput.value = '';
	if (emblemSelect) emblemSelect.value = '';

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

			const emblemSelect = document.getElementById('emblemSelect');
			if (emblemSelect) emblemSelect.value = '';

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

function measureTrackedText(text, tracking) {
	let width = 0;

	for (let i = 0; i < text.length; i++) {
		width += ctx.measureText(text[i]).width;
		if (i < text.length - 1) width += tracking;
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

function getSecondaryLayout(img) {
	if (!img) {
		return {
			drawX: 0,
			drawY: 0,
			drawWidth: 0,
			drawHeight: 0
		};
	}

	const maxHeight = BASE_HEIGHT - 30;
	const scale = maxHeight / img.height;
	const drawWidth = img.width * scale;
	const drawHeight = img.height * scale;
	const drawX = BASE_WIDTH - SECONDARY_PADDING_RIGHT - drawWidth - SECONDARY_GRAPHIC_OFFSET_LEFT;
	const drawY = (BASE_HEIGHT - drawHeight) / 2;

	return { drawX, drawY, drawWidth, drawHeight };
}

async function renderGraphic() {
	if (!ctx || !capFont) return;

	const subordinateTextInput = document.getElementById('subordinateText');
	const logoStyleSelect = document.getElementById('logoStyle');

	const rawInput = subordinateTextInput?.value || 'Marketing & Communication';
	const text = rawInput.toUpperCase();
	const selectedStyle = logoStyleSelect?.value || 'blue';

	const isWhiteVersion = selectedStyle === 'white';
	const logoFile = isWhiteVersion ? 'WhiteLogo.png' : 'BlueLogo.png';
	const secondaryLayout = getSecondaryLayout(secondaryGraphicImage);

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
	const wordmarkRight = secondaryGraphicImage
		? Math.min(defaultWordmarkRight, secondaryLayout.drawX - 10)
		: defaultWordmarkRight;
	const wordmarkWidth = Math.max(100, wordmarkRight - wordmarkLeft);

	const fontSize = getResponsiveFontSize(text, {
		fontFamily: 'Rajdhani',
		fontWeight: '700',
		tracking: text.length > 20 ? 1 : 3,
		availableWidth: wordmarkWidth,
		targetFillRatio: 1,
		maxFontSize: 130,
		minFontSize: 20,
		maxTextHeight: 70
	});

	const baselineY = 220 + fontSize;
	const textColor = isWhiteVersion ? '#FFFFFF' : '#001871';
	const tracking = text.length > 20 ? 1 : 3;

	ctx.fillStyle = textColor;
	ctx.strokeStyle = textColor;
	ctx.lineWidth = 1.2;
	ctx.lineJoin = 'round';
	ctx.miterLimit = 2;
	ctx.font = `700 ${fontSize}px Rajdhani`;

	drawTrackedText(text, wordmarkLeft, baselineY, tracking);

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
