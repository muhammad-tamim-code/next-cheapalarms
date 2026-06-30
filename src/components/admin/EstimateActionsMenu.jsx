import Image from "next/image";
import { MoreVertical, Eye, Trash2, RotateCcw, ExternalLink, Link as LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { buildGhlEstimateEditUrl, resolveGhlLocationId } from "../../lib/admin/ghl-links";

/**
 * Actions menu for estimates
 * Shows different actions based on context (active list vs trash)
 */
export function EstimateActionsMenu({
  estimateId,
  isInTrash = false,
  onViewDetails,
  onMoveToTrash,
  onRestore,
  locationId,
  linkedInvoiceId,
}) {
  // Construct URLs
  const ghlUrl = buildGhlEstimateEditUrl(estimateId, resolveGhlLocationId(locationId));
  
  const portalUrl = estimateId 
    ? `/portal?estimateId=${estimateId}`
    : null;
  
  const invoiceUrl = locationId && linkedInvoiceId
    ? `/admin/invoices?invoiceId=${linkedInvoiceId}`
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => e.stopPropagation()}
          aria-label="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onSelect={(e) => {
            e.stopPropagation();
            onViewDetails(estimateId);
          }}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}
        
        {/* Quick Links */}
        {(ghlUrl || portalUrl || invoiceUrl) && (
          <>
            <DropdownMenuSeparator />
            {ghlUrl && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  window.open(ghlUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <Image src="/brand/ghl-logo.png" alt="" width={16} height={16} className="mr-2 shrink-0 rounded-sm" />
                View in GHL
              </DropdownMenuItem>
            )}
            {portalUrl && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  window.open(portalUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                View Portal
              </DropdownMenuItem>
            )}
            {invoiceUrl && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  window.location.href = invoiceUrl;
                }}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Related Invoice
              </DropdownMenuItem>
            )}
          </>
        )}

        {isInTrash ? (
          <>
            {onViewDetails && <DropdownMenuSeparator />}
            {onRestore && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  onRestore(estimateId, locationId);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <>
            {onViewDetails && <DropdownMenuSeparator />}
            {onMoveToTrash && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  onMoveToTrash(estimateId, locationId);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Move to Trash
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

