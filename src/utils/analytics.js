// Simulated analytics ping, logged whenever a primary action completes.
export const ANALYTICS_PREFIX =
  '[Analytics] User interacted with Class Waitlist SMS Notification Job (Twilio Mock)';

export function trackAction(action) {
  console.log(`${ANALYTICS_PREFIX}: ${action}`);
}
