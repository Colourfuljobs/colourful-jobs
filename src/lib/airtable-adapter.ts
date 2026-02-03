import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
} from "next-auth/adapters";
import Airtable from "airtable";
import { getUserByEmail, createUser, escapeAirtableString } from "./airtable";

// Lazy initialization to avoid build-time errors when env vars aren't available
let _base: ReturnType<Airtable["base"]> | null = null;

function getBase() {
  if (_base) return _base;
  
  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  _base = new Airtable({ apiKey }).base(baseId);
  return _base;
}
const VERIFICATION_TOKENS_TABLE = "VerificationTokens";
const ACCOUNTS_TABLE = "Accounts";
const SESSIONS_TABLE = "Sessions";
const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || "Users";

async function getUserById(id: string): Promise<AdapterUser | null> {
  try {
    const record = await getBase()(USERS_TABLE).find(id);
    const email = record.fields.email as string;
    if (!email) return null;
    
    // Get employer_id (linked field returns array)
    const employer_id = Array.isArray(record.fields.employer_id)
      ? record.fields.employer_id[0] || null
      : record.fields.employer_id || null;
    
    // Get status with default fallback
    const status = (record.fields.status as string) || "pending_onboarding";
    
    return {
      id: record.id,
      email,
      emailVerified: null,
      name: null,
      image: null,
      employerId: employer_id,
      status,
    } as AdapterUser;
  } catch {
    return null;
  }
}

