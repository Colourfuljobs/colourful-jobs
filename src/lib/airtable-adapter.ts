import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
} from "next-auth/adapters";
import Airtable from "airtable";
import { getUserByEmail, createUser, escapeAirtableString } from "./airtable";

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

if (!baseId || !apiKey) {
  throw new Error("Airtable not configured");
}

const base = new Airtable({ apiKey }).base(baseId);
const VERIFICATION_TOKENS_TABLE = "VerificationTokens";
const ACCOUNTS_TABLE = "Accounts";
const SESSIONS_TABLE = "Sessions";
const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || "Users";

async function getUserById(id: string): Promise<AdapterUser | null> {
  try {
    const record = await base(USERS_TABLE).find(id);
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
        const records = await base(ACCOUNTS_TABLE)
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

      const record = await base(USERS_TABLE).update(user.id, fields);
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
      await base(ACCOUNTS_TABLE).create({
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
      
      const record = await base(SESSIONS_TABLE).create({
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
        const records = await base(SESSIONS_TABLE)
          .select({
            filterByFormula: `{sessionToken} = '${escapeAirtableString(sessionToken)}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (!records[0]) return null;

        const session = records[0];
        const expires = new Date(session.fields.expires as string);
        if (expires < new Date()) {
          await base(SESSIONS_TABLE).destroy(session.id);
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
        const records = await base(SESSIONS_TABLE)
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

        const record = await base(SESSIONS_TABLE).update(records[0].id, fields);
        
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
        const records = await base(SESSIONS_TABLE)
          .select({
            filterByFormula: `{sessionToken} = '${escapeAirtableString(sessionToken)}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (records[0]) {
          await base(SESSIONS_TABLE).destroy(records[0].id);
        }
      } catch {
        // Ignore errors
      }
    },
    async createVerificationToken({ identifier, expires, token }) {
      console.log("📝 createVerificationToken called:", { identifier, tokenLength: token?.length });
      try {
        // Use full ISO string for DateTime fields in Airtable
        const expiresFormatted = expires.toISOString();
        
        const record = await base(VERIFICATION_TOKENS_TABLE).create({
          identifier,
          token,
          expires: expiresFormatted,
        });
        
        console.log("✅ Verification token created in Airtable:", { 
          identifier, 
          recordId: record.id,
          expires: expiresFormatted 
        });
        
        // Airtable returns dates in various formats, handle both
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
        console.error("❌ Error creating verification token:", {
          table: VERIFICATION_TOKENS_TABLE,
          identifier,
          error: error.message,
          statusCode: error.statusCode,
          expectedFields: ["identifier", "token", "expires"],
          expiresValue: expires,
          expiresFormatted: expires.toISOString().split('T')[0],
        });
        throw error;
      }
    },
    async useVerificationToken({ identifier, token }) {
      console.log("🔍 useVerificationToken called:", { identifier, tokenLength: token?.length });
      try {
        const records = await base(VERIFICATION_TOKENS_TABLE)
          .select({
            filterByFormula: `AND({identifier} = '${escapeAirtableString(identifier)}', {token} = '${escapeAirtableString(token)}')`,
            maxRecords: 1,
          })
          .firstPage();

        console.log("🔍 Verification token lookup result:", { 
          found: records.length > 0,
          recordCount: records.length 
        });

        if (!records[0]) {
          console.log("❌ No verification token found for:", identifier);
          return null;
        }

        const verificationToken = {
          identifier: records[0].fields.identifier as string,
          token: records[0].fields.token as string,
          expires: new Date(records[0].fields.expires as string),
        };

        console.log("✅ Verification token found, expires:", verificationToken.expires);

        await base(VERIFICATION_TOKENS_TABLE).destroy(records[0].id);
        console.log("🗑️ Verification token deleted after use");
        return verificationToken;
      } catch (error: any) {
        console.error("❌ Error in useVerificationToken:", {
          identifier,
          error: error.message,
          statusCode: error.statusCode,
        });
        return null;
      }
    },
  };
}

