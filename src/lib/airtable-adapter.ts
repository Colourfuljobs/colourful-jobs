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
    
    return {
      id: record.id,
      email,
      emailVerified: null,
      name: null,
      image: null,
      employerId: employer_id,
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
      // Use full ISO string for DateTime fields in Airtable
      const expiresFormatted = expires.toISOString();
      
      const record = await getBase()(SESSIONS_TABLE).create({
        sessionToken,
        userId,
        expires: expiresFormatted,
      });
      
      // Handle date parsing from Airtable
      const expiresValue = record.fields.expires;
      const expiresDate = expiresValue instanceof Date 
        ? expiresValue 
        : typeof expiresValue === 'string' 
          ? new Date(expiresValue) 
          : new Date(expiresValue as any);
      
      return {
        sessionToken: record.fields.sessionToken as string,
        userId: record.fields.userId as string,
        expires: expiresDate,
      };
    },
    async getSessionAndUser(sessionToken) {
      try {
        const records = await getBase()(SESSIONS_TABLE)
          .select({
            filterByFormula: `{sessionToken} = '${escapeAirtableString(sessionToken)}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (!records[0]) return null;

        const session = records[0];
        const expires = new Date(session.fields.expires as string);
        if (expires < new Date()) {
          await getBase()(SESSIONS_TABLE).destroy(session.id);
          return null;
        }

        const user = await getUserById(session.fields.userId as string);
        if (!user) return null;

        return {
          session: {
            sessionToken: session.fields.sessionToken as string,
            userId: session.fields.userId as string,
            expires,
          },
          user,
        };
      } catch {
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
        
        return {
          sessionToken: record.fields.sessionToken as string,
          userId: record.fields.userId as string,
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
        
        console.log("[Auth] Creating verification token for:", identifier);
        console.log("[Auth] Token (first 20 chars):", token.substring(0, 20) + "...");
        console.log("[Auth] Token length:", token.length);
        console.log("[Auth] Expires:", expiresFormatted);
        
        const record = await getBase()(VERIFICATION_TOKENS_TABLE).create({
          identifier,
          token,
          expires: expiresFormatted,
        });
        
        console.log("[Auth] Verification token created with ID:", record.id);
        
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
      } catch (error: any) {
        console.error("[Auth] ERROR creating verification token:", error.message, error.statusCode);
        throw error;
      }
    },
    async useVerificationToken({ identifier, token }) {
      try {
        console.log("[Auth] Looking for verification token...");
        console.log("[Auth] Identifier:", identifier);
        console.log("[Auth] Token (first 20 chars):", token.substring(0, 20) + "...");
        console.log("[Auth] Token length:", token.length);
        
        const escapedIdentifier = escapeAirtableString(identifier);
        const escapedToken = escapeAirtableString(token);
        const formula = `AND({identifier} = '${escapedIdentifier}', {token} = '${escapedToken}')`;
        
        console.log("[Auth] Search formula:", formula.substring(0, 100) + "...");
        
        // Retry mechanism for Airtable eventual consistency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let records: any[] = [];
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          records = await getBase()(VERIFICATION_TOKENS_TABLE)
            .select({
              filterByFormula: formula,
              maxRecords: 1,
            })
            .firstPage();
          
          console.log(`[Auth] Attempt ${attempt}/${maxRetries}: Records found:`, records.length);
          
          if (records.length > 0) break;
          
          if (attempt < maxRetries) {
            console.log(`[Auth] Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        if (!records[0]) {
          console.log("[Auth] No verification token found after retries - token may be expired, already used, or mismatched");
          
          // Debug: Try to find any tokens for this identifier
          try {
            const allTokensForEmail = await getBase()(VERIFICATION_TOKENS_TABLE)
              .select({
                filterByFormula: `{identifier} = '${escapedIdentifier}'`,
                maxRecords: 10,
              })
              .firstPage();
            console.log("[Auth] Total tokens for this email:", allTokensForEmail.length);
            if (allTokensForEmail.length > 0) {
              allTokensForEmail.forEach((r, i) => {
                const storedToken = r.fields.token as string;
                const storedExpires = r.fields.expires as string;
                console.log(`[Auth] Token ${i + 1}:`);
                console.log(`  - Length: ${storedToken?.length}`);
                console.log(`  - Prefix: ${storedToken?.substring(0, 20)}`);
                console.log(`  - Suffix: ${storedToken?.substring(storedToken.length - 20)}`);
                console.log(`  - Expires: ${storedExpires}`);
                console.log(`  - Matches input: ${storedToken === token}`);
              });
              
              // Compare requested token with stored tokens
              console.log("[Auth] Requested token prefix:", token.substring(0, 20));
              console.log("[Auth] Requested token suffix:", token.substring(token.length - 20));
            }
          } catch (debugError) {
            console.log("[Auth] Debug query failed:", debugError);
          }
          
          return null;
        }

        console.log("[Auth] Verification token found with ID:", records[0].id);
        console.log("[Auth] Token expires:", records[0].fields.expires);
        
        const verificationToken = {
          identifier: records[0].fields.identifier as string,
          token: records[0].fields.token as string,
          expires: new Date(records[0].fields.expires as string),
        };

        // Check if token is expired
        if (verificationToken.expires < new Date()) {
          console.log("[Auth] Token is EXPIRED! Expires:", verificationToken.expires, "Now:", new Date());
        }

        await getBase()(VERIFICATION_TOKENS_TABLE).destroy(records[0].id);
        console.log("[Auth] Verification token deleted successfully");
        return verificationToken;
      } catch (error: any) {
        console.error("[Auth] ERROR in useVerificationToken:", error.message);
        console.error("[Auth] Error stack:", error.stack);
        return null;
      }
    },
  };
}