export function AirtableAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      if (!user.email) {
        throw new Error("Email is required");
      }
      const airtableUser = await createUser({
        email: user.email,
        status: "pending_onboarding",
      });
      return {
        id: airtableUser.id,
        email: airtableUser.email,
        emailVerified: null,
        name: null,
        image: null,
      };
    },
    async getUser(id) {
      return getUserById(id);
    },
    async getUserByEmail(email) {
      const user = await getUserByEmail(email);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        emailVerified: null,
        name: null,
        image: null,
        employerId: user.employer_id || null,
        status: user.status || "pending_onboarding",
      } as AdapterUser;
    },
    async getUserByAccount({ providerAccountId, provider }) {
      try {
        const records = await getBase()(ACCOUNTS_TABLE)
          .select({
            filterByFormula: `AND({provider} = '${escapeAirtableString(provider)}', {providerAccountId} = '${escapeAirtableString(providerAccountId)}')`,
            maxRecords: 1,
          })
          .firstPage();

        if (!records[0]) return null;

        const userId = records[0].fields.userId as string;
        return getUserById(userId);
      } catch {
        return null;
      }
    },
    async updateUser(user) {
      const fields: Record<string, any> = {};
      if (user.email) fields.email = user.email;
      if (user.name) fields.name = user.name;

      const record = await getBase()(USERS_TABLE).update(user.id, fields);
      const email = record.fields.email as string;
      if (!email) {
        throw new Error("Email is required");
      }
      return {
        id: record.id,
        email,
        emailVerified: null,
        name: null,
        image: null,
      };
    },
    async linkAccount(account: AdapterAccount) {
      await getBase()(ACCOUNTS_TABLE).create({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
      return account;
    },
    async createSession({ sessionToken, userId, expires }) {
      console.log("[Auth:createSession] Starting session creation", { 
        userId, 
        expires: expires.toISOString(),
        sessionTokenPrefix: sessionToken.substring(0, 8) + "..." 
      });
      
      try {
        // Use full ISO string for DateTime fields in Airtable
        const expiresFormatted = expires.toISOString();
        
        const record = await getBase()(SESSIONS_TABLE).create({
          sessionToken,
          userId: [userId], // Link to Users requires array
          expires: expiresFormatted,
          "created-at": new Date().toISOString(),
        });
        
        console.log("[Auth:createSession] Session created successfully", { 
          recordId: record.id,
          userId 
        });
        
        // Handle date parsing from Airtable
        const expiresValue = record.fields.expires;
        const expiresDate = expiresValue instanceof Date 
          ? expiresValue 
          : typeof expiresValue === 'string' 
            ? new Date(expiresValue) 
            : new Date(expiresValue as any);
        
        // Extract userId from linked record array
        const userIdValue = Array.isArray(record.fields.userId)
          ? record.fields.userId[0]
          : record.fields.userId;
        
        return {
          sessionToken: record.fields.sessionToken as string,
          userId: userIdValue as string,
          expires: expiresDate,
        };
      } catch (error: unknown) {
        console.error("[Auth:createSession] FAILED to create session", {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw so NextAuth knows it failed
      }
    },
    async getSessionAndUser(sessionToken) {
      const tokenPrefix = sessionToken.substring(0, 8) + "...";
      console.log("[Auth:getSessionAndUser] Looking up session", { tokenPrefix });
      
      try {
        const records = await getBase()(SESSIONS_TABLE)
          .select({
            filterByFormula: `{sessionToken} = '${escapeAirtableString(sessionToken)}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (!records[0]) {
          console.log("[Auth:getSessionAndUser] No session found", { tokenPrefix });
          return null;
        }

        const session = records[0];
        const expires = new Date(session.fields.expires as string);
        
        if (expires < new Date()) {
          console.log("[Auth:getSessionAndUser] Session expired, deleting", { 
            tokenPrefix, 
            expires: expires.toISOString() 
          });
          await getBase()(SESSIONS_TABLE).destroy(session.id);
          return null;
        }

        // Extract userId from linked record array
        const userIdValue = Array.isArray(session.fields.userId)
          ? session.fields.userId[0]
          : session.fields.userId;

        const user = await getUserById(userIdValue as string);
        if (!user) {
          console.log("[Auth:getSessionAndUser] User not found for session", { 
            tokenPrefix, 
            userIdValue 
          });
          return null;
        }

        console.log("[Auth:getSessionAndUser] Session valid", { 
          tokenPrefix, 
          userId: userIdValue,
          userEmail: user.email 
        });

        return {
          session: {
            sessionToken: session.fields.sessionToken as string,
            userId: userIdValue as string,
            expires,
          },
          user,
        };
      } catch (error: unknown) {
        console.error("[Auth:getSessionAndUser] ERROR looking up session", {
          tokenPrefix,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    async updateSession({ sessionToken, expires }) {
      try {
        const records = await getBase()(SESSIONS_TABLE)
          .select({
            filterByFormula: `{sessionToken} = '${escapeAirtableString(sessionToken)}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (!records[0]) return null;

        const fields: Record<string, any> = {};
        if (expires) {
          // Use full ISO string for DateTime fields in Airtable
          fields.expires = expires.toISOString();
        }

        const record = await getBase()(SESSIONS_TABLE).update(records[0].id, fields);
        
        // Handle date parsing from Airtable
        const expiresValue = record.fields.expires;
        const expiresDate = expiresValue instanceof Date 
          ? expiresValue 
          : typeof expiresValue === 'string' 
            ? new Date(expiresValue) 
            : new Date(expiresValue as any);
        
        // Extract userId from linked record array
        const userIdValue = Array.isArray(record.fields.userId)
          ? record.fields.userId[0]
          : record.fields.userId;
        
        return {
          sessionToken: record.fields.sessionToken as string,
          userId: userIdValue as string,
          expires: expiresDate,
        };
      } catch {
        return null;
      }
    },
    async deleteSession(sessionToken) {
      try {
        const records = await getBase()(SESSIONS_TABLE)
          .select({
            filterByFormula: `{sessionToken} = '${escapeAirtableString(sessionToken)}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (records[0]) {
          await getBase()(SESSIONS_TABLE).destroy(records[0].id);
        }
      } catch {
        // Ignore errors
      }
    },
    async createVerificationToken({ identifier, expires, token }) {
      try {
        const expiresFormatted = expires.toISOString();
        
        // Check if user exists to determine request type and link user
        const existingUser = await getUserByEmail(identifier);
        const requestType = existingUser?.status === "active" ? "login" : "verification";
        
        // Revoke any existing pending tokens for this identifier
        // This ensures only the newest magic link is valid
        try {
          const escapedIdentifier = escapeAirtableString(identifier);
          const existingTokens = await getBase()(VERIFICATION_TOKENS_TABLE)
            .select({
              filterByFormula: `AND({identifier} = '${escapedIdentifier}', {status} = 'pending')`,
            })
            .all();
          
          // Mark all existing pending tokens as revoked
          for (const existingToken of existingTokens) {
            await getBase()(VERIFICATION_TOKENS_TABLE).update(existingToken.id, {
              status: "revoked",
            });
          }
        } catch (revokeError) {
          // Log but don't fail - creating the new token is more important
          console.warn("[Auth] Error revoking existing tokens:", revokeError);
        }
        
        // Construct the full magic link URL
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const magicLink = `${baseUrl}/api/auth/callback/email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(identifier)}`;
        
        // Build the record fields
        const recordFields: Record<string, any> = {
          identifier,
          token,
          expires: expiresFormatted,
          "magic-link": magicLink,
          status: "pending",
          "created-at": new Date().toISOString(),
          "request-type": requestType,
        };
        
        // Link to user if they exist (Airtable linked fields require array)
        if (existingUser?.id) {
          recordFields.user = [existingUser.id];
        }
        
        const record = await getBase()(VERIFICATION_TOKENS_TABLE).create(recordFields);
        
        // Update the record to set the id field to the Airtable record ID
        await getBase()(VERIFICATION_TOKENS_TABLE).update(record.id, { id: record.id });
        
        const expiresValue = record.fields.expires;
        const expiresDate = expiresValue instanceof Date 
          ? expiresValue 
          : typeof expiresValue === 'string' 
            ? new Date(expiresValue) 
            : new Date(expiresValue as any);
            
        return {
          identifier: record.fields.identifier as string,
          token: record.fields.token as string,
          expires: expiresDate,
        };
      } catch (error: unknown) {
        console.error("[Auth] Error creating verification token:", error instanceof Error ? error.message : "Unknown error");
        throw error;
      }
    },
    async useVerificationToken({ identifier, token }) {
      console.log("[Auth:useVerificationToken] Starting token verification", { 
        identifier,
        tokenPrefix: token.substring(0, 8) + "..." 
      });
      
      try {
        const escapedIdentifier = escapeAirtableString(identifier);
        const escapedToken = escapeAirtableString(token);
        const formula = `AND({identifier} = '${escapedIdentifier}', {token} = '${escapedToken}')`;
        
        // Retry mechanism for Airtable eventual consistency
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        let foundRecord = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log("[Auth:useVerificationToken] Attempt", attempt, "of", maxRetries);
          const results = await getBase()(VERIFICATION_TOKENS_TABLE)
            .select({
              filterByFormula: formula,
              maxRecords: 1,
            })
            .firstPage();
          
          if (results.length > 0) {
            foundRecord = results[0];
            console.log("[Auth:useVerificationToken] Token found on attempt", attempt);
            break;
          }
          
          if (attempt < maxRetries) {
            console.log("[Auth:useVerificationToken] Token not found, retrying in 1s...");
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        if (!foundRecord) {
          console.warn("[Auth:useVerificationToken] Token NOT FOUND after all retries", { identifier });
          return null;
        }
        
        // Check if token was already used or revoked (extra security)
        const tokenStatus = foundRecord.fields.status as string;
        if (tokenStatus === "used") {
          console.warn("[Auth:useVerificationToken] Token already USED", { identifier });
          return null;
        }
        if (tokenStatus === "revoked") {
          console.warn("[Auth:useVerificationToken] Token was REVOKED", { identifier });
          return null;
        }
        
        console.log("[Auth:useVerificationToken] Token valid, marking as used", { 
          identifier,
          tokenStatus 
        });
        
        const verificationToken = {
          identifier: foundRecord.fields.identifier as string,
          token: foundRecord.fields.token as string,
          expires: new Date(foundRecord.fields.expires as string),
        };

        // Build update fields: mark as used with timestamp
        const updateFields: Record<string, any> = {
          status: "used",
          "used-at": new Date().toISOString(),
        };
        
        // If user wasn't linked yet (user was created after token), link them now
        const existingUserLink = foundRecord.fields.user;
        if (!existingUserLink || (Array.isArray(existingUserLink) && existingUserLink.length === 0)) {
          const user = await getUserByEmail(identifier);
          if (user?.id) {
            updateFields.user = [user.id];
            console.log("[Auth:useVerificationToken] Linking user to token", { userId: user.id });
          }
        }
        
        // Update status instead of deleting (keeps record for support/audit)
        await getBase()(VERIFICATION_TOKENS_TABLE).update(foundRecord.id, updateFields);
        
        console.log("[Auth:useVerificationToken] SUCCESS - token verified", { identifier });
        return verificationToken;
      } catch (error: unknown) {
        console.error("[Auth:useVerificationToken] ERROR", {
          identifier,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        return null;
      }
    },
  };
}

