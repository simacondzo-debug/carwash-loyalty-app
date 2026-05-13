# Backend setup for the permanent domain

The live app needs `/api/state` to work so customer phones and the owner device share one database.

This project now includes:

- `api/state.js` - Vercel API endpoint for the shared app database
- `package.json` - installs `@vercel/blob`

## Vercel setup

1. Open the Vercel project connected to `thecarwash1.co.za`.
2. Add Vercel Blob storage to the project.
3. Make sure the project has this environment variable:
   `BLOB_READ_WRITE_TOKEN`
4. Redeploy the project.
5. Test:
   `https://www.thecarwash1.co.za/api/state`

The test link should return JSON with `version` and `state`.

Do not upload local `data/`, `tools/`, logs, or old zip files.
