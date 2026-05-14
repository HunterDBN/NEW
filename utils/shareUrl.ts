export let pendingShareUrl: string | null = null;

export function setPendingShareUrl(url: string | null): void {
  pendingShareUrl = url;
}
