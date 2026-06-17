import { useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Spinner } from "../../ui/spinner";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import {
  useIntegrationStatus,
  useTestStripeConnection,
  useSaveStripeSettings,
  useDeleteStripeSettings,
} from "../../../lib/react-query/hooks/admin";

export function StripeIntegrationCard() {
  const { data: status, isLoading } = useIntegrationStatus();
  const testStripe = useTestStripeConnection();
  const saveStripe = useSaveStripeSettings();
  const deleteStripe = useDeleteStripeSettings();

  const [secretKey, setSecretKey] = useState("");
  const [publishableDraft, setPublishableDraft] = useState(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [editingSecret, setEditingSecret] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [message, setMessage] = useState(null);

  const stripe = status?.stripe;
  const connected = Boolean(stripe?.connected);
  const showMaskedSecret = connected && !editingSecret;
  const showMaskedWebhook = Boolean(stripe?.has_webhook_secret) && !editingWebhook;
  const serverPublishable = stripe?.publishable_key ?? "";
  const publishableKey = publishableDraft !== null ? publishableDraft : serverPublishable;
  const canTest = Boolean(secretKey.trim());
  const canSave = Boolean(secretKey.trim());

  const resetForm = useCallback(() => {
    setSecretKey("");
    setWebhookSecret("");
    setPublishableDraft(null);
    setEditingSecret(false);
    setEditingWebhook(false);
    setMessage(null);
  }, []);

  const handleTest = useCallback(async () => {
    setMessage(null);
    try {
      const r = await testStripe.mutateAsync({
        secret_key: secretKey.trim(),
        publishable_key: publishableKey.trim(),
      });
      const label = r?.account_name ? `${r.account_name}` : (r?.account_id || "connected");
      setMessage({ ok: true, text: `Valid — ${label}${r?.mode ? ` (${r.mode} mode)` : ""}` });
    } catch (e) {
      setMessage({ ok: false, text: e?.message || "Test failed" });
    }
  }, [secretKey, publishableKey, testStripe]);

  const handleSave = useCallback(async () => {
    setMessage(null);
    try {
      const r = await saveStripe.mutateAsync({
        secret_key: secretKey.trim(),
        publishable_key: publishableKey.trim(),
        webhook_secret: webhookSecret.trim(),
      });
      const label = r?.account_name ? `${r.account_name}` : (r?.account_id || "saved");
      setMessage({ ok: true, text: `Saved — ${label}${r?.mode ? ` (${r.mode} mode)` : ""}` });
      setSecretKey("");
      setWebhookSecret("");
      setEditingSecret(false);
      setEditingWebhook(false);
      setPublishableDraft(null);
    } catch (e) {
      setMessage({ ok: false, text: e?.message || "Save failed" });
    }
  }, [secretKey, publishableKey, webhookSecret, saveStripe]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Clear Stripe credentials stored in WordPress? Env / secrets.php will apply if set.")) {
      return;
    }
    setMessage(null);
    try {
      await deleteStripe.mutateAsync();
      resetForm();
      setMessage({ ok: true, text: "Disconnected" });
    } catch (e) {
      setMessage({ ok: false, text: e?.message || "Disconnect failed" });
    }
  }, [deleteStripe, resetForm]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading integrations…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Stripe</CardTitle>
            <CardDescription>Card payments. Secret key, publishable key, and webhook signing secret.</CardDescription>
          </div>
          {connected ? (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              {stripe?.mode ? `Connected (${stripe.mode})` : "Connected"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-4 w-4" />
              Not set
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Active credential source:{" "}
              <span className="font-medium text-foreground">
                secret {stripe?.secret_key_source || "none"} / publishable {stripe?.publishable_key_source || "none"} / webhook {stripe?.webhook_secret_source || "none"}
              </span>
            </p>
            <p>Database values override environment and secrets.php.</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Secret key (sk_live_… or sk_test_…)</label>
          {showMaskedSecret ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input readOnly value="••••••••••••••••" className="max-w-md font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSecret(true);
                  setSecretKey("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <Input
              type="password"
              autoComplete="off"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Paste secret key"
              className="max-w-md"
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Publishable key (pk_live_… or pk_test_…)</label>
          <Input
            value={publishableKey}
            onChange={(e) => setPublishableDraft(e.target.value)}
            placeholder="pk_test_…"
            className="max-w-md font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Webhook signing secret (whsec_…) <span className="text-muted-foreground">— optional</span>
          </label>
          {showMaskedWebhook ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input readOnly value="••••••••••••••••" className="max-w-md font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingWebhook(true);
                  setWebhookSecret("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <Input
              type="password"
              autoComplete="off"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_…"
              className="max-w-md"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testStripe.isPending || !canTest}
          >
            {testStripe.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Testing…
              </>
            ) : (
              "Test connection"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saveStripe.isPending || !canSave}
          >
            {saveStripe.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save & connect"
            )}
          </Button>
          {connected && (
            <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect} disabled={deleteStripe.isPending}>
              {deleteStripe.isPending ? "Clearing…" : "Disconnect"}
            </Button>
          )}
        </div>

        {stripe?.account_name ? (
          <p className="text-xs text-muted-foreground">
            Account: <span className="font-medium text-foreground">{stripe.account_name}</span>
          </p>
        ) : null}

        {message ? (
          <p className={`text-xs ${message.ok ? "text-success" : "text-error"}`}>{message.text}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
