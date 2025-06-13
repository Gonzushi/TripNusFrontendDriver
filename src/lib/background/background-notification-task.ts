import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_NOTIFICATION_TASK =
  'expo.notifications.BACKGROUND_NOTIFICATION_TASK';

// Function to register the background task
export async function registerBackgroundNotificationTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_NOTIFICATION_TASK
    );
    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('✅ Background notification task registered successfully');
    }
  } catch (error) {
    console.error('❌ Failed to register background notification task:', error);
  }
}

// Function to unregister the background task
export async function unregisterBackgroundNotificationTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_NOTIFICATION_TASK
    );
    if (isRegistered) {
      await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('✅ Background notification task unregistered successfully');
    }
  } catch (error) {
    console.error(
      '❌ Failed to unregister background notification task:',
      error
    );
  }
}

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    try {
      if (error) {
        console.error('❌ Background notification error:', error);
        return;
      }

      if (!data) {
        console.log('⚠️ No data received in background notification');
        return;
      }
    } catch (err) {
      console.error('❌ Error in background notification task:', err);
    }
  }
);
