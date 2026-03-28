// supabase/functions/create-payment/index.ts
// Proxies OxaPay payment creation — key never reaches browser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // OxaPay key stored securely in Supabase env — never in frontend code
    const OXAPAY_KEY = Deno.env.get("OXAPAY_MERCHANT_KEY");
    if (!OXAPAY_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, currency = "USDT", description, orderId } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.oxapay.com/merchants/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: OXAPAY_KEY,
        amount,
        currency,
        lifeTime: 60,
        feePaidByPayer: 1,
        underPaidCover: 2.5,
        description: description || "HoldPay Payment",
        orderId: orderId || `hp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        returnUrl: "https://myholdpay.vercel.app/dashboard.html",
        callbackUrl: "https://myholdpay.vercel.app/api/webhook",
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
