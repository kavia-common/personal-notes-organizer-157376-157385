//
// Simple component helpers and inline icons
//

/**
 * Create a DOM element with attributes and children.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param  {...any} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class' || k === 'className') {
      node.className = String(v);
    } else if (k === 'dataset' && v && typeof v === 'object') {
      Object.assign(node.dataset, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) {
      node.setAttribute(k, k);
    } else if (v !== false && v != null) {
      node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (Array.isArray(child)) {
      child.forEach((c) => append(node, c));
    } else {
      append(node, child);
    }
  }
  return node;
}

function append(node, child) {
  if (child == null) return;
  if (child instanceof Node) {
    node.appendChild(child);
  } else {
    node.appendChild(document.createTextNode(String(child)));
  }
}

/**
 * PUBLIC INTERFACE
 * Create an SVG icon by name
 */
/** Creates a 20x20 inline SVG icon with the given name. */
export function icon(name, size = 20) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const p = (d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    return path;
  };
  const poly = (points) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    g.setAttribute('points', points);
    return g;
  };
  switch (name) {
    case 'add':
      svg.appendChild(p('M12 5v14M5 12h14'));
      break;
    case 'search':
      svg.appendChild(p('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z'));
      svg.appendChild(p('M21 21l-3.5-3.5'));
      break;
    case 'star':
      svg.appendChild(poly('12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9'));
      break;
    case 'star-fill':
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('stroke', 'none');
      svg.appendChild(p('M12 2l3 7h7l-5 5 2 7-7-4-7 4 2-7-5-5h7z'));
      break;
    case 'trash':
      svg.appendChild(p('M3 6h18'));
      svg.appendChild(p('M8 6V4h8v2'));
      svg.appendChild(p('M19 6l-1 14H6L5 6'));
      break;
    case 'tag':
      svg.appendChild(p('M20.59 13.41L13.41 20.59a2 2 0 0 1-2.83 0L2 12V4h8l8.59 8.59a2 2 0 0 1 0 2.82z'));
      svg.appendChild(p('M7 7h.01'));
      break;
    case 'all':
      svg.appendChild(p('M4 6h16M4 12h16M4 18h16'));
      break;
    case 'menu':
      svg.appendChild(p('M3 6h18M3 12h18M3 18h18'));
      break;
    case 'close':
      svg.appendChild(p('M6 6l12 12M6 18L18 6'));
      break;
    default:
      svg.appendChild(p('M12 12m-10,0a10,10 0 1,0 20,0a10,10 0 1,0 -20,0'));
  }
  return svg;
}

/**
 * PUBLIC INTERFACE
 * Debounce utility for event handlers
 */
/** Returns a debounced function that delays invoking fn until wait ms have elapsed. */
export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
