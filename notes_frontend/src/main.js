import './style.css';
import { initApp } from './ui/app.js';

document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('app');
  if (!mount) {
    throw new Error('Mount element #app not found');
  }
  // PUBLIC_INTERFACE
  // Initialize the Notes app within the mount element.
  /** Bootstraps the application and renders the UI. */
  initApp(mount);
});
