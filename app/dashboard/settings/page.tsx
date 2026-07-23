"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link2, Unlink } from "lucide-react";

type RiskLevel = "conservative" | "moderate" | "aggressive";

export default function SettingsPage() {
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");
  const [investmentCap, setInvestmentCap] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialState, setInitialState] = useState({
    riskLevel: "moderate" as RiskLevel,
    investmentCap: "",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          const loadedRisk = (data.risk_level as RiskLevel) || "moderate";
          const loadedCap = data.investment_cap?.toString() ?? "";
          setRiskLevel(loadedRisk);
          setInvestmentCap(loadedCap);
          setIsConnected(data.brokerage_connected ?? false);
          setInitialState({
            riskLevel: loadedRisk,
            investmentCap: loadedCap,
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const hasChanges =
    riskLevel !== initialState.riskLevel ||
    investmentCap !== initialState.investmentCap;

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_level: riskLevel,
          investment_cap: investmentCap ? parseFloat(investmentCap) : null,
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to save settings" }));
        setSaveError(err.error ?? "Failed to save settings");
        return;
      }
      const saved = await res.json();
      setInitialState({
        riskLevel: saved.risk_level,
        investmentCap: saved.investment_cap?.toString() ?? "",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (_err) {
      setSaveError("Network error. Please try again.");
    }
  };

  const handleConnect = () => {
    alert("Brokerage connection is not yet implemented.");
  };

  const handleDisconnect = () => {
    alert("Brokerage disconnection is not yet implemented.");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Risk Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select
              value={riskLevel}
              onValueChange={(v) => setRiskLevel(v as RiskLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Investment Cap ($)</Label>
            <Input
              type="number"
              value={investmentCap}
              onChange={(e) => setInvestmentCap(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          {saveError && (
            <p className="text-red-500 text-sm">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-green-500 text-sm">
              Settings saved successfully.
            </p>
          )}
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Brokerage Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alpaca</p>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "Connected" : "Not connected"}
              </p>
            </div>
            {isConnected ? (
              <Button variant="outline" onClick={handleDisconnect}>
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect}>
                <Link2 className="w-4 h-4 mr-2" />
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
