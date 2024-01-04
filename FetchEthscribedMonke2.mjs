import fs from "node:fs/promises";
import pMap from "p-map";
import crypto from "crypto";

const imgLOC = 'NM'; // Update this to your local directory path
const items = Array.from({ length: 10_000 })
  .fill(0)
  .map((_, index) => index);

async function splitArrayIntoGroups(array, groupSize) {
  const result = [];

  for (let i = 0; i < array.length; i += groupSize) {
    result.push(array.slice(i, i + groupSize));
  }

  return result;
}

const originalArray = items;
const groupSize = 100;
const groupedArrays = await splitArrayIntoGroups(originalArray, groupSize);

const stats = { minted: 0, supply: originalArray.length };
const results = [];

const getLocalImage = async (index) => {
  const imagePath = `${imgLOC}/${index}.png`;

  try {
    const imageBuffer = await fs.readFile(imagePath);
    const buf = Buffer.from(imageBuffer);
    const dataURI = `data:image/png;base64,${buf.toString("base64")}`;
    const sha = await sha256(dataURI);
    return { index, sha, dataURI };
  } catch (error) {
    console.error(`Error reading image ${index}:`, error);
    return null;
  }
};

await pMap(
  groupedArrays,
  async (items, idx) => {
    console.log("group:", idx + 1);
    const mapped = await pMap(
      items,
      async (index) => getLocalImage(index),
      { concurrency: 50 }
    );

    const exists = await checkExists(mapped.filter((x) => x !== null));

    if (exists === null) {
      console.log("some error");
      return;
    }

    await pMap(
      exists,
      async (x) => {
        if (x.eth) {
          stats.minted += 1;
        }

        results.push({
          index: x.index,
          sha: x.sha,
          dataURI: x.dataURI,
          existsInEthscriptions: Boolean(x.eth),
          transactionHash: x.eth ? x.eth.transaction_hash : null,
        });
      },
      { concurrency: 50 }
    );

    console.log("group end", idx + 1);
  },
  { concurrency: 5 }
).then(async () => {
  await fs.writeFile("./results.json", JSON.stringify(results, null, 2));
  await fs.writeFile("./status.json", JSON.stringify(stats));
});

function sha256(message) {
  const hash = crypto.createHash("sha256");
  hash.update(message);
  return hash.digest("hex");
}

async function checkExists(list) {
  const resp = await fetch(
    `https://api.ethscriptions.com/api/ethscriptions/exists_multi`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list.map((x) => x.sha)),
    }
  );

  if (!resp.ok) {
    console.log("some err", resp);
    return null;
  }

  const exists = await resp.json();

  return list.map((x) => ({ ...x, eth: exists[x.sha] }));
}