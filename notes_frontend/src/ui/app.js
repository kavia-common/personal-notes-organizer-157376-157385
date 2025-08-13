import { el, icon, debounce } from './components.js';
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  listTags,
  toggleFavorite,
  updateNote,
} from '../store.js';

/**
 * Build tag chip element with optional remove action.
 * @param {string} label
 * @param {Function} [onRemove]
 * @returns {HTMLElement}
 */
function tagChip(label, onRemove) {
  const chip = el('span', { class: 'chip' }, label);
  if (onRemove) {
    const removeBtn = el('button', { class: 'chip-remove', title: 'Remove tag' }, '×');
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove(label);
    });
    chip.appendChild(removeBtn);
  }
  return chip;
}

/**
 * Tag input control with chips and comma/enter handling.
 * @param {string[]} initial
 * @param {(tags: string[]) => void} onChange
 * @returns {{root: HTMLElement, setTags: (tags: string[]) => void, getTags: () => string[]}}
 */
function tagInput(initial, onChange) {
  let tags = [...new Set((initial || []).map((t) => t.trim()).filter(Boolean))];
  const input = el('input', {
    class: 'tag-input',
    type: 'text',
    placeholder: 'Add tag…',
    'aria-label': 'Add tag',
  });
  const root = el('div', { class: 'tag-input-wrap' });

  function render() {
    root.innerHTML = '';
    tags.forEach((t) => root.appendChild(tagChip(t, removeTag)));
    root.appendChild(input);
    onChange?.(tags);
  }

  function addTagFromValue() {
    const raw = input.value;
    if (!raw) return;
    raw.split(',').forEach((part) => {
      const t = part.trim();
      if (!t) return;
      if (!tags.includes(t)) tags.push(t);
    });
    input.value = '';
    render();
  }

  function removeTag(label) {
    tags = tags.filter((t) => t !== label);
    render();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagFromValue();
    } else if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop();
      render();
    }
  });

  input.addEventListener('blur', () => {
    addTagFromValue();
  });

  render();

  return {
    root,
    setTags(next) {
      tags = [...new Set((next || []).map((t) => t.trim()).filter(Boolean))];
      render();
    },
    getTags() {
      return [...tags];
    },
  };
}

/**
 * Build a note list item element.
 * @param {import('../store.js').Note} note
 * @param {boolean} active
 * @param {() => void} onClick
 * @returns {HTMLElement}
 */
