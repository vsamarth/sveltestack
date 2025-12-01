<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import { Badge } from "$lib/components/ui/badge";
  import {
    FileIcon,
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

  let {
    activities,
    currentUserId,
  }: { activities: Activity[]; currentUserId: string } = $props();

  const EVENT_ICONS: Record<WorkspaceActivityEventType, typeof FileIcon> = {
    "workspace.created": FolderPlusIcon,
    "workspace.renamed": FolderPenIcon,
    "workspace.deleted": Trash2Icon,
    "file.uploaded": FileIcon,
    "file.renamed": PencilIcon,
    "file.deleted": Trash2Icon,
    "file.downloaded": DownloadIcon,
    "member.added": UserPlusIcon,
    "member.removed": UserMinusIcon,
    "invite.sent": MailIcon,
    "invite.accepted": MailCheckIcon,
    "invite.cancelled": MailXIcon,
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("");

  const formatTime = (date: Date) => {
    const diff = Date.now() - +date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDateKey = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const activityDate = new Date(d);
    activityDate.setHours(0, 0, 0, 0);
    if (+activityDate === +today) return "Today";
    if (+activityDate === +yesterday) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const getIconColor = (type: WorkspaceActivityEventType) => {
    if (
      type.includes("deleted") ||
      type.includes("removed") ||
      type.includes("cancelled")
    )
      return "text-destructive";
    if (
      type.includes("added") ||
      type.includes("uploaded") ||
      type.includes("created") ||
      type.includes("accepted")
    )
      return "text-green-600 dark:text-green-500";
    return "text-muted-foreground";
  };

  const formatSize = (size?: string) => {
    if (!size) return;
    const bytes = +size;
    if (!bytes) return;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getDescription = (activity: Activity, isCurrentUser: boolean) => {
    const meta = (activity.metadata || {}) as Record<string, unknown>;
    const actor = isCurrentUser ? "You" : activity.actorName;
    const desc: Record<
      WorkspaceActivityEventType,
      () => { action: string; target?: string; detail?: string }
    > = {
      "workspace.created": () => ({
        action: `${actor} created this workspace`,
      }),
      "workspace.renamed": () => ({
        action: `${actor} renamed the workspace`,
        target: `${meta.oldName} → ${meta.newName}`,
      }),
      "workspace.deleted": () => ({
        action: `${actor} deleted this workspace`,
      }),
      "file.uploaded": () => ({
        action: `${actor} uploaded`,
        target: meta.filename as string,
        detail: formatSize(meta.size as string),
      }),
      "file.renamed": () => ({
        action: `${actor} renamed`,
        target: `${meta.oldFilename} → ${meta.newFilename}`,
      }),
      "file.deleted": () => ({
        action: `${actor} deleted`,
        target: meta.filename as string,
      }),
      "file.downloaded": () => ({
        action: `${actor} downloaded`,
        target: meta.filename as string,
      }),
      "member.added": () => ({
        action: `${actor} joined the workspace`,
        detail: meta.role as string,
      }),
      "member.removed": () => ({
        action: `${actor} was removed from the workspace`,
      }),
      "invite.sent": () => ({
        action: `${actor} invited`,
        target: meta.inviteEmail as string,
      }),
      "invite.accepted": () => ({ action: `${actor} accepted the invitation` }),
      "invite.cancelled": () => ({
        action: `${actor} cancelled invite for`,
        target: meta.inviteEmail as string,
      }),
    };
    return (
      desc[activity.eventType]?.() ?? { action: `${actor} performed an action` }
    );
  };

  const groupedActivities = $derived.by(() => {
    const groups = new Map<string, Activity[]>();
    for (const activity of activities) {
      const key = getDateKey(activity.createdAt);
      groups.set(key, [...(groups.get(key) ?? []), activity]);
    }
    return Array.from(groups.entries());
  });
</script>

<div class="space-y-8 w-full">
  {#each groupedActivities as [dateGroup, groupActivities], groupIndex (dateGroup)}
    <div class="relative">
      <div
        class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 py-2 mb-4 flex items-center gap-4"
      >
        <div
          class="bg-muted/50 text-muted-foreground px-3 py-1 rounded-full text-xs font-medium border border-border/50"
        >
          {dateGroup}
        </div>
        <div class="h-px flex-1 bg-border/50"></div>
      </div>

      <div class="space-y-4 pl-2">
        {#each groupActivities as activity (activity.id)}
          {@const isCurrentUser = activity.actorId === currentUserId}
          {@const EventIcon = EVENT_ICONS[activity.eventType] ?? FileIcon}
          {@const iconColor = getIconColor(activity.eventType)}
          {@const desc = getDescription(activity, isCurrentUser)}

          <div
            class="group relative flex gap-4 p-4 sm:p-5 bg-card border border-border/60 hover:border-border/80 rounded-xl transition-all duration-200 hover:shadow-sm"
          >
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
              <div
                class="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm"
              >
                <div class="bg-muted/30 rounded-full p-1">
                  <EventIcon class="size-3 {iconColor}" />
                </div>
              </div>
            </div>

            <div class="flex-1 min-w-0 pt-0.5">
              <div
                class="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4"
              >
                <div class="flex-1 min-w-0 space-y-1">
                  <p class="text-sm text-foreground/90 leading-relaxed">
                    <span class="font-semibold text-foreground"
                      >{desc.action}</span
                    >
                    {#if desc.target}
                      <span class="font-medium text-foreground/80 mx-1"
                        >{desc.target}</span
                      >
                    {/if}
                  </p>
                  {#if desc.detail}
                    <Badge
                      variant="outline"
                      class="bg-muted/30 text-muted-foreground font-mono text-[10px] px-1.5 h-5 border-border/50"
                    >
                      {desc.detail}
                    </Badge>
                  {/if}
                </div>
                <time
                  datetime={activity.createdAt.toISOString()}
                  class="text-xs text-muted-foreground/60 font-medium whitespace-nowrap shrink-0"
                >
                  {formatTime(activity.createdAt)}
                </time>
              </div>
            </div>
          </div>
        {/each}
      </div>

      {#if groupIndex < groupedActivities.length - 1}
        <div
          class="absolute left-[27px] top-[40px] bottom-[-20px] w-px bg-border/40 -z-10"
        ></div>
      {/if}
    </div>
  {/each}
</div>
