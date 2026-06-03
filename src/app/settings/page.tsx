"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Save, Shield, Key, Globe, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, DollarSign, ChevronRight, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { saveCredentials, clearCredentials, getApiConfig, api } from "@/services";
import type { AuthCredentials } from "@/types";

const GROQ_KEY = "groq_api_key";

export default function SettingsPage() {
  const [creds, setCreds] = useState<AuthCredentials>({
    apiUrl: "https://api.codinafrica.com/api",
    token: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [groqKey, setGroqKey] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqSaved, setGroqSaved] = useState(false);

  useEffect(() => {
    const config = getApiConfig();
    setCreds({ apiUrl: config.apiUrl, token: config.token });
    const stored = localStorage.getItem(GROQ_KEY);
    if (stored) setGroqKey(stored);
  }, []);

  const handleSave = useCallback(() => {
    saveCredentials(creds);
    api.refreshConfig();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [creds]);

  const handleClear = useCallback(() => {
    clearCredentials();
    api.refreshConfig();
    setCreds({ apiUrl: "https://api.codinafrica.com/api", token: "" });
  }, []);

  const handleSaveGroq = useCallback(() => {
    localStorage.setItem(GROQ_KEY, groqKey);
    setGroqSaved(true);
    setTimeout(() => setGroqSaved(false), 2000);
  }, [groqKey]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${creds.apiUrl}/orders/search?limit=1`, {
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": creds.token,
        },
      });
      if (res.ok) {
        setTestResult({ success: true, message: "Connection successful! API is working." });
      } else {
        const body = await res.text();
        setTestResult({ success: false, message: `Failed: ${res.status} - ${body.substring(0, 100)}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: `Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setTesting(false);
    }
  }, [creds]);

  const inputClass = "w-full bg-[#111827] border border-[#1F2937] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/20 transition-all duration-200 text-sm px-3 py-2.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card hover={false}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#6366F1]/10">
              <Shield className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <CardTitle>API Credentials</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-5">
          <div>
            <label className="block text-[#94A3B8] text-sm font-medium mb-1.5">
              <Globe className="w-4 h-4 inline mr-1.5" />
              API URL
            </label>
            <input
              type="text"
              value={creds.apiUrl}
              onChange={(e) => setCreds((c) => ({ ...c, apiUrl: e.target.value }))}
              placeholder="https://api.codinafrica.com/api"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[#94A3B8] text-sm font-medium mb-1.5">
              <Key className="w-4 h-4 inline mr-1.5" />
              X-Auth-Token
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={creds.token}
                onChange={(e) => setCreds((c) => ({ ...c, token: e.target.value }))}
                placeholder="Enter your API authentication token"
                className={inputClass + " pr-10"}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors duration-200"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-[0_0_16px_rgba(99,102,241,0.2)] hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]"
            >
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save Credentials"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !creds.token}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#111827] border border-[#1F2937] hover:border-[#6366F1]/30 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg transition-all duration-200 text-sm font-medium border border-[#ef4444]/20"
            >
              Clear
            </button>
          </div>

          {testResult && (
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${
              testResult.success ? "bg-[#10b981]/5 border-[#10b981]/20" : "bg-[#ef4444]/5 border-[#ef4444]/20"
            }`}>
              {testResult.success
                ? <CheckCircle className="w-5 h-5 text-[#10b981] mt-0.5 shrink-0" />
                : <AlertCircle className="w-5 h-5 text-[#ef4444] mt-0.5 shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${testResult.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                  {testResult.success ? "Success" : "Error"}
                </p>
                <p className="text-[#94A3B8] text-sm mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Link href="/settings/fees" className="block group">
        <Card hover={false} className="hover:border-[#6366F1]/30 transition-all duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#10b981]/10">
                  <DollarSign className="w-5 h-5 text-[#10b981]" />
                </div>
                <CardTitle>Country Service Fees</CardTitle>
              </div>
              <ChevronRight className="w-5 h-5 text-[#64748B] group-hover:text-white transition-colors duration-200" />
            </div>
          </CardHeader>
          <p className="text-[#94A3B8] text-sm">
            Configure CodinAfrica service fee percentages per country to calculate net revenue and track real profitability.
          </p>
        </Card>
      </Link>

      <Card hover={false}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#10b981]/10">
              <Bot className="w-5 h-5 text-[#10b981]" />
            </div>
            <CardTitle>AI Agent - Groq API</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-5">
          <p className="text-[#94A3B8] text-sm">
            AI Agent كيستعمل Groq API (مجاني) باش يجاوبك بحال ChatGPT. سجل ف <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:underline">console.groq.com</a> باش تاخد API key مجاني.
          </p>
          <div>
            <label className="block text-[#94A3B8] text-sm font-medium mb-1.5">
              <Key className="w-4 h-4 inline mr-1.5" />
              Groq API Key
            </label>
            <div className="relative">
              <input
                type={showGroqKey ? "text" : "password"}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className={inputClass + " pr-10"}
              />
              <button
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors duration-200"
              >
                {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleSaveGroq}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-all duration-200 text-sm font-medium"
          >
            {groqSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {groqSaved ? "Saved!" : "Save Groq Key"}
          </button>
        </div>
      </Card>

      <Card hover={false}>
        <CardHeader>
          <CardTitle>About COD Analytics</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-[#94A3B8]">
          <p>
            This dashboard connects to the <strong className="text-white">CodinAfrica API</strong> to provide real-time analytics
            for your Cash on Delivery e-commerce business across Africa.
          </p>
          <p>All data is fetched live. Credentials are stored locally in your browser only.</p>
          <div className="bg-[#0B0F19] rounded-lg p-4 space-y-1.5">
            <p className="text-[#64748B] text-xs font-medium uppercase tracking-wider">Available endpoints</p>
            <code className="block text-[#8B5CF6] text-xs font-mono">GET /orders/search?limit=500</code>
            <code className="block text-[#8B5CF6] text-xs font-mono">GET /warehouses/search?limit=50</code>
          </div>
        </div>
      </Card>
    </div>
  );
}
