const { ConfidentialClientApplication } = require("@azure/msal-node");

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const TOKEN_SCOPE = ["https://graph.microsoft.com/.default"];

let cachedWorkbookRef = null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getFetch() {
  if (typeof fetch === "function") {
    return fetch;
  }

  // eslint-disable-next-line global-require
  return require("node-fetch");
}

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: getRequiredEnv("GRAPH_CLIENT_ID"),
    clientSecret: getRequiredEnv("GRAPH_CLIENT_SECRET"),
    authority: `https://login.microsoftonline.com/${getRequiredEnv("TENANT_ID")}`,
  },
});

async function getAccessToken() {
  const response = await msalClient.acquireTokenByClientCredential({
    scopes: TOKEN_SCOPE,
  });

  if (!response || !response.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph access token.");
  }

  return response.accessToken;
}

async function graphRequest(path, options = {}) {
  const token = await getAccessToken();
  const doFetch = getFetch();

  const response = await doFetch(`${GRAPH_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Graph API ${options.method || "GET"} ${path} failed: ${response.status} ${response.statusText} :: ${errorText}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function resolveSiteId(hostname, sitePath) {
  const payload = await graphRequest(`/sites/${hostname}:${sitePath}`);
  if (!payload?.id) {
    throw new Error(`Unable to resolve siteId for ${hostname}:${sitePath}`);
  }
  return payload.id;
}

async function resolveDriveId(siteId) {
  const payload = await graphRequest(`/sites/${siteId}/drives`);
  const drives = payload?.value || [];
  if (drives.length === 0) {
    throw new Error(`No drives found for siteId ${siteId}`);
  }

  const preferred = drives.find(
    (d) => d.name === "Documents" || d.name === "Shared Documents"
  );

  const selected = preferred || drives[0];

  if (!preferred) {
    console.warn(
      `No preferred drive found. Using first drive: ${selected.name} (${selected.id})`
    );
  }

  return selected.id;
}

async function resolveItemId(driveId, filePath) {
  const payload = await graphRequest(`/drives/${driveId}/root:/${filePath}`);
  if (!payload?.id) {
    throw new Error(`Unable to resolve itemId for drive ${driveId} and file ${filePath}`);
  }
  return payload.id;
}

async function getWorkbookRef() {
  if (cachedWorkbookRef) {
    return cachedWorkbookRef;
  }

  const hostname = getRequiredEnv("SHAREPOINT_SITE_HOSTNAME");
  const sitePath = getRequiredEnv("SHAREPOINT_SITE_PATH");
  const filePath = getRequiredEnv("SHAREPOINT_EXCEL_FILE_PATH");

  const siteId = await resolveSiteId(hostname, sitePath);
  const driveId = await resolveDriveId(siteId);
  const itemId = await resolveItemId(driveId, filePath);

  cachedWorkbookRef = { siteId, driveId, itemId };
  return cachedWorkbookRef;
}

function parseWorkbookAddress(address) {
  const match = /^'?(.*?)'?!([^!]+)$/.exec(address || "");
  if (!match) {
    throw new Error(`Unexpected workbook address format: ${address}`);
  }

  const worksheetName = match[1].replace(/''/g, "'");
  const rangeAddress = match[2];
  return { worksheetName, rangeAddress };
}

async function getTableDataBodyRange(tableName) {
  const { driveId, itemId } = await getWorkbookRef();
  return graphRequest(
    `/drives/${driveId}/items/${itemId}/workbook/tables/${encodeURIComponent(
      tableName
    )}/dataBodyRange`
  );
}

async function patchRangeByAddress(worksheetName, rangeAddress, values) {
  const { driveId, itemId } = await getWorkbookRef();
  return graphRequest(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets/${encodeURIComponent(
      worksheetName
    )}/range(address='${encodeURIComponent(rangeAddress)}')`,
    {
      method: "PATCH",
      body: { values },
    }
  );
}

function mapQueueRow(values = []) {
  return {
    displayName: values[0] || "",
    status: String(values[1] || "").toLowerCase(),
    queueOrder: Number(values[2]) || 0,
    boostMode: String(values[3] || "normal").toLowerCase(),
    rowVersion: Number(values[4]) || 0,
    aadObjectId: values[5] || "",
    lastUpdatedUtc: values[6] || "",
  };
}

function toQueueRowValues(agent) {
  return [
    agent.displayName,
    agent.status,
    agent.queueOrder,
    agent.boostMode,
    agent.rowVersion,
    agent.aadObjectId || "",
    agent.lastUpdatedUtc,
  ];
}

async function getQueueAgents() {
  const tableName = getRequiredEnv("EXCEL_TABLE_NAME");
  const range = await getTableDataBodyRange(tableName);
  const rows = range?.values || [];
  return rows.map(mapQueueRow);
}

async function writeQueueAgents(updatedAgents) {
  const tableName = getRequiredEnv("EXCEL_TABLE_NAME");
  const range = await getTableDataBodyRange(tableName);
  const values = updatedAgents.map(toQueueRowValues);

  const { worksheetName, rangeAddress } = parseWorkbookAddress(range.address);
  await patchRangeByAddress(worksheetName, rangeAddress, values);
}

function mapLockRow(values = []) {
  return {
    lockOwnerAadId: values[0] || "",
    lockUntilUtc: values[1] || "1970-01-01T00:00:00.000Z",
    lockRowVersion: Number(values[2]) || 0,
  };
}

function toLockRowValues(lock) {
  return [lock.lockOwnerAadId || "", lock.lockUntilUtc, lock.lockRowVersion];
}

async function getLockRow() {
  const tableName = getRequiredEnv("LOCK_TABLE_NAME");
  const range = await getTableDataBodyRange(tableName);
  const row = (range?.values || [])[0] || [];
  return mapLockRow(row);
}

async function writeLockRow(lock) {
  const tableName = getRequiredEnv("LOCK_TABLE_NAME");
  const range = await getTableDataBodyRange(tableName);
  const { worksheetName, rangeAddress } = parseWorkbookAddress(range.address);
  await patchRangeByAddress(worksheetName, rangeAddress, [toLockRowValues(lock)]);
}

function clearWorkbookCache() {
  cachedWorkbookRef = null;
}

module.exports = {
  clearWorkbookCache,
  getLockRow,
  getQueueAgents,
  resolveDriveId,
  resolveItemId,
  resolveSiteId,
  writeLockRow,
  writeQueueAgents,
};
