import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbMvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { MemoryWorkflowDao } from "./MemoryWorkflowDao";

const MANUAL_BUNDLES = {
  mvp: { mainModule: duckdbMvpWasm, mainWorker: duckdbMvpWorker },
  eh: { mainModule: duckdbEhWasm, mainWorker: duckdbEhWorker },
};

function sql(value) {
  if (value == null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function json(value) { return sql(JSON.stringify(value ?? {})); }

function rows(table) {
  return table.toArray().map((row) => row.toJSON?.() ?? { ...row });
}

function parseJson(value, fallback) {
  try { return JSON.parse(value ?? ""); } catch { return fallback; }
}

export class DuckDbWasmDao {
  constructor({ databasePath = "opfs://cleardose-flow-lab.duckdb", fallback } = {}) {
    this.databasePath = databasePath;
    this.fallback = fallback ?? new MemoryWorkflowDao({ reason: "DuckDB-Wasm was unavailable." });
    this.db = null;
    this.connection = null;
    this.worker = null;
    this.databaseStatus = { engine: "duckdb-wasm", persistence: "initializing", state: "idle", drugCount: 0 };
  }

  async initialize({ drugs = [] } = {}) {
    try {
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      this.worker = new Worker(bundle.mainWorker);
      this.db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), this.worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      await this.db.open({
        path: this.databasePath,
        accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        opfs: { fileHandling: "auto" },
        query: { castBigIntToDouble: true, castTimestampToDate: true },
      });
      this.connection = await this.db.connect();
      await this.createSchema();
      await this.seedDrugs(drugs);
      this.databaseStatus = {
        engine: "duckdb-wasm",
        persistence: "opfs",
        state: "ready",
        fallbackReason: "",
        drugCount: drugs.length,
      };
      return this.status();
    } catch (error) {
      await this.disposeDuckDb();
      await this.fallback.initialize({ drugs });
      this.databaseStatus = {
        ...this.fallback.status(),
        engine: "memory-fallback",
        fallbackReason: error instanceof Error ? error.message : "DuckDB-Wasm initialization failed.",
      };
      return this.status();
    }
  }

  status() { return Object.freeze({ ...this.databaseStatus }); }
  get usingFallback() { return !this.connection; }

  async createSchema() {
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS drugs (
        id VARCHAR PRIMARY KEY, name VARCHAR, generic_for VARCHAR, category VARCHAR,
        drug_class VARCHAR, comparison_group VARCHAR, udi VARCHAR, payload_json VARCHAR
      );
      CREATE TABLE IF NOT EXISTS flow_instances (
        id VARCHAR PRIMARY KEY, definition_id VARCHAR, title VARCHAR, state VARCHAR,
        status VARCHAR, context_json VARCHAR, event_count INTEGER, created_at VARCHAR, updated_at VARCHAR
      );
      CREATE TABLE IF NOT EXISTS flow_events (
        id VARCHAR PRIMARY KEY, flow_id VARCHAR, definition_id VARCHAR, event_type VARCHAR,
        from_state VARCHAR, to_state VARCHAR, source VARCHAR, correlation_id VARCHAR,
        context_json VARCHAR, created_at VARCHAR
      );
      CREATE TABLE IF NOT EXISTS agent_exchanges (
        id VARCHAR PRIMARY KEY, type VARCHAR, flow_id VARCHAR, status VARCHAR,
        request_json VARCHAR, instruction VARCHAR, response_schema_json VARCHAR,
        created_at VARCHAR, updated_at VARCHAR
      );
      CREATE TABLE IF NOT EXISTS generated_cards (
        id VARCHAR PRIMARY KEY, exchange_id VARCHAR, flow_id VARCHAR, status VARCHAR,
        payload_json VARCHAR, created_at VARCHAR, updated_at VARCHAR
      );
    `);
  }

  async seedDrugs(drugs) {
    if (!drugs.length) return;
    const values = drugs.map((drug) => `(${[
      drug.id,
      drug.name,
      drug.genericFor,
      drug.category,
      drug.drugClass,
      drug.comparisonGroup,
      drug.identifiers?.udi,
    ].map(sql).join(",")},${json(drug)})`).join(",");
    await this.connection.query(`INSERT OR REPLACE INTO drugs VALUES ${values}; CHECKPOINT;`);
  }

  async appendEvent(event, flow) {
    if (this.usingFallback) return this.fallback.appendEvent(event, flow);
    await this.connection.query(`
      INSERT OR REPLACE INTO flow_events VALUES (
        ${sql(event.id)}, ${sql(event.flowId)}, ${sql(event.definitionId)}, ${sql(event.type)},
        ${sql(event.fromState)}, ${sql(event.toState)}, ${sql(event.source)}, ${sql(event.correlationId)},
        ${json(event.context)}, ${sql(event.createdAt)}
      );
      INSERT OR REPLACE INTO flow_instances VALUES (
        ${sql(flow.id)}, ${sql(flow.definitionId)}, ${sql(flow.title)}, ${sql(flow.state)},
        ${sql(flow.status)}, ${json(flow.context)}, ${Number(flow.eventCount)}, ${sql(flow.createdAt)}, ${sql(flow.updatedAt)}
      );
      CHECKPOINT;
    `);
  }

  async saveExchange(exchange) {
    if (this.usingFallback) return this.fallback.saveExchange(exchange);
    await this.connection.query(`INSERT OR REPLACE INTO agent_exchanges VALUES (
      ${sql(exchange.id)}, ${sql(exchange.type)}, ${sql(exchange.flowId)}, ${sql(exchange.status)},
      ${json(exchange.requestContext)}, ${sql(exchange.instruction)}, ${json(exchange.expectedResponseSchema)},
      ${sql(exchange.createdAt)}, ${sql(exchange.updatedAt)}
    ); CHECKPOINT;`);
  }

  async saveCard(card) {
    if (this.usingFallback) return this.fallback.saveCard(card);
    await this.connection.query(`INSERT OR REPLACE INTO generated_cards VALUES (
      ${sql(card.id)}, ${sql(card.exchangeId)}, ${sql(card.flowId)}, ${sql(card.status)},
      ${json(card)}, ${sql(card.createdAt)}, ${sql(card.updatedAt)}
    ); CHECKPOINT;`);
  }

  async loadSnapshot() {
    if (this.usingFallback) return this.fallback.loadSnapshot();
    const [flowRows, eventRows, exchangeRows, cardRows] = await Promise.all([
      this.connection.query("SELECT * FROM flow_instances ORDER BY updated_at DESC"),
      this.connection.query("SELECT * FROM flow_events ORDER BY created_at ASC"),
      this.connection.query("SELECT * FROM agent_exchanges ORDER BY updated_at DESC"),
      this.connection.query("SELECT * FROM generated_cards ORDER BY updated_at DESC"),
    ]);
    return {
      flows: rows(flowRows).map((row) => ({
        id: row.id, definitionId: row.definition_id, title: row.title, state: row.state,
        status: row.status, context: parseJson(row.context_json, {}), eventCount: Number(row.event_count),
        createdAt: row.created_at, updatedAt: row.updated_at,
      })),
      events: rows(eventRows).map((row) => ({
        id: row.id, flowId: row.flow_id, definitionId: row.definition_id, type: row.event_type,
        fromState: row.from_state, toState: row.to_state, source: row.source,
        correlationId: row.correlation_id, context: parseJson(row.context_json, {}), createdAt: row.created_at,
      })),
      exchanges: rows(exchangeRows).map((row) => ({
        id: row.id, type: row.type, flowId: row.flow_id, status: row.status,
        requestContext: parseJson(row.request_json, {}), instruction: row.instruction,
        expectedResponseSchema: parseJson(row.response_schema_json, {}), createdAt: row.created_at, updatedAt: row.updated_at,
      })),
      cards: rows(cardRows).map((row) => parseJson(row.payload_json, {})),
      database: this.status(),
    };
  }

  async clearWorkflowData() {
    if (this.usingFallback) return this.fallback.clearWorkflowData();
    await this.connection.query("DELETE FROM flow_events; DELETE FROM flow_instances; DELETE FROM agent_exchanges; DELETE FROM generated_cards; CHECKPOINT;");
  }

  async disposeDuckDb() {
    try { await this.connection?.close(); } catch { /* best effort */ }
    try { await this.db?.terminate(); } catch { /* best effort */ }
    try { this.worker?.terminate(); } catch { /* best effort */ }
    this.connection = null;
    this.db = null;
    this.worker = null;
  }
}

