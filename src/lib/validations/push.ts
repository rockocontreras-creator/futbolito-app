import { z } from "zod";

// Suscripción que entrega el navegador (PushSubscription.toJSON()).
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

export const pushEndpointSchema = z.object({ endpoint: z.string().min(10).max(1000) });