function noteListItem(note, active, onClick) {
  const date = new Date(note.updatedAt);
  const subtitle = `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  const snippet = (note.content || '').slice(0, 80).replace(/\n/g, ' ');
  const fav = el(
    'span',
    { class: 'note-fav', title: note.favorite ? 'Favorite' : 'Not favorite' },
    note.favorite ? icon('star-fill', 16) : icon('star', 16),
  );

  const node = el(
    'button',
    { class: `note-item ${active ? 'active' : ''}`, 'aria-pressed': active ? 'true' : 'false' },
    el('div', { class: 'note-item-head' }, el('span', { class: 'note-title' }, note.title || 'Untitled'), fav),
    el('div', { class: 'note-item-sub' }, subtitle),
    el('div', { class: 'note-item-snippet' }, snippet),
  );
  node.addEventListener('click', onClick);
  return node;
}

/**
 * PUBLIC INTERFACE
 * Initialize the Notes app UI inside a container element.
 */
/** Initializes the application, renders layout, and wires up all interactions. */
export function initApp(mount) {
  // App state
  const state = {
    selectedId: null,
    filter: { type: 'all', value: null }, // 'all' | 'favorites' | 'tag'
    query: '',
    sidebarOpen: true,
  };

  // Header
  const menuBtn = el('button', { class: 'icon-btn', title: 'Toggle sidebar', id: 'menuBtn' }, icon('menu', 20));
  const title = el('h1', { class: 'app-title' }, 'Notes');
  const search = el('input', {
    class: 'search',
    type: 'search',
    placeholder: 'Search notes…',
    'aria-label': 'Search notes',
  });
  const addBtn = el('button', { class: 'btn btn-primary', id: 'newNoteBtn' }, icon('add', 18), ' New');

  const header = el('header', { class: 'app-header' }, el('div', { class: 'header-left' }, menuBtn, title), el('div', { class: 'header-center' }, el('div', { class: 'search-wrap' }, icon('search', 18), search)), el('div', { class: 'header-right' }, addBtn));

  // Sidebar
  const filterAll = el('button', { class: 'nav-btn', title: 'All notes' }, icon('all', 18), ' All');
  const filterFav = el('button', { class: 'nav-btn', title: 'Favorites' }, icon('star', 18), ' Favorites');
  const tagHeader = el('div', { class: 'tag-header' }, icon('tag', 16), el('span', { class: 'tag-title' }, 'Tags'));
  const tagsWrap = el('div', { class: 'tag-list' });

  const notesWrap = el('div', { class: 'notes-list' });

  const sidebar = el('aside', { class: 'app-sidebar' }, el('nav', { class: 'sidebar-nav' }, filterAll, filterFav, tagHeader, tagsWrap), el('div', { class: 'sidebar-divider' }), notesWrap);

  // Editor
  const noteTitle = el('input', {
    class: 'note-title-input',
    type: 'text',
    placeholder: 'Note title…',
    'aria-label': 'Note title',
  });
  const noteToolbar = el(
    'div',
    { class: 'note-toolbar' },
    el(
      'button',
      { class: 'icon-btn', id: 'favToggleBtn', title: 'Toggle favorite' },
      icon('star', 18),
      el('span', { class: 'sr-only' }, 'Toggle favorite'),
    ),
    el(
      'button',
      { class: 'icon-btn danger', id: 'deleteBtn', title: 'Delete note' },
      icon('trash', 18),
      el('span', { class: 'sr-only' }, 'Delete'),
    ),
  );
  const tagsLabel = el('label', { class: 'label' }, 'Tags');
  const tagControl = tagInput([], onTagsChanged);
  const noteContent = el('textarea', {
    class: 'note-content',
    placeholder: 'Start typing your note here…',
    'aria-label': 'Note content',
    rows: '12',
  });

  const emptyState = el(
    'div',
    { class: 'empty-state' },
    el('p', {}, 'Select a note from the list, or create a new one to begin.'),
  );

  const editor = el(
    'section',
    { class: 'app-editor' },
    el('div', { class: 'editor-head' }, noteTitle, noteToolbar),
    el('div', { class: 'editor-tags' }, tagsLabel, tagControl.root),
    noteContent,
    emptyState,
  );

  // Main layout
  const root = el('div', { class: 'app-root' }, header, el('div', { class: 'app-body' }, sidebar, editor));
  mount.innerHTML = '';
  mount.appendChild(root);

  // Event handlers
  menuBtn.addEventListener('click', () => {
    state.sidebarOpen = !state.sidebarOpen;
    root.classList.toggle('sidebar-collapsed', !state.sidebarOpen);
  });

  addBtn.addEventListener('click', () => {
    const n = createNote({
      title: 'Untitled',
      content: '',
      tags: [],
      favorite: false,
    });
    state.selectedId = n.id;
    state.filter = { type: 'all', value: null };
    state.query = '';
    search.value = '';
    refresh();
  });

  filterAll.addEventListener('click', () => {
    state.filter = { type: 'all', value: null };
    refresh();
  });

  filterFav.addEventListener('click', () => {
    state.filter = { type: 'favorites', value: true };
    refresh();
  });

  search.addEventListener(
    'input',
    debounce((e) => {
      state.query = e.target.value || '';
      refreshNotesList();
    }, 150),
  );

  noteTitle.addEventListener(
    'input',
    debounce(() => {
      if (!state.selectedId) return;
      updateNote(state.selectedId, { title: noteTitle.value });
      refreshNotesListOnlySelection();
    }, 250),
  );

  noteContent.addEventListener(
    'input',
    debounce(() => {
      if (!state.selectedId) return;
      updateNote(state.selectedId, { content: noteContent.value });
      refreshNotesListOnlySelection();
    }, 250),
  );

  noteToolbar.querySelector('#deleteBtn').addEventListener('click', () => {
    if (!state.selectedId) return;
    const delId = state.selectedId;
    const ok = deleteNote(delId);
    if (ok) {
      // choose next note if any
      const remain = listNotes({ query: state.query, favorites: state.filter.type === 'favorites', tag: state.filter.type === 'tag' ? state.filter.value : undefined });
      state.selectedId = remain.length ? remain[0].id : null;
      refresh();
    }
  });

  noteToolbar.querySelector('#favToggleBtn').addEventListener('click', () => {
    if (!state.selectedId) return;
    const updated = toggleFavorite(state.selectedId);
    if (updated) {
      refreshNotesList();
      renderEditor(updated);
    }
  });

  function onTagsChanged(tags) {
    if (!state.selectedId) return;
    updateNote(state.selectedId, { tags });
    refreshTagList();
    refreshNotesListOnlySelection();
  }

  // Rendering
  function refresh() {
    // initialize default content if empty
    if (listNotes().length === 0) {
      const welcome = createNote({
        title: 'Welcome',
        content:
          'This is your notes app.\n\n- Create notes with the New button\n- Search using the search bar\n- Organize with tags and favorites\n\nEnjoy!',
        tags: ['welcome'],
        favorite: true,
      });
      state.selectedId = welcome.id;
    }

    refreshTagList();
    refreshNotesList();
    renderEditor(getNote(state.selectedId));
    root.classList.toggle('sidebar-collapsed', !state.sidebarOpen);
  }

  function refreshTagList() {
    const tags = listTags();
    tagsWrap.innerHTML = '';
    if (tags.length === 0) {
      tagsWrap.appendChild(el('div', { class: 'tag-empty' }, 'No tags yet'));
      return;
    }
    for (const t of tags) {
      const btn = el('button', { class: 'tag-btn' }, '#', t.tag, el('span', { class: 'tag-count' }, t.count));
      btn.addEventListener('click', () => {
        state.filter = { type: 'tag', value: t.tag };
        refreshNotesList();
      });
      if (state.filter.type === 'tag' && state.filter.value === t.tag) btn.classList.add('active');
      tagsWrap.appendChild(btn);
    }
  }

  function refreshNotesListOnlySelection() {
    // Update list to reflect new title/snippet/fav markers, but keep selection intact
    const selId = state.selectedId;
    refreshNotesList(selId);
  }

  function refreshNotesList(forceSelectId = null) {
    const opts = {
      query: state.query,
      favorites: state.filter.type === 'favorites',
      tag: state.filter.type === 'tag' ? state.filter.value : undefined,
    };
    const notes = listNotes(opts);
    notesWrap.innerHTML = '';
    if (notes.length === 0) {
      notesWrap.appendChild(el('div', { class: 'empty-list' }, 'No notes found'));
    } else {
      notes.forEach((n) => {
        const item = noteListItem(n, n.id === state.selectedId, () => {
          state.selectedId = n.id;
          renderEditor(n);
          refreshNotesList(n.id);
        });
        notesWrap.appendChild(item);
      });
    }

    // If no selection, select the first
    if (!state.selectedId && notes.length) {
      state.selectedId = notes[0].id;
    }
    // Force selection if requested
    if (forceSelectId != null) {
      // nothing extra; items were rendered with active class based on id
    }
  }

  function renderEditor(note) {
    if (!note) {
      editor.classList.add('empty');
      emptyState.style.display = 'flex';
      noteTitle.value = '';
      noteContent.value = '';
      tagControl.setTags([]);
      return;
    }
    editor.classList.remove('empty');
    emptyState.style.display = 'none';
    noteTitle.value = note.title || '';
    noteContent.value = note.content || '';
    tagControl.setTags(note.tags || []);
    const favBtn = noteToolbar.querySelector('#favToggleBtn');
    favBtn.classList.toggle('active', !!note.favorite);
    favBtn.setAttribute('aria-pressed', note.favorite ? 'true' : 'false');
  }

  // Initial render
  refresh();
}
