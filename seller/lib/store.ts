import { Pool } from "@neondatabase/serverless";
import type { MarketTerms } from "./terms";

export type SellerLicense = {
  id: string;
  offerId: string;
  title: string;
  artist: string;
  terms: MarketTerms;
  issuedAt: string;
  transactionHash: string;
  settlementTransactionHash: string | null;
  payer: string;
  payee: string;
  amountBaseUnits: string;
  asset: string;
  network: string;
};

export type LicenseRecord = {
  transactionHash: string;
  licenseId: string;
  offerId: string;
  license: SellerLicense;
  payer: string;
  payee: string;
  amountBaseUnits: string;
  asset: string;
  network: string;
  settlementTransactionHash: string | null;
  issuedAt: Date;
};

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.SELLER_DATABASE_URL;
  if (!connectionString) throw new Error("SELLER_DATABASE_URL is not configured.");
  pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  return pool;
}

async function ready(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await getPool().query(`
        create table if not exists seller_licenses (
          transaction_hash text primary key,
          license_id text not null unique,
          offer_id text not null,
          license jsonb not null,
          payer text not null,
          payee text not null,
          amount_base_units text not null,
          asset text not null,
          network text not null,
          issued_at timestamptz not null,
          settlement_transaction_hash text,
          created_at timestamptz not null default now()
        )
      `);
      await getPool().query(
        "alter table seller_licenses add column if not exists settlement_transaction_hash text",
      );
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

type Row = {
  transaction_hash: string;
  license_id: string;
  offer_id: string;
  license: SellerLicense;
  payer: string;
  payee: string;
  amount_base_units: string;
  asset: string;
  network: string;
  settlement_transaction_hash: string | null;
  issued_at: Date;
};

function toRecord(row: Row): LicenseRecord {
  return {
    transactionHash: row.transaction_hash,
    licenseId: row.license_id,
    offerId: row.offer_id,
    license: row.license,
    payer: row.payer,
    payee: row.payee,
    amountBaseUnits: row.amount_base_units,
    asset: row.asset,
    network: row.network,
    settlementTransactionHash: row.settlement_transaction_hash,
    issuedAt: row.issued_at,
  };
}

export async function findLicenseByTxHash(transactionHash: string): Promise<LicenseRecord | null> {
  await ready();
  const result = await getPool().query<Row>("select * from seller_licenses where transaction_hash = $1 limit 1", [transactionHash]);
  return result.rows[0] ? toRecord(result.rows[0]) : null;
}

export async function findLicenseById(licenseId: string): Promise<LicenseRecord | null> {
  await ready();
  const result = await getPool().query<Row>("select * from seller_licenses where license_id = $1 limit 1", [licenseId]);
  return result.rows[0] ? toRecord(result.rows[0]) : null;
}

export async function insertLicense(record: LicenseRecord): Promise<LicenseRecord> {
  await ready();
  await getPool().query(
    `insert into seller_licenses
      (transaction_hash, license_id, offer_id, license, payer, payee, amount_base_units, asset, network, issued_at, settlement_transaction_hash)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
     on conflict (transaction_hash) do nothing`,
    [
      record.transactionHash,
      record.licenseId,
      record.offerId,
      JSON.stringify(record.license),
      record.payer,
      record.payee,
      record.amountBaseUnits,
      record.asset,
      record.network,
      record.issuedAt,
      record.settlementTransactionHash,
    ],
  );
  const stored = await findLicenseByTxHash(record.transactionHash);
  if (!stored) throw new Error("The seller license was not stored.");
  return stored;
}
