//
// Notes data store: localStorage-backed persistence with CRUD, search, tags, and favorites.
// Designed for a simple single-user frontend app.
//
const STORAGE_KEY = 'notes_app_v1';

/**
 * Read and parse store from localStorage safely.
 * @returns {{notes: Array}} Store object.
 */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { notes: [] };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.notes)) {
      return { notes: [] };
    }
    return parsed;
  } catch {
    return { notes: [] };
  }
}

/**
 * Save store object to localStorage.
 * @param {{notes: Array}} store
 */
function writeStore(store) {
  const safe = {
    notes: Array.isArray(store.notes) ? store.notes : [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}

/**
 * Generate a random ID for notes.
 * @returns {string}
 */
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Normalize a note object.
 * @param {Partial<Note>} n
 * @returns {Note}
 */
function normalizeNote(n = {}) {
  const now = new Date().toISOString();
  return {
    id: n.id || uid(),
    title: (n.title || '').trim(),
    content: n.content || '',
    tags: Array.isArray(n.tags)
      ? [...new Set(n.tags.map((t) => String(t).trim()).filter(Boolean))]
      : [],
    favorite: Boolean(n.favorite),
    createdAt: n.createdAt || now,
    updatedAt: n.updatedAt || now,
  };
}

/**
 * Sort notes by updatedAt desc then title asc.
 * @param {Note[]} notes
 * @returns {Note[]}
 */
function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    const t = (d) => new Date(d).getTime();
    const diff = t(b.updatedAt) - t(a.updatedAt);
    if (diff !== 0) return diff;
    return (a.title || '').localeCompare(b.title || '');
  });
}



/**
 * PUBLIC INTERFACE
 * Create a new note with optional initial fields and persist it.
 * Returns the created note.
 */
/** This function creates a new note and persists it to localStorage. */
export function createNote(initial = {}) {
  const note = normalizeNote(initial);
  const store = readStore();
  store.notes.push(note);
  writeStore(store);
  return note;
}

/**
 * PUBLIC INTERFACE
 * Get a note by id.
 */
/** Returns the note with the given id, or undefined if not found. */
export function getNote(id) {
  const store = readStore();
  return store.notes.find((n) => n.id === id);
}

/**
 * PUBLIC INTERFACE
 * Update a note fields and persist.
 */
/** Updates a note by id with provided fields; returns the updated note or undefined if not found. */
export function updateNote(id, fields = {}) {
  const store = readStore();
  const idx = store.notes.findIndex((n) => n.id === id);
  if (idx === -1) return undefined;
  const merged = normalizeNote({
    ...store.notes[idx],
    ...fields,
    id,
    updatedAt: new Date().toISOString(),
  });
  store.notes[idx] = merged;
  writeStore(store);
  return merged;
}

/**
 * PUBLIC INTERFACE
 * Delete a note by id and persist.
 */
/** Deletes a note by id. Returns true if deleted, false if not found. */
export function deleteNote(id) {
  const store = readStore();
  const before = store.notes.length;
  store.notes = store.notes.filter((n) => n.id !== id);
  writeStore(store);
  return store.notes.length < before;
}

/**
 * PUBLIC INTERFACE
 * Toggle favorite property on a note.
 */
/** Toggles favorite on a note and returns updated note or undefined. */
export function toggleFavorite(id) {
  const note = getNote(id);
  if (!note) return undefined;
  return updateNote(id, { favorite: !note.favorite });
}

/**
 * PUBLIC INTERFACE
 * List notes, optionally filtered by tag/favorites and search query.
 */
/** Returns notes filtered and sorted. Options: { tag?: string, favorites?: boolean, query?: string } */
export function listNotes(options = {}) {
  const { tag, favorites, query } = options;
  const store = readStore();
  let out = [...store.notes];

  if (favorites) {
    out = out.filter((n) => n.favorite);
  }

  if (tag) {
    const t = String(tag).trim().toLowerCase();
    out = out.filter((n) => n.tags.some((x) => x.toLowerCase() === t));
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    out = out.filter((n) => {
      const title = (n.title || '').toLowerCase();
      const content = (n.content || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }

  return sortNotes(out);
}

/**
 * PUBLIC INTERFACE
 * Return unique tags with counts for all notes.
 */
/** Returns an array of { tag: string, count: number } for all tags. */
export function listTags() {
  const store = readStore();
  const map = new Map();
  for (const n of store.notes) {
    for (const t of n.tags || []) {
      const key = t.trim();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/**
 Note type doc for editor intellisense
 @typedef {Object} Note
 @property {string} id
 @property {string} title
 @property {string} content
 @property {string[]} tags
 @property {boolean} favorite
 @property {string} createdAt
 @property {string} updatedAt
 */
