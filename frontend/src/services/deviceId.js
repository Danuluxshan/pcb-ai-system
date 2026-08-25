// frontend/src/services/deviceId.js
/**
 * Generates a persistent, anonymous device identifier stored in
 * localStorage. Used to give each browser/device its own private
 * inspection history without requiring user accounts or login,
 * consistent with the system's no-account-required design goal.
 *
 * Note: this ties history to a specific browser on a specific device.
 * Clearing browser storage or switching browsers/devices starts a
 * fresh, empty history — there is no cross-device sync.
 */
const STORAGE_KEY = 'pcb_device_id';

export function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
