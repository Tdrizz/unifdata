import { RealtimeRefresh } from "./RealtimeRefresh";

type WatchedTable = { table: string; column?: "company_id" | "organization_id" };

// Server component wrapper for RealtimeRefresh client component.
// Using this instead of importing RealtimeRefresh directly into server pages
// prevents those pages from being converted to client components, which was
// breaking Clerk authentication middleware. See:
// https://nextjs.org/docs/getting-started/react-essentials#mixing-server-and-client-components
export function RealtimeRefreshServer({ orgId, tables }: { orgId: string; tables: WatchedTable[] }) {
  return <RealtimeRefresh orgId={orgId} tables={tables} />;
}
