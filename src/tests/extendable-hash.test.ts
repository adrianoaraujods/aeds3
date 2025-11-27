"use server";

import * as fs from "fs";
import * as path from "path";
import z from "zod";

import { DATA_FOLDER_PATH } from "@/lib/config";
import { ExtendableHash } from "@/lib/extendable-hash";

const TEST_FOLDER = path.join(DATA_FOLDER_PATH, "test");
const DIR_PATH = path.join(TEST_FOLDER, "extendable-hash.dir");
const BKT_PATH = path.join(TEST_FOLDER, "extendable-hash.bkt");

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

export async function extendableHashTests() {
  console.log("Start Extendable Hash tests...");

  try {
    if (!fs.existsSync(TEST_FOLDER)) fs.mkdirSync(TEST_FOLDER);
    if (fs.existsSync(DIR_PATH)) fs.unlinkSync(DIR_PATH);
    if (fs.existsSync(BKT_PATH)) fs.unlinkSync(BKT_PATH);

    // 1. Basic CRUD
    console.log("Testing Basic CRUD...");
    const hash = new ExtendableHash(DIR_PATH, BKT_PATH, z.number());

    hash.insert(1, 100);
    assert(hash.find(1) === 100, "Should find inserted key 1");

    hash.update(1, 200);
    assert(hash.find(1) === 200, "Should find updated key 1");

    hash.remove(1);
    assert(hash.find(1) === null, "Should not find deleted key 1");

    // 2. Volume Test (Splitting)
    console.log("Testing Volume Insert (Bucket Splitting)...");
    const MAX_ITEMS = 10_000;

    const start = performance.now();
    for (let i = 0; i < MAX_ITEMS; i++) {
      hash.insert(i, i * 10);
    }
    const end = performance.now();
    console.log(
      `   Inserted ${MAX_ITEMS} items in ${(end - start).toFixed(2)}ms`
    );

    // Verify random subset
    assert(hash.find(0) === 0, "Find first item");
    assert(hash.find(MAX_ITEMS - 1) === (MAX_ITEMS - 1) * 10, "Find last item");
    assert(
      hash.find(Math.floor(MAX_ITEMS / 2)) === Math.floor(MAX_ITEMS / 2) * 10,
      "Find middle item"
    );

    // 3. Persistence Check
    console.log("Testing Persistence...");
    // Simulate restart by creating new instance on same files
    const reloadedHash = new ExtendableHash(DIR_PATH, BKT_PATH, z.number());
    assert(
      reloadedHash.find(50) === 500,
      "Should find key 50 in reloaded hash"
    );
    assert(
      reloadedHash.find(MAX_ITEMS - 1) === (MAX_ITEMS - 1) * 10,
      "Should find last key in reloaded hash"
    );

    console.log("✅ All tests passed successfully.");
  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    if (fs.existsSync(DIR_PATH)) fs.unlinkSync(DIR_PATH);
    if (fs.existsSync(BKT_PATH)) fs.unlinkSync(BKT_PATH);
    if (fs.existsSync(TEST_FOLDER)) fs.rmdirSync(TEST_FOLDER);
  }
}
