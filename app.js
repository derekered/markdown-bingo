const form = document.querySelector('#bingo-form');
const output = document.querySelector('#output');
const errorEl = document.querySelector('#error');
const copyButton = document.querySelector('#copyButton');
const freeSpacePosition = document.querySelector('#freeSpacePosition');
const customPositionFields = document.querySelector('#customPositionFields');
const includeFreeSpace = document.querySelector('#includeFreeSpace');

function parseEntries(raw) {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function shuffle(array) {
  const values = [...array];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function buildHeaders(labelInput, cols) {
  const trimmed = labelInput.trim();
  if (!trimmed) {
    return Array.from({ length: cols }, (_, idx) => `C${idx + 1}`);
  }

  if (trimmed.includes(',')) {
    const labels = trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (labels.length === cols) {
      return labels;
    }
  }

  if (trimmed.length === cols) {
    return trimmed.split('');
  }

  return Array.from({ length: cols }, (_, idx) => `C${idx + 1}`);
}

function getFreeSpaceLocation(position, rows, cols, customRow, customCol) {
  switch (position) {
    case 'top-left':
      return [0, 0];
    case 'top-right':
      return [0, cols - 1];
    case 'bottom-left':
      return [rows - 1, 0];
    case 'bottom-right':
      return [rows - 1, cols - 1];
    case 'custom':
      return [customRow - 1, customCol - 1];
    case 'center':
    default:
      return [Math.floor(rows / 2), Math.floor(cols / 2)];
  }
}

function toMarkdown(title, headers, board) {
  const heading = title.trim() ? `# ${title.trim()}\n\n` : '';
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyRows = board.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return `${heading}${headerRow}\n${separator}\n${bodyRows}`;
}

function setError(message) {
  errorEl.textContent = message;
}

function toggleCustomPosition() {
  const show = includeFreeSpace.checked && freeSpacePosition.value === 'custom';
  customPositionFields.hidden = !show;
}

freeSpacePosition.addEventListener('change', toggleCustomPosition);
includeFreeSpace.addEventListener('change', toggleCustomPosition);
toggleCustomPosition();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  setError('');

  const formData = new FormData(form);
  const title = formData.get('title')?.toString() ?? '';
  const rows = Number(formData.get('rows'));
  const cols = Number(formData.get('cols'));
  const entriesRaw = formData.get('entries')?.toString() ?? '';
  const labelsInput = formData.get('columnLabels')?.toString() ?? '';
  const hasFreeSpace = formData.get('includeFreeSpace') === 'on';
  const freePosition = formData.get('freeSpacePosition')?.toString() ?? 'center';
  const customRow = Number(formData.get('freeSpaceRow'));
  const customCol = Number(formData.get('freeSpaceCol'));

  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 15 || cols > 15) {
    setError('Rows and columns must be whole numbers from 1 to 15.');
    return;
  }

  const entries = parseEntries(entriesRaw);
  const required = rows * cols - (hasFreeSpace ? 1 : 0);
  if (entries.length < required) {
    setError(`Not enough unique entries. Need ${required}, got ${entries.length}.`);
    return;
  }

  const headers = buildHeaders(labelsInput, cols);
  const [freeRow, freeCol] = getFreeSpaceLocation(freePosition, rows, cols, customRow, customCol);

  if (hasFreeSpace && (freeRow < 0 || freeRow >= rows || freeCol < 0 || freeCol >= cols)) {
    setError('Free space location is outside the board.');
    return;
  }

  const selected = shuffle(entries).slice(0, required);
  const board = Array.from({ length: rows }, () => Array(cols).fill(''));

  let entryIndex = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (hasFreeSpace && r === freeRow && c === freeCol) {
        board[r][c] = 'FREE SPACE';
      } else {
        board[r][c] = selected[entryIndex];
        entryIndex += 1;
      }
    }
  }

  output.value = toMarkdown(title, headers, board);
});

copyButton.addEventListener('click', async () => {
  if (!output.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = 'Copy Markdown';
    }, 1200);
  } catch {
    setError('Could not copy to clipboard in this browser context.');
  }
});
