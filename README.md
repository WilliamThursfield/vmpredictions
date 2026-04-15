# VM 2026 Predictions

En webapp for private VM-leagues, inspirert av Excel-arket `WCup_2026_4.2.5_en.xlsx`.

## Hva som er bygget

- enkel multiplayer-MVP med leagues, deltakerinnsending og leaderboard
- gruppespill med seks kamper per gruppe
- automatisk tabellberegning basert på resultatene du skriver inn
- rangering av tredjeplasser og oversikt over hvem som går videre
- offisiell `Round of 32`-mapping for kombinasjoner av beste tredjeplasser
- sluttspill fra `Round of 32` til finale
- automatisk videreføring av vinnere og tapere i bracketen
- kampdatoer, kampnumre og arenaer hentet fra workbooken
- live fasit, låste predictions og live leaderboard for league-spill
- admin-kode for å låse predictions og oppdatere fasit underveis
- lokal lagring i nettleseren med `localStorage`

## Live

- Domene: `https://vmpredictions.no`

## Kjøring

Installer avhengigheter:

```bash
npm install
```

Start app-serveren lokalt:

```bash
npm start
```

Åpne deretter `http://localhost:8000`.

Lokalt gjør serveren to ting:

- serverer frontend-filen
- lagrer leagues, entries og fasit i `data/leagues.json`

## Vercel-klar arkitektur

Prosjektet er nå lagt opp slik at:

- lokal utvikling kan bruke `data/leagues.json`
- produksjon kan bruke Postgres via `DATABASE_URL`
- API-et kan kjøres både fra `server.mjs` lokalt og fra `api/handler.js` på Vercel

### Miljøvariabler for deploy

- `DATABASE_URL`: Postgres-tilkobling for produksjon

Når `DATABASE_URL` finnes, blir tabellen `leagues` opprettet automatisk ved første kall.

## Neste steg for ekte publisering

- opprette et Postgres-prosjekt, for eksempel via Vercel Marketplace
- deploye repoet til Vercel
- koble `vmpredictions.no` til Vercel-prosjektet via DNS i Domeneshop
- senere: legge til innlogging eller e-postbasert admin hvis du vil bort fra admin-kode
