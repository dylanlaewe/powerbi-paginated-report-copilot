# Mac Electron RDL MVP manual test

## Launch

From a clean clone:

```bash
pnpm install
pnpm setup:electron
pnpm dev
```

## Focused procedure

1. Open `examples/regional-sales-request.txt` and copy the complete request.
2. Paste it into **Constrained report request**.
3. Click **Generate Report** once.
4. Confirm the status changes to **Validated** and the summary shows:
   - title `Northwind Field Sales — July 2026`
   - 6 rows
   - Central, East, West
   - template `production-pagination-letter`
   - SHA-256 `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`
   - Central `19 / 5,370 / 2,170`; East `10 / 7,590 / 2,830`; West `30 / 7,500 / 2,970`; Grand Total `59 / 20,460 / 7,970`
5. Click **Copy path**, paste into a text editor, and confirm it ends in `generated-reports/regional-sales-generated.rdl`.
6. Click **Reveal in Finder** and confirm Finder selects that exact RDL.
7. Compare it with the accepted CLI artifact:

   ```bash
   shasum -a 256 "<copied path>" artifacts/copilot-mvp/regional-sales-generated.rdl
   cmp "<copied path>" artifacts/copilot-mvp/regional-sales-generated.rdl
   ```

   Both hashes must match and `cmp` must exit zero.

8. Replace the request with invalid text and click Generate. Confirm a clear validation error is visible and the previous file is not replaced.
9. Replace `production pagination template` with `custom template`. Confirm the request is rejected.

The output folder is derived exclusively by the Electron main process from `app.getPath("userData")/generated-reports`. The renderer cannot submit a template path or output path.
