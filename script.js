import { emblemOptions } from './emblemoptions.js';

const BASE_WIDTH = 2000;
const BASE_HEIGHT = 415;
const MAX_TEXT_LENGTH = 50;

// Layout tuning
const BASE_LOGO_SCALE_MULTIPLIER = 1.08;
const WORDMARK_LEFT = 410;
const DEFAULT_WORDMARK_RIGHT = 1190;
const WORDMARK_TO_EMBLEM_GAP = 52;
const SECONDARY_PADDING_RIGHT = 14;
const SECONDARY_GRAPHIC_OFFSET_LEFT = 380;
const SUBORDINATE_TARGET_FILL_RATIO = 0.985;
const SUBORDINATE_MAX_TEXT_HEIGHT = 70;
const MIN_WORDMARK_WIDTH = 560;
const DISK_SCALE_RATIO = 1;
const SHIELD_SCALE_RATIO = 1;
const NON_STANDARD_SCALE_RATIO = 0.86;
const NON_STANDARD_MAX_WIDTH = 280;

// Visible bounds detection
const VISIBLE_BOUNDS_ALPHA_THRESHOLD = 16;
const VISIBLE_BOUNDS_WHITE_THRESHOLD = 245;
const VISIBLE_BOUNDS_PADDING = 2;

let canvas;
let ctx;
let capFont;

let emblemDropdown = null;
let ncsaDropdown = null;
let directorateDropdown = null;

let secondaryGraphicImage = null;
let secondaryGraphicSource = null; // 'upload' | 'dropdown' | 'ncsa' | 'directorate' | null
let secondaryGraphicOriginalUpload = null;

const SECONDARY_SOURCE_CONFIG = {
  dropdown: { selectId: 'emblemSelect', dropdownInstance: () => emblemDropdown },
  ncsa: { selectId: 'ncsaSelect', dropdownInstance: () => ncsaDropdown },
  directorate: { selectId: 'directorateSelect', dropdownInstance: () => directorateDropdown }
};

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
  const ncsaSelect = document.getElementById('ncsaSelect');
  const directorateSelect = document.getElementById('directorateSelect');

  populateEmblemSelect();
  populateNcsaSelect();
  populateDirectorateSelect();
  initializeSearchableDropdowns();
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
  ncsaSelect?.addEventListener('change', handleNcsaSelection);
  directorateSelect?.addEventListener('change', handleDirectorateSelection);
});

function populateEmblemSelect() {
  const emblemSelect = resetSelect('emblemSelect', 'emblemDropdown');
  if (!emblemSelect) return;

  const groupOrder = ['Region', 'Wing', 'Group', 'Squadron'];
  const groupLabels = {
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
    if (item.type === 'NCSA' || item.type === 'directorate') continue;
    if (!groups[item.type]) continue;

    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.available ? item.label : `${item.label} (unavailable)`;
    option.disabled = !item.available;
    groups[item.type].appendChild(option);
  }

  for (const type of groupOrder) {
    if (groups[type].children.length > 0) {
      emblemSelect.appendChild(groups[type]);
    }
  }
}

function populateNcsaSelect() {
  const ncsaSelect = resetSelect('ncsaSelect', 'ncsaDropdown');
  if (!ncsaSelect) return;

  for (const item of emblemOptions) {
    if (!item?.value || !item?.label || item.type !== 'NCSA') continue;

    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.available ? item.label : `${item.label} (unavailable)`;
    option.disabled = !item.available;
    ncsaSelect.appendChild(option);
  }
}

function populateDirectorateSelect() {
  const directorateSelect = resetSelect('directorateSelect', 'directorateDropdown');
  if (!directorateSelect) return;

  for (const item of emblemOptions) {
    if (!item?.value || !item?.label || item.type !== 'directorate') continue;

    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.available ? item.label : `${item.label} (unavailable)`;
    option.disabled = !item.available;
    directorateSelect.appendChild(option);
  }
}

