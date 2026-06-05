import { NextResponse } from "next/server";

const META_API_VERSION = "v25.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const DATE_PRESETS: Record<string, { since: string; until: string }> = {
  today: { since: new Date().toISOString().split("T")[0], until: new Date().toISOString().split("T")[0] },
  yesterday: { since: new Date(Date.now() - 86400000).toISOString().split("T")[0], until: new Date(Date.now() - 86400000).toISOString().split("T")[0] },
  last_7d: { since: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0], until: new Date().toISOString().split("T")[0] },
  last_30d: { since: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], until: new Date().toISOString().split("T")[0] },
  this_month: { since: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], until: new Date().toISOString().split("T")[0] },
};

export async function POST(request: Request) {
  try {
    const { adAccountId, accessToken, datePreset } = await request.json();

    if (!adAccountId || !accessToken) {
      return NextResponse.json({ error: "Missing adAccountId or accessToken" }, { status: 400 });
    }

    const cleanAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const preset = DATE_PRESETS[datePreset || "last_30d"] || DATE_PRESETS.last_30d;

    let accountCurrency = "";
    let accountName = "";
    let rawAccountResponse = "";
    let accountFetchStatus = 0;
    try {
      const acctUrl = `${META_GRAPH_URL}/${cleanAdAccountId}?fields=id,name,currency&access_token=${accessToken}`;
      const acctRes = await fetch(acctUrl);
      accountFetchStatus = acctRes.status;
      const acctRaw = await acctRes.text();
      rawAccountResponse = acctRaw;
      if (acctRes.ok) {
        const acctJson = JSON.parse(acctRaw);
        accountCurrency = acctJson.currency || "";
        accountName = acctJson.name || "";
      }
    } catch (e) {
      rawAccountResponse = `Fetch error: ${e instanceof Error ? e.message : e}`;
    }

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
      "clicks",
      "actions",
      "cost_per_action_type",
      "action_values",
      "purchase_roas",
      "conversions",
    ].join(",");

    const url = `${META_GRAPH_URL}/${cleanAdAccountId}/insights?fields=${fields}&level=ad&time_range={"since":"${preset.since}","until":"${preset.until}"}&limit=200&access_token=${accessToken}`;

    const res = await fetch(url);

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
      clicks?: string;
      purchase_roas?: string[];
      conversions?: string;
      actions?: ActionEntry[];
      cost_per_action_type?: ActionEntry[];
      action_values?: ActionValueEntry[];
    }

    const ads = adsData.map((ad: RawMetaAd) => {
      const spend = parseFloat(ad.spend || "0");
      const purchases = (ad.actions || [])
        .filter((a) => a.action_type === "purchase")
        .reduce((sum, a) => sum + parseFloat(a.value || "0"), 0);
      const linkClicks = (ad.actions || [])
        .filter((a) => a.action_type === "link_click")
        .reduce((sum, a) => sum + parseFloat(a.value || "0"), 0);
      const purchaseValue = (ad.action_values || [])
        .filter((a) => a.action_type === "purchase")
        .reduce((sum, a) => sum + parseFloat(a.value || "0"), 0);
      const roas = spend > 0 ? purchaseValue / spend : 0;
      const purchaseRoas = ad.purchase_roas && ad.purchase_roas.length > 0 ? parseFloat(ad.purchase_roas[0]) : roas;

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
        linkClicks,
        purchaseRoas,
      };
    });

    const totalSpend = ads.reduce((sum: number, a: { spend: number }) => sum + a.spend, 0);
    const totalPurchases = ads.reduce((sum: number, a: { purchases: number }) => sum + a.purchases, 0);
    const totalImpressions = ads.reduce((sum: number, a: { impressions: number }) => sum + a.impressions, 0);
    const averageCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
    const averageCtr = totalImpressions > 0
      ? ads.reduce((sum: number, a: { ctr: number; impressions: number }) => sum + a.ctr * a.impressions, 0) / totalImpressions
      : 0;
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

    const accountInfo = {
      accountId: cleanAdAccountId,
      accountName,
      currency: accountCurrency,
      dateRange: { since: preset.since, until: preset.until },
      rawSpend: totalSpend,
      rawResponse: rawAccountResponse,
      accountFetchStatus,
    };

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
      accountCurrency,
      accountName,
      datePreset: datePreset || "last_30d",
      rawAccountResponse,
      debugInfo: accountInfo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
