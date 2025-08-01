import { createServerFn } from "@tanstack/react-start";
import type { User } from "~/lib/auth/types";

/**
 * Server function to get the current user with all custom fields
 */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<User | null> => {
    // Import server-only modules inside the handler
    const [{ getDb }, { getAuth }] = await Promise.all([
      import("~/db/server-helpers"),
      import("~/lib/auth/server-helpers"),
    ]);

    const auth = await getAuth();
    const { getWebRequest } = await import("@tanstack/react-start/server");
    const { headers } = getWebRequest();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return null;
    }

    // Import schema and ORM inside the handler
    const { eq } = await import("drizzle-orm");
    const { user } = await import("~/db/schema");

    // Fetch the full user data from the database
    const db = await getDb();
    const dbUser = await db()
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!dbUser[0]) {
      return null;
    }

    // Map the database user to our extended User type
    return {
      ...session.user,
      profileComplete: dbUser[0].profileComplete,
      dateOfBirth: dbUser[0].dateOfBirth,
      emergencyContact: dbUser[0].emergencyContact,
      gender: dbUser[0].gender,
      pronouns: dbUser[0].pronouns,
      phone: dbUser[0].phone,
      privacySettings: dbUser[0].privacySettings,
      profileVersion: dbUser[0].profileVersion,
      profileUpdatedAt: dbUser[0].profileUpdatedAt,
    };
  },
);
