import type { AdviceCard, DashboardData } from "@/lib/dashboard/model";

interface AdvisorInput {
  wallet: number;
  assetValue: number;
  queue: DashboardData["skills"]["queue"];
  location: string;
  systemSecurity: number;
  shipType: string;
  online: boolean;
  orders: DashboardData["activity"]["orders"];
  jobs: DashboardData["activity"]["jobs"];
  locations: DashboardData["assets"]["locations"];
  unavailable: string[];
}

function daysUntil(date: string): number {
  return (new Date(date).getTime() - Date.now()) / 86_400_000;
}

export function generateAdvice(input: AdvisorInput): AdviceCard[] {
  const advice: AdviceCard[] = [];
  const firstSkill = input.queue[0];

  if (!firstSkill) {
    advice.push({
      id: "empty-skill-queue",
      priority: "now",
      title: "Your skill queue is empty",
      summary: "Every idle hour delays every future plan.",
      evidence: "ESI returned no queued skills.",
      action: "Add at least one short skill now, then build a 14-day queue around your next ship or income goal.",
    });
  } else if (firstSkill.finishDate && daysUntil(firstSkill.finishDate) < 1) {
    advice.push({
      id: "short-skill-queue",
      priority: "now",
      title: "Protect your training time",
      summary: `${firstSkill.name} finishes soon and your visible queue is short.`,
      evidence: `Next completion: ${new Date(firstSkill.finishDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`,
      action: "Queue the next dependency before you log off.",
    });
  }

  if (input.online && input.systemSecurity < 0.5) {
    advice.push({
      id: "security-awareness",
      priority: "now",
      title: "You are active outside high-sec",
      summary: `${input.location} is ${input.systemSecurity.toFixed(1)} security space.`,
      evidence: `ESI reports you online in ${input.shipType}.`,
      action: "Before committing: check local, directional scan, route warnings, and whether the cargo is worth the exposure.",
    });
  }

  const wealth = input.wallet + input.assetValue;
  if (wealth > 0 && input.wallet / wealth < 0.08) {
    advice.push({
      id: "liquidity",
      priority: "next",
      title: "Most of your wealth is illiquid",
      summary: "Your wallet is small relative to your estimated inventory value.",
      evidence: `${Math.round((input.wallet / wealth) * 100)}% of tracked net worth is liquid ISK.`,
      action: "Sell unused hulls, duplicate modules, or stale materials before buying another major upgrade.",
    });
  }

  const concentrated = input.locations[0];
  if (concentrated && concentrated.share >= 0.7 && input.assetValue >= 500_000_000) {
    advice.push({
      id: "asset-concentration",
      priority: "watch",
      title: "Your assets are concentrated",
      summary: `${Math.round(concentrated.share * 100)}% of estimated asset value is in one location.`,
      evidence: `${concentrated.name} holds about ${Math.round(concentrated.estimatedValue / 1_000_000)}M ISK by ESI market averages.`,
      action: "Decide whether this is your deliberate home base; if not, plan one consolidated hauling run instead of scattered trips.",
    });
  }

  const expiringOrders = input.orders.filter((order) => daysUntil(order.expiresAt) < 3);
  if (expiringOrders.length) {
    advice.push({
      id: "expiring-orders",
      priority: "next",
      title: `${expiringOrders.length} market order${expiringOrders.length === 1 ? " expires" : "s expire"} soon`,
      summary: "Expiring orders can strand inventory or leave buying plans unfinished.",
      evidence: `${expiringOrders[0].item} is the nearest visible expiry.`,
      action: "Review margin and remaining volume before renewing; do not renew automatically if the market moved.",
    });
  }

  const finishingJobs = input.jobs.filter((job) => daysUntil(job.endDate) < 1);
  if (finishingJobs.length) {
    advice.push({
      id: "jobs-finishing",
      priority: "next",
      title: "Industry output is nearly ready",
      summary: `${finishingJobs.length} job${finishingJobs.length === 1 ? " finishes" : "s finish"} within a day.`,
      evidence: `${finishingJobs[0].item} completes first.`,
      action: "Prepare the next blueprint and inputs now so the slot can be restarted in one visit.",
    });
  }

  if (input.unavailable.length >= 3) {
    advice.push({
      id: "partial-data",
      priority: "watch",
      title: "Recommendations are using partial data",
      summary: "Some ESI categories could not be read, so conclusions are less complete.",
      evidence: `${input.unavailable.slice(0, 3).join(", ")}${input.unavailable.length > 3 ? " and more" : ""} unavailable.`,
      action: "Refresh once; if it persists, reconnect the character and confirm the registered SSO scopes.",
    });
  }

  if (!advice.length) {
    advice.push({
      id: "steady-state",
      priority: "watch",
      title: "No urgent leaks detected",
      summary: "Your training, liquidity, orders, and current-space checks look stable from the data ESI exposes.",
      evidence: "The current rule set found no time-sensitive exception.",
      action: "Choose your next goal explicitly—income, combat readiness, industry, or exploration—so the advisor can optimize toward it.",
    });
  }

  const order = { now: 0, next: 1, watch: 2 } as const;
  return advice.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 5);
}
