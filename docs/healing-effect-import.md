# Healing effect summary import

## Scope and source

Only `02_참여자별_스팟요약` and `03_전체_스팟요약` are read. No raw data import,
statistical recomputation, formula evaluation, or automatic startup import.
Landing and protected Admin detail now consume these summaries through the query service.
The external workbook remains read-only; do not copy it into this repository or a test fixture.
Tests generate synthetic workbooks in temporary directories.

`HealingEffectExcelParser.parse(Path)` reads and hashes the same bytes, validates sheet/header/
row types, unique pairs, HS code/name and numeric capacity, and returns immutable records.
Only numeric literals are accepted for rates and counts; formulas, blanks, numeric strings,
fractional/negative counts and values that cannot fit losslessly in DECIMAL(38,18) fail.
Rates are percentage points (19.5 means 19.5%), not fractions. There is no 100% cap.
No missing participant/spot combinations are synthesized.

`HealingEffectDatabaseImporter.execute(...)` validates DB mappings, then persists in a
single JDBC transaction. It is deliberately not a Spring bean: no `@Transactional` proxy,
SpringApplication, DataInitializer, Hibernate DDL, or application profile is involved.
The caller must supply a fresh auto-commit connection and close it after the call.
All validations complete before any INSERT. ImportBatch is inserted last, before commit.
Any SQL/runtime failure rolls back both summary tables and the batch.

## Mapping and queries

Participant text must match `P[0-9]{3}` exactly. `P004` maps to `Member.participantNo=4`;
only the Member FK is stored. Every referenced Member must exist. A duplicate mapping fails.
An explicit Site ID scopes Spot matching; codes are not globally unique.
That Site must contain exactly HC-A 회복 코스, HC-B 감각 코스, HC-C 힐링 코스 and
HS1 호스타 정원, HS2 곶자왈원, HS3 가든 위스퍼스, HS4 콜로네이드 가든,
HS5 블로썸 가든, HS6 극림원 in the expected two-spots-per-course arrangement.
Missing, additional, renamed, duplicate or ambiguously mapped courses/spots fail closed.
Unrelated Sites do not affect mapping.

Repositories provide Site overall, Member, Member+Site, and exact Spot/pair lookups.
Queries sort HS1 through HS6 by code. `HealingEffectQueryService.findMember` returns
missing DTOs for absent combinations without storing rows; actual zero remains `0.0%`.
`HealingEffectView` contains no participant identifier and formats only display strings
with HALF_UP to one decimal place. DB values retain source precision at scale 18.

## Explicit execution

Run from `manage/`. Supply credentials via environment; do not paste secrets into commands,
logs, source files, or documentation. The utility does not load credentials from Spring YAML.

```sh
export HEALING_IMPORT_JDBC_URL='jdbc:mysql://127.0.0.1:3306/manage'
export HEALING_IMPORT_DB_USER='<local user>'
# Set HEALING_IMPORT_DB_PASSWORD securely in your shell/session.

./gradlew healingEffectImport --args='--file ../private-data/healing_spot_stress_emotional_summary.xlsx --site-id 1 --dry-run'
```

Only localhost/127.0.0.1 MySQL URLs without URL options are accepted. Railway/remote URLs
are rejected. File path, positive Site ID, and exactly one of `--dry-run`/`--write` are required.
Dry-run sets JDBC read-only and MySQL transaction read-only, runs SELECT/metadata checks,
then rolls back. It never creates tables or saves a batch. Missing new tables are reported
as `schemaReady=false`, while mapping validation and planned row counts still run.

Explicit write invocation (requires authorization for the target environment):

```sh
./gradlew healingEffectImport --args='--file <external.xlsx> --site-id <verified-site-id> --write'
```

Before an authorized write, back up the local DB and prepare/review the three tables using
`docs/healing-effect-schema.sql` (manual SQL, not an automatic migration).
Existing referenced tables and summary tables must use InnoDB. Do not run the normal app
just to dry-run, since its existing `ddl-auto=update` can change schema.
Repeat dry-run and require `schemaReady=true`, zero validation errors, the expected SHA and
counts. See `healing-effect-local-validation.md` for the subsequently authorized local import.
Production schema/import/deployment is a separate, unperformed step.

Same SHA+Site returns `ALREADY_IMPORTED` with zero inserts, even after summary deletion.
Same SHA with a different Site fails. Any existing batch/summary data with another SHA or
unknown provenance rejects replacement, including during dry-run. Batch uniqueness is global.
Never delete the batch to force a reimport. Write mode locks Sites in ID order and Members
in ID order; concurrent importers serialize. Site editing uses the same Site locks and
Member deletion takes the Member lock before cleaning summaries.

Member deletion explicitly removes its participant summaries, preserving overall data.
Unused Spot deletion removes both kinds of summaries. Scheduled Spot deletion remains
blocked by existing policy. No cascade remove was added. Batch audit records survive deletion.

## Read-only validation on 2026-09-30

Source: external `../private-data/healing_spot_stress_emotional_summary.xlsx`.
SHA-256: `d0f81649162ee0177093365a27c5a53e51ec152135b2d70627c9f000185cb31d`.
Local Site 1 mapping passed. Existing Member participant numbers span 1–11 (11 Members).
Parser and DB mapping validation passed: overall 6 rows, participant summary 60 rows,
planned inserts 6/60, validation errors 0. HS6 displayed 21.2% / 200.4%.
Status `DRY_RUN`, `schemaReady=false`: all three new tables were absent.
No schema/data/batch writes were performed. SQL preparation above was not executed.

## Tests and next UI stage

Run `./gradlew test` and `git diff --check`. Tests use H2 isolated from MySQL and cover
parser failures, precision, mapping, unique constraints, ordered queries, missing versus zero,
SHA guards, concurrent duplicate import, late failure rollback, missing schema and deletions.
Actual MySQL write/rollback is intentionally not exercised with the private workbook.

HomeController now supplies overall effects and anonymous example DTOs to landing.html/landing.js.
AdminController supplies Member effects to admin/member-detail.html. The successful batch selects
the target Site. Public examples select the first complete six-Spot Member by participantNo;
no complete candidate yields an empty state, with no sample-value fallback.
Public personal views must use the label `참가자 예시` and disclose no identifiers in HTML,
JS, attributes or payloads. These values are Spot averages, not a chronological series;
do not connect Baseline → HS1 → HS2 as a time trend. Missing rows mean `측정 없음`.
