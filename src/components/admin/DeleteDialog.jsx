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

export function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  isLoading,
  showScopeSelection = true,
  scope = 'local',
  onScopeChange,
  trashMode = false,
}) {
  const dialogTitle = trashMode ? (title || 'Move to Trash') : (title || 'Delete Item');
  const dialogDescription = trashMode
    ? description || `This estimate will be moved to trash and can be restored within 30 days. After 30 days, it will be permanently deleted.`
    : description || `Are you sure you want to delete ${itemName}? This action cannot be undone.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {trashMode ? (
              <div className="rounded-full bg-warning/10 p-2">
                <Trash2 className="h-5 w-5 text-warning" />
              </div>
            ) : (
              <div className="rounded-full bg-error/10 p-2">
                <AlertCircle className="h-5 w-5 text-error" />
              </div>
            )}
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>{dialogDescription}</p>
            {trashMode && (
              <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info-bg/50 p-3 mt-3">
                <AlertCircle className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                <p className="text-xs text-info">
                  <strong>Note:</strong> You can restore this estimate from the Trash tab within 30 days.
                </p>
              </div>
            )}
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
            disabled={isLoading}
            className={trashMode 
              ? "bg-warning text-warning-foreground hover:bg-warning/90"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {isLoading 
              ? (trashMode ? 'Moving to trash...' : 'Deleting...') 
              : (trashMode ? 'Move to Trash' : 'Delete')
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

