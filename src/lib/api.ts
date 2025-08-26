import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/** retry helper for transient failures */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 300): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// adjust names if your DB types differ
type FormsRow = Database["public"]["Tables"]["forms"]["Row"];
type FormsInsert = Database["public"]["Tables"]["forms"]["Insert"];
type FormsUpdate = Database["public"]["Tables"]["forms"]["Update"];

type ResponsesRow = Database["public"]["Tables"]["form_responses"]["Row"];
type ResponsesInsert = Database["public"]["Tables"]["form_responses"]["Insert"];

export const FormsAPI = {
  listByUser: (userId: string) =>
    withRetry(async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FormsRow[];
    }),

  get: (id: string) =>
    withRetry(async () => {
      const { data, error } = await supabase.from("forms").select("*").eq("id", id).single();
      if (error) throw error;
      return data as FormsRow;
    }),

  create: (payload: FormsInsert) =>
    withRetry(async () => {
      const { data, error } = await supabase.from("forms").insert(payload).select().single();
      if (error) throw error;
      return data as FormsRow;
    }),

  update: (id: string, payload: FormsUpdate) =>
    withRetry(async () => {
      const { data, error } = await supabase.from("forms").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data as FormsRow;
    }),

  remove: (id: string) =>
    withRetry(async () => {
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;
      return true;
    }),
};

export const ResponsesAPI = {
  listForForm: (formId: string) =>
    withRetry(async () => {
      const { data, error } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ResponsesRow[];
    }),

  create: (payload: ResponsesInsert) =>
    withRetry(async () => {
      const { data, error } = await supabase
        .from("form_responses")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as ResponsesRow;
    }),
};
