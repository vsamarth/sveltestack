<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import {
    FileIcon,
    FileTextIcon,
    ImageIcon,
    UserPlusIcon,
    UserMinusIcon,
    MailIcon,
    MailCheckIcon,
    MailXIcon,
    PencilIcon,
    Trash2Icon,
    DownloadIcon,
    FolderPlusIcon,
    FolderPenIcon,
  } from "@lucide/svelte";
  import type { WorkspaceActivityEventType } from "$lib/server/db/schema/activity";

  interface Activity {
    id: string;
    workspaceId: string;
    actorId: string;
    actorName: string;
    actorEmail: string;
    actorImage: string | null;
    eventType: WorkspaceActivityEventType;
    entityType: string | null;
    entityId: string | null;
    metadata: unknown;
    createdAt: Date;
  }

  interface Props {
    activities: Activity[];
    currentUserId: string;
  }

  let { activities, currentUserId }: Props = $props();

  function getInitials(name: string) {
    const names = name.split(" ");
    const initials = names.map((n) => n.charAt(0).toUpperCase());
    return initials.slice(0, 2).join("");
  }

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function formatFullDate(date: Date): string {
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getDateGroupKey(date: Date): string {
    const now = new Date();
    const d = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const activityDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (activityDate.getTime() === today.getTime()) return "Today";
    if (activityDate.getTime() === yesterday.getTime()) return "Yesterday";

    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  function getEventIcon(eventType: WorkspaceActivityEventType) {
    switch (eventType) {
      case "workspace.created":
        return FolderPlusIcon;
      case "workspace.renamed":
        return FolderPenIcon;
      case "workspace.deleted":
        return Trash2Icon;
      case "file.uploaded":
        return FileIcon;
      case "file.renamed":
        return PencilIcon;
      case "file.deleted":
        return Trash2Icon;
      case "file.downloaded":
        return DownloadIcon;
      case "member.added":
        return UserPlusIcon;
      case "member.removed":
        return UserMinusIcon;
      case "invite.sent":
        return MailIcon;
      case "invite.accepted":
        return MailCheckIcon;
      case "invite.cancelled":
        return MailXIcon;
      default:
        return FileIcon;
    }
  }

  function getEventIconColor(eventType: WorkspaceActivityEventType): string {
    if (
      eventType.includes("deleted") ||
      eventType.includes("removed") ||
      eventType.includes("cancelled")
    ) {
      return "text-destructive";
    }
    if (
      eventType.includes("added") ||
      eventType.includes("uploaded") ||
      eventType.includes("created") ||
      eventType.includes("accepted")
    ) {
      return "text-green-600 dark:text-green-500";
    }
    return "text-muted-foreground";
  }

  function formatEventDescription(
    activity: Activity,
    isCurrentUser: boolean,
  ): { action: string; target?: string; detail?: string } {
    const metadata = (activity.metadata || {}) as Record<string, unknown>;
    const actorName = isCurrentUser ? "You" : activity.actorName;

    switch (activity.eventType) {
      case "workspace.created":
        return { action: `${actorName} created this workspace` };

      case "workspace.renamed":
        return {
          action: `${actorName} renamed the workspace`,
          target: `${metadata.oldName} → ${metadata.newName}`,
        };

      case "workspace.deleted":
        return { action: `${actorName} deleted this workspace` };

      case "file.uploaded":
        return {
          action: `${actorName} uploaded`,
          target: metadata.filename as string,
          detail: formatFileSize(metadata.size as string),
        };

      case "file.renamed":
        return {
          action: `${actorName} renamed`,
          target: `${metadata.oldFilename} → ${metadata.newFilename}`,
        };

      case "file.deleted":
        return {
          action: `${actorName} deleted`,
          target: metadata.filename as string,
        };

      case "file.downloaded":
        return {
          action: `${actorName} downloaded`,
          target: metadata.filename as string,
        };

      case "member.added":
        return {
          action: `${actorName} joined the workspace`,
          detail: metadata.role as string,
        };

      case "member.removed":
        return {
          action: `${actorName} was removed from the workspace`,
        };

      case "invite.sent":
        return {
          action: `${actorName} invited`,
          target: metadata.inviteEmail as string,
        };

      case "invite.accepted":
        return {
          action: `${actorName} accepted the invitation`,
        };

      case "invite.cancelled":
        return {
          action: `${actorName} cancelled invite for`,
          target: metadata.inviteEmail as string,
        };

      default:
        return { action: `${actorName} performed an action` };
    }
  }

  function formatFileSize(size: string | undefined): string | undefined {
    if (!size) return undefined;
    const bytes = parseInt(size, 10);
    if (isNaN(bytes)) return undefined;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Group activities by date
  const groupedActivities = $derived.by(() => {
    const groups = new Map<string, Activity[]>();

    for (const activity of activities) {
      const key = getDateGroupKey(activity.createdAt);
      const existing = groups.get(key) || [];
      existing.push(activity);
      groups.set(key, existing);
    }

    return Array.from(groups.entries());
  });
</script>

<div class="space-y-8 w-full">
  {#each groupedActivities as [dateGroup, groupActivities], groupIndex (dateGroup)}
    <!-- Date Group -->
    <div class="relative">
      <!-- Date Header -->
      <div
        class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 mb-4 flex items-center gap-4"
      >
        <div
          class="bg-muted/50 text-muted-foreground px-3 py-1 rounded-full text-xs font-medium border border-border/50"
        >
          {dateGroup}
        </div>
        <div class="h-px flex-1 bg-border/50"></div>
      </div>

      <!-- Activities in group -->
      <div class="space-y-4 pl-2">
        {#each groupActivities as activity (activity.id)}
          {@const isCurrentUser = activity.actorId === currentUserId}
          {@const EventIcon = getEventIcon(activity.eventType)}
          {@const iconColor = getEventIconColor(activity.eventType)}
          {@const description = formatEventDescription(activity, isCurrentUser)}

          <div
            class="group relative flex gap-4 p-4 sm:p-5 bg-card border border-border/60 hover:border-border/80 rounded-xl transition-all duration-200 hover:shadow-sm"
          >
            <!-- Avatar -->
            <div class="shrink-0 relative z-10">
              <Avatar.Root
                class="size-10 sm:size-11 border-2 border-background shadow-sm"
              >
                {#if activity.actorImage}
                  <Avatar.Image
                    src={activity.actorImage}
                    alt={activity.actorName}
                  />
                {/if}
                <Avatar.Fallback
                  class="text-xs sm:text-sm font-medium bg-muted text-muted-foreground"
                >
                  {getInitials(activity.actorName)}
                </Avatar.Fallback>
              </Avatar.Root>

              <!-- Event Type Icon Badge -->
              <div
                class="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm"
              >
                <div class="bg-muted/30 rounded-full p-1">
                  <EventIcon class="size-3 {iconColor}" />
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 pt-0.5">
              <div
                class="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4"
              >
                <div class="flex-1 min-w-0 space-y-1">
                  <!-- Action description -->
                  <p class="text-sm text-foreground/90 leading-relaxed">
                    <span class="font-semibold text-foreground"
                      >{description.action}</span
                    >
                    {#if description.target}
                      <span class="font-medium text-foreground/80 mx-1">
                        {description.target}
                      </span>
                    {/if}
                  </p>

                  <!-- Detail badge -->
                  {#if description.detail}
                    <div class="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        class="bg-muted/30 text-muted-foreground font-mono text-[10px] px-1.5 h-5 border-border/50"
                      >
                        {description.detail}
                      </Badge>
                    </div>
                  {/if}
                </div>

                <!-- Timestamp -->
                <div class="shrink-0 flex items-center gap-2">
                  <time
                    datetime={new Date(activity.createdAt).toISOString()}
                    title={formatFullDate(activity.createdAt)}
                    class="text-xs text-muted-foreground/60 font-medium whitespace-nowrap"
                  >
                    {formatRelativeTime(activity.createdAt)}
                  </time>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Timeline Connector Line -->
      {#if groupIndex < groupedActivities.length - 1}
        <div
          class="absolute left-[27px] top-[40px] bottom-[-20px] w-px bg-border/40 -z-10"
        ></div>
      {/if}
    </div>
  {/each}
</div>