function resetSelect(selectId, dropdownName) {
  const select = document.getElementById(selectId);
  if (!select) return null;

  if (dropdownName === 'emblemDropdown' && emblemDropdown) {
    emblemDropdown.destroy();
    emblemDropdown = null;
  } else if (dropdownName === 'ncsaDropdown' && ncsaDropdown) {
    ncsaDropdown.destroy();
    ncsaDropdown = null;
  } else if (dropdownName === 'directorateDropdown' && directorateDropdown) {
    directorateDropdown.destroy();
    directorateDropdown = null;
  }

  select.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'None';
  select.appendChild(noneOption);
  return select;
}

function clearSelectControl(sourceKey) {
  const sourceConfig = SECONDARY_SOURCE_CONFIG[sourceKey];
  if (!sourceConfig) return;

  const dropdown = sourceConfig.dropdownInstance();
  if (dropdown) {
    dropdown.clear(true);
    return;
  }

  const select = document.getElementById(sourceConfig.selectId);
  if (select) select.value = '';
}

function clearInactiveDropdownSelections(activeSource) {
  for (const sourceKey of Object.keys(SECONDARY_SOURCE_CONFIG)) {
    if (sourceKey === activeSource) continue;
    clearSelectControl(sourceKey);
  }
}

function resetSecondaryGraphicState() {
  secondaryGraphicImage = null;
  secondaryGraphicSource = null;
  secondaryGraphicOriginalUpload = null;
}

