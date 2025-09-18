import { IS_MACOS } from '$lib/constants/platform';
import { createTaggedError, extractErrorMessage } from 'wellcrafted/error';
import type { Result } from 'wellcrafted/result';
import { Ok, tryAsync } from 'wellcrafted/result';

/**
 * Tagged error creator and error constructor for permissions service operations
 */
export const { PermissionsServiceError, PermissionsServiceErr } =
	createTaggedError('PermissionsServiceError');

/**
 * Type representing a permissions service error
 */
export type PermissionsServiceError = ReturnType<
	typeof PermissionsServiceError
>;

/**
 * Service interface for managing system permissions on macOS
 */
export type PermissionsService = {
	/**
	 * Accessibility permission operations
	 */
	accessibility: {
		/**
		 * Checks current accessibility permission status
		 * @returns Promise resolving to Result with boolean indicating permission status
		 */
		check: () => Promise<Result<boolean, PermissionsServiceError>>;
		/**
		 * Requests accessibility permission from the user
		 * @returns Promise resolving to Result with unknown response from system
		 */
		request: () => Promise<Result<unknown, PermissionsServiceError>>;
	};
	/**
	 * Microphone permission operations
	 */
	microphone: {
		/**
		 * Checks current microphone permission status
		 * @returns Promise resolving to Result with boolean indicating permission status
		 */
		check: () => Promise<Result<boolean, PermissionsServiceError>>;
		/**
		 * Requests microphone permission from the user
		 * @returns Promise resolving to Result with unknown response from system
		 */
		request: () => Promise<Result<unknown, PermissionsServiceError>>;
	};
};

/**
 * Creates a new permissions service instance with accessibility and microphone permission management
 * @returns PermissionsService instance with check and request methods for each permission type
 */
function createPermissionsService(): PermissionsService {
	return {
		accessibility: {
			/**
			 * Checks if accessibility permissions are granted
			 * Returns true immediately on non-macOS platforms
			 * @returns Promise resolving to Result with permission status or error
			 */
			async check() {
				if (!IS_MACOS) return Ok(true);

				return tryAsync({
					try: async () => {
						const { checkAccessibilityPermission } = await import(
							'tauri-plugin-macos-permissions-api'
						);
						return await checkAccessibilityPermission();
					},
					catch: (error) =>
						PermissionsServiceErr({
							message: `Failed to check accessibility permissions: ${extractErrorMessage(error)}`,
							cause: error,
						}),
				});
			},

			/**
			 * Requests accessibility permissions from the user
			 * Returns true immediately on non-macOS platforms
			 * @returns Promise resolving to Result with request response or error
			 */
			async request() {
				if (!IS_MACOS) return Ok(true);

				return tryAsync({
					try: async () => {
						const { requestAccessibilityPermission } = await import(
							'tauri-plugin-macos-permissions-api'
						);
						return await requestAccessibilityPermission();
					},
					catch: (error) =>
						PermissionsServiceErr({
							message: `Failed to request accessibility permissions: ${extractErrorMessage(error)}`,
							cause: error,
						}),
				});
			},
		},

		microphone: {
			/**
			 * Checks if microphone permissions are granted
			 * Returns true immediately on non-macOS platforms
			 * @returns Promise resolving to Result with permission status or error
			 */
			async check() {
				if (!IS_MACOS) return Ok(true);

				return tryAsync({
					try: async () => {
						const { checkMicrophonePermission } = await import(
							'tauri-plugin-macos-permissions-api'
						);
						return await checkMicrophonePermission();
					},
					catch: (error) =>
						PermissionsServiceErr({
							message: `Failed to check microphone permissions: ${extractErrorMessage(error)}`,
							cause: error,
						}),
				});
			},

			/**
			 * Requests microphone permissions from the user
			 * Returns true immediately on non-macOS platforms
			 * @returns Promise resolving to Result with request response or error
			 */
			async request() {
				if (!IS_MACOS) return Ok(true);

				return tryAsync({
					try: async () => {
						const { requestMicrophonePermission } = await import(
							'tauri-plugin-macos-permissions-api'
						);
						return await requestMicrophonePermission();
					},
					catch: (error) =>
						PermissionsServiceErr({
							message: `Failed to request microphone permissions: ${extractErrorMessage(error)}`,
							cause: error,
						}),
				});
			},
		},
	};
}

/**
 * Live instance of the permissions service ready for use
 */
export const PermissionsServiceLive = createPermissionsService();
