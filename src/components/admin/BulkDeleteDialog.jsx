import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Radio } from "../ui/radio";
import { AlertCircle, Trash2 } from "lucide-react";

export function BulkDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  itemCount = 0,
  isLoading = false,
  showScopeSelection = true,
  scope = 'local',
  onScopeChange,
  itemType = 'Item',
  trashMode = false,
}) {
  const itemTypeLower = itemType.toLowerCase();
  const itemTypePlural = itemCount !== 1 ? `${itemType}s` : itemType;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-warning/10 p-2">
              <Trash2 className="h-5 w-5 text-warning" />
            </div>
            <AlertDialogTitle>Delete {itemCount} {itemTypePlural}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 space-y-2">
            <p>
              {trashMode && (scope === 'both' || scope === 'local')
                ? `This will move ${itemCount} ${itemTypeLower}${itemCount !== 1 ? 's' : ''} to trash. You can restore them from the Trash tab within 30 days.`
                : `This will permanently delete ${itemCount} ${itemTypeLower}${itemCount !== 1 ? 's' : ''}${scope === 'ghl' ? ' from GoHighLevel' : ''}. This action cannot be undone.`}
            </p>
            {trashMode && (scope === 'both' || scope === 'local') ? (
              <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info-bg/50 p-3 mt-3">
                <AlertCircle className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                <p className="text-xs text-info">
                  <strong>Note:</strong> You can restore these {itemTypeLower}s from the Trash tab within 30 days.
                </p>
              </div>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {showScopeSelection && (
          <div className="py-4">
            <label className="text-sm font-medium mb-3 block">Delete from:</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Radio
                  id="scope-local"
                  name="delete-scope"
                  value="local"
                  checked={scope === 'local'}
                  onChange={(e) => onScopeChange(e.target.value)}
                />
                <label htmlFor="scope-local" className="cursor-pointer text-sm">
                  WordPress only (local database)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Radio
                  id="scope-ghl"
                  name="delete-scope"
                  value="ghl"
                  checked={scope === 'ghl'}
                  onChange={(e) => onScopeChange(e.target.value)}
                />
                <label htmlFor="scope-ghl" className="cursor-pointer text-sm">
                  GoHighLevel only
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Radio
                  id="scope-both"
                  name="delete-scope"
                  value="both"
                  checked={scope === 'both'}
                  onChange={(e) => onScopeChange(e.target.value)}
                />
                <label htmlFor="scope-both" className="cursor-pointer text-sm font-medium">
                  Both (WordPress + GoHighLevel)
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {scope === 'both' && (
                <span className="text-warning">
                  ⚠️ If GHL deletion fails, local deletion will be skipped (fail-closed).
                </span>
              )}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading || itemCount === 0}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Deleting...</span>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </>
            ) : (
              `Delete ${itemCount} ${itemTypePlural}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

