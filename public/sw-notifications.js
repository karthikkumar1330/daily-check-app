/* Service Worker Notification Click & Deep-Link Handler */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || "/today";

  event.waitUntil(
    (async () => {
      try {
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });

        // 1. Check for existing window client on the same origin
        let targetClient = null;
        for (const client of clientList) {
          if (client.url && new URL(client.url).origin === self.location.origin) {
            if (client.focused) {
              targetClient = client;
              break;
            }
            if (!targetClient) {
              targetClient = client;
            }
          }
        }

        if (targetClient) {
          // App is already open or backgrounded: bring it to foreground
          await targetClient.focus();

          // Send message to notify React Router to deep link smoothly
          if ("postMessage" in targetClient) {
            targetClient.postMessage({
              type: "DAILY_CHECK_NOTIFICATION_CLICK",
              data: notifData
            });
          }

          // Navigate existing client to the target URL if needed
          if ("navigate" in targetClient && targetUrl) {
            try {
              const currentUrl = new URL(targetClient.url);
              const destinationUrl = new URL(targetUrl, self.location.origin);
              if (currentUrl.pathname !== destinationUrl.pathname || currentUrl.search !== destinationUrl.search) {
                await targetClient.navigate(destinationUrl.href);
              }
            } catch (err) {
              // Ignore navigation error if already on page
            }
          }
          return;
        }

        // 2. App is completely closed: open the app with the target deep link URL
        if (self.clients.openWindow) {
          const destinationHref = new URL(targetUrl, self.location.origin).href;
          await self.clients.openWindow(destinationHref);
        }
      } catch (err) {
        console.error("Daily Check: notificationclick failed", err);
      }
    })()
  );
});
