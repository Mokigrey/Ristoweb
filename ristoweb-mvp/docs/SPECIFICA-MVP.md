# Specifica funzionale e tecnica – MVP 1.0

## Obiettivo
Piattaforma multi-tenant per creare e gestire siti web per ristoranti e pizzerie. Ogni attività dispone di sito pubblico, pannello editoriale e modulo richieste di prenotazione. L'amministratore della piattaforma gestisce clienti, modelli, domini e piani.

## Ruoli
- `platform_admin`: gestisce l'intera piattaforma e tutti i tenant.
- `tenant_admin`: gestisce sito, contenuti, membri e impostazioni del proprio tenant.
- `tenant_editor`: gestisce contenuti editoriali e prenotazioni del proprio tenant.

## Modello commerciale
- Piano `subscription`: sito ospitato e gestito dal fornitore; canone ricorrente.
- Piano `license`: licenza d'uso del software/sito per installazione concordata e gestione autonoma dei contenuti. Hosting, aggiornamenti, supporto, durata, limiti e condizioni di cessazione sono definiti dal contratto.
- Il cliente mantiene la titolarità dei contenuti e dei dati che inserisce, secondo contratto e normativa applicabile.
- La licenza non implica cessione del codice sorgente o della proprietà intellettuale della piattaforma.

## Funzioni MVP
### Sito pubblico
- Home con immagine principale, presentazione e call-to-action.
- Menu diviso in categorie e piatti con descrizioni e prezzi.
- Galleria fotografica.
- Contatti, indirizzo, telefono, WhatsApp, orari e link social.
- Layout responsive e metadati SEO di base.
- Tre template: Tradizionale, Moderno, Mediterraneo.

### Pannello cliente
- Login e recupero accesso.
- Dashboard del singolo locale.
- Modifica testi, immagini, contatti e orari.
- CRUD categorie e piatti, ordinamento, disponibilità e prezzi.
- Gestione galleria.
- Gestione richieste di prenotazione: elenco, dettaglio, conferma, rifiuto, annullamento e nota interna.
- Anteprima del sito.

### Prenotazioni MVP
- Modulo pubblico con nome, telefono, email facoltativa, numero persone, data/ora richiesta e note.
- La richiesta nasce con stato `pending`.
- Il ristoratore la conferma o rifiuta dal pannello.
- Notifiche email al ristoratore e al cliente da implementare con provider transazionale.
- Il sistema non promette disponibilità automatica né assegna tavoli nella prima versione.
- Protezioni anti-spam, rate limit e validazione server-side obbligatorie.

### Pannello piattaforma
- Creazione e modifica tenant.
- Assegnazione template e piano.
- Gestione domini e stato pubblicazione.
- Gestione membri e ruoli.
- Vista riepilogativa clienti e stato servizio.

## Requisiti non funzionali
- Isolamento tenant verificato a livello database con Row Level Security e controlli server-side.
- Nessuna chiave Supabase privilegiata esposta nel browser.
- Validazione input server-side, rate limiting e protezione anti-spam.
- HTTPS, backup, log, monitoraggio e procedura di ripristino.
- GDPR: informative, basi giuridiche, minimizzazione, retention, gestione richieste interessati e contratti con fornitori/responsabili.
- Accessibilità e prestazioni mobile-first.
- Dominio personalizzato per ciascun cliente.

## Fuori ambito per MVP
- Ordini e pagamenti online.
- Delivery e integrazione rider.
- Gestione automatica tavoli e turni.
- Programmi fedeltà.
- App mobile nativa.
- Multi-lingua avanzato.
- Builder visuale drag-and-drop.

## Entità dati iniziali
`tenants`, `tenant_members`, `platform_members`, `domains`, `site_settings`, `menu_categories`, `menu_items`, `gallery_images`, `bookings`.

## Criteri di accettazione
1. Un amministratore piattaforma può creare un tenant.
2. Un utente associato a un tenant vede esclusivamente i dati autorizzati.
3. Il cliente modifica menu, prezzi, immagini, contatti e orari senza codice.
4. Il sito pubblico mostra i dati del tenant risolto dal dominio.
5. Un visitatore può inviare una richiesta prenotazione.
6. Il cliente può gestire lo stato della richiesta dal pannello.
7. Il sito può utilizzare uno dei tre template senza duplicare la logica dei contenuti.
8. Il tenant può essere pubblicato o sospeso dall'amministratore.

## Sequenza di sviluppo
1. Repository, ambienti e progetto Supabase.
2. Schema database, RLS e test isolamento.
3. Autenticazione e ruoli.
4. Risoluzione dominio e rendering tenant.
5. Pannello cliente e gestione contenuti.
6. Template pubblici.
7. Prenotazioni e notifiche.
8. Pannello piattaforma.
9. Pagamenti ricorrenti, licenze e automazioni.
10. Test sicurezza, backup, GDPR e rilascio pilota.
