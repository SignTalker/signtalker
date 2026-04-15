export type NotificationLevel = "info" | "warn" | "error";

export type AppNotification = {
  level: NotificationLevel;
  message: string;
};

export class NotificationService {
  notify(_n: AppNotification) {
    // UI integration will be added later.
  }
}

