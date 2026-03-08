// Expo Push Notifications integration
// Single API endpoint handles both iOS and Android

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushNotificationResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

// Send a push notification via Expo
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<PushNotificationResult> {
  // Validate Expo push token format
  if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
    return { success: false, error: 'Invalid push token format' };
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: 'default',
        data: data || {},
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json() as any;
    const ticket = result.data?.[0];

    if (ticket?.status === 'ok') {
      return { success: true, ticketId: ticket.id };
    } else {
      return {
        success: false,
        error: ticket?.message || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

// Send notifications to multiple users
export async function sendBulkNotifications(
  notifications: Array<{
    pushToken: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }>
): Promise<PushNotificationResult[]> {
  // Expo recommends batching up to 100 notifications per request
  const results: PushNotificationResult[] = [];
  const batchSize = 100;

  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    
    const messages = batch.map((n) => ({
      to: n.pushToken,
      title: n.title,
      body: n.body,
      sound: 'default',
      data: n.data || {},
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        const result = await response.json() as any;
        const tickets = result.data || [];
        
        for (const ticket of tickets) {
          results.push({
            success: ticket.status === 'ok',
            ticketId: ticket.id,
            error: ticket.message,
          });
        }
      } else {
        // Mark all in batch as failed
        for (const _ of batch) {
          results.push({ success: false, error: `HTTP ${response.status}` });
        }
      }
    } catch (error) {
      for (const _ of batch) {
        results.push({ success: false, error: 'Network error' });
      }
    }
  }

  return results;
}
