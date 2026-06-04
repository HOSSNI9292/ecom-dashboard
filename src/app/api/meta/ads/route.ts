import { NextResponse } from "next/server";

const META_API_VERSION = "v22.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(request: Request) {
  try {
    const { adAccountId, accessToken } = await request.json();

    if (!adAccountId || !accessToken) {
      return NextResponse.json({ error: "Missing adAccountId or accessToken" }, { status: 400 });
    }

    const cleanAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    const since = sixMonthsAgo.toISOString().split("T")[0];
    const until = today.toISOString().split("T")[0];

    const fields = [
      "campaign_name",
      "campaign_id",
      "adset_name",
      "ad_name",
      "spend",
      "ctr",
      "cpc",
      "cpm",
      "reach",
      "impressions",
      "frequency",
      "actions",
      "cost_per_action_type",
      "action_values",
      "link_clicks",
    ].join(",");

    const url = `${META_GRAPH_URL}/${cleanAdAccountId}/insights?fields=${fields}&level=ad&time_range={"since":"${since}","until":"${until}"}&limit=200&access_token=${accessToken}`;

    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (!res.ok) {
      const errBody = await res.text();
      let errorMsg = `Meta API error (${res.status})`;
      try {
        const errJson = JSON.parse(errBody);
        errorMsg = errJson.error?.message || errorMsg;
      } catch {}
      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    const json = await res.json();
    const adsData = json.data || [];

    interface ActionEntry {
      action_type: string;
      value: string;
    }

    interface ActionValueEntry {
      action_type: string;
      value: string;
    }

    interface RawMetaAd {
      campaign_name: string;
      campaign_id: string;
      adset_name: string;
      ad_name: string;
      spend?: string;
      ctr?: string;
      cpc?: string;
      cpm?: string;
      reach?: string;
      impressions?: string;
      frequency?: string;
      actions?: ActionEntry[];
      cost_per_action_type?: ActionEntry[];
      action_values?: ActionValueEntry[];
      link_clicks?: string;
    }

    const ads = adsData.map((ad: RawMetaAd) => {
      const spend = parseFloat(ad.spend || "0");
      const purchases = (ad.actions || [])
        .filter((a) => a.action_type === "purchase")
        .reduce((sum, a) => sum + parseFloat(a.value || "0"), 0);
      const purchaseValue = (ad.action_values || [])
        .filter((a) => a.action_type === "purchase")
        .reduce((sum, a) => sum + parseFloat(a.value || "0"), 0);
      const roas = spend > 0 ? purchaseValue / spend : 0;

      return {
        campaignId: ad.campaign_id || "",
        campaignName: ad.campaign_name || "Unknown",
        adSetName: ad.adset_name || "Unknown",
        adName: ad.ad_name || "Unknown",
        spend,
        purchases,
        ctr: parseFloat(ad.ctr || "0"),
        cpc: parseFloat(ad.cpc || "0"),
        cpm: parseFloat(ad.cpm || "0"),
        reach: parseInt(ad.reach || "0", 10),
        impressions: parseInt(ad.impressions || "0", 10),
        frequency: parseFloat(ad.frequency || "0"),
        roas,
        linkClicks: parseInt(ad.link_clicks || "0", 10),
      };
    });

    const totalSpend = ads.reduce((sum: number, a: { spend: number }) => sum + a.spend, 0);
    const totalPurchases = ads.reduce((sum: number, a: { purchases: number }) => sum + a.purchases, 0);
    const averageCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
    const averageCtr = ads.length > 0 ? ads.reduce((sum: number, a: { ctr: number }) => sum + a.ctr, 0) / ads.length : 0;
    const averageRoas = totalSpend > 0
      ? ads.reduce((sum: number, a: { roas: number; spend: number }) => sum + a.roas * a.spend, 0) / totalSpend
      : 0;

    const campaigns = new Map<string, { spend: number; purchaseValue: number }>();
    ads.forEach((a: { campaignName: string; campaignId: string; spend: number; roas: number }) => {
      const existing = campaigns.get(a.campaignName) || { spend: 0, purchaseValue: 0 };
      existing.spend += a.spend;
      existing.purchaseValue += a.spend * a.roas;
      campaigns.set(a.campaignName, existing);
    });

    let bestCampaign: { name: string; roas: number } | null = null;
    let worstCampaign: { name: string; roas: number } | null = null;

    campaigns.forEach((data, name) => {
      const roas = data.spend > 0 ? data.purchaseValue / data.spend : 0;
      if (!bestCampaign || roas > bestCampaign.roas) bestCampaign = { name, roas };
      if (!worstCampaign || roas < worstCampaign.roas) worstCampaign = { name, roas };
    });

    return NextResponse.json({
      totalSpend,
      totalPurchases,
      averageCpa,
      averageCtr,
      averageRoas,
      bestCampaign,
      worstCampaign,
      bestProduct: "",
      bestCountry: "",
      ads,
      lastSynced: new Date().toISOString(),
      syncing: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
