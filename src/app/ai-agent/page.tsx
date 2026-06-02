"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, TrendingDown, Package, AlertTriangle } from "lucide-react";
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

interface ProductAnalysis {
  productCode: string;
  productName: string;
  totalOrders: number;
  cancelled: number;
  double: number;
  confirmed: number;
  fakeOrders: number;
  fakeRate: number;
  stockQuantity: number;
  revenue: number;
  riskLevel: "high" | "medium" | "low" | "safe";
  recommendation: string;
}

export default function AIAgentPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "مرحبا! أنا AI Agent ديالك. قدر تسولني على:\n\n• **المنتجات**: \"علاش هاد المنتج عندو fake rate عالية؟\"\n• **الستوك**: \"شحال باقي ف الستوك ديال المنتج X؟\"\n• **النصائح**: \"شنو ندير - نوقف الإعلانات ولا نكمل؟\"\n• **التحليل**: \"شنو أحسن منتج؟\" أو \"شنو أسوأ منتج؟\"\n\nجرب تسولني!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeProducts = (): ProductAnalysis[] => {
    if (!data?.orders) return [];

    const map = new Map<string, ProductAnalysis>();
    const orders = data.orders as Order[];
    const products = data.products ?? [];

    for (const o of orders) {
      const key = o.productCode || o.productName;
      if (!key) continue;

      if (!map.has(key)) {
        const product = products.find((p) => p.code === key || p.name === key);
        map.set(key, {
          productCode: key,
          productName: o.productName,
          totalOrders: 0,
          cancelled: 0,
          double: 0,
          confirmed: 0,
          fakeOrders: 0,
          fakeRate: 0,
          stockQuantity: product?.stockQuantity ?? 0,
          revenue: 0,
          riskLevel: "safe",
          recommendation: "",
        });
      }

      const p = map.get(key)!;
      p.totalOrders += 1;
      p.revenue += o.amount;

      if (o.status === "cancelled") { p.cancelled += 1; p.fakeOrders += 1; }
      else if (o.status === "double") { p.double += 1; p.fakeOrders += 1; }
      else if (o.status === "confirmed") p.confirmed += 1;
    }

    for (const p of map.values()) {
      p.fakeRate = p.totalOrders > 0 ? p.fakeOrders / p.totalOrders : 0;

      if (p.fakeRate >= 0.5) {
        p.riskLevel = "high";
        p.recommendation = "⛔ **وقف الإعلانات فوراً** - Fake rate عالية بزاف!";
      } else if (p.fakeRate >= 0.3) {
        p.riskLevel = "medium";
        p.recommendation = "⚠️ **قلل الإعلانات** - Fake rate متوسطة، راقب الوضع.";
      } else if (p.fakeRate >= 0.15) {
        p.riskLevel = "low";
        p.recommendation = "👍 **استمر** - Fake rate مقبولة، لكن راقب.";
      } else {
        p.riskLevel = "safe";
        p.recommendation = "✅ **زود الإعلانات** - منتج ممتاز!";
      }

      if (p.stockQuantity === 0) {
        p.recommendation += "\n📦 **الستوك فارغ** - خاصك تعمر!";
      } else if (p.stockQuantity <= 5) {
        p.recommendation += "\n⚠️ **الستوك قليل** - خاصك تعمر قريب.";
      }
    }

    return Array.from(map.values());
  };

  const generateResponse = (question: string): string => {
    const q = question.toLowerCase();
    const products = analyzeProducts();

    if (products.length === 0) {
      return "ما كاينش بيانات كافية. جرب من بعد.";
    }

    const highRisk = products.filter((p) => p.riskLevel === "high");
    const bestProducts = products.filter((p) => p.riskLevel === "safe").sort((a, b) => b.revenue - a.revenue);
    const worstProducts = products.filter((p) => p.riskLevel === "high" || p.riskLevel === "medium");

    if (q.includes("علاش") || q.includes("ليه") || q.includes("why")) {
      if (q.includes("fake") || q.includes("cancel") || q.includes("double")) {
        const product = products.find((p) => q.includes(p.productName.toLowerCase()) || q.includes(p.productCode.toLowerCase()));
        if (product) {
          return `**${product.productName}**\n\n📊 **التحليل:**\n• Total Orders: ${formatNumber(product.totalOrders)}\n• Fake Orders: ${formatNumber(product.fakeOrders)} (${formatPercentage(product.fakeRate)})\n• Cancelled: ${formatNumber(product.cancelled)}\n• Double: ${formatNumber(product.double)}\n• Confirmed: ${formatNumber(product.confirmed)}\n\n💡 **الأسباب المحتملة:**\n• Fake rate عالية = ناس كيطلبو وما كيكملوش\n• ممكن السعر غالي أو المنتج مش مطلوب\n• ممكن الإعلانات ماشي مستهدفة مزيان\n\n${product.recommendation}`;
        }
        return `علاش fake rate عالية ف المنتجات؟\n\n📊 **الأسباب الشائعة:**\n• الإعلانات ماشي مستهدفة للمهتمين الحقيقيين\n• السعر ماشي مناسب للسوق\n• المنتج مش واضح ف الإعلانات\n• ناس كيطلبو بالخطأ أو للتجريب\n\n🔍 **المنتجات اللي عندها fake rate عالية:**\n${worstProducts.slice(0, 3).map((p) => `• **${p.productName}**: ${formatPercentage(p.fakeRate)}`).join("\n")}\n\n${worstProducts[0]?.recommendation || ""}`;
      }
    }

    if (q.includes("شحال") || q.includes("stock") || q.includes("ستوك") || q.includes("باقي")) {
      const product = products.find((p) => q.includes(p.productName.toLowerCase()) || q.includes(p.productCode.toLowerCase()));
      if (product) {
        let stockStatus = "";
        if (product.stockQuantity === 0) {
          stockStatus = "⛔ **الستوك فارغ!** خاصك تعمر فوراً.";
        } else if (product.stockQuantity <= 5) {
          stockStatus = "⚠️ **الستوك قليل بزاف** - خاصك تعمر قريب.";
        } else if (product.stockQuantity <= 20) {
          stockStatus = "👍 **الستوك مقبول** - راقب.";
        } else {
          stockStatus = "✅ **الستوك مزيان**";
        }
        return `**${product.productName}**\n\n📦 **الستوك:** ${formatNumber(product.stockQuantity)} وحدة\n\n${stockStatus}\n\n📊 **الأداء:**\n• Total Orders: ${formatNumber(product.totalOrders)}\n• Revenue: ${formatCurrency(product.revenue)}\n• Fake Rate: ${formatPercentage(product.fakeRate)}`;
      }
      const lowStock = products.filter((p) => p.stockQuantity <= 5 && p.stockQuantity > 0).slice(0, 5);
      const outOfStock = products.filter((p) => p.stockQuantity === 0).slice(0, 5);
      return `📦 **وضع الستوك:**\n\n${outOfStock.length > 0 ? `⛔ **فارغ (${outOfStock.length} منتج):**\n${outOfStock.map((p) => `• ${p.productName}`).join("\n")}\n\n` : ""}${lowStock.length > 0 ? `⚠️ **قليل (${lowStock.length} منتج):**\n${lowStock.map((p) => `• ${p.productName}: ${formatNumber(p.stockQuantity)} وحدة`).join("\n")}` : "✅ كلشي مزيان ف الستوك!"}`;
    }

    if (q.includes("شنو") || q.includes("ندير") || q.includes("نصيحة") || q.includes("advice") || q.includes("recommend")) {
      if (highRisk.length > 0) {
        return `🚨 **نصائح عاجلة:**\n\n${highRisk.slice(0, 3).map((p) => `**${p.productName}** (${formatPercentage(p.fakeRate)} fake)\n${p.recommendation}`).join("\n\n")}\n\n💡 **نصيحة عامة:**\n• وقف الإعلانات ديال المنتجات اللي fake rate > 50%\n• راجع targeting ديال الإعلانات\n• جرب تقلل الميزانية ف المنتجات المتوسطة`;
      }
      return `✅ **ما كاينش مشاكل كبيرة!**\n\n🎯 **نصائح للتحسين:**\n• زود الميزانية ف المنتجات اللي fake rate < 15%\n• راقب المنتجات اللي fake rate بين 15-30%\n• استمر ف التحسين!`;
    }

    if (q.includes("أحسن") || q.includes("best") || q.includes("ممتاز") || q.includes("top")) {
      if (bestProducts.length === 0) {
        return "ما كاينش منتجات ممتازة حالياً. كلشي عندو مشاكل.";
      }
      return `🏆 **أحسن المنتجات:**\n\n${bestProducts.slice(0, 5).map((p, i) => `${i + 1}. **${p.productName}**\n   • Revenue: ${formatCurrency(p.revenue)}\n   • Fake Rate: ${formatPercentage(p.fakeRate)}\n   • ${p.recommendation}`).join("\n\n")}`;
    }

    if (q.includes("أسوأ") || q.includes("worst") || q.includes("خايب") || q.includes("مشكل")) {
      if (worstProducts.length === 0) {
        return "✅ ما كاينش منتجات خايبة! كلشي مزيان.";
      }
      return `⚠️ **المنتجات اللي عندها مشاكل:**\n\n${worstProducts.slice(0, 5).map((p, i) => `${i + 1}. **${p.productName}**\n   • Fake Rate: ${formatPercentage(p.fakeRate)}\n   • Fake Orders: ${formatNumber(p.fakeOrders)}/${formatNumber(p.totalOrders)}\n   • ${p.recommendation}`).join("\n\n")}`;
    }

    if (q.includes("ملخص") || q.includes("summary") || q.includes("overview")) {
      const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
      const totalFake = products.reduce((s, p) => s + p.fakeOrders, 0);
      const totalOrders = products.reduce((s, p) => s + p.totalOrders, 0);
      return `📊 **ملخص عام:**\n\n• **Total Products:** ${formatNumber(products.length)}\n• **Total Revenue:** ${formatCurrency(totalRevenue)}\n• **Total Orders:** ${formatNumber(totalOrders)}\n• **Fake Orders:** ${formatNumber(totalFake)} (${formatPercentage(totalOrders > 0 ? totalFake / totalOrders : 0)})\n\n🎯 **التوزيع:**\n• 🟢 Safe (< 15%): ${products.filter((p) => p.riskLevel === "safe").length}\n• 🟡 Low (15-30%): ${products.filter((p) => p.riskLevel === "low").length}\n• 🟠 Medium (30-50%): ${products.filter((p) => p.riskLevel === "medium").length}\n• 🔴 High (> 50%): ${highRisk.length}`;
    }

    return `ما فهمتش السؤال. جرب تسولني على:\n\n• **المنتجات**: \"علاش هاد المنتج عندو fake rate عالية؟\"\n• **الستوك**: \"شحال باقي ف الستوك؟\"\n• **النصائح**: \"شنو ندير؟\"\n• **التحليل**: \"شنو أحسن منتج؟\" أو \"شنو أسوأ منتج؟\"\n• **الملخص**: \"عطيني ملخص\"`;
  };

  const handleSend = () => {
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

    setTimeout(() => {
      const response = generateResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch} hasData={!!data}>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-[#0891B2]/20">
            <Bot className="w-6 h-6 text-[#22D3EE]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Agent</h1>
            <p className="text-[#606060] text-xs">سولني على المنتجات، الستوك، والنصائح</p>
          </div>
        </div>

        <Card hover={false} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06B6D4]/20 to-[#0891B2]/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#22D3EE]" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[#06B6D4] text-white"
                      : "bg-[#1F1F1F] text-[#e0e0e0]"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-xs mt-1 ${msg.role === "user" ? "text-white/70" : "text-[#606060]"}`}>
                    {msg.timestamp.toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-[#1F1F1F] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#e0e0e0]" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06B6D4]/20 to-[#0891B2]/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#22D3EE]" />
                </div>
                <div className="bg-[#1F1F1F] rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#606060] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#606060] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#606060] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#1F1F1F] p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="سولني على المنتجات، الستوك، النصائح..."
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl text-white text-sm placeholder:text-[#404040] focus:outline-none focus:border-[#06B6D4]/50 resize-none"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-4 py-3 bg-[#06B6D4] hover:bg-[#0891B2] disabled:bg-[#1F1F1F] disabled:text-[#404040] text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => setInput("شنو أحسن منتج؟")}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2a2a2a] text-[#e0e0e0] text-xs rounded-lg transition-all"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                أحسن منتج
              </button>
              <button
                onClick={() => setInput("شنو أسوأ منتج؟")}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2a2a2a] text-[#e0e0e0] text-xs rounded-lg transition-all"
              >
                <TrendingDown className="w-3 h-3 inline mr-1" />
                أسوأ منتج
              </button>
              <button
                onClick={() => setInput("شحال باقي ف الستوك؟")}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2a2a2a] text-[#e0e0e0] text-xs rounded-lg transition-all"
              >
                <Package className="w-3 h-3 inline mr-1" />
                الستوك
              </button>
              <button
                onClick={() => setInput("شنو ندير؟")}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2a2a2a] text-[#e0e0e0] text-xs rounded-lg transition-all"
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
