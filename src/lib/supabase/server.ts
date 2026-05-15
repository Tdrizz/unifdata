import { createAdminClient } from "./admin";
import { getCurrentAppUser } from "@/lib/auth/session";

export async function createClient() {
  const supabase = createAdminClient();

  Object.assign(supabase.auth, {
    async getUser() {
      const user = await getCurrentAppUser();

      return {
        data: {
          user: user
            ? {
                id: user.profileId,
                email: user.email,
                user_metadata: {
                  clerk_user_id: user.clerkUserId,
                  full_name: user.fullName,
                  subscribed: user.subscribed,
                  company_id: user.invitationCompanyId,
                  invited_role: user.invitationRole,
                },
              }
            : null,
        },
        error: null,
      };
    },
  });

  return supabase;
}
