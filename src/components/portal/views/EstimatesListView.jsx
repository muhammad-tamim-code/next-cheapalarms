import { ArrowRight } from "lucide-react";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/spinner";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../ui/select";
import { formatAddress } from "../utils/portal-utils";

import { useState } from "react";
import { CheckCircle, Clock, AlertCircle, FileText, X } from "lucide-react";

const statusIcons = {
  sent: Clock,
  under_review: AlertCircle,
  accepted: CheckCircle,
  rejected: X,
};

const statusColors = {
  sent: "text-warning bg-warning-bg border-warning/30",
  under_review: "text-info bg-info-bg border-info/30",
  accepted: "text-success bg-success-bg border-success/30",
  rejected: "text-error bg-error-bg border-error/30",
};

export function EstimatesListView({ estimates, loading, error, onSelectEstimate, resumeEstimate }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedEstimate = estimates[selectedIndex];
  const selectedStatus = selectedEstimate?.status || "sent";
  const StatusIcon = statusIcons[selectedStatus] || FileText;
  const statusColor = statusColors[selectedStatus] || statusColors.sent;
  
  const selectedEstimateId = selectedEstimate?.estimateId || selectedEstimate?.id || String(selectedIndex);

  return (
    <div className="rounded-xl border-2 border-border bg-surface p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">My estimates</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Select a project</h1>
          <p className="text-sm text-muted-foreground">
            Pick an estimate to continue. We&apos;ll remember your last viewed site for next time.
          </p>
        </div>
        {resumeEstimate && (
          <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-right shadow-inner">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Resume last viewed</p>
            <p className="text-sm font-semibold text-foreground">
              {resumeEstimate.label || `Estimate #${resumeEstimate.number || resumeEstimate.estimateId}`}
            </p>
            <Button
              type="button"
              onClick={() => onSelectEstimate(resumeEstimate.estimateId || resumeEstimate.id)}
              variant="outline"
              size="sm"
              className="mt-2 rounded-full uppercase tracking-[0.3em]"
            >
              Resume <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-error/30 bg-error-bg p-4 text-error">
          <p className="text-sm font-semibold">Error loading estimates</p>
          <p className="text-xs text-error">{error}</p>
        </div>
      ) : estimates.length > 0 ? (
        <>
          {/* Estimate Switcher Dropdown */}
          <div className="mt-6">
            <Select 
              value={String(selectedEstimateId)}
              onValueChange={(value) => {
                const idx = estimates.findIndex(est => 
                  String(est.estimateId || est.id) === value
                );
                if (idx !== -1) {
                  setSelectedIndex(idx);
                  onSelectEstimate(estimates[idx].estimateId || estimates[idx].id);
                }
              }}
            >
              <SelectTrigger className="w-full px-4 py-3 rounded-xl border-2 h-auto">
                <SelectValue>
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-lg ${statusColor.split(" ")[1]} ${statusColor.split(" ")[2]}`}>
                      <StatusIcon className={`h-4 w-4 ${statusColor.split(" ")[0]}`} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-foreground">
                        {selectedEstimate?.label || `Estimate #${selectedEstimate?.number || selectedEstimate?.estimateId || selectedIndex + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAddress(selectedEstimate?.address || selectedEstimate?.meta?.address) || "Site address pending"}
                      </p>
                    </div>
                  </div>
                </SelectValue>
              </SelectTrigger>
              
              <SelectContent className="w-full rounded-xl border-2 border-border shadow-2xl p-0">
                {estimates.map((estimate, idx) => {
                  const estId = estimate.estimateId || estimate.id;
                  const estStatus = estimate.status || "sent";
                  const EstStatusIcon = statusIcons[estStatus] || FileText;
                  const estStatusColor = statusColors[estStatus] || statusColors.sent;
                  const isSelected = idx === selectedIndex;

                  return (
                    <SelectItem 
                      key={estId} 
                      value={String(estId)}
                      className={`px-4 py-3 h-auto rounded-none ${
                        isSelected 
                          ? "border-l-4 border-primary bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground" 
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`p-2 rounded-lg ${estStatusColor.split(" ")[1]} ${estStatusColor.split(" ")[2]}`}>
                          <EstStatusIcon className={`h-4 w-4 ${estStatusColor.split(" ")[0]}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">
                            {estimate.label || `Estimate #${estimate.number || estId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatAddress(estimate.address || estimate.meta?.address) || "Site address pending"}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Estimate Details */}
          {selectedEstimate && (
            <div className="mt-6 p-4 rounded-xl border-2 border-border bg-gradient-to-br from-surface to-muted">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusColor}`}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold capitalize">{selectedStatus.replace("_", " ")}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatAddress(selectedEstimate.address || selectedEstimate.meta?.address) || "Pending"}
                  </span>
                </div>
                {selectedEstimate.total != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      ${selectedEstimate.total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Estimates Summary */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
              All Estimates ({estimates.length})
            </p>
            <div className="space-y-2">
              {estimates.map((estimate, idx) => {
                const estId = estimate.estimateId || estimate.id;
                const estStatus = estimate.status || "sent";
                const EstStatusIcon = statusIcons[estStatus] || FileText;
                const estStatusColor = statusColors[estStatus] || statusColors.sent;
                
                return (
                  <div
                    key={estId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition cursor-pointer"
                    onClick={() => {
                      setSelectedIndex(idx);
                      onSelectEstimate(estId);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <EstStatusIcon className={`h-4 w-4 ${estStatusColor.split(" ")[0]}`} />
                      <span className="text-sm font-semibold text-foreground">
                        {estimate.label || `Estimate #${estimate.number || estId}`}
                      </span>
                    </div>
                    {estimate.total != null && (
                      <span className="text-sm font-semibold text-muted-foreground">
                        ${estimate.total.toLocaleString("en-AU")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-muted p-6 text-center">
          <p className="text-sm text-muted-foreground">No estimates found. Check back later for updates.</p>
        </div>
      )}
    </div>
  );
}

