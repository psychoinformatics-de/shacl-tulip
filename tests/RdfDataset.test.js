import { describe, it, expect, beforeEach, vi} from 'vitest';
import rdf from 'rdf-ext';
import { RDF, XSD } from '@/modules/namespaces';
import { RdfDataset } from '@/classes/RdfDataset';
import httpServer from 'http-server';

let server;
const PORT = 8080;
const HOST = 'localhost';

// import httpServer from 'http-server';

// Test the RdfDataset class
describe('RdfDataset', () => {
    let dataset;
    var i = 0;

    beforeEach(() => {
        dataset = new RdfDataset();
    });

    // test creation of class instance
    it('should create an empty dataset', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        expect(dataset.graph.size).toBe(0);
    });

    it('should add a quad to the dataset', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = rdf.namedNode('http://example.com/subject');
        const predicate = rdf.namedNode('http://example.com/predicate');
        const object = rdf.literal('example', XSD.string);
        const quad = rdf.quad(subject, predicate, object);

        dataset.addQuad(quad);

        expect(dataset.graph.size).toBe(1);
        expect(dataset.graph.has(quad)).toBe(true);
    });

    it('should correctly detect an RDF list', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const node1 = rdf.blankNode();
        const node2 = rdf.blankNode();
        const node3 = rdf.namedNode(RDF.nil.value);

        dataset.addQuad(rdf.quad(node1, RDF.first, rdf.literal("Item 1")));
        dataset.addQuad(rdf.quad(node1, RDF.rest, node2));
        dataset.addQuad(rdf.quad(node2, RDF.first, rdf.literal("Item 2")));
        dataset.addQuad(rdf.quad(node2, RDF.rest, node3));

        expect(dataset.isRdfList(node1)).toBe(true);
        expect(dataset.isRdfList(node2)).toBe(true);
        expect(dataset.isRdfList(node3)).toBe(false);
    });

    it('should convert an RDF list to an array', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const node1 = rdf.blankNode();
        const node2 = rdf.blankNode();
        const node3 = rdf.namedNode(RDF.nil.value);

        dataset.addQuad(rdf.quad(node1, RDF.first, rdf.literal("Item 1")));
        dataset.addQuad(rdf.quad(node1, RDF.rest, node2));
        dataset.addQuad(rdf.quad(node2, RDF.first, rdf.literal("Item 2")));
        dataset.addQuad(rdf.quad(node2, RDF.rest, node3));

        const result = dataset.rdfListToArray(node1);
        expect(result).toEqual(["Item 1", "Item 2"]);
    });

    it('should serialize the dataset to Turtle format', async () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = rdf.namedNode('http://example.com/subject');
        const predicate = rdf.namedNode('http://example.com/predicate');
        const object = rdf.literal('example', XSD.string);
        const quad = rdf.quad(subject, predicate, object);

        dataset.addQuad(quad);
        const serializedGraph = await dataset.serializeGraph();
        expect(serializedGraph).toContain('<http://example.com/subject>');
        expect(serializedGraph).toContain('<http://example.com/predicate>');
        expect(serializedGraph).toContain('"example"');
    });

    it('should load RDF data from a Turtle file and run associated functions', async () => {
        console.log(`Running RdfDataset Test ${i++}...`)

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

        expect(dataset.graphLoaded).toBe(false);
        expect(dataset.prefixesLoaded).toBe(false);

        const fileUrl = `http://${HOST}:${PORT}/tests/mockData.ttl`

        const response = await fetch(fileUrl);
        expect(response.status).toBe(200);
        const text = await response.text();
        await dataset.loadRDF(fileUrl);
        // Wait for event loop to process stream
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(dataset.graph.size).toBe(2);
        expect(dataset.prefixes['ex']).toBe('http://example.com/');
        expect(dataset.graphLoaded).toBe(true);
        expect(dataset.prefixesLoaded).toBe(true);

        console.log(`Closing server on http://${HOST}:${PORT}`);
        server.close();

    });

    it('should resolve blank nodes correctly', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const blankNode = rdf.blankNode();
        const predicate = rdf.namedNode('http://example.com/predicate');
        const object = rdf.literal('value');
        
        dataset.addQuad(rdf.quad(blankNode, predicate, object));

        const resolved = dataset.resolveBlankNode(blankNode);
        expect(resolved[predicate.value]).toBe('value');
    });

    it('should retrieve subject triples', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = rdf.namedNode('http://example.com/subject');
        const predicate = rdf.namedNode('http://example.com/predicate');
        const object = rdf.literal('example');

        dataset.addQuad(rdf.quad(subject, predicate, object));

        const triples = dataset.getSubjectTriples(subject);
        expect(triples.length).toBe(1);
        expect(triples[0].predicate.equals(predicate)).toBe(true);
    });

    it('should retrieve object triples', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = rdf.namedNode('http://example.com/subject');
        const predicate = rdf.namedNode('http://example.com/predicate');
        const object = rdf.literal('example');

        dataset.addQuad(rdf.quad(subject, predicate, object));

        const triples = dataset.getObjectTriples(object);
        expect(triples.length).toBe(1);
        expect(triples[0].subject.equals(subject)).toBe(true);
    });

});
