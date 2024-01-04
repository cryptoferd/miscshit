import fs from "node:fs/promises";
import createCsvWriter from "csv-writer";

async function extractIndexesToCSV() {
  try {
    const resultsFile = await fs.readFile("./results.json", "utf-8");
    const results = JSON.parse(resultsFile);

    const falseIndexes = results.filter((item) => item.existsInEthscriptions === false);
    const falseIndexesCount = falseIndexes.length;

    const falseIndexesMapped = falseIndexes.map((item) => ({ index: item.index }));

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: "./false_indexes.csv",
      header: [{ id: "index", title: "Index" }],
    });

    await csvWriter.writeRecords(falseIndexesMapped);
    console.log("Indexes where existsInEthscriptions is false written to false_indexes.csv");

    console.log(`Total instances where existsInEthscriptions is false: ${falseIndexesCount}`);
  } catch (error) {
    console.error("Error reading or parsing the results file:", error);
  }
}

extractIndexesToCSV();
