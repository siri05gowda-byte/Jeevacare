# Linking the demo doctors and patients

The server's startup bootstrap (`server/src/utils/bootstrapDemoData.js`) creates the demo hospitals,
doctors and patients, but it does not connect them. `server/src/scripts/linkDemoActivity.js` does:
it gives each demo patient one or two doctors and an appointment history (finished, cancelled, no-show
and upcoming visits on working days), so the doctor, patient and hospital dashboards look lived in.

It only ever touches the 31 demo accounts, never real users, and tags everything it writes with
`demo-seed:v1` so it can be removed again.

Run these from the `server/` folder. The database comes from `MONGODB_URI` in `server/.env`.

```bash
node src/scripts/linkDemoActivity.js                  # DRY RUN: prints the plan, writes nothing
node src/scripts/linkDemoActivity.js --apply          # write it
node src/scripts/linkDemoActivity.js --remove         # dry run of the undo
node src/scripts/linkDemoActivity.js --remove --apply # remove everything it added
```

- It prints the database it is connected to before doing anything. Check that line.
- The same `--seed=N` gives the same plan (default `20261115`); use another number for a different shuffle.
- Running `--apply` twice is safe: patients that already have demo appointments are skipped.
- MongoDB Atlas only accepts connections from allow-listed IP addresses (Atlas, Network Access). If the
  script says it cannot reach your cluster, add your current IP there.

## Related checks

`server/src/__tests__/demo-flows.verification.test.js` runs login, settings, document upload and appointment
booking against a throwaway database. It only runs when `FLOW_TEST_MONGODB_URI` is set and never reads
`MONGODB_URI`:

```bash
FLOW_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/jeevacare-test npx vitest run src/__tests__/demo-flows.verification.test.js
```
