
"use server";

import { revalidatePath } from "next/cache";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { createClient } from "@/lib/supabase/server";

type SaveResult = {
  success: boolean;
  message: string;
};

type GiornoOrari = {
  closed: boolean;
  lunch_open: string;
  lunch_close: string;
  dinner_open: string;
  dinner_close: string;
};

const giorni = [
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidTime(value: string): boolean {
  return (
    value === "" ||
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function validateInterval(
  open: string,
  close: string
): boolean {
  if (!isValidTime(open) || !isValidTime(close)) {
    return false;
  }

  if (!open && !close) {
    return true;
  }

  if (!open || !close) {
    return false;
  }

  // Sono ammessi anche orari oltre la mezzanotte.
  return open !== close;
}

export async function saveOpeningHours(
  tenantId: string,
  hours: unknown
): Promise<SaveResult> {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out") {
    return { success: false, message: "Sessione scaduta. Effettua nuovamente il login." };
  }
  if (access === "denied") {
    return { success: false, message: "Non sei autorizzato a modificare questo sito." };
  }

  // 3. Verifica struttura dei dati
  if (!isRecord(hours)) {
    return {
      success: false,
      message: "Formato degli orari non valido.",
    };
  }

  const validatedHours: Record<string, GiornoOrari> = {};

  for (const giorno of giorni) {
    const value = hours[giorno];

    if (!isRecord(value)) {
      return {
        success: false,
        message: `Dati mancanti per ${giorno}.`,
      };
    }

    const {
      closed,
      lunch_open,
      lunch_close,
      dinner_open,
      dinner_close,
    } = value;

    if (
      typeof closed !== "boolean" ||
      typeof lunch_open !== "string" ||
      typeof lunch_close !== "string" ||
      typeof dinner_open !== "string" ||
      typeof dinner_close !== "string"
    ) {
      return {
        success: false,
        message: `Dati non validi per ${giorno}.`,
      };
    }

    if (
      !validateInterval(lunch_open, lunch_close) ||
      !validateInterval(dinner_open, dinner_close)
    ) {
      return {
        success: false,
        message: `Controlla gli orari di ${giorno}: ogni fascia deve avere apertura e chiusura.`,
      };
    }

    validatedHours[giorno] = {
      closed,
      lunch_open,
      lunch_close,
      dinner_open,
      dinner_close,
    };
  }

  // 4. Verifica che il ristorante esista
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return {
      success: false,
      message: "Ristorante non trovato o non accessibile.",
    };
  }

  // 5. Aggiorna esclusivamente opening_hours
  const { data, error } = await supabase
    .from("site_settings")
    .update({
      opening_hours: validatedHours,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();

  if (error) {
    console.error("Errore salvataggio orari:", error);

    return {
      success: false,
      message: "Impossibile salvare gli orari.",
    };
  }

  if (!data) {
    return {
      success: false,
      message:
        "Configurazione del sito non trovata. Salva prima la sezione Informazioni e contatti.",
    };
  }

  // 6. Aggiorna le pagine
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/orari`
  );

  return {
    success: true,
    message: "Orari di apertura salvati correttamente!",
  };
}

type SocialLinks = {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  tripadvisor: string;
};

const socialDomains: Record<keyof SocialLinks, string[]> = {
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  tripadvisor: ["tripadvisor.it", "tripadvisor.com"],
};

function isValidSocialUrl(
  value: string,
  allowedDomains: string[]
): boolean {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    if (url.username || url.password) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return allowedDomains.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function saveSocialLinks(
  tenantId: string,
  links: unknown
): Promise<SaveResult> {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out") {
    return { success: false, message: "Sessione scaduta. Effettua nuovamente il login." };
  }
  if (access === "denied") {
    return { success: false, message: "Non sei autorizzato a modificare questo sito." };
  }

  // 3. Verifica struttura dei dati
  if (!isRecord(links)) {
    return {
      success: false,
      message: "Formato dei collegamenti social non valido.",
    };
  }

  const validatedLinks = {} as SocialLinks;

  const socialNames = [
    "facebook",
    "instagram",
    "tiktok",
    "youtube",
    "tripadvisor",
  ] as const;

  for (const social of socialNames) {
    const value = links[social];

    if (typeof value !== "string") {
      return {
        success: false,
        message: `Il collegamento ${social} non è valido.`,
      };
    }

    const trimmed = value.trim();

    if (trimmed.length > 500) {
      return {
        success: false,
        message: `Il collegamento ${social} è troppo lungo.`,
      };
    }

    if (!isValidSocialUrl(trimmed, socialDomains[social])) {
      return {
        success: false,
        message:
          `Inserisci un indirizzo HTTPS valido per ${social}, ` +
          `appartenente al relativo social network.`,
      };
    }

    validatedLinks[social] = trimmed;
  }

  // 4. Verifica esistenza del ristorante
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return {
      success: false,
      message: "Ristorante non trovato o non accessibile.",
    };
  }

  // 5. Aggiorna soltanto social_links
  const { data, error } = await supabase
    .from("site_settings")
    .update({
      social_links: validatedLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();

  if (error) {
    console.error("Errore salvataggio social:", error);

    return {
      success: false,
      message: "Impossibile salvare i collegamenti social.",
    };
  }

  if (!data) {
    return {
      success: false,
      message:
        "Configurazione del sito non trovata. Salva prima la sezione Informazioni e contatti.",
    };
  }

  // 6. Aggiorna la pagina
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/orari`
  );

  return {
    success: true,
    message: "Collegamenti social salvati correttamente!",
  };
}
