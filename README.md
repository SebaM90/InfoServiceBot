# InfoServiceBot

Read account balances and invoices from Edesur, AySA and Metrogas. Requires Node **24.15.0** and pnpm **12.8.1**; `pnpm-lock.yaml` is the dependency source of truth.

## Install and verify safely

```sh
pnpm --version
pnpm install --frozen-lockfile
pnpm test
pnpm smoke
pnpm smoke:browser
```

If your pnpm version is different, run the pinned version without changing global tools:

```sh
npx --yes pnpm@12.8.1 install --frozen-lockfile
```

Puppeteer's approved install script downloads Chrome. If the browser cache is missing, run `pnpm exec puppeteer browsers install chrome`.

`pnpm test` and `pnpm smoke` use offline fixtures/mocks, never load `.env`, and never log in to providers. `pnpm smoke:browser` launches and closes the real browser against local HTML with page requests blocked; it does not load credentials.

## Run against real accounts

Copy `.env.example` to `.env` and fill in `EDESUR_USER`, `EDESUR_PASS`, `METROGAS_USER`, `METROGAS_PASS`, `AYSA_USER`, and `AYSA_PASS`. Keep this file private. Optional service timeout values (`EDESUR_TIMEOUT`, `METROGAS_TIMEOUT`, `AYSA_TIMEOUT`) must be positive numbers in milliseconds; the default is 20000.

```sh
pnpm start
```

Unlike smoke checks, **start logs in to real providers**, deletes previous `captura*.png` files in the working directory, and writes screenshots, logs and Metrogas PDFs. These files may contain account information; do not publish them. Partial service failures produce a nonzero exit status while successful results remain visible. Missing configuration fails before browser launch.

Provider login flows and selectors require authorized live verification; offline checks cannot prove their current behavior. Invoice downloads verify HTTPS certificates and reject failed HTTP responses instead of saving error pages as PDFs.

## Example output

![image](https://user-images.githubusercontent.com/39964514/235238007-9fb564aa-eaa1-4db8-bb25-f64e19758f9b.png)
