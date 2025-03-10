import { describe, it, expect, beforeEach} from 'vitest';
import { ClassDataset } from '@/classes/ClassDataset';

import httpServer from 'http-server';
let server;
const PORT = 8081;
const HOST = 'localhost';

// Test the ClassDataset class
describe('ClassDataset', () => {
    let dataset;

    beforeEach(() => {
        dataset = new ClassDataset();
    });

    it('should load RDF data from Turtle file and only add subclass triples', async () => {

        console.log("Running ClassDataset Test 1...")

        expect(dataset.graphLoaded).toBe(false);
        expect(dataset.prefixesLoaded).toBe(false);

        server = httpServer.createServer({ });
        // server.listen(8080, 'localhost');
        server.listen(PORT, HOST, (err) => {
            if (err) {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`Port ${PORT} is already in use. Ignoring...`);
                } else {
                    throw err; // Re-throw unexpected errors
                }
            } else {
                console.log(`Test server started on http://${HOST}:${PORT}`);
            }
        });

        const fileUrl = `http://${HOST}:${PORT}/tests/mockData.ttl`
        await dataset.loadRDF(fileUrl);
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for event loop to process stream
        expect(dataset.graph.size).toBe(1);
        expect(dataset.graphLoaded).toBe(true);
        expect(dataset.prefixesLoaded).toBe(true);
        const serializedGraph = await dataset.serializeGraph();
        expect(serializedGraph).not.toContain('<http://example.com/subject>');
        expect(serializedGraph).not.toContain('<http://example.com/predicate>');
        expect(serializedGraph).not.toContain('"example"');
        expect(serializedGraph).toContain('<https://concepts.datalad.org/s/things/v1/Property>');
        expect(serializedGraph).toContain('<https://concepts.datalad.org/s/things/v1/Thing>');
    });

});
