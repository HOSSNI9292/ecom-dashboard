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

type LangStrings = {
  scaleCampaign: string;
  scaleCampaignDesc: string;
  reduceSpend: string;
  reduceSpendDesc: string;
  stopLoss: string;
  stopLossDesc: string;
  increaseBudget: string;
  increaseBudgetDesc: string;
  winningCampaign: string;
  winningCampaignDesc: string;
  reviewCampaign: string;
  reviewCampaignDesc: string;
  lowConfirmation: string;
  lowConfirmationDesc: string;
  lowDelivery: string;
  lowDeliveryDesc: string;
  bestCountry: string;
  bestCountryDesc: string;
  weakMarket: string;
  weakMarketDesc: string;
  topProduct: string;
  topProductDesc: string;
  lowPerformers: string;
  lowPerformersDesc: string;
  raisePrice: string;
  raisePriceDesc: string;
  lowerPrice: string;
  lowerPriceDesc: string;
};

const STRINGS_EN: LangStrings = {
  scaleCampaign: "Scale Top Campaigns",
  scaleCampaignDesc: "ROAS of {roas}x and CPA of {cpa} indicates room to scale. Increase budgets on best performers.",
  reduceSpend: "Reduce Underperforming Spend",
  reduceSpendDesc: "Overall ROAS of {roas}x is below threshold. Reduce budgets for low-ROAS campaigns.",
  stopLoss: "Stop Loss-Making Campaigns",
  stopLossDesc: "ROAS of {roas}x means you're losing money. Consider pausing campaigns with ROAS below 1.0x.",
  increaseBudget: "Increase Budget for Winners",
  increaseBudgetDesc: "Strong ROAS of {roas}x with low CPA. Increasing budget could capture more volume.",
  winningCampaign: "Winning Campaign",
  winningCampaignDesc: "ROAS of {roas}x — this is your top performer.",
  reviewCampaign: "Review Campaign",
  reviewCampaignDesc: "ROAS of {roas}x — the weakest performer. Consider pausing or restructuring.",
  lowConfirmation: "Low Confirmation Rate Alert",
  lowConfirmationDesc: "Confirmation rate is {rate}%. Review order quality and target countries.",
  lowDelivery: "Low Delivery Rate Alert",
  lowDeliveryDesc: "Delivery rate is {rate}%. Consider changing target countries with better logistics.",
  bestCountry: "Best Country",
  bestCountryDesc: "Delivery rate of {rate}%. Focus more marketing on this country.",
  weakMarket: "Weak Market",
  weakMarketDesc: "Very low delivery rate of {rate}%. Consider reducing ad spend here.",
  topProduct: "Top Product",
  topProductDesc: "Revenue of {revenue}. Feature this product in campaigns.",
  lowPerformers: "Low Performers Detected",
  lowPerformersDesc: "{count} products with revenue <5% of top product. Review and consider price adjustment.",
  raisePrice: "Consider Raising Prices",
  raisePriceDesc: "AOV is {aov} while CPA is {cpa}. Low margins suggest a price increase.",
  lowerPrice: "Consider Price Optimization",
  lowerPriceDesc: "AOV is high ({aov}) with good confirmation rate. Testing lower prices might increase volume.",
};

const STRINGS_FR: LangStrings = {
  scaleCampaign: "Augmenter les meilleures campagnes",
  scaleCampaignDesc: "ROAS de {roas}x et CPA de {cpa} indiquent une marge de progression. Augmentez les budgets des meilleures campagnes.",
  reduceSpend: "Réduire les dépenses des campagnes sous-performantes",
  reduceSpendDesc: "Le ROAS global de {roas}x est sous le seuil. Réduisez les budgets des campagnes à faible ROAS.",
  stopLoss: "Arrêter les campagnes déficitaires",
  stopLossDesc: "ROAS de {roas}x signifie que vous perdez de l'argent. Envisagez de mettre en pause les campagnes avec un ROAS inférieur à 1,0x.",
  increaseBudget: "Augmenter le budget des campagnes gagnantes",
  increaseBudgetDesc: "ROAS solide de {roas}x avec un CPA faible. Augmenter le budget pourrait capturer plus de volume.",
  winningCampaign: "Campagne gagnante",
  winningCampaignDesc: "ROAS de {roas}x — c'est votre meilleure campagne.",
  reviewCampaign: "Réviser la campagne",
  reviewCampaignDesc: "ROAS de {roas}x — la campagne la plus faible. Envisagez de la mettre en pause ou de la restructurer.",
  lowConfirmation: "Alerte de faible taux de confirmation",
  lowConfirmationDesc: "Le taux de confirmation est de {rate}%. Examinez la qualité des commandes et les pays ciblés.",
  lowDelivery: "Alerte de faible taux de livraison",
  lowDeliveryDesc: "Le taux de livraison est de {rate}%. Envisagez de changer de pays cibles avec une meilleure logistique.",
  bestCountry: "Meilleur pays",
  bestCountryDesc: "Taux de livraison de {rate}%. Concentrez davantage de marketing sur ce pays.",
  weakMarket: "Marché faible",
  weakMarketDesc: "Très faible taux de livraison de {rate}%. Envisagez de réduire les dépenses publicitaires ici.",
  topProduct: "Produit phare",
  topProductDesc: "Revenu de {revenue}. Mettez ce produit en avant dans les campagnes.",
  lowPerformers: "Produits faibles détectés",
  lowPerformersDesc: "{count} produits avec un revenu <5% du produit phare. Examinez et envisagez un ajustement de prix.",
  raisePrice: "Envisager une augmentation de prix",
  raisePriceDesc: "Le panier moyen est de {aov} tandis que le CPA est de {cpa}. Des marges faibles suggèrent une augmentation de prix.",
  lowerPrice: "Envisager une optimisation de prix",
  lowerPriceDesc: "Le panier moyen est élevé ({aov}) avec un bon taux de confirmation. Tester des prix plus bas pourrait augmenter le volume.",
};

