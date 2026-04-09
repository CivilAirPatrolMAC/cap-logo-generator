let canvas;
let ctx;
let capFont;

let secondaryGraphicImage = null;
let secondaryGraphicSource = null; // 'upload' or 'dropdown' or null
let secondaryGraphicOriginalUpload = null;

const BASE_WIDTH = 2000;
const BASE_HEIGHT = 415;
const SECONDARY_PADDING_LEFT = 35;
const SECONDARY_PADDING_RIGHT = 35;

let baseLogoLayout = {
	drawX: 0,
	drawY: 0,
	drawWidth: BASE_WIDTH,
	drawHeight: BASE_HEIGHT
};

const input = document.getElementById('subordinate');

const emblemOptions = [
	// Regions
	{ value: 'rocky-mountain-region', label: 'Rocky Mountain Region', type: 'Region', path: '', available: false },
	{ value: 'pacific-region', label: 'Pacific Region', type: 'Region', path: '', available: false },
	{ value: 'north-central-region', label: 'North Central Region', type: 'Region', path: '', available: false },
	{ value: 'great-lakes-region', label: 'Great Lakes Region', type: 'Region', path: '', available: false },
	{ value: 'northeast-region', label: 'Northeast Region', type: 'Region', path: '', available: false },
	{ value: 'mid-atlantic-region', label: 'Mid-Atlantic Region', type: 'Region', path: '', available: false },
	{ value: 'southeast-region', label: 'Southeast Region', type: 'Region', path: '', available: false },
	{ value: 'southwest-region', label: 'Southwest Region', type: 'Region', path: 'region/swremblem.png', available: true },
	{ value: 'overseas', label: 'Overseas', type: 'Region', path: '', available: false },

	// States
	{ value: 'alabama', label: 'Alabama', type: 'State', path: '', available: false },
	{ value: 'alaska', label: 'Alaska', type: 'State', path: '', available: false },
	{ value: 'arizona', label: 'Arizona', type: 'State', path: 'wing/azemblem.png', available: true },
	{ value: 'arkansas', label: 'Arkansas', type: 'State', path: 'wing/aremblem.png', available: true },
	{ value: 'california', label: 'California', type: 'State', path: '', available: false },
	{ value: 'colorado', label: 'Colorado', type: 'State', path: '', available: false },
	{ value: 'connecticut', label: 'Connecticut', type: 'State', path: '', available: false },
	{ value: 'delaware', label: 'Delaware', type: 'State', path: '', available: false },
	{ value: 'florida', label: 'Florida', type: 'State', path: '', available: false },
	{ value: 'georgia', label: 'Georgia', type: 'State', path: '', available: false },
	{ value: 'hawaii', label: 'Hawaii', type: 'State', path: '', available: false },
	{ value: 'idaho', label: 'Idaho', type: 'State', path: '', available: false },
	{ value: 'illinois', label: 'Illinois', type: 'State', path: '', available: false },
	{ value: 'indiana', label: 'Indiana', type: 'State', path: '', available: false },
	{ value: 'iowa', label: 'Iowa', type: 'State', path: '', available: false },
	{ value: 'kansas', label: 'Kansas', type: 'State', path: '', available: false },
	{ value: 'kentucky', label: 'Kentucky', type: 'State', path: '', available: false },
	{ value: 'louisiana', label: 'Louisiana', type: 'State', path: 'wing/laemblem.png', available: true },
	{ value: 'maine', label: 'Maine', type: 'State', path: '', available: false },
	{ value: 'maryland', label: 'Maryland', type: 'State', path: '', available: false },
	{ value: 'massachusetts', label: 'Massachusetts', type: 'State', path: '', available: false },
	{ value: 'michigan', label: 'Michigan', type: 'State', path: '', available: false },
	{ value: 'minnesota', label: 'Minnesota', type: 'State', path: '', available: false },
	{ value: 'mississippi', label: 'Mississippi', type: 'State', path: '', available: false },
	{ value: 'missouri', label: 'Missouri', type: 'State', path: '', available: false },
	{ value: 'montana', label: 'Montana', type: 'State', path: '', available: false },
	{ value: 'nationalcapital', label: 'National Capital', type: 'State', path: '', available: false },
	{ value: 'nebraska', label: 'Nebraska', type: 'State', path: '', available: false },
	{ value: 'nevada', label: 'Nevada', type: 'State', path: '', available: false },
	{ value: 'new-hampshire', label: 'New Hampshire', type: 'State', path: '', available: false },
	{ value: 'new-jersey', label: 'New Jersey', type: 'State', path: '', available: false },
	{ value: 'new-mexico', label: 'New Mexico', type: 'State', path: 'wing/nmemblem.png', available: true },
	{ value: 'new-york', label: 'New York', type: 'State', path: '', available: false },
	{ value: 'north-carolina', label: 'North Carolina', type: 'State', path: '', available: false },
	{ value: 'north-dakota', label: 'North Dakota', type: 'State', path: '', available: false },
	{ value: 'ohio', label: 'Ohio', type: 'State', path: '', available: false },
	{ value: 'oklahoma', label: 'Oklahoma', type: 'State', path: 'wing/okemblem.png', available: true },
	{ value: 'oregon', label: 'Oregon', type: 'State', path: '', available: false },
	{ value: 'pennsylvania', label: 'Pennsylvania', type: 'State', path: '', available: false },
	{ value: 'rhode-island', label: 'Rhode Island', type: 'State', path: '', available: false },
	{ value: 'south-carolina', label: 'South Carolina', type: 'State', path: '', available: false },
	{ value: 'south-dakota', label: 'South Dakota', type: 'State', path: '', available: false },
	{ value: 'tennessee', label: 'Tennessee', type: 'State', path: '', available: false },
	{ value: 'texas', label: 'Texas', type: 'State', path: 'wing/txemblem.png', available: true },
	{ value: 'utah', label: 'Utah', type: 'State', path: '', available: false },
	{ value: 'vermont', label: 'Vermont', type: 'State', path: '', available: false },
	{ value: 'virginia', label: 'Virginia', type: 'State', path: '', available: false },
	{ value: 'washington', label: 'Washington', type: 'State', path: '', available: false },
	{ value: 'west-virginia', label: 'West Virginia', type: 'State', path: '', available: false },
	{ value: 'wisconsin', label: 'Wisconsin', type: 'State', path: '', available: false },
	{ value: 'wyoming', label: 'Wyoming', type: 'State', path: '', available: false }
];

