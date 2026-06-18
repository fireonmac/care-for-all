import { toast } from 'sonner';

const DEFAULT_SUCCESS_DURATION = 3000;
const DEFAULT_ERROR_DURATION = 4000;

export function useToast() {
  function showSuccess(message: string, durationMs = DEFAULT_SUCCESS_DURATION) {
    toast.success(message, { duration: durationMs });
  }

  function showError(message: string, durationMs = DEFAULT_ERROR_DURATION) {
    toast.error(message, { duration: durationMs });
  }

  function showInfo(message: string, durationMs = DEFAULT_SUCCESS_DURATION) {
    toast(message, { duration: durationMs });
  }

  return { showSuccess, showError, showInfo };
}
