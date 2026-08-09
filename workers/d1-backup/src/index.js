/**
 * Nightly D1 snapshots to R2, from inside Cloudflare.
 *
 * Bindings, not API tokens: the GitHub-Actions version of this job spent a
 * night failing on R2 token permissions, and a worker simply has no tokens
 * to misconfigure - the databases and the bucket are handed to it. It runs
 * where the data lives, on the same cron cadence.
 *
 * The dump is plain SQL - schema first, then batched INSERTs, then indexes -
 * so a restore is `wrangler d1 execute <db> --remote --file=backup.sql`
 * against a fresh database, or any SQLite anywhere. Every upload is read
 * back and decompressed before the run counts as success: a backup that
 * cannot round-trip is a rabbit's foot, not a backup.
 *
 * Manual runs: GET /run with the x-backup-key header (secret BACKUP_KEY).
 */

const BATCH = 500;

export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(backupAll(env));
	},

	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname !== "/run") return new Response("not found", { status: 404 });
		const key = request.headers.get("x-backup-key") || "";
		if (!env.BACKUP_KEY || key !== env.BACKUP_KEY) {
			return new Response("forbidden", { status: 403 });
		}
		if (url.searchParams.get("list") === "1") {
			const listing = await env.BACKUPS.list({ prefix: "d1/" });
			return Response.json(listing.objects.map((o) => ({ key: o.key, size: o.size })));
		}
		const report = await backupAll(env);
		return Response.json(report);
	},
};

async function backupAll(env) {
	const stamp = new Date().toISOString().slice(0, 10);
	const report = [];
	for (const [name, db] of [
		["timmies-passport-db", env.TIMMIES_DB],
		["site_analytics", env.ANALYTICS_DB],
	]) {
		const sql = await dumpSql(db);
		const gz = await gzip(sql);
		const objKey = `d1/${name}/${stamp}.sql.gz`;
		await env.BACKUPS.put(objKey, gz);

		// Read back and verify before believing it.
		const stored = await env.BACKUPS.get(objKey);
		if (!stored) throw new Error(`${objKey}: not found after put`);
		const restored = await gunzip(await stored.arrayBuffer());
		if (restored.length !== sql.length) {
			throw new Error(`${objKey}: round-trip mismatch (${restored.length} != ${sql.length})`);
		}
		report.push({ key: objKey, bytes: gz.byteLength, sqlChars: sql.length });
	}
	console.log("backup complete", JSON.stringify(report));
	return report;
}

async function dumpSql(db) {
	const master = (
		await db
			.prepare(
				`SELECT type, name, sql FROM sqlite_master
				 WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
				 ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`
			)
			.all()
	).results;

	const parts = ["PRAGMA defer_foreign_keys=TRUE;"];

	for (const item of master) {
		if (item.type !== "table") continue;
		parts.push(item.sql + ";");
		for (let offset = 0; ; offset += BATCH) {
			const rows = (
				await db.prepare(`SELECT * FROM "${item.name}" LIMIT ${BATCH} OFFSET ${offset}`).all()
			).results;
			for (const row of rows) {
				const cols = Object.keys(row);
				parts.push(
					`INSERT INTO "${item.name}" (` +
						cols.map((c) => `"${c}"`).join(",") +
						`) VALUES (` +
						cols.map((c) => literal(row[c])).join(",") +
						`);`
				);
			}
			if (rows.length < BATCH) break;
		}
	}

	// Indexes and triggers after the data, the way d1 export orders things.
	for (const item of master) {
		if (item.type !== "table") parts.push(item.sql + ";");
	}

	return parts.join("\n") + "\n";
}

function literal(v) {
	if (v === null || v === undefined) return "NULL";
	if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
	if (v instanceof ArrayBuffer) {
		const bytes = new Uint8Array(v);
		let hex = "";
		for (const b of bytes) hex += b.toString(16).padStart(2, "0");
		return `X'${hex}'`;
	}
	return `'${String(v).replace(/'/g, "''")}'`;
}

async function gzip(text) {
	const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
	return await new Response(stream).arrayBuffer();
}

async function gunzip(buf) {
	const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
	return await new Response(stream).text();
}