document.addEventListener('DOMContentLoaded', () => {
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');

	const subordinateTextInput = document.getElementById('subordinateText');
	const logoStyleSelect = document.getElementById('logoStyle');
	const secondaryInput = document.getElementById('secondaryGraphic');
	const clearButton = document.getElementById('clearSecondaryGraphic');
	const emblemSelect = document.getElementById('emblemSelect');
	const transparencyToggle = document.getElementById('secondaryGraphicTransparency');
	const romanCoolToggle = document.getElementById('romanCoolToggle');
	const downloadButton = document.getElementById('download');

	populateEmblemSelect();

	loadFont().then(() => {
		renderGraphic();
	});

	if (subordinateTextInput) subordinateTextInput.oninput = renderGraphic;
	if (logoStyleSelect) logoStyleSelect.onchange = renderGraphic;
	if (secondaryInput) secondaryInput.onchange = handleSecondaryGraphicUpload;
	if (clearButton) clearButton.onclick = clearSecondaryGraphic;
	if (emblemSelect) emblemSelect.onchange = handleEmblemSelection;
	if (downloadButton) downloadButton.onclick = download;
	if (transparencyToggle) transparencyToggle.onchange = handleTransparencyToggleChange;
	if (romanCoolToggle) romanCoolToggle.onclick = handleRomanCoolToggle;
});

const populateEmblemSelect = () => {
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

	emblemOptions.forEach((item) => {
		const option = document.createElement('option');
		option.value = item.value;
		option.textContent = item.label;
		option.disabled = !item.available;

		if (!item.available) {
			option.textContent += ' (unavailable)';
		}

		if (item.type === 'Region') {
			regionGroup.appendChild(option);
		} else {
			stateGroup.appendChild(option);
		}
	});

	emblemSelect.appendChild(regionGroup);
	emblemSelect.appendChild(stateGroup);
};

const loadFont = async () => {
	if (capFont) return;

	const fontSource = new FontFace('Rajdhani', 'url(font.woff2)');
	capFont = await fontSource.load();
	document.fonts.add(capFont);
};

const drawSource = (imagePath) => {
	return new Promise((resolve, reject) => {
		const img = new Image();

		img.onload = () => {
			const scale = BASE_HEIGHT / img.height;
			const drawWidth = img.width * scale;
			const drawHeight = BASE_HEIGHT;
			const drawX = 0;
			const drawY = 0;

			baseLogoLayout = {
				drawX,
				drawY,
				drawWidth,
				drawHeight
			};

			ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
			resolve(baseLogoLayout);
		};

		img.onerror = reject;
		img.src = imagePath;
	});
};

