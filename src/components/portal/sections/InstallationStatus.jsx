import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { apiFetch } from "../../../lib/api/apiFetch";

export default function InstallationStatus({ estimateId }) {
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(0);
  const cacheTimeoutRef = useRef(null);

  // Caching strategy: Only fetch if cache is stale (30 seconds) or on mount
  const CACHE_TTL = 30000; // 30 seconds
  const POLL_INTERVAL = 60000; // Poll every 60 seconds if job is active

  // Initial fetch and setup
  useEffect(() => {
    if (!estimateId) return;

    const fetchJobStatus = async (forceRefresh = false) => {
      const now = Date.now();
      
      // Check cache - don't fetch if data is fresh and not forcing refresh
      if (!forceRefresh && (now - lastFetchRef.current) < CACHE_TTL) {
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // First, get the job UUID from estimate ID (this reads from WordPress meta, not ServiceM8)
        let linkData;
        try {
          linkData = await apiFetch(`/api/servicem8/jobs/link?estimateId=${encodeURIComponent(estimateId)}`);
        } catch {
          // No job linked yet or API error - this is fine
          setLoading(false);
          return;
        }

        if (!linkData.ok || !linkData.link?.jobUuid) {
          setLoading(false);
          return;
        }

        const jobUuid = linkData.link.jobUuid;

        // Fetch job details (only if cache expired or forcing refresh)
        const jobData = await apiFetch(`/api/servicem8/jobs/${jobUuid}`);
        if (jobData.ok) {
          setJob(jobData.job);
        }

        // Fetch job activities (scheduling)
        try {
          const activitiesData = await apiFetch(`/api/servicem8/jobs/${jobUuid}/activities`);
          if (activitiesData.ok && activitiesData.activities) {
            setActivities(Array.isArray(activitiesData.activities) ? activitiesData.activities : [activitiesData.activities]);
          }
        } catch {
          // Activities are optional - ignore errors
        }

        lastFetchRef.current = now;
      } catch (err) {
        console.error("Error fetching job status:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchJobStatus(true);

    // Cleanup on unmount
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [estimateId]);

  // Separate effect for polling active jobs (recursive: reschedule after each fetch)
  useEffect(() => {
    if (!job?.status || job.status === 'Completed' || job.status === 'Cancelled') return;

    let timer;
    const poll = async () => {
      try {
        const linkData = await apiFetch(`/api/servicem8/jobs/link?estimateId=${encodeURIComponent(estimateId)}`);
        if (!linkData.ok || !linkData.link?.jobUuid) return;

        const jobUuid = linkData.link.jobUuid;
        const jobData = await apiFetch(`/api/servicem8/jobs/${jobUuid}`);
        if (jobData.ok) {
          setJob(jobData.job);
          lastFetchRef.current = Date.now();
        }
      } catch (err) {
        // ignore
      }
      timer = setTimeout(poll, POLL_INTERVAL);
    };
    timer = setTimeout(poll, POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [job?.status, estimateId]);

  const getStatusColor = (status) => {
    const colors = {
      "In Progress": "bg-info/10 text-info border-info/20",
      "Scheduled": "bg-secondary/10 text-secondary border-secondary/20",
      "Quote": "bg-warning/10 text-warning border-warning/20",
      "Completed": "bg-success/10 text-success border-success/20",
      "Cancelled": "bg-error/10 text-error border-error/20",
    };
    return colors[status] || colors.Quote;
  };

  // SSR-safe date formatting (consistent between server and client)
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      // Use UTC methods for consistency
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getUTCMonth()];
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimeRange = (start, end) => {
    if (!start) return null;
    const startFormatted = formatDate(start);
    if (!end) return startFormatted;
    const endFormatted = formatDate(end);
    // Extract just time from end (SSR-safe)
    try {
      const endDate = new Date(end);
      const hours = String(endDate.getUTCHours()).padStart(2, "0");
      const minutes = String(endDate.getUTCMinutes()).padStart(2, "0");
      const endTime = `${hours}:${minutes}`;
      return `${startFormatted} - ${endTime}`;
    } catch {
      return `${startFormatted} - ${formatDate(end)}`;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle>Installation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle>Installation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-error">Error loading status: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    // No job created yet - this is fine, job will be created when estimate is accepted
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle>Installation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Job will be created when estimate is accepted.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get scheduled window from activities
  const scheduledActivity = activities.find(
    (a) => a.start_date || a.scheduled_start_date
  );
  const scheduledWindow = scheduledActivity
    ? formatTimeRange(
        scheduledActivity.start_date || scheduledActivity.scheduled_start_date,
        scheduledActivity.end_date || scheduledActivity.scheduled_end_date
      )
    : null;

  // Use fallback field names for ServiceM8 API variations
  const jobStatus = job?.status || job?.job_status;
  const jobNumber = job?.job_number || job?.jobNumber;
  const assignedTechnician = job?.assigned_to_staff_name || job?.assignedToStaffName;
  const jobNotes = job?.notes || job?.job_description;

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Installation Status</span>
          {jobStatus && (
            <Badge
              variant="outline"
              className={`${getStatusColor(jobStatus)} border font-medium`}
            >
              {jobStatus}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scheduled Window */}
        {scheduledWindow && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              📅 Scheduled
            </p>
            <p className="text-sm text-muted-foreground">{scheduledWindow}</p>
          </div>
        )}

        {/* Job Details */}
        {jobNumber && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Job Number
            </p>
            <p className="text-sm text-muted-foreground">{jobNumber}</p>
          </div>
        )}

        {/* Assigned Technician */}
        {assignedTechnician && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Assigned Technician
            </p>
            <p className="text-sm text-muted-foreground">
              {assignedTechnician}
            </p>
          </div>
        )}

        {/* Notes */}
        {jobNotes && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {jobNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
