"use server";

import type { Client } from "@/lib/schemas";

async function createClient(data: Client): Promise<Client | null> {
  try {
  } catch (error) {
    console.error(error);
  }

  return null;
}

async function readClient(
  document?: Client["document"]
): Promise<Client | null> {
  try {
  } catch (error) {
    console.error(error);
  }

  return null;
}

async function updateClient(
  document: Client["document"],
  patch: Client
): Promise<Client | null> {
  try {
  } catch (error) {
    console.error(error);
  }

  return null;
}

async function deleteClient(
  document: Client["document"]
): Promise<boolean | null> {
  try {
  } catch (error) {
    console.error(error);
  }

  return false;
}

export { createClient, readClient, updateClient, deleteClient };