const loadImage = (imagePath) => {
	return new Promise((resolve, reject) => {
		const img = new Image();

		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = imagePath;
	});
};

const createCanvasFromImage = (img) => {
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d');

	tempCanvas.width = img.width;
	tempCanvas.height = img.height;
	tempCtx.drawImage(img, 0, 0);

	return { tempCanvas, tempCtx };
};

const removeNearWhiteBackground = (img) => {
	const { tempCanvas, tempCtx } = createCanvasFromImage(img);
	const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];

		if (a === 0) continue;

		if (r > 240 && g > 240 && b > 240) {
			data[i + 3] = 0;
		}
	}

	tempCtx.putImageData(imageData, 0, 0);
	return tempCanvas;
};

const canvasToImage = (sourceCanvas) => {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.src = sourceCanvas.toDataURL('image/png');
	});
};

const processUploadedSecondaryGraphic = async () => {
	if (!secondaryGraphicOriginalUpload) {
		secondaryGraphicImage = null;
		renderGraphic();
		return;
	}

	const transparencyToggle = document.getElementById('secondaryGraphicTransparency');
	const transparencyEnabled = transparencyToggle ? transparencyToggle.checked : false;

	if (transparencyEnabled) {
		const transparentCanvas = removeNearWhiteBackground(secondaryGraphicOriginalUpload);
		secondaryGraphicImage = await canvasToImage(transparentCanvas);
	} else {
		secondaryGraphicImage = secondaryGraphicOriginalUpload;
	}

	renderGraphic();
};

const handleTransparencyToggleChange = async () => {
	if (secondaryGraphicSource !== 'upload' || !secondaryGraphicOriginalUpload) {
		return;
	}

	await processUploadedSecondaryGraphic();
};

const clearSecondaryGraphic = () => {
	secondaryGraphicImage = null;
	secondaryGraphicSource = null;
	secondaryGraphicOriginalUpload = null;

	const secondaryGraphicInput = document.getElementById('secondaryGraphic');
	const emblemSelect = document.getElementById('emblemSelect');

	if (secondaryGraphicInput) secondaryGraphicInput.value = '';
	if (emblemSelect) emblemSelect.value = '';

	renderGraphic();
};

const handleSecondaryGraphicUpload = (event) => {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();

	reader.onload = (e) => {
		const img = new Image();

		img.onload = async () => {
			secondaryGraphicOriginalUpload = img;
			secondaryGraphicSource = 'upload';

			const emblemSelect = document.getElementById('emblemSelect');
			if (emblemSelect) {
				emblemSelect.value = '';
			}

			await processUploadedSecondaryGraphic();
		};

		img.src = e.target.result;
	};

	reader.readAsDataURL(file);
};

const handleEmblemSelection = async (event) => {
	const selectedValue = event.target.value;

	if (!selectedValue) {
		secondaryGraphicImage = null;
		secondaryGraphicSource = null;
		secondaryGraphicOriginalUpload = null;
		renderGraphic();
		return;
	}

	const selectedItem = emblemOptions.find((item) => item.value === selectedValue);

	if (!selectedItem || !selectedItem.available || !selectedItem.path) {
		return;
	}

	try {
		const img = await loadImage(selectedItem.path);

		secondaryGraphicImage = img;
		secondaryGraphicSource = 'dropdown';
		secondaryGraphicOriginalUpload = null;

		const secondaryGraphicInput = document.getElementById('secondaryGraphic');
		if (secondaryGraphicInput) {
			secondaryGraphicInput.value = '';
		}

		renderGraphic();
	} catch (error) {
		console.error('Could not load emblem:', error);
	}
};

const measureTrackedText = (str, tracking) => {
	let width = 0;

	for (let i = 0; i < str.length; i++) {
		width += ctx.measureText(str[i]).width;
		if (i < str.length - 1) {
			width += tracking;
		}
	}

	return width;
};

const drawTrackedText = (str, startX, baselineY, tracking) => {
	let x = startX;

	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		ctx.strokeText(char, x, baselineY);
		ctx.fillText(char, x, baselineY);
		x += ctx.measureText(char).width + tracking;
	}
};

const getResponsiveFontSize = (text, options) => {
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
	ctx.font = fontWeight + ' ' + referenceFontSize + 'px ' + fontFamily;

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
};

