import { PrismaClient } from '@prisma/client';
import { sendPushNotification } from '../integrations/pushNotifications';
import { getBestPrice } from './priceService';

const prisma = new PrismaClient();

export interface TriggeredAlert {
  alertId: string;
  userId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  storeName: string;
}

// Check all alerts and trigger notifications for price drops
export async function checkAlerts(): Promise<TriggeredAlert[]> {
  const triggeredAlerts: TriggeredAlert[] = [];

  // Get all non-triggered alerts
  const alerts = await prisma.alert.findMany({
    where: { triggered: false },
    include: {
      product: true,
      user: true,
    },
  });

  for (const alert of alerts) {
    const bestPrice = await getBestPrice(alert.productId);

    if (!bestPrice) continue;

    // Check if current price is at or below target
    if (bestPrice.effectivePrice <= alert.targetPrice) {
      // Mark as triggered
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          triggered: true,
          triggeredAt: new Date(),
        },
      });

      const triggeredAlert: TriggeredAlert = {
        alertId: alert.id,
        userId: alert.userId,
        productName: alert.product.name,
        targetPrice: alert.targetPrice,
        currentPrice: bestPrice.effectivePrice,
        storeName: bestPrice.store.name,
      };

      triggeredAlerts.push(triggeredAlert);

      // Send push notification if user has a push token
      if (alert.user.pushToken) {
        await sendPushNotification(
          alert.user.pushToken,
          '🎯 Price Alert!',
          `${alert.product.name} is now $${bestPrice.effectivePrice.toFixed(2)} at ${bestPrice.store.name}!`
        );
      }
    }
  }

  return triggeredAlerts;
}

// Reset an alert (allow it to trigger again)
export async function resetAlert(alertId: string): Promise<void> {
  await prisma.alert.update({
    where: { id: alertId },
    data: {
      triggered: false,
      triggeredAt: null,
    },
  });
}

// Get alert status with current price info
export async function getAlertStatus(alertId: string) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { product: true },
  });

  if (!alert) return null;

  const bestPrice = await getBestPrice(alert.productId);

  return {
    alert,
    currentBestPrice: bestPrice?.effectivePrice ?? null,
    currentBestStore: bestPrice?.store.name ?? null,
    willTrigger: bestPrice ? bestPrice.effectivePrice <= alert.targetPrice : false,
    priceDifference: bestPrice
      ? Math.round((bestPrice.effectivePrice - alert.targetPrice) * 100) / 100
      : null,
  };
}
