<script type="text/javascript">
		let canvas;
		let ctx;
		let capFont;

		let secondaryGraphicImage = null;
		let secondaryGraphicShouldInvertOnWhite = false;

		const BASE_WIDTH = 2000;
		const BASE_HEIGHT = 415;
		const SECONDARY_PADDING_LEFT = 35;
		const SECONDARY_PADDING_RIGHT = 35;
		const SECONDARY_PADDING_TOP = 35;
		const SECONDARY_PADDING_BOTTOM = 35;
		const SECONDARY_MAX_HEIGHT = BASE_HEIGHT - SECONDARY_PADDING_TOP - SECONDARY_PADDING_BOTTOM;

		document.addEventListener('DOMContentLoaded', () => {
			canvas = document.getElementById('canvas');
			ctx = canvas.getContext('2d');

			const subordinateTextInput = document.getElementById('subordinateText');
			const logoStyleSelect = document.getElementById('logoStyle');
			const secondaryInput = document.getElementById('secondaryGraphic');
			const clearButton = document.getElementById('clearSecondaryGraphic');

			loadFont().then(() => {
				updateSecondaryGraphicAvailability();
				renderGraphic();
			});

			subordinateTextInput.oninput = renderGraphic;

			logoStyleSelect.onchange = () => {
				updateSecondaryGraphicAvailability();

				if (logoStyleSelect.value !== 'blue') {
					clearSecondaryGraphic();
				}

				renderGraphic();
			};

			secondaryInput.onchange = handleSecondaryGraphicUpload;
			clearButton.onclick = clearSecondaryGraphic;
			document.getElementById('download').onclick = download;
		});

		const updateSecondaryGraphicAvailability = () => {
			const isBlue = document.getElementById('logoStyle').value === 'blue';
			document.getElementById('secondaryGraphic').disabled = !isBlue;
			document.getElementById('clearSecondaryGraphic').disabled = !isBlue;
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
					ctx.drawImage(img, 0, 0, BASE_WIDTH, BASE_HEIGHT);
					resolve();
				};

				img.onerror = reject;
				img.src = imagePath;
			});
		};

		const clearSecondaryGraphic = () => {
			secondaryGraphicImage = null;
			secondaryGraphicShouldInvertOnWhite = false;
			document.getElementById('secondaryGraphic').value = '';
			renderGraphic();
		};

		const analyzeDarkLogo = (img) => {
			const tempCanvas = document.createElement('canvas');
			const tempCtx = tempCanvas.getContext('2d');

			tempCanvas.width = img.width;
			tempCanvas.height = img.height;
			tempCtx.drawImage(img, 0, 0);

			const data = tempCtx.getImageData(0, 0, img.width, img.height).data;

			let total = 0;
			let dark = 0;

			for (let i = 0; i < data.length; i += 4) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const a = data[i + 3];

				if (a < 20) continue;

				total++;
				const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

				if (luminance < 110) {
					dark++;
				}
			}

			return total && (dark / total > 0.4);
		};

		const invertImage = (img) => {
			return new Promise((resolve) => {
				const tempCanvas = document.createElement('canvas');
				const tempCtx = tempCanvas.getContext('2d');

				tempCanvas.width = img.width;
				tempCanvas.height = img.height;
				tempCtx.drawImage(img, 0, 0);

				const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
				const data = imageData.data;

				for (let i = 0; i < data.length; i += 4) {
					if (data[i + 3] === 0) continue;
					data[i] = 255 - data[i];
					data[i + 1] = 255 - data[i + 1];
					data[i + 2] = 255 - data[i + 2];
				}

				tempCtx.putImageData(imageData, 0, 0);

				const newImg = new Image();
				newImg.onload = () => resolve(newImg);
				newImg.src = tempCanvas.toDataURL('image/png');
			});
		};

		const handleSecondaryGraphicUpload = (event) => {
			const file = event.target.files[0];
			if (!file) return;

			const reader = new FileReader();

			reader.onload = (e) => {
				const img = new Image();

				img.onload = () => {
					secondaryGraphicImage = img;
					secondaryGraphicShouldInvertOnWhite = analyzeDarkLogo(img);
					renderGraphic();
				};

				img.src = e.target.result;
			};

			reader.readAsDataURL(file);
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

		const getSecondaryImageForMode = async (isWhiteVersion) => {
			if (!secondaryGraphicImage) return null;

			if (!isWhiteVersion || !secondaryGraphicShouldInvertOnWhite) {
				return secondaryGraphicImage;
			}

			return await invertImage(secondaryGraphicImage);
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

			const scale = Math.min(1, SECONDARY_MAX_HEIGHT / imgHeight);

			const drawWidth = imgWidth * scale;
			const drawHeight = imgHeight * scale;

			const extraWidth = Math.ceil(
				SECONDARY_PADDING_LEFT + drawWidth + SECONDARY_PADDING_RIGHT
			);

			const drawX = BASE_WIDTH + SECONDARY_PADDING_LEFT;
			const drawY = Math.round((BASE_HEIGHT - drawHeight) / 2);

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

			const rawInput = document.getElementById('subordinateText').value || 'Marketing & Communication';
			const text = rawInput.toUpperCase();
			const selectedStyle = document.getElementById('logoStyle').value;

			const isWhiteVersion = selectedStyle === 'white';
			const isBlueVersion = !isWhiteVersion;
			const logoFile = isWhiteVersion ? 'WhiteLogo.png' : 'BlueLogo.png';

			const secondaryImageForMode = isBlueVersion
				? await getSecondaryImageForMode(isWhiteVersion)
				: null;

			const secondaryLayout = isWhiteVersion
				? { extraWidth: 0, drawX: 0, drawY: 0, drawWidth: 0, drawHeight: 0 }
				: getSecondaryLayout(secondaryImageForMode);

			const canvasWidth = BASE_WIDTH + secondaryLayout.extraWidth;
			const canvasHeight = BASE_HEIGHT;

			const startX = 600;
			const baselineY = 355;
			const safeRightPadding = 10;

			const capBlue = '#001871';
			const white = '#FFFFFF';

			const fontFamily = 'Rajdhani';
			const fontWeight = '700';
			const tracking = 3;

			const availableWidth = BASE_WIDTH - startX - safeRightPadding;
			const targetFillRatio = 0.98;
			const maxFontSize = 130;
			const minFontSize = 50;
			const maxTextHeight = 70;

			const fontSize = getResponsiveFontSize(text, {
				fontFamily,
				fontWeight,
				tracking,
				availableWidth,
				targetFillRatio,
				maxFontSize,
				minFontSize,
				maxTextHeight
			});

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

			const textColor = isWhiteVersion ? white : capBlue;

			ctx.fillStyle = textColor;
			ctx.strokeStyle = textColor;
			ctx.lineWidth = 1.2;
			ctx.lineJoin = 'round';
			ctx.miterLimit = 2;
			ctx.font = '700 ' + fontSize + 'px Rajdhani';

			drawTrackedText(text, startX, baselineY, tracking);

			if (isBlueVersion && secondaryImageForMode) {
				ctx.drawImage(
					secondaryImageForMode,
					secondaryLayout.drawX,
					secondaryLayout.drawY,
					secondaryLayout.drawWidth,
					secondaryLayout.drawHeight
				);
			}
		};

		const download = () => {
			const a = document.createElement('a');
			a.download = 'Graphic.png';
			a.href = canvas.toDataURL('image/png');
			a.click();
		};
	</script>