function initializeSearchableDropdowns() {
  if (typeof TomSelect === 'undefined') {
    console.warn('TomSelect is not loaded.');
    return;
  }

  const emblemSelect = document.getElementById('emblemSelect');
  const ncsaSelect = document.getElementById('ncsaSelect');
  const directorateSelect = document.getElementById('directorateSelect');

  const sharedConfig = {
    create: false,
    allowEmptyOption: true,
    dropdownParent: 'body',
    copyClassesToDropdown: false,
    hidePlaceholder: false,
    render: {
      no_results(data, escape) {
        return `<div class="no-results">No results for "${escape(data.input)}"</div>`;
      }
    }
  };

  if (emblemSelect) {
    if (emblemSelect.tomselect) {
      emblemSelect.tomselect.destroy();
    }

    emblemDropdown = new TomSelect(emblemSelect, {
      ...sharedConfig,
      placeholder: 'Search emblems...',
      maxOptions: 500,
      searchField: ['text'],
      optgroupField: 'optgroup'
    });
  }

  if (ncsaSelect) {
    if (ncsaSelect.tomselect) {
      ncsaSelect.tomselect.destroy();
    }

    ncsaDropdown = new TomSelect(ncsaSelect, {
      ...sharedConfig,
      placeholder: 'Search NCSAs...',
      maxOptions: 200,
      searchField: ['text']
    });
  }

  if (directorateSelect) {
    if (directorateSelect.tomselect) {
      directorateSelect.tomselect.destroy();
    }

    directorateDropdown = new TomSelect(directorateSelect, {
      ...sharedConfig,
      placeholder: 'Search directorates...',
      maxOptions: 100,
      searchField: ['text']
    });
  }
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

  tempCtx.putImageData(imageData, tempCanvas.width > 0 ? 0 : 0, 0);
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
  resetSecondaryGraphicState();

  const secondaryGraphicInput = document.getElementById('secondaryGraphic');
  if (secondaryGraphicInput) secondaryGraphicInput.value = '';

  clearInactiveDropdownSelections();

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
      clearInactiveDropdownSelections();

      await processUploadedSecondaryGraphic();
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

async function handleEmblemSelection(event) {
  await handleSecondarySelection(event.target.value, 'dropdown', 'Could not load emblem:');
}

async function handleNcsaSelection(event) {
  await handleSecondarySelection(event.target.value, 'ncsa', 'Could not load NCSA emblem:');
}

async function handleDirectorateSelection(event) {
  await handleSecondarySelection(event.target.value, 'directorate', 'Could not load directorate emblem:');
}

async function handleSecondarySelection(selectedValue, sourceKey, errorMessage) {
  if (selectedValue) {
    clearInactiveDropdownSelections(sourceKey);
  }

  if (!selectedValue) {
    resetSecondaryGraphicState();
    await renderGraphic();
    return;
  }

  const selectedItem = emblemOptions.find((item) => item.value === selectedValue);
  if (!selectedItem?.available || !selectedItem.path) return;

  try {
    secondaryGraphicImage = await loadImage(selectedItem.path);
    secondaryGraphicSource = sourceKey;
    secondaryGraphicOriginalUpload = null;

    const secondaryGraphicInput = document.getElementById('secondaryGraphic');
    if (secondaryGraphicInput) secondaryGraphicInput.value = '';

    await renderGraphic();
  } catch (error) {
    console.error(errorMessage, error);
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

function getVisiblePixelMaskStats(img, visibleBounds) {
  const { tempCanvas, tempCtx } = createCanvasFromImage(img);
  const imageData = tempCtx.getImageData(
    visibleBounds.left,
    visibleBounds.top,
    visibleBounds.width,
    visibleBounds.height
  );
  const data = imageData.data;

  let visiblePixels = 0;
  let topRowVisible = 0;
  let bottomRowVisible = 0;
  const width = visibleBounds.width;
  const height = visibleBounds.height;

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

      visiblePixels += 1;
      if (y === 0) topRowVisible += 1;
      if (y === height - 1) bottomRowVisible += 1;
    }
  }

  return {
    fillRatio: visiblePixels / Math.max(1, width * height),
    topRowFillRatio: topRowVisible / Math.max(1, width),
    bottomRowFillRatio: bottomRowVisible / Math.max(1, width)
  };
}

function classifySecondaryGraphic(img, visibleBounds) {
  const aspectRatio = visibleBounds.width / Math.max(1, visibleBounds.height);
  const { fillRatio, topRowFillRatio, bottomRowFillRatio } = getVisiblePixelMaskStats(img, visibleBounds);

  const looksLikeDisk =
    aspectRatio > 0.82 &&
    aspectRatio < 1.18 &&
    fillRatio > 0.58 &&
    fillRatio < 0.9 &&
    topRowFillRatio < 0.95 &&
    bottomRowFillRatio < 0.95;

  const looksLikeShield =
    aspectRatio > 0.72 &&
    aspectRatio < 1.35 &&
    topRowFillRatio > 0.55 &&
    bottomRowFillRatio < 0.45;

  if (looksLikeDisk) return 'disk';
  if (looksLikeShield) return 'shield';
  return 'non-standard';
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
      drawHeight: 0,
      emblemType: null
    };
  }

  const visibleBounds = getVisibleImageBounds(img);
  const emblemType = classifySecondaryGraphic(img, visibleBounds);
  const referenceHeight = Math.max(1, referenceBottom - referenceTop);

  const scaleRatio =
    emblemType === 'disk'
      ? DISK_SCALE_RATIO
      : emblemType === 'shield'
        ? SHIELD_SCALE_RATIO
        : NON_STANDARD_SCALE_RATIO;

  const targetHeight = referenceHeight * scaleRatio;
  let scale = targetHeight / Math.max(1, visibleBounds.height);
  let drawWidth = visibleBounds.width * scale;

  if (emblemType === 'non-standard') {
    const widthScale = NON_STANDARD_MAX_WIDTH / Math.max(1, drawWidth);
    if (widthScale < 1) {
      scale *= widthScale;
      drawWidth *= widthScale;
    }
  }

  const rightAnchor = BASE_WIDTH - SECONDARY_PADDING_RIGHT - SECONDARY_GRAPHIC_OFFSET_LEFT;
  const maxAllowedWidth = Math.max(1, rightAnchor - (WORDMARK_LEFT + MIN_WORDMARK_WIDTH + WORDMARK_TO_EMBLEM_GAP));

  if (drawWidth > maxAllowedWidth) {
    const shrinkScale = maxAllowedWidth / drawWidth;
    drawWidth *= shrinkScale;
    scale *= shrinkScale;
  }

  const scaledHeight = visibleBounds.height * scale;
  const drawX = rightAnchor - drawWidth;
  const drawY = referenceTop + (referenceHeight - scaledHeight) / 2;

  return {
    sourceX: visibleBounds.left,
    sourceY: visibleBounds.top,
    sourceWidth: visibleBounds.width,
    sourceHeight: visibleBounds.height,
    drawX,
    drawY,
    drawWidth,
    drawHeight: scaledHeight,
    emblemType
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
