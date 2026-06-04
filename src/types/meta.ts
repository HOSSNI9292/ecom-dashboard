export interface MetaCredentials {
  adAccountId: string;
  accessToken: string;
}

export interface MetaAd {
  campaignId: string;
  campaignName: string;
  adSetName: string;
  adName: string;
  spend: number;
  purchases: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  impressions: number;
  frequency: number;
  roas: number;
  linkClicks: number;
}

export interface MetaSummary {
  totalSpend: number;
  totalPurchases: number;
  averageCpa: number;
  averageCtr: number;
  averageRoas: number;
  bestCampaign: { name: string; roas: number } | null;
  worstCampaign: { name: string; roas: number } | null;
  bestProduct: string;
  bestCountry: string;
  ads: MetaAd[];
  lastSynced: string | null;
  syncing: boolean;
}

export interface Recommendation {
  id: string;
  type: "increase_budget" | "decrease_budget" | "stop_campaign" | "scale_campaign" | "raise_price" | "lower_price" | "change_country" | "detect_losing" | "detect_winning" | "alert";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  entityName?: string;
  metric?: string;
  value?: number;
  date: string;
  read: boolean;
}

export interface RecommendationsData {
  recommendations: Recommendation[];
  generatedAt: string;
}
