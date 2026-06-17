import { useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Spinner } from "../../ui/spinner";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import {
  useIntegrationStatus,
  useTestGhlConnection,
  useSaveGhlSettings,
  useDeleteGhlSettings,
} from "../../../lib/react-query/hooks/admin";

export function GhlIntegrationCard() {
  const { data: status, isLoading } = useIntegrationStatus();
  const testGhl = useTestGhlConnection();
  const saveGhl = useSaveGhlSettings();
  const deleteGhl = useDeleteGhlSettings();

  const [apiKey, setApiKey] = useState("");
  /** `null` = show server `ghl.location_id`; string = user-edited draft */
  const [locationDraft, setLocationDraft] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingKey, setEditingKey] = useState(false);

  const ghl = status?.ghl;
  const connected = Boolean(ghl?.connected);
  const showMasked = connected && !editingKey;
  const serverLocationId = ghl?.location_id ?? "";
  const locationId = locationDraft !== null ? locationDraft : serverLocationId;
  const canTest = Boolean(apiKey.trim() && locationId.trim());
  const canSave = Boolean(apiKey.trim() && locationId.trim());

  const resetForm = useCallback(() => {
    setApiKey("");
    setEditingKey(false);
    setLocationDraft(null);
    setMessage(null);
  }, []);

  const handleTest = useCallback(async () => {
    setMessage(null);
    try {
      const r = await testGhl.mutateAsync({
        api_key: apiKey.trim(),
        location_id: locationId.trim(),
      });
      setMessage({ ok: true, text: r?.location_name ? `Valid — ${r.location_name}` : "Valid — connection OK" });
    } catch (e) {
      setMessage({ ok: false, text: e?.message || "Test failed" });
    }
  }, [apiKey, locationId, testGhl]);

  const handleSave = useCallback(async () => {
    setMessage(null);
    try {
      const r = await saveGhl.mutateAsync({
        api_key: apiKey.trim(),
        location_id: locationId.trim(),
      });
      setMessage({
        ok: true,
        text: r?.location_name ? `Saved — ${r.location_name}` : "Saved",
      });
      setApiKey("");
      setEditingKey(false);
      setLocationDraft(null);
    } catch (e) {
      setMessage({ ok: false, text: e?.message || "Save failed" });
    }
  }, [apiKey, locationId, saveGhl]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Clear GoHighLevel credentials stored in WordPress? Env / secrets.php will apply if set.")) {
      return;
    }
    setMessage(null);
    try {
      await deleteGhl.mutateAsync();
      resetForm();
      setMessage({ ok: true, text: "Disconnected" });
    } catch (e) {
      setMessage({ ok: false, text: e?.message || "Disconnect failed" });
    }
  }, [deleteGhl, resetForm]);

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
            <CardTitle>GoHighLevel</CardTitle>
            <CardDescription>Private Integration token + Location ID (saved in WordPress).</CardDescription>
          </div>
          {connected ? (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Connected
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
                {ghl?.token_source || "none"} / {ghl?.location_source || "none"}
              </span>
            </p>
            <p>Database values override environment and secrets.php.</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Location API key (Private Integration Token)</label>
          {showMasked ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input readOnly value="••••••••••••••••" className="max-w-md font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingKey(true);
                  setApiKey("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <Input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste API key"
              className="max-w-md"
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Location ID</label>
          <Input
            value={locationId}
            onChange={(e) => setLocationDraft(e.target.value)}
            placeholder="Location ID"
            className="max-w-md font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testGhl.isPending || !canTest}
          >
            {testGhl.isPending ? (
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
            disabled={saveGhl.isPending || !canSave}
          >
            {saveGhl.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save & connect"
            )}
          </Button>
          {connected && (
            <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect} disabled={deleteGhl.isPending}>
              {deleteGhl.isPending ? "Clearing…" : "Disconnect"}
            </Button>
          )}
        </div>

        {ghl?.location_name ? (
          <p className="text-xs text-muted-foreground">
            Location: <span className="font-medium text-foreground">{ghl.location_name}</span>
          </p>
        ) : null}

        {message ? (
          <p className={`text-xs ${message.ok ? "text-success" : "text-error"}`}>{message.text}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
