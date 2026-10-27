/** Recomputes all leaderboards now. Run from cron or after bulk data changes. */
import { recomputeRankings } from "../src/server/services/rankings";
import { db } from "../src/server/db";

recomputeRankings()
  .then((r) => console.log(r ? `Ranking run ${r.runId}: ${r.entries} entries` : "Another recompute is in progress; skipped."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
