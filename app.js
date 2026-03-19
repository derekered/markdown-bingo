const titleInput = document.querySelector('#title');
const entriesInput = document.querySelector('#entries');
const boardEditor = document.querySelector('#boardEditor');
const output = document.querySelector('#output');
const copyButton = document.querySelector('#copyButton');
const shuffleButton = document.querySelector('#shuffleButton');
const addRowButton = document.querySelector('#addRowButton');
const removeRowButton = document.querySelector('#removeRowButton');
const addColumnButton = document.querySelector('#addColumnButton');
const removeColumnButton = document.querySelector('#removeColumnButton');
const clearFreeSpaceButton = document.querySelector('#clearFreeSpaceButton');
const dimensionStatus = document.querySelector('#dimensionStatus');
const entryStatus = document.querySelector('#entryStatus');
const feedbackEl = document.querySelector('#feedback');

const DEFAULT_HEADERS = ['B', 'I', 'N', 'G', 'O'];
const MIN_SIZE = 1;
const MAX_SIZE = 15;

const state = {
  title: '',
  entriesText: '',
  rows: 5,
  cols: 5,
  headers: [...DEFAULT_HEADERS],
  freeCell: { row: 2, col: 2 },
  lastFreeCell: { row: 2, col: 2 },
  board: [],
  entryCount: 0,
  requiredCount: 24,
};

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

function getDefaultHeader(index) {
  return DEFAULT_HEADERS[index] ?? `C${index + 1}`;
}

function normalizeHeaders() {
  state.headers = Array.from({ length: state.cols }, (_, index) => state.headers[index] ?? getDefaultHeader(index));
}

function clampFreeCell() {
  if (!state.freeCell) {
    return;
  }

  state.freeCell = {
    row: Math.min(state.freeCell.row, state.rows - 1),
    col: Math.min(state.freeCell.col, state.cols - 1),
  };
}

function clampCell(cell) {
  return {
    row: Math.max(0, Math.min(cell.row, state.rows - 1)),
    col: Math.max(0, Math.min(cell.col, state.cols - 1)),
  };
}

function getDefaultFreeCell() {
  return {
    row: Math.floor(state.rows / 2),
    col: Math.floor(state.cols / 2),
  };
}

function getNextFreeCell() {
  const candidate = state.lastFreeCell ?? getDefaultFreeCell();
  return clampCell(candidate);
}

function getRequiredCount() {
  return state.rows * state.cols - (state.freeCell ? 1 : 0);
}

function escapeMarkdownCell(value) {
  return value.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function toMarkdown(title, headers, board) {
  const heading = title.trim() ? `# ${title.trim()}\n\n` : '';
  const safeHeaders = headers.map(escapeMarkdownCell);
  const headerRow = `| ${safeHeaders.join(' | ')} |`;
  const separator = `| ${safeHeaders.map(() => '---').join(' | ')} |`;
  const bodyRows = board
    .map((row) => `| ${row.map((cell) => escapeMarkdownCell(cell.label)).join(' | ')} |`)
    .join('\n');

  return `${heading}${headerRow}\n${separator}\n${bodyRows}`;
}

function setFeedback(message = '') {
  feedbackEl.textContent = message;
}

function buildBoardPreview(selectedEntries) {
  const board = [];
  let entryIndex = 0;
  let placeholderIndex = 1;

  for (let row = 0; row < state.rows; row += 1) {
    const rowCells = [];

    for (let col = 0; col < state.cols; col += 1) {
      const isFree = state.freeCell && state.freeCell.row === row && state.freeCell.col === col;

      if (isFree) {
        rowCells.push({
          label: 'FREE SPACE',
          isFree: true,
          isPlaceholder: false,
        });
        continue;
      }

      const label = selectedEntries[entryIndex] ?? `Entry ${placeholderIndex}`;
      rowCells.push({
        label,
        isFree: false,
        isPlaceholder: !selectedEntries[entryIndex],
      });

      if (selectedEntries[entryIndex]) {
        entryIndex += 1;
      }
      placeholderIndex += 1;
    }

    board.push(rowCells);
  }

  return board;
}

function regenerateBoard() {
  normalizeHeaders();
  clampFreeCell();

  const entries = parseEntries(state.entriesText);
  state.entryCount = entries.length;
  state.requiredCount = getRequiredCount();

  const selectedEntries = shuffle(entries).slice(0, Math.min(entries.length, state.requiredCount));
  state.board = buildBoardPreview(selectedEntries);
}

function renderBoard() {
  boardEditor.innerHTML = '';
  boardEditor.style.setProperty('--cols', String(state.cols));

  const fragment = document.createDocumentFragment();

  for (let col = 0; col < state.cols; col += 1) {
    const headerWrap = document.createElement('div');
    headerWrap.className = 'board-header';

    const headerInput = document.createElement('input');
    headerInput.type = 'text';
    headerInput.value = state.headers[col];
    headerInput.placeholder = getDefaultHeader(col);
    headerInput.dataset.headerIndex = String(col);
    headerInput.className = 'header-input';
    headerInput.setAttribute('aria-label', `Column ${col + 1} header`);

    headerWrap.append(headerInput);
    fragment.append(headerWrap);
  }

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = state.board[row][col];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-cell';
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute('aria-pressed', cell.isFree ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        cell.isFree
          ? `Free space at row ${row + 1}, column ${col + 1}. Click to remove it.`
          : `${cell.label}. Cell at row ${row + 1}, column ${col + 1}. Click to set it as the free space.`
      );

      if (cell.isFree) {
        button.classList.add('is-free');
      }

      if (cell.isPlaceholder) {
        button.classList.add('is-placeholder');
      }

      if (cell.isFree) {
        const freeLabel = document.createElement('span');
        freeLabel.className = 'free-label';
        freeLabel.textContent = 'FREE';
        button.append(freeLabel);
      } else {
        const cellLabel = document.createElement('span');
        cellLabel.className = 'cell-label';
        cellLabel.textContent = cell.label;
        button.append(cellLabel);
      }

      fragment.append(button);
    }
  }

  boardEditor.append(fragment);
}

