import { multimediaPickerService } from "./multimediaPickerService";
import {
  checkBucketExists,
  uploadMediaToStorage,
} from "./multimediaUploadService";
import { formatFileSize, getFileIcon } from "./multimediaUtils";

/**
 * Facade: same API as before, implementation split across picker / upload / utils.
 */
export const multimediaService = {
  pickImage: (...args) => multimediaPickerService.pickImage(...args),
  pickMultipleImages: (...args) =>
    multimediaPickerService.pickMultipleImages(...args),
  pickVideo: (...args) => multimediaPickerService.pickVideo(...args),
  pickDocument: (...args) => multimediaPickerService.pickDocument(...args),
  pickAudio: (...args) => multimediaPickerService.pickAudio(...args),

  checkBucketExists,
  uploadToStorage: uploadMediaToStorage,

  formatFileSize,
  getFileIcon,

  isAvailable: () => multimediaPickerService.isAvailable(),
};

export default multimediaService;
