# Regole di sviluppo di Selfweb

## Interfaccia web

- Usa Tailwind CSS per tutte le pagine e i componenti web di Selfweb. La regola riguarda le vetrine pubbliche, i template, i flussi di accesso e prenotazione, il pannello del gestore e il pannello del supervisor.
- Usa le utility Tailwind per layout, spaziature, tipografia, stati dei controlli e comportamento responsive. Riutilizza i componenti condivisi e i token di `tailwind.config.ts`. Esprimi i valori personalizzabili dei template con variabili CSS usate dalle utility Tailwind.
- Quando modifichi una schermata esistente, porta in Tailwind gli stili interessati e verifica il risultato su telefono e desktop. Usa un unico framework CSS per il progetto.
