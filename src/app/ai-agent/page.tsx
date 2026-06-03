"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bot, Send, User, Sparkles, TrendingDown, Package, AlertTriangle, BarChart3, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageWrapper } from "@/components/PageWrapper";
import { useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency, formatPercentage } from "@/utils";
import type { Order, Product } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GROQ_KEY = "groq_api_key";

export default function AIAgentPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "مرحبا! أنا AI Agent ديالك 🤖\n\nقدر تسولني على:\n\n• **المنتجات**: \"علاش هاد المنتج عندو fake rate عالية؟\"\n• **الستوك**: \"شحال باقي ف الستوك ديال المنتج X؟\"\n• **النصائح**: \"شنو ندير - نوقف الإعلانات ولا نكمل؟\"\n• **التحليل**: \"شنو أحسن منتج؟\" أو \"شنو أسوأ منتج؟\"\n• **الأرقام**: \"شحال الربح ديال هاد الشهر؟\"\n\nعندي access لكل البيانات ديالك، سولني على أي حاجة!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [groqKey, setGroqKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GROQ_KEY);
    if (stored) setGroqKey(stored);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const dataContext = useMemo(() => {
    if (!data) return "No data available yet.";

    const orders = data.orders ?? [];
    const products = data.products ?? [];
    const stats = data.stats;
    const countries = data.countries ?? [];

    const productMap = new Map<string, any>();
    for (const o of orders) {
      const key = o.productCode || o.productName;
      if (!key) continue;

      if (!productMap.has(key)) {
        const product = products.find((p: Product) => p.code === key || p.name === key);
        productMap.set(key, {
          productCode: key,
          productName: o.productName,
          totalOrders: 0,
          cancelled: 0,
          double: 0,
          transferred: 0,
          confirmed: 0,
          pending: 0,
          fakeOrders: 0,
          stockQuantity: product?.stockQuantity ?? 0,
          revenue: 0,
        });
      }

      const p = productMap.get(key);
      p.totalOrders += 1;
      p.revenue += o.amount;

      if (o.status === "cancelled") { p.cancelled += 1; p.fakeOrders += 1; }
      else if (o.status === "double") { p.double += 1; p.fakeOrders += 1; }
      else if (o.status === "transferred") { p.transferred += 1; p.fakeOrders += 1; }
      else if (o.status === "confirmed") p.confirmed += 1;
      else if (o.status === "pending") p.pending += 1;
    }

    const productAnalysis = Array.from(productMap.values()).map((p) => ({
      ...p,
      fakeRate: p.totalOrders > 0 ? (p.fakeOrders / p.totalOrders * 100).toFixed(1) : "0",
    }));

    const topProducts = productAnalysis
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const worstProducts = productAnalysis
      .filter((p) => p.totalOrders > 0)
      .sort((a, b) => (b.fakeOrders / b.totalOrders) - (a.fakeOrders / a.totalOrders))
      .slice(0, 10);

    const lowStock = productAnalysis
      .filter((p) => p.stockQuantity <= 10 && p.stockQuantity > 0)
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    const outOfStock = productAnalysis
      .filter((p) => p.stockQuantity === 0);

    let context = `=== BUSINESS OVERVIEW ===
Total Orders: ${stats?.totalOrders ?? orders.length}
Total Revenue: ${formatCurrency(stats?.revenue ?? orders.reduce((s, o) => s + o.amount, 0))}
Confirmed Orders: ${stats?.confirmedOrders ?? 0}
Cancelled Orders: ${stats?.cancelledOrders ?? 0}
Pending Orders: ${stats?.pendingOrders ?? 0}
Net Revenue: ${formatCurrency(stats?.netRevenue ?? 0)}
Service Fees: ${formatCurrency(stats?.serviceFeesTotal ?? 0)}
Confirmation Rate: ${formatPercentage(stats?.confirmationRate ?? 0)}
Delivery Rate: ${formatPercentage(stats?.deliveryRate ?? 0)}
Average Order Value: ${formatCurrency(stats?.averageOrderValue ?? 0)}

=== TOP 10 PRODUCTS BY REVENUE ===
${topProducts.map((p, i) => `${i + 1}. ${p.productName} (Code: ${p.productCode})
   - Revenue: ${formatCurrency(p.revenue)}
   - Total Orders: ${p.totalOrders}
   - Fake Orders: ${p.fakeOrders} (Cancelled: ${p.cancelled}, Double: ${p.double})
   - Fake Rate: ${p.fakeRate}%
   - Stock: ${p.stockQuantity} units`).join("\n")}

=== TOP 10 PRODUCTS BY FAKE RATE ===
${worstProducts.map((p, i) => `${i + 1}. ${p.productName} (Code: ${p.productCode})
   - Fake Rate: ${p.fakeRate}%
   - Fake Orders: ${p.fakeOrders}/${p.totalOrders}
   - Revenue: ${formatCurrency(p.revenue)}
   - Stock: ${p.stockQuantity} units`).join("\n")}

=== LOW STOCK PRODUCTS (${lowStock.length}) ===
${lowStock.map((p) => `- ${p.productName}: ${p.stockQuantity} units left (Revenue: ${formatCurrency(p.revenue)})`).join("\n") || "No low stock products"}

=== OUT OF STOCK PRODUCTS (${outOfStock.length}) ===
${outOfStock.map((p) => `- ${p.productName} (Revenue: ${formatCurrency(p.revenue)}, Orders: ${p.totalOrders})`).join("\n") || "No out of stock products"}

=== COUNTRIES PERFORMANCE ===
${countries.slice(0, 10).map((c) => `- ${c.countryName}: Revenue ${formatCurrency(c.revenue)}, Orders ${c.orders}, Confirmation Rate ${formatPercentage(c.confirmationRate)}`).join("\n")}`;

    return context;
  }, [data]);

  const generateSmartResponse = (question: string): string => {
    if (!data) return "⏳ البيانات مازال كتحمّل، عاوني شوية...";

    const q = question.toLowerCase();
    const orders = data.orders ?? [];
    const products = data.products ?? [];
    const stats = data.stats;
    const countries = data.countries ?? [];

    const productMap = new Map<string, any>();
    for (const o of orders) {
      const key = o.productCode || o.productName;
      if (!key) continue;

      if (!productMap.has(key)) {
        const product = products.find((p: Product) => p.code === key || p.name === key);
        productMap.set(key, {
          productCode: key,
          productName: o.productName,
          totalOrders: 0,
          cancelled: 0,
          double: 0,
          transferred: 0,
          confirmed: 0,
          pending: 0,
          fakeOrders: 0,
          stockQuantity: product?.stockQuantity ?? 0,
          revenue: 0,
        });
      }

      const p = productMap.get(key);
      p.totalOrders += 1;
      p.revenue += o.amount;

      if (o.status === "cancelled") { p.cancelled += 1; p.fakeOrders += 1; }
      else if (o.status === "double") { p.double += 1; p.fakeOrders += 1; }
      else if (o.status === "transferred") { p.transferred += 1; p.fakeOrders += 1; }
      else if (o.status === "confirmed") p.confirmed += 1;
      else if (o.status === "pending") p.pending += 1;
    }

    const productAnalysis = Array.from(productMap.values()).map((p) => ({
      ...p,
      fakeRate: p.totalOrders > 0 ? (p.fakeOrders / p.totalOrders) : 0,
      fakeRatePercent: p.totalOrders > 0 ? ((p.fakeOrders / p.totalOrders) * 100).toFixed(1) : "0",
    }));

    const topProducts = [...productAnalysis].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const worstProducts = [...productAnalysis].filter((p) => p.totalOrders > 0).sort((a, b) => b.fakeRate - a.fakeRate).slice(0, 5);
    const lowStock = productAnalysis.filter((p) => p.stockQuantity <= 10 && p.stockQuantity > 0).sort((a, b) => a.stockQuantity - b.stockQuantity);
    const outOfStock = productAnalysis.filter((p) => p.stockQuantity === 0);
    const highRisk = productAnalysis.filter((p) => p.fakeRate >= 0.5);

    if (q.includes("ملخص") || q.includes("summary") || q.includes("overview") || q.includes("كيفاش") || q.includes("كيف")) {
      const totalRevenue = stats?.revenue ?? orders.reduce((s, o) => s + o.amount, 0);
      const totalOrders = stats?.totalOrders ?? orders.length;
      const confirmedOrders = stats?.confirmedOrders ?? 0;
      const cancelledOrders = stats?.cancelledOrders ?? 0;
      const netRevenue = stats?.netRevenue ?? 0;
      const confRate = stats?.confirmationRate ?? 0;

      return `📊 **ملخص البيزنس ديالك:**

💰 **الأرقام:**
• Total Revenue: ${formatCurrency(totalRevenue)}
• Net Revenue (بعد الرسوم): ${formatCurrency(netRevenue)}
• Total Orders: ${formatNumber(totalOrders)}
• Confirmed: ${formatNumber(confirmedOrders)}
• Cancelled: ${formatNumber(cancelledOrders)}
• Confirmation Rate: ${formatPercentage(confRate)}

🎯 **المنتجات:**
• Total Products: ${formatNumber(productAnalysis.length)}
• 🟢 منتجات ممتازة (fake < 15%): ${productAnalysis.filter((p) => p.fakeRate < 0.15).length}
• 🟡 منتجات متوسطة (fake 15-30%): ${productAnalysis.filter((p) => p.fakeRate >= 0.15 && p.fakeRate < 0.3).length}
• 🔴 منتجات خطيرة (fake > 50%): ${highRisk.length}

📦 **الستوك:**
• Out of Stock: ${outOfStock.length} منتج
• Low Stock: ${lowStock.length} منتج

🌍 **Countries:** ${countries.length} دولة

${highRisk.length > 0 ? `⚠️ **تنبيه:** عندك ${highRisk.length} منتج fake rate > 50%، خاصك توقف الإعلانات ديالهم!` : "✅ ما كاينش منتجات خطيرة!"}`;
    }

    if (q.includes("أحسن") || q.includes("best") || q.includes("top") || q.includes("ممتاز")) {
      if (topProducts.length === 0) return "ما كاينش بيانات كافية على المنتجات.";
      
      return `🏆 **Top 5 المنتجات:**

${topProducts.map((p, i) => `${i + 1}. **${p.productName}**
   💰 Revenue: ${formatCurrency(p.revenue)}
   📦 Orders: ${p.totalOrders} (Confirmed: ${p.confirmed})
   📊 Fake Rate: ${p.fakeRatePercent}%
   📈 Stock: ${p.stockQuantity} units
   ${p.fakeRate < 0.15 ? "✅ **زود الإعلانات!**" : p.fakeRate < 0.3 ? "⚠️ راقب" : "🔴 مشكل"}`).join("\n\n")}

💡 **نصيحة:** هاد المنتجات كيجيبو فلوس، زود الميزانية ديالهم!`;
    }

    if (q.includes("أسوأ") || q.includes("worst") || q.includes("خايب") || q.includes("مشكل") || q.includes("fake")) {
      if (worstProducts.length === 0) return "✅ ما كاينش منتجات عندها مشاكل!";
      
      return `⚠️ **Top 5 منتجات عندها مشاكل:**

${worstProducts.map((p, i) => `${i + 1}. **${p.productName}**
   🔴 Fake Rate: ${p.fakeRatePercent}%
   ❌ Fake Orders: ${p.fakeOrders}/${p.totalOrders}
      • Cancelled: ${p.cancelled}
      • Double: ${p.double}
      • Transferred: ${p.transferred}
   💰 Revenue: ${formatCurrency(p.revenue)}
   📦 Stock: ${p.stockQuantity} units
   ${p.fakeRate >= 0.5 ? "⛔ **وقف الإعلانات فوراً!**" : p.fakeRate >= 0.3 ? "⚠️ قلل الإعلانات" : "👍 راقب"}`).join("\n\n")}

💡 **نصيحة:** المنتجات اللي fake rate > 50% خاصك توقف الإعلانات ديالهم فوراً!`;
    }

    if (q.includes("ستوك") || q.includes("stock") || q.includes("باقي") || q.includes("شحال")) {
      if (outOfStock.length === 0 && lowStock.length === 0) {
        return "✅ **الستوك مزيان!** ما كاينش منتجات فارغة أو قليلة.";
      }

      let response = "📦 **وضع الستوك:**\n\n";
      
      if (outOfStock.length > 0) {
        response += `⛔ **Out of Stock (${outOfStock.length}):**\n`;
        response += outOfStock.slice(0, 5).map((p) => `• ${p.productName} (Revenue: ${formatCurrency(p.revenue)})`).join("\n");
        response += "\n\n";
      }

      if (lowStock.length > 0) {
        response += `⚠️ **Low Stock (${lowStock.length}):**\n`;
        response += lowStock.slice(0, 5).map((p) => `• ${p.productName}: ${p.stockQuantity} units`).join("\n");
      }

      response += "\n\n💡 **نصيحة:** المنتجات اللي out of stock خاصك تعمرهم فوراً، خصوصاً اللي كيجيبو revenue عالي!";
      return response;
    }

    if (q.includes("نصيحة") || q.includes("advice") || q.includes("ندير") || q.includes("recommend")) {
      let advice = "💡 **نصائح للبيزنس ديالك:**\n\n";

      if (highRisk.length > 0) {
        advice += `⛔ **عاجل:** عندك ${highRisk.length} منتج fake rate > 50%\n`;
        advice += highRisk.slice(0, 3).map((p) => `• ${p.productName} (${p.fakeRatePercent}%)`).join("\n");
        advice += "\n**وقف الإعلانات ديالهم فوراً!**\n\n";
      }

      const goodProducts = productAnalysis.filter((p) => p.fakeRate < 0.15 && p.revenue > 0);
      if (goodProducts.length > 0) {
        advice += `✅ **زود الميزانية ف:**\n`;
        advice += goodProducts.slice(0, 3).map((p) => `• ${p.productName} (Fake: ${p.fakeRatePercent}%, Revenue: ${formatCurrency(p.revenue)})`).join("\n");
        advice += "\n\n";
      }

      if (outOfStock.length > 0) {
        advice += `📦 **عمر الستوك:**\n`;
        advice += outOfStock.slice(0, 3).map((p) => `• ${p.productName}`).join("\n");
        advice += "\n\n";
      }

      const confRate = stats?.confirmationRate ?? 0;
      if (confRate < 0.5) {
        advice += `📉 **Confirmation Rate ضعيف (${formatPercentage(confRate)})**\nراجع targeting ديال الإعلانات وجودة المنتجات.\n\n`;
      }

      advice += "🎯 **خلاصة:** ركز على المنتجات اللي fake rate < 15% وزود الميزانية ديالهم!";
      return advice;
    }

    if (q.includes("ربح") || q.includes("profit") || q.includes("revenue") || q.includes("فلوس")) {
      const totalRevenue = stats?.revenue ?? orders.reduce((s, o) => s + o.amount, 0);
      const netRevenue = stats?.netRevenue ?? 0;
      const serviceFees = stats?.serviceFeesTotal ?? 0;
      const confirmedRevenue = stats?.confirmedRevenue ?? 0;

      return `💰 **تحليل الأرباح:**

📊 **Revenue:**
• Total Revenue: ${formatCurrency(totalRevenue)}
• Confirmed Revenue: ${formatCurrency(confirmedRevenue)}
• Service Fees: ${formatCurrency(serviceFees)}
• **Net Revenue: ${formatCurrency(netRevenue)}** 💵

📈 **Performance:**
• Average Order Value: ${formatCurrency(stats?.averageOrderValue ?? 0)}
• Confirmation Rate: ${formatPercentage(stats?.confirmationRate ?? 0)}

${netRevenue > 0 ? "✅ **البيزنس كيجيب فلوس!**" : "⚠️ **الربح ضعيف، راجع المنتجات والإعلانات.**"}`;
    }

    if (q.includes("country") || q.includes("دولة") || q.includes("بلد")) {
      if (countries.length === 0) return "ما كاينش بيانات على الدول.";

      const topCountries = [...countries].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      return `🌍 **Top 5 الدول:**

${topCountries.map((c, i) => `${i + 1}. **${c.countryName}** ${c.flag}
   💰 Revenue: ${formatCurrency(c.revenue)}
   📦 Orders: ${c.orders}
   ✅ Confirmation Rate: ${formatPercentage(c.confirmationRate)}
   📊 Delivery Rate: ${formatPercentage(c.deliveryRate)}`).join("\n\n")}

💡 **نصيحة:** ركز على الدول اللي عندها confirmation rate عالي!`;
    }

    if (q.includes("product") || q.includes("منتج")) {
      const productName = question.replace(/.*product|منتج/i, "").trim();
      if (productName) {
        const found = productAnalysis.find((p) => 
          p.productName.toLowerCase().includes(productName.toLowerCase()) ||
          p.productCode.toLowerCase().includes(productName.toLowerCase())
        );

        if (found) {
          return `📊 **${found.productName}:**

💰 Revenue: ${formatCurrency(found.revenue)}
📦 Total Orders: ${found.totalOrders}
   • Confirmed: ${found.confirmed}
   • Cancelled: ${found.cancelled}
   • Double: ${found.double}
   • Pending: ${found.pending}
📊 Fake Rate: ${found.fakeRatePercent}%
📈 Stock: ${found.stockQuantity} units

${found.fakeRate >= 0.5 ? "⛔ **خطير! وقف الإعلانات فوراً!**" : 
  found.fakeRate >= 0.3 ? "⚠️ **قلل الإعلانات وراقب**" :
  found.fakeRate >= 0.15 ? "👍 **مقبول، راقب**" :
  "✅ **ممتاز! زود الإعلانات!**"}`;
        }
      }
    }

    return `🤔 ما فهمتش السؤال. جرب تسولني على:

• **ملخص**: "عطيني ملخص"
• **المنتجات**: "شنو أحسن منتج؟" أو "شنو أسوأ منتج؟"
• **الستوك**: "شحال باقي ف الستوك؟"
• **النصائح**: "شنو ندير؟"
• **الأرباح**: "شحال الربح؟"
• **الدول**: "شنو أحسن دولة؟"
• **منتج معين**: "عطيني معلومات على [اسم المنتج]"

سولني على أي حاجة! 🚀`;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (groqKey) {
      try {
        const chatHistory = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }))
          .slice(-10);

        chatHistory.push({ role: "user", content: input });

        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory,
            groqKey,
            dataContext,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to get response");
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const smartResponse = generateSmartResponse(input);
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: smartResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
      } finally {
        setIsTyping(false);
      }
    } else {
      setTimeout(() => {
        const smartResponse = generateSmartResponse(input);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: smartResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 800);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([{
      id: Date.now().toString(),
      role: "assistant",
      content: "مرحبا! أنا AI Agent ديالك 🤖\n\nقدر تسولني على المنتجات، الستوك، الإعلانات، والأرقام. سولني على أي حاجة!",
      timestamp: new Date(),
    }]);
  };

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch} hasData={!!data}>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#059669]/20">
              <Bot className="w-6 h-6 text-[#34D399]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Agent</h1>
              <p className="text-[#71717A] text-xs">
                {groqKey ? "🟢 Groq AI (Advanced)" : "🟢 Smart AI (Ready)"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#27272A] transition-all"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <Card hover={false} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981]/20 to-[#059669]/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#34D399]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[#10B981] text-white"
                      : "bg-[#27272A] text-[#A1A1AA]"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  <div className={`text-xs mt-1 ${msg.role === "user" ? "text-white/70" : "text-[#71717A]"}`}>
                    {msg.timestamp.toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#A1A1AA]" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981]/20 to-[#059669]/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#34D399]" />
                </div>
                <div className="bg-[#27272A] rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#71717A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#71717A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#71717A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#27272A] p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="سولني على المنتجات، الستوك، النصائح..."
                className="flex-1 px-4 py-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-white text-sm placeholder:text-[#3F3F46] focus:outline-none focus:border-[#10B981]/50 resize-none"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-4 py-3 bg-[#10B981] hover:bg-[#059669] disabled:bg-[#27272A] disabled:text-[#3F3F46] text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => setInput("شنو أحسن منتج عندي؟")}
                className="px-3 py-1.5 bg-[#27272A] hover:bg-[#1C1C21] text-[#A1A1AA] text-xs rounded-lg transition-all"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                أحسن منتج
              </button>
              <button
                onClick={() => setInput("شنو المنتجات اللي خاصني نوقف الإعلانات ديالهم؟")}
                className="px-3 py-1.5 bg-[#27272A] hover:bg-[#1C1C21] text-[#A1A1AA] text-xs rounded-lg transition-all"
              >
                <TrendingDown className="w-3 h-3 inline mr-1" />
                نوقف الإعلانات
              </button>
              <button
                onClick={() => setInput("شحال باقي ف الستوك؟ شنو خاصني نعاود نطلب؟")}
                className="px-3 py-1.5 bg-[#27272A] hover:bg-[#1C1C21] text-[#A1A1AA] text-xs rounded-lg transition-all"
              >
                <Package className="w-3 h-3 inline mr-1" />
                الستوك
              </button>
              <button
                onClick={() => setInput("عطيني ملخص كامل على البيزنس ديالي")}
                className="px-3 py-1.5 bg-[#27272A] hover:bg-[#1C1C21] text-[#A1A1AA] text-xs rounded-lg transition-all"
              >
                <BarChart3 className="w-3 h-3 inline mr-1" />
                ملخص
              </button>
              <button
                onClick={() => setInput("شنو النصائح اللي عندك ليا باش نزيد الربح؟")}
                className="px-3 py-1.5 bg-[#27272A] hover:bg-[#1C1C21] text-[#A1A1AA] text-xs rounded-lg transition-all"
              >
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                نصائح
              </button>
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
