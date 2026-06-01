"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Shield, Key, Globe, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { saveCredentials, clearCredentials, getApiConfig } from "@/services";
import type { AuthCredentials } from "@/types";

export default function SettingsPage() {
  const [creds, setCreds] = useState<AuthCredentials>({
    apiUrl: "https://api.codinafrica.com/api",
    token: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const config = getApiConfig();
    setCreds({ apiUrl: config.apiUrl, token: config.token });
  }, []);

  const handleSave = useCallback(() => {
    saveCredentials(creds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [creds]);

  const handleClear = useCallback(() => {
    clearCredentials();
    setCreds({ apiUrl: "https://api.codinafrica.com/api", token: "" });
  }, []);

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

  const inputClass = "w-full bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-accent-500 transition-colors text-sm px-3 py-2.5 pr-10";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-400" />
            <CardTitle>API Credentials</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-5">
          <div>
            <label className="block text-dark-300 text-sm font-medium mb-1.5">
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
            <label className="block text-dark-300 text-sm font-medium mb-1.5">
              <Key className="w-4 h-4 inline mr-1.5" />
              X-Auth-Token
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={creds.token}
                onChange={(e) => setCreds((c) => ({ ...c, token: e.target.value }))}
                placeholder="Enter your API authentication token"
                className={inputClass}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save Credentials"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !creds.token}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <div className="w-4 h-4 border-2 border-dark-400 border-t-white rounded-full animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-error/20 hover:bg-error/30 text-error rounded-lg transition-colors text-sm font-medium"
            >
              Clear
            </button>
          </div>

          {testResult && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              testResult.success ? "bg-success/10 border border-success/20" : "bg-error/10 border border-error/20"
            }`}>
              {testResult.success ? <CheckCircle className="w-5 h-5 text-success mt-0.5" /> : <AlertCircle className="w-5 h-5 text-error mt-0.5" />}
              <div>
                <p className={`text-sm font-medium ${testResult.success ? "text-success" : "text-error"}`}>
                  {testResult.success ? "Success" : "Error"}
                </p>
                <p className="text-dark-300 text-sm mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About COD Analytics</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-dark-300">
          <p>
            This dashboard connects to the <strong className="text-white">CodinAfrica API</strong> to provide real-time analytics
            for your Cash on Delivery e-commerce business across Africa.
          </p>
          <p>All data is fetched live. Credentials are stored locally in your browser only.</p>
          <div className="bg-dark-900 rounded-lg p-4 space-y-1">
            <p className="text-dark-400 text-xs">Available endpoints:</p>
            <code className="block text-accent-300 text-xs font-mono">GET /orders/search?limit=500</code>
            <code className="block text-accent-300 text-xs font-mono">GET /warehouses/search?limit=50</code>
          </div>
        </div>
      </Card>
    </div>
  );
}
