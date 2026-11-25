# Selfweb

Piattaforma Next.js e Supabase per configurare e gestire vetrine di attività di settori diversi. Il pannello distingue l’amministrazione della piattaforma dai gestori delle singole attività.

## Avvio

1. Usa un progetto Supabase di sviluppo. Configura la CLI Supabase e applica le migrazioni in `supabase/migrations` in ordine. Per un progetto già popolato, confronta lo schema e lo storico delle migrazioni prima di procedere.
2. Copia `.env.example` in `.env.local`. Inserisci l’URL del progetto e la chiave pubblicabile. Le credenziali amministrative rimangono fuori dall’applicazione.
3. Con Node.js e pnpm disponibili, esegui `pnpm install --frozen-lockfile` e `pnpm dev`.
4. Apri `http://localhost:3000/login`. Gli account vengono creati con Supabase Auth e associati a `platform_members` per l’amministrazione o a `tenant_members` per la gestione di un’attività.

## Interfaccia

Tailwind CSS è lo standard dell’interfaccia di Selfweb. Usa le utility responsive con un approccio mobile-first e riutilizza la palette `selfweb` definita in `tailwind.config.ts`. I pannelli usano la navigazione condivisa di `WorkspaceShell`. I template delle vetrine pubbliche mantengono stili dedicati alla propria identità visiva.

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
- Prenotazioni dal pannello e appuntamenti online. Il gestore può scegliere la conferma manuale o automatica, con quella manuale come predefinita.

I rinnovi vengono registrati dall’amministratore. L’attivazione del primo abbonamento è predisposta nel database. Resta da collegare il checkout e il servizio che verifica la conferma del pagamento.

## Attivazione dopo il primo pagamento

Il server che gestisce il pagamento deve associare la sessione del fornitore al riepilogo salvato. Dopo aver verificato la conferma con il fornitore, chiama `selfweb_activate_paid_checkout` con la chiave riservata al server. Passa attività e riepilogo associati, riferimenti del pagamento e dell’abbonamento, importo in centesimi, valuta e date del primo ciclo. La funzione confronta importo e valuta con il riepilogo salvato.

`activated` e `already_activated` indicano che l’attivazione è stata registrata. Conserva gli altri esiti per la riconciliazione con il fornitore. L’attivazione registra il ciclo, abilita i moduli acquistati e pubblica la vetrina nella stessa transazione.

## Conferme Stripe in ambiente di test

Configura un endpoint Stripe con eventi snapshot `checkout.session.completed` e `checkout.session.async_payment_succeeded` verso `/api/pagamenti/stripe-test`. Imposta le variabili `SELFWEB_STRIPE_TEST_*` con credenziali Stripe di test e una chiave server del progetto Supabase di test. La creazione della sessione deve passare il riepilogo come `client_reference_id` e i metadati `selfweb_flow=initial_checkout`, `selfweb_tenant_id` e `selfweb_quote_id`.

Imposta anche `SELFWEB_STRIPE_TEST_APP_URL` con l’origine dell’app di test. Quando Stripe, Supabase e il listino risultano configurati, il cliente può aprire il checkout di prova dal riepilogo. Gli importi inviati a Stripe provengono dal riepilogo verificato nel database. Il ritorno dal checkout mostra lo stato dell’attivazione.

L’endpoint verifica la firma sul messaggio originale, rilegge da Stripe la sessione e la prima fattura pagata in EUR e applica l’attivazione nel database di test.

## Indirizzi pubblici delle vetrine

Le vetrine pubblicate sono raggiungibili su `/vetrine/<slug>`. Per usare anche i sottodomini, imposta `SELFWEB_SHOWCASE_DOMAIN` con un dominio base dedicato, ad esempio `siti.example.com`, senza protocollo o percorso. L’indirizzo canonico diventa `https://<slug>.siti.example.com/`.

Configura il DNS wildcard `*.siti.example.com` verso l’hosting di Selfweb, abilita HTTPS per lo stesso wildcard e inoltra l’header `Host` originale all’applicazione. Usa un dominio separato per il pannello, ad esempio `app.example.com`. Gli identificativi oltre i 63 caratteri rimangono raggiungibili tramite `/vetrine/<slug>`.
