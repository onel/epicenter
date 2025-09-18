import { Ok } from 'wellcrafted/result';
import type { FfmpegService } from './types';
import { FfmpegServiceErr } from './types';

/**
 * Creates a web-compatible FFmpeg service with limited functionality.
 * @returns {FfmpegService} Service object with checkInstalled and compressAudioBlob methods
 */
export function createFfmpegServiceWeb(): FfmpegService {
	return {
		/**
		 * Checks if FFmpeg is installed.
		 * @returns {Promise<Ok<boolean>>} Always returns false for web version
		 */
		async checkInstalled() {
			// FFmpeg check is not available in web version, assume not installed
			return Ok(false);
		},

		/**
		 * Attempts to compress an audio blob using the provided compression options.
		 * @param {Blob} _blob - The audio blob to compress (unused in web version)
		 * @param {string} compressionOptions - The compression options to apply
		 * @returns {Promise<FfmpegServiceErr>} Always returns an error indicating compression is not available
		 */
		async compressAudioBlob(_blob: Blob, compressionOptions: string) {
			// Audio compression is not available in web version
			return FfmpegServiceErr({
				message:
					'Audio compression is not available in the web version. FFmpeg is only supported in the desktop application.',
				context: { compressionOptions },
				cause: undefined,
			});
		},
	};
}
