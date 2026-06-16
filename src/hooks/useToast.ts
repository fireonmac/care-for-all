import { Toast } from '@base-ui/react/toast';

const DEFAULT_SUCCESS_DURATION = 3000;
const DEFAULT_ERROR_DURATION = 4000;

export function useToast() {
  const toastManager = Toast.useToastManager();

  function showSuccess(message: string, durationMs = DEFAULT_SUCCESS_DURATION) {
    const id = toastManager.add({ title: message, type: 'success' });
    setTimeout(() => toastManager.close(id), durationMs);
  }

  function showError(message: string, durationMs = DEFAULT_ERROR_DURATION) {
    const id = toastManager.add({ title: message, type: 'error' });
    setTimeout(() => toastManager.close(id), durationMs);
  }

  function showInfo(message: string, durationMs = DEFAULT_SUCCESS_DURATION) {
    const id = toastManager.add({ title: message });
    setTimeout(() => toastManager.close(id), durationMs);
  }

  return { showSuccess, showError, showInfo };
}