function getStrings(lang: string): LangStrings {
  return lang === "fr" ? STRINGS_FR : STRINGS_EN;
}

export function generateRecommendations(
  stats: DashboardStats,
  countries: CountryStats[],
  products: Product[],
  meta: MetaSummary | null,
  lang: string = "en"
): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = new Date().toISOString();
  let idCounter = 1;
  const S = getStrings(lang);

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
      addRec("scale_campaign", S.scaleCampaign, S.scaleCampaignDesc.replace("{roas}", meta.averageRoas.toFixed(2)).replace("{cpa}", fmtCurrency(meta.averageCpa)), "high", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.averageRoas < roasThreshold && meta.totalSpend > 50000) {
      addRec("decrease_budget", S.reduceSpend, S.reduceSpendDesc.replace("{roas}", meta.averageRoas.toFixed(2)), "medium", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.averageRoas < 1 && meta.totalSpend > 100000) {
      addRec("stop_campaign", S.stopLoss, S.stopLossDesc.replace("{roas}", meta.averageRoas.toFixed(2)), "high", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.averageRoas >= 5 && meta.averageCpa <= 1000) {
      addRec("increase_budget", S.increaseBudget, S.increaseBudgetDesc.replace("{roas}", meta.averageRoas.toFixed(2)), "high", undefined, "ROAS", meta.averageRoas);
    }
    if (meta.bestCampaign) {
      addRec("detect_winning", `${S.winningCampaign}: ${meta.bestCampaign.name}`, S.winningCampaignDesc.replace("{roas}", meta.bestCampaign.roas.toFixed(2)), "high", meta.bestCampaign.name, "ROAS", meta.bestCampaign.roas);
    }
    if (meta.worstCampaign) {
      addRec("stop_campaign", `${S.reviewCampaign}: ${meta.worstCampaign.name}`, S.reviewCampaignDesc.replace("{roas}", meta.worstCampaign.roas.toFixed(2)), "medium", meta.worstCampaign.name, "ROAS", meta.worstCampaign.roas);
    }
  }

  if (confirmationRate < 0.5) {
    addRec("change_country", S.lowConfirmation, S.lowConfirmationDesc.replace("{rate}", (confirmationRate * 100).toFixed(1)), "high", undefined, "Confirmation Rate", confirmationRate);
  }

  if (deliveryRate < 0.25) {
    addRec("change_country", S.lowDelivery, S.lowDeliveryDesc.replace("{rate}", (deliveryRate * 100).toFixed(1)), "high", undefined, "Delivery Rate", deliveryRate);
  }

  const bestCountry = countries
    .filter((c) => c.processedOrders > 0)
    .sort((a, b) => b.processedOrders / b.orders - a.processedOrders / a.orders)
    .map((c) => ({ name: c.countryName, rate: c.processedOrders / c.orders }))
    .filter((c) => c.rate > 0.4)
    .slice(0, 1);

  if (bestCountry.length > 0) {
    addRec("detect_winning", `${S.bestCountry}: ${bestCountry[0].name}`, S.bestCountryDesc.replace("{rate}", (bestCountry[0].rate * 100).toFixed(1)), "medium", bestCountry[0].name, "Delivery Rate", bestCountry[0].rate);
  }

  const worstCountry = countries
    .filter((c) => c.orders > 10)
    .sort((a, b) => a.processedOrders / a.orders - b.processedOrders / b.orders)
    .slice(0, 1);

  if (worstCountry.length > 0 && worstCountry[0].processedOrders / worstCountry[0].orders < 0.15) {
    addRec("change_country", `${S.weakMarket}: ${worstCountry[0].countryName}`, S.weakMarketDesc.replace("{rate}", ((worstCountry[0].processedOrders / worstCountry[0].orders) * 100).toFixed(1)), "medium", worstCountry[0].countryName, "Delivery Rate", worstCountry[0].processedOrders / worstCountry[0].orders);
  }

  const sortedProducts = [...products].sort((a, b) => b.revenue - a.revenue);
  if (sortedProducts.length > 0) {
    const topProduct = sortedProducts[0];
    addRec("detect_winning", `${S.topProduct}: ${topProduct.name}`, S.topProductDesc.replace("{revenue}", fmtNum(topProduct.revenue)), "medium", topProduct.name, "Revenue", topProduct.revenue);

    const losers = sortedProducts
      .filter((p) => p.revenue > 0 && p.revenue < sortedProducts[0].revenue * 0.05 && p.totalSold < 5)
      .slice(0, 3);

    if (losers.length > 0 && meta && meta.totalSpend > 0) {
      addRec("detect_losing", S.lowPerformers, S.lowPerformersDesc.replace("{count}", String(losers.length)), "low", undefined, "Revenue", 0);
    }

    if (avgOrderValue > 0 && avgOrderValue < 10000 && meta && meta.averageCpa > avgOrderValue * 0.5) {
      addRec("raise_price", S.raisePrice, S.raisePriceDesc.replace("{aov}", fmtNum(avgOrderValue)).replace("{cpa}", fmtCurrency(meta.averageCpa)), "medium", undefined, "AOV", avgOrderValue);
    }

    if (avgOrderValue > 50000 && confirmationRate > 0.6) {
      addRec("lower_price", S.lowerPrice, S.lowerPriceDesc.replace("{aov}", fmtNum(avgOrderValue)), "low", undefined, "AOV", avgOrderValue);
    }
  }

  return recs.slice(0, 20);
}

