# Selfweb

Piattaforma Next.js e Supabase per configurare e gestire vetrine di attività di settori diversi. Il pannello distingue l’amministrazione della piattaforma dai gestori delle singole attività.

## Avvio

1. Usa un progetto Supabase di sviluppo. Configura la CLI Supabase e applica le migrazioni in `supabase/migrations` in ordine. Per un progetto già popolato, confronta lo schema e lo storico delle migrazioni prima di procedere.
2. Copia `.env.example` in `.env.local`. Inserisci l’URL del progetto e la chiave pubblicabile. Le credenziali amministrative rimangono fuori dall’applicazione.
3. Con Node.js e pnpm disponibili, esegui `pnpm install --frozen-lockfile` e `pnpm dev`.
4. Apri `http://localhost:3000/login`. Gli account vengono creati con Supabase Auth e associati a `platform_members` per l’amministrazione o a `tenant_members` per la gestione di un’attività.

## Registrazione e conferma email

Mantieni attiva la conferma email in Supabase Auth. Aggiungi alle URL di reindirizzamento autorizzate il percorso `/auth/conferma` per ogni origine dell’app, ad esempio `http://localhost:3000/auth/conferma` in sviluppo. Il template di conferma deve usare `{{ .ConfirmationURL }}`. L’utente apre il link nello stesso browser usato per registrarsi, quindi arriva alla creazione della prima bozza.

Per inviare conferme a destinatari esterni all’organizzazione Supabase serve un servizio SMTP configurato per il progetto.

## Funzionalità collaudate

- Creazione e modifica di attività con scelta guidata di settore e template.
- Gestione della vetrina, anteprima privata, immagini, palette e sezioni.
- Pannello cliente limitato alle attività assegnate.
- Registrazione con verifica email e creazione autonoma di una vetrina in bozza.
- Selezione dei moduli e stima del piano prima del checkout. Le scelte in bozza sono separate dai moduli attivi.
- Menu digitale opzionale, stima del canone e disattivazioni programmate al rinnovo.

I rinnovi vengono registrati dall’amministratore. Checkout, pagamenti effettivi e pubblicazione automatica restano da integrare.
