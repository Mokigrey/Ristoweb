# RistoWeb MVP 1.0

Starter tecnico per una piattaforma multi-tenant di siti web per ristoranti e pizzerie.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase: PostgreSQL, Auth e Storage
- GitHub per versionamento
- Vercel per il primo deployment

## Stato
Questo pacchetto è lo scheletro iniziale: contiene specifica, schema SQL iniziale e una pagina di avvio. Non è ancora un prodotto pronto per clienti o produzione.

## Avvio locale
Richiede Node.js LTS e un progetto Supabase.

1. `npm install`
2. Copiare `.env.example` in `.env.local` e inserire le credenziali Supabase.
3. `npm run dev`
4. Aprire `http://localhost:3000`.

## Prossimi passaggi
1. Configurare Supabase e applicare la migration SQL.
2. Implementare login e ruoli (`platform_admin`, `tenant_admin`, `tenant_editor`).
3. Implementare risoluzione del sito tramite dominio.
4. Implementare dashboard e CRUD contenuti.
5. Implementare richieste prenotazione e notifiche.
6. Aggiungere i tre template.

## Decisioni da non rimandare
- Dominio principale della piattaforma e strategia domini clienti.
- Provider email transazionale.
- Regole di retention, backup, privacy e trattamento dati.
- Contratto licenza/abbonamento e procedura di esportazione.