const getSecondaryLayout = (img) => {
	if (!img) {
		return {
			extraWidth: 0,
			drawX: 0,
			drawY: 0,
			drawWidth: 0,
			drawHeight: 0
		};
	}

	const imgWidth = img.width;
	const imgHeight = img.height;

	const scale = BASE_HEIGHT / imgHeight;
	const drawWidth = imgWidth * scale;
	const drawHeight = BASE_HEIGHT;

	const extraWidth = Math.ceil(
		SECONDARY_PADDING_LEFT + drawWidth + SECONDARY_PADDING_RIGHT
	);

	const drawX = BASE_WIDTH + SECONDARY_PADDING_LEFT;
	const drawY = 0;

	return {
		extraWidth,
		drawX,
		drawY,
		drawWidth,
		drawHeight
	};
};

const renderGraphic = async () => {
	if (!ctx || !capFont) return;

	const subordinateTextInput = document.getElementById('subordinateText');
	const logoStyleSelect = document.getElementById('logoStyle');

	const rawInput = subordinateTextInput ? subordinateTextInput.value : 'Marketing & Communication';
	const text = (rawInput || 'Marketing & Communication').toUpperCase();
	const selectedStyle = logoStyleSelect ? logoStyleSelect.value : 'blue';

	const isWhiteVersion = selectedStyle === 'white';
	const logoFile = isWhiteVersion ? 'WhiteLogo.png' : 'BlueLogo.png';

	const secondaryLayout = getSecondaryLayout(secondaryGraphicImage);

	const canvasWidth = BASE_WIDTH + secondaryLayout.extraWidth;
	const canvasHeight = BASE_HEIGHT;

	const baselineY = 300;
	const safeRightPadding = 10;

	const capBlue = '#001871';
	const white = '#FFFFFF';

	const fontFamily = 'Rajdhani';
	const fontWeight = '700';
	const tracking = 3;

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	ctx.clearRect(0, 0, canvasWidth, canvasHeight);

	if (isWhiteVersion) {
		canvas.classList.add('white-preview');
	} else {
		canvas.classList.remove('white-preview');
	}

	try {
		await drawSource(logoFile);
	} catch (error) {
		console.error('Could not load base logo:', error);
		return;
	}

	const wordmarkLeft = 560;
const wordmarkRight = 1860;
const wordmarkWidth = wordmarkRight - wordmarkLeft;

const availableWidth = Math.max(100, wordmarkWidth);

const fontSize = getResponsiveFontSize(text, {
	fontFamily,
	fontWeight,
	tracking,
	availableWidth,
	targetFillRatio: 0.82,
	maxFontSize: 130,
	minFontSize: 50,
	maxTextHeight: 70
});

const textColor = isWhiteVersion ? white : capBlue;

ctx.fillStyle = textColor;
ctx.strokeStyle = textColor;
ctx.lineWidth = 1.2;
ctx.lineJoin = 'round';
ctx.miterLimit = 2;
ctx.font = '700 ' + fontSize + 'px Rajdhani';

const textWidth = measureTrackedText(text, tracking);
const startX = wordmarkLeft -170;
	
drawTrackedText(text, startX, baselineY, tracking);

	if (secondaryGraphicImage) {
		ctx.drawImage(
			secondaryGraphicImage,
			secondaryLayout.drawX,
			secondaryLayout.drawY,
			secondaryLayout.drawWidth,
			secondaryLayout.drawHeight
		);
	}
};

const handleRomanCoolToggle = () => {
	const button = document.getElementById('romanCoolToggle');
	if (!button) return;

	const isActive = button.classList.toggle('active');
	button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

	if (isActive) {
		const width = button.offsetWidth + 'px';
		button.style.width = width;
		button.textContent = 'Your compliance has been recorded';

		fireConfettiBurst();
		sendRomanFanMail?.();
	}
};

const sendRomanFanMail = async () => {
	try {
		await fetch('https://formspree.io/f/mzdkwebr', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				message: 'Someone confirmed Roman Vitanza is the coolest PAO.',
				timestamp: new Date().toISOString(),
				userAgent: navigator.userAgent
			})
		});
	} catch (error) {
		console.error('Email send failed:', error);
	}
};

const fireConfettiBurst = () => {
	if (typeof confetti !== 'function') {
		console.error('Confetti library did not load.');
		return;
	}

	confetti({
		particleCount: 140,
		spread: 80,
		origin: { y: 0.6 }
	});

	setTimeout(() => {
		confetti({
			particleCount: 90,
			angle: 60,
			spread: 60,
			origin: { x: 0, y: 0.7 }
		});

		confetti({
			particleCount: 90,
			angle: 120,
			spread: 60,
			origin: { x: 1, y: 0.7 }
		});
	}, 180);
};

const download = () => {
	const a = document.createElement('a');
	a.download = 'Graphic.png';
	a.href = canvas.toDataURL('image/png');
	a.click();
};
