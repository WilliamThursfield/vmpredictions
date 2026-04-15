# VM 2026 Predictions

En webapp for private VM-leagues der venner kan sende inn sine predictions før turneringen starter, og følge et live leaderboard mens kampene spilles.

## Live

- Nettside: [vmpredictions.no](https://vmpredictions.no)

## Hva prosjektet gjør

- oppretter private leagues med egen league-kode
- lar flere deltakere sende inn sine predictions
- låser predictions når alle er ferdige
- lar admin legge inn live fasit kamp for kamp
- oppdaterer leaderboard fortløpende
- deler kun ut fasepoeng når en fase faktisk er ferdigspilt

## Funksjoner

- gruppespill med seks kamper per gruppe
- automatisk tabellberegning basert på score du skriver inn
- rangering av tredjeplasser og oversikt over hvem som går videre
- offisiell `Round of 32`-mapping for kombinasjoner av beste tredjeplasser
- sluttspill fra `Round of 32` til finale
- automatisk videreføring av vinnere og tapere i bracketen
- kampdatoer, kampnumre og arenaer hentet fra workbooken
- admin-kode for å låse predictions og oppdatere fasit underveis

## Tech stack

- HTML
- CSS
- Vanilla JavaScript
- Node.js
- Vercel
- Postgres

## Lokal kjøring

Installer avhengigheter:

```bash
npm install
```

Start appen lokalt:

```bash
npm start
```

Åpne deretter [http://localhost:8000](http://localhost:8000).

Lokalt blir data lagret i [data/leagues.json](./data/leagues.json).

## Deploy

Prosjektet er satt opp slik at:

- lokal utvikling bruker `data/leagues.json`
- produksjon bruker Postgres via `DATABASE_URL`
- API-et kan kjøres både fra `server.mjs` lokalt og fra `api/handler.js` på Vercel

Når `DATABASE_URL` finnes, blir tabellen `leagues` opprettet automatisk ved første kall.

## Bakgrunn

Prosjektet er inspirert av Excel-arket `WCup_2026_4.2.5_en.xlsx`, men bygget som en webapp for enklere deling, live scoring og league-spill mellom venner.
