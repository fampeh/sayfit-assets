/**
 * A small, transient message in the corner. Used for load failures only -
 * anything a visitor can act on belongs in the page, not in a toast.
 */

let timer = null;

export function showToast(message, duration = 6000) {
  if (!message) return;

  document.querySelectorAll('.site-toast').forEach((el) => el.remove());
  clearTimeout(timer);

  const toast = document.createElement('div');
  toast.className = 'site-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  document.body.appendChild(toast);
  timer = window.setTimeout(() => toast.remove(), duration);
}
