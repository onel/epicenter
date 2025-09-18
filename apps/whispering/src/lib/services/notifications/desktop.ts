import {
	active,
	isPermissionGranted,
	removeActive,
	requestPermission,
	sendNotification,
} from '@tauri-apps/plugin-notification';
import { nanoid } from 'nanoid/non-secure';
import { Err, Ok, type Result, tryAsync } from 'wellcrafted/result';
import type { NotificationService, UnifiedNotificationOptions } from './types';
import {
	type NotificationServiceError,
	NotificationServiceErr,
	hashNanoidToNumber,
	toTauriNotification,
} from './types';

/**
 * Creates a desktop notification service implementation using Tauri's notification plugin.
 * Handles permission requests, notification display, and cleanup of active notifications.
 * 
 * @returns {NotificationService} A notification service with notify and clear methods
 */
export function createNotificationServiceDesktop(): NotificationService {
	/**
	 * Removes an active notification by its numeric ID.
	 * Retrieves all active notifications and removes the one matching the provided ID.
	 * 
	 * @param {number} id - The numeric ID of the notification to remove
	 * @returns {Promise<Result<void, NotificationServiceError>>} Success result or error if removal fails
	 */
	const removeNotificationById = async (
		id: number,
	): Promise<Result<void, NotificationServiceError>> => {
		const { data: activeNotifications, error: activeNotificationsError } =
			await tryAsync({
				try: async () => await active(),
				catch: (error) =>
					NotificationServiceErr({
						message: 'Unable to retrieve active desktop notifications.',
						context: { id },
						cause: error,
					}),
			});
		if (activeNotificationsError) return Err(activeNotificationsError);
		const matchingActiveNotification = activeNotifications.find(
			(notification) => notification.id === id,
		);
		if (matchingActiveNotification) {
			const { error: removeActiveError } = await tryAsync({
				try: async () => await removeActive([matchingActiveNotification]),
				catch: (error) =>
					NotificationServiceErr({
						message: `Unable to remove notification with id ${id}.`,
						context: { id, matchingActiveNotification },
						cause: error,
					}),
			});
			if (removeActiveError) return Err(removeActiveError);
		}
		return Ok(undefined);
	};

	return {
		/**
		 * Displays a desktop notification with the provided options.
		 * Handles permission requests, removes existing notifications with the same ID,
		 * and sends the new notification if permissions are granted.
		 * 
		 * @param {UnifiedNotificationOptions} options - The notification configuration including title, description, and optional ID
		 * @returns {Promise<Result<string, NotificationServiceError>>} The notification ID string on success, or error if sending fails
		 */
		async notify(options: UnifiedNotificationOptions) {
			const idStringified = options.id ?? nanoid();
			const id = hashNanoidToNumber(idStringified);

			await removeNotificationById(id);

			const { error: notifyError } = await tryAsync({
				try: async () => {
					let permissionGranted = await isPermissionGranted();
					if (!permissionGranted) {
						const permission = await requestPermission();
						permissionGranted = permission === 'granted';
					}
					if (permissionGranted) {
						const tauriOptions = toTauriNotification(options);
						sendNotification({
							...tauriOptions,
							id, // Override with our numeric id
						});
					}
				},
				catch: (error) =>
					NotificationServiceErr({
						message: 'Could not send notification',
						context: {
							idStringified,
							title: options.title,
							description: options.description,
						},
						cause: error,
					}),
			});
			if (notifyError) return Err(notifyError);
			return Ok(idStringified);
		},
		/**
		 * Clears an active notification by its string ID.
		 * Converts the string ID to a numeric hash and removes the corresponding notification.
		 * 
		 * @param {string} idStringified - The string ID of the notification to clear
		 * @returns {Promise<Result<void, NotificationServiceError>>} Success result or error if clearing fails
		 */
		clear: async (idStringified) => {
			const removeNotificationResult = await removeNotificationById(
				hashNanoidToNumber(idStringified),
			);
			return removeNotificationResult;
		},
	};
}
