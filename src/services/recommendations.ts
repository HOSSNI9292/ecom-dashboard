import type { Recommendation, RecommendationsData } from "@/types/meta";
import type { DashboardStats, CountryStats, Product } from "@/types/api";
import type { MetaSummary } from "@/types/meta";

const RECS_KEY = "cod_recommendations";
const DAILY_REFRESH_KEY = "cod_recs_last_date";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function getCachedRecommendations(): RecommendationsData | null {
  try {
    const raw = localStorage.getItem(RECS_KEY);
    if (!raw) return null;
    const data: RecommendationsData = JSON.parse(raw);
    const lastDate = localStorage.getItem(DAILY_REFRESH_KEY);
    if (lastDate === todayStr()) return data;
    return null;
  } catch {
    return null;
  }
}

function storeRecommendations(recs: Recommendation[]): void {
  const data: RecommendationsData = { recommendations: recs, generatedAt: new Date().toISOString() };
  localStorage.setItem(RECS_KEY, JSON.stringify(data));
  localStorage.setItem(DAILY_REFRESH_KEY, todayStr());
}

export function generateRecommendations(
  stats: DashboardStats,
  countries: CountryStats[],
  products: Product[],
  meta: MetaSummary | null
): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = new Date().toISOString();
  let idCounter = 1;

  const acctCurrency = meta?.accountCurrency || "";
  const fmtCurrency = (n: number) => {
    if (!acctCurrency) return Math.round(n).toLocaleString();
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: acctCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return Math.round(n).toLocaleString();
    }
  };
  const fmtNum = (n: number) => Math.round(n).toLocaleString();

  function addRec(
    type: Recommendation["type"],
    title: string,
    description: string,
    priority: Recommendation["priority"],
    entityName?: string,
    metric?: string,
    value?: number
  ) {
    recs.push({
      id: `rec_${now}_${idCounter++}`,
      type,
      title,
      description,
      priority,
      entityName,
      metric,
      value,
      date: now,
      read: false,
    });
  }

  const confirmationRate = stats.totalOrders > 0
    ? stats.confirmedOrders / (stats.totalOrders - stats.cancelledOrders - stats.outOfStockOrders)
    : 0;
  const deliveryRate = stats.totalOrders > 0 ? stats.processedOrders / stats.totalOrders : 0;
  const avgOrderValue = stats.totalOrders > 0 ? stats.revenue / stats.totalOrders : 0;
  const cpaThreshold = 5000;
  const roasThreshold = 1.5;

  if (meta && meta.ads.length > 0) {
    if (meta.averageRoas >= 3 && meta.averageCpa <= cpaThreshold * 0.4) {
      addRec("scale_campaign", "Scale Top Campaigns", `ROAS of ${meta.averageRoas.toFixed(2)}x and CPA of ${fmtCurrency(meta.averageCpa)} indicates room to scale. Increase budgets on best performers.`, "high", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.averageRoas < roasThreshold && meta.totalSpend > 50000) {
      addRec("decrease_budget", "Reduce Underperforming Spend", `Overall ROAS of ${meta.averageRoas.toFixed(2)}x is below threshold. Reduce budgets for low-ROAS campaigns.`, "medium", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.averageRoas < 1 && meta.totalSpend > 100000) {
      addRec("stop_campaign", "Stop Loss-Making Campaigns", `ROAS of ${meta.averageRoas.toFixed(2)}x means you're losing money. Consider pausing campaigns with ROAS below 1.0x.`, "high", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.averageRoas >= 5 && meta.averageCpa <= 1000) {
      addRec("increase_budget", "Increase Budget for Winners", `Strong ROAS of ${meta.averageRoas.toFixed(2)}x with low CPA. Increasing budget could capture more volume.`, "high", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.bestCampaign) {
      addRec("detect_winning", `Winning Campaign: ${meta.bestCampaign.name}`, `ROAS of ${meta.bestCampaign.roas.toFixed(2)}x — this is your top performer.`, "high", meta.bestCampaign.name, "ROAS", meta.bestCampaign.roas);
    }
    if (meta.worstCampaign) {
      addRec("stop_campaign", `Review Campaign: ${meta.worstCampaign.name}`, `ROAS of ${meta.worstCampaign.roas.toFixed(2)}x — the weakest performer. Consider pausing or restructuring.`, "medium", meta.worstCampaign.name, "ROAS", meta.worstCampaign.roas);
    }
  }

  if (confirmationRate < 0.5) {
    addRec("change_country", "Low Confirmation Rate Alert", `Confirmation rate is ${(confirmationRate * 100).toFixed(1)}%. Review order quality and target countries.`, "high", undefined, "Confirmation Rate", confirmationRate);
  }

  if (deliveryRate < 0.25) {
    addRec("change_country", "Low Delivery Rate Alert", `Delivery rate is ${(deliveryRate * 100).toFixed(1)}%. Consider changing target countries with better logistics.`, "high", undefined, "Delivery Rate", deliveryRate);
  }

  const bestCountry = countries
    .filter((c) => c.processedOrders > 0)
    .sort((a, b) => b.processedOrders / b.orders - a.processedOrders / a.orders)
    .map((c) => ({ name: c.countryName, rate: c.processedOrders / c.orders }))
    .filter((c) => c.rate > 0.4)
    .slice(0, 1);

  if (bestCountry.length > 0) {
    addRec("detect_winning", `Best Country: ${bestCountry[0].name}`, `Delivery rate of ${(bestCountry[0].rate * 100).toFixed(1)}%. Focus more marketing on this country.`, "medium", bestCountry[0].name, "Delivery Rate", bestCountry[0].rate);
  }

  const worstCountry = countries
    .filter((c) => c.orders > 10)
    .sort((a, b) => a.processedOrders / a.orders - b.processedOrders / b.orders)
    .slice(0, 1);

  if (worstCountry.length > 0 && worstCountry[0].processedOrders / worstCountry[0].orders < 0.15) {
    addRec("change_country", `Weak Market: ${worstCountry[0].countryName}`, `Very low delivery rate of ${((worstCountry[0].processedOrders / worstCountry[0].orders) * 100).toFixed(1)}%. Consider reducing ad spend here.`, "medium", worstCountry[0].countryName, "Delivery Rate", worstCountry[0].processedOrders / worstCountry[0].orders);
  }

  const sortedProducts = [...products].sort((a, b) => b.revenue - a.revenue);
  if (sortedProducts.length > 0) {
    const topProduct = sortedProducts[0];
    addRec("detect_winning", `Top Product: ${topProduct.name}`, `Revenue of ${fmtNum(topProduct.revenue)}. Feature this product in campaigns.`, "medium", topProduct.name, "Revenue", topProduct.revenue);

    const losers = sortedProducts
      .filter((p) => p.revenue > 0 && p.revenue < sortedProducts[0].revenue * 0.05 && p.totalSold < 5)
      .slice(0, 3);

    if (losers.length > 0 && meta && meta.totalSpend > 0) {
      addRec("detect_losing", `Low Performers Detected`, `${losers.length} products with revenue <5% of top product. Review and consider price adjustment.`, "low", undefined, "Revenue", 0);
    }

    if (avgOrderValue > 0 && avgOrderValue < 10000 && meta && meta.averageCpa > avgOrderValue * 0.5) {
      addRec("raise_price", "Consider Raising Prices", `AOV is ${fmtNum(avgOrderValue)} while CPA is ${fmtCurrency(meta.averageCpa)}. Low margins suggest a price increase.`, "medium", undefined, "AOV", avgOrderValue);
    }

    if (avgOrderValue > 50000 && confirmationRate > 0.6) {
      addRec("lower_price", "Consider Price Optimization", `AOV is high (${fmtNum(avgOrderValue)}) with good confirmation rate. Testing lower prices might increase volume.`, "low", undefined, "AOV", avgOrderValue);
    }
  }

  return recs.slice(0, 20);
}

export async function fetchRecommendations(): Promise<RecommendationsData> {
  const cached = getCachedRecommendations();
  if (cached) return cached;

  const res = await fetch("/api/recommendations");
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  const data: RecommendationsData = await res.json();
  storeRecommendations(data.recommendations);
  return data;
}
