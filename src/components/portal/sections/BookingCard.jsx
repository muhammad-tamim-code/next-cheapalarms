import { useState, useEffect } from "react";
import { Calendar, Clock, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Alert, AlertDescription, AlertIcon, AlertTitle } from "../../ui/alert";
import { DatePicker, DatePickerTrigger, DatePickerContent } from "../../ui/date-picker";
import { TimePicker, TimePickerTrigger, TimePickerContent } from "../../ui/time-picker";
import { Spinner } from "../../ui/spinner";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { getWpNonceSafe } from "../../../lib/api/get-wp-nonce";
import { formatDate } from "../../../lib/utils/date-utils";
import { formatTime } from "../../../lib/utils/time-utils";

/**
 * BookingCard Component
 * 
 * Allows customers to book installation date/time after accepting an estimate.
 * Shown when workflow.status === "accepted" and not yet booked.
 */
export function BookingCard({ estimateId, locationId, inviteToken, booking, workflow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  // Today's date after mount (minDate); must run before any conditional returns (rules-of-hooks)
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
  }, []);

  // If already booked, show confirmation
  if (booking && booking.status === 'scheduled') {
    const formatBookingDate = (dateString) => {
      if (!dateString) return 'Not set';
      try {
        // Try to parse as ISO date string or Date object
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        if (isNaN(date.getTime())) return dateString;
        return formatDate(date, 'long');
      } catch {
        return dateString;
      }
    };

    const bookingDate = booking.scheduledDate || booking.scheduledDateTime;
    const bookingTime = booking.scheduledTime;

    return (
      <Card className="shadow-elevated animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-success-bg p-3 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <CardTitle className="text-2xl">Booking Confirmed</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your installation has been scheduled successfully
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-success/30 bg-success-bg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-success/20 p-2 mt-0.5">
                <Calendar className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-success font-medium mb-1">
                  Installation Date
                </p>
                <p className="text-lg font-semibold text-success">
                  {formatBookingDate(bookingDate)}
                </p>
              </div>
            </div>
            {bookingTime && (
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-success/20 p-2 mt-0.5">
                  <Clock className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-success font-medium mb-1">
                    Preferred Time
                  </p>
                  <p className="text-lg font-semibold text-success">
                    {formatTime(bookingTime, '12h')}
                  </p>
                </div>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-success/20 p-2 mt-0.5">
                  <MessageSquare className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-success font-medium mb-1">
                    Additional Notes
                  </p>
                  <p className="text-sm text-success">{booking.notes}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show booking form if accepted but not booked
  if (workflow?.status !== 'accepted') {
    return null; // Only show when accepted
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!date) {
      setError('Please select a date');
      return;
    }
    if (!time) {
      setError('Please select a time');
      return;
    }

    setIsSubmitting(true);

    try {
      const nonce = await getWpNonceSafe({ inviteToken, estimateId }).catch((err) => {
        const msg = err?.code === 'AUTH_REQUIRED'
          ? 'Session expired. Please log in again.'
          : (err?.message || 'Failed to fetch security token.');
        setError(msg);
        toast.error('Booking failed', { description: msg });
        return null;
      });
      if (!nonce) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/portal/book-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce || '' },
        body: JSON.stringify({
          estimateId,
          locationId,
          inviteToken,
          date,
          time,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.err || 'Failed to book installation');
      }

      // Show success toast
      toast.success('Booking confirmed!', {
        description: 'Your installation has been scheduled successfully.',
        duration: 3000,
      });

      // Refresh the page after a short delay to show the toast
      setTimeout(() => {
        router.reload();
      }, 1500);
    } catch (err) {
      const errorMessage = err.message || 'Failed to book installation. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);
      toast.error('Booking failed', {
        description: errorMessage,
        duration: 4000,
      });
    }
  };

  return (
    <Card className="shadow-elevated animate-in fade-in duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-primary/15 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Schedule Installation</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Choose your preferred date and time
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Date and Time Inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Preferred Date
              </label>
              <DatePicker
                value={date}
                onValueChange={setDate}
                minDate={today}
                disabled={isSubmitting}
                className="w-full"
              >
                <DatePickerTrigger aria-label="Select installation date" />
                <DatePickerContent />
              </DatePicker>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Preferred Time
              </label>
              <TimePicker
                value={time}
                onValueChange={setTime}
                format="12h"
                interval={15}
                disabled={isSubmitting}
                className="w-full"
              >
                <TimePickerTrigger aria-label="Select installation time" />
                <TimePickerContent />
              </TimePicker>
            </div>
          </div>

          {/* Notes Section - Collapsible */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-primary transition-colors"
              aria-expanded={showNotes}
            >
              <span>Additional Notes (Optional)</span>
              <span className="text-muted-foreground">{showNotes ? '−' : '+'}</span>
            </button>
            {showNotes && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or access details..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Additional Notes"
                />
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="error" className="animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertIcon variant="error" />
              <AlertTitle>Booking Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !date || !time}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Booking...
              </>
            ) : (
              <>
                Confirm Booking <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