function renderStatus() {
  const missing = Math.max(0, state.requiredCount - state.entryCount);
  dimensionStatus.textContent = `${state.rows} ${state.rows === 1 ? 'row' : 'rows'} x ${state.cols} ${state.cols === 1 ? 'column' : 'columns'}`;
  entryStatus.textContent = `${state.entryCount} of ${state.requiredCount} unique entries${missing ? `, ${missing} more needed` : ''}`;

  addRowButton.disabled = state.rows >= MAX_SIZE;
  removeRowButton.disabled = state.rows <= MIN_SIZE;
  addColumnButton.disabled = state.cols >= MAX_SIZE;
  removeColumnButton.disabled = state.cols <= MIN_SIZE;
  shuffleButton.disabled = state.entryCount === 0;
}

function renderOutput() {
  const enoughEntries = state.entryCount >= state.requiredCount;

  if (!enoughEntries) {
    const missing = state.requiredCount - state.entryCount;
    output.value = '';
    output.placeholder = `Add ${missing} more unique ${missing === 1 ? 'entry' : 'entries'} to generate markdown.`;
    copyButton.disabled = true;
    return;
  }

  const headers = state.headers.map((header, index) => {
    const trimmed = header.trim();
    return trimmed || getDefaultHeader(index);
  });

  output.value = toMarkdown(state.title, headers, state.board);
  copyButton.disabled = false;
}

function refresh() {
  renderBoard();
  renderStatus();
  renderOutput();
}

function resizeBoard(nextRows, nextCols) {
  state.rows = nextRows;
  state.cols = nextCols;
  normalizeHeaders();
  clampFreeCell();
  regenerateBoard();
  refresh();
}

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  renderOutput();
});

entriesInput.addEventListener('input', () => {
  state.entriesText = entriesInput.value;
  regenerateBoard();
  refresh();
  setFeedback('');
});

boardEditor.addEventListener('input', (event) => {
  const headerInput = event.target.closest('[data-header-index]');
  if (!headerInput) {
    return;
  }

  const index = Number(headerInput.dataset.headerIndex);
  state.headers[index] = headerInput.value;
  renderOutput();
});

boardEditor.addEventListener('click', (event) => {
  const cellButton = event.target.closest('[data-row][data-col]');
  if (!cellButton) {
    return;
  }

  const row = Number(cellButton.dataset.row);
  const col = Number(cellButton.dataset.col);
  const isSameCell = state.freeCell && state.freeCell.row === row && state.freeCell.col === col;

  if (isSameCell) {
    state.lastFreeCell = { row, col };
    state.freeCell = null;
  } else {
    state.freeCell = { row, col };
    state.lastFreeCell = { row, col };
  }
  regenerateBoard();
  refresh();
  setFeedback('');
});

addRowButton.addEventListener('click', () => {
  if (state.rows >= MAX_SIZE) {
    setFeedback('Board size is capped at 15 rows.');
    return;
  }

  resizeBoard(state.rows + 1, state.cols);
  setFeedback('');
});

removeRowButton.addEventListener('click', () => {
  if (state.rows <= MIN_SIZE) {
    setFeedback('The card must keep at least one row.');
    return;
  }

  resizeBoard(state.rows - 1, state.cols);
  setFeedback('');
});

addColumnButton.addEventListener('click', () => {
  if (state.cols >= MAX_SIZE) {
    setFeedback('Board size is capped at 15 columns.');
    return;
  }

  resizeBoard(state.rows, state.cols + 1);
  setFeedback('');
});

removeColumnButton.addEventListener('click', () => {
  if (state.cols <= MIN_SIZE) {
    setFeedback('The card must keep at least one column.');
    return;
  }

  state.headers = state.headers.slice(0, state.cols - 1);
  resizeBoard(state.rows, state.cols - 1);
  setFeedback('');
});

clearFreeSpaceButton.addEventListener('click', () => {
  if (state.freeCell) {
    state.lastFreeCell = { ...state.freeCell };
    state.freeCell = null;
  } else {
    state.freeCell = getNextFreeCell();
    state.lastFreeCell = { ...state.freeCell };
  }
  regenerateBoard();
  refresh();
  setFeedback('');
});

shuffleButton.addEventListener('click', () => {
  regenerateBoard();
  refresh();
  setFeedback('');
});

copyButton.addEventListener('click', async () => {
  if (!output.value) {
    setFeedback('Add enough unique entries before copying markdown.');
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    setFeedback('Markdown copied to clipboard.');
  } catch {
    setFeedback('Could not copy to clipboard in this browser context.');
  }
});

regenerateBoard();
refresh();
