import { describe, it, expect, beforeEach, vi} from 'vitest';
import { Store, Writer, DataFactory } from 'n3';
const { namedNode, literal, blankNode, quad } = DataFactory;
import { RDF, XSD } from '@/modules/namespaces';
import { RdfDataset } from '@/classes/RdfDataset';
import httpServer from 'http-server';

let server;
const PORT = 8080;
const HOST = 'localhost';

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
        expect(dataset.data.graph.size).toBe(0);
    });

    it('should add a quad to the dataset', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = namedNode('http://example.com/subject');
        const predicate = namedNode('http://example.com/predicate');
        const object = literal('example', XSD.string);
        const q = quad(subject, predicate, object);

        dataset.addQuad(q);

        expect(dataset.data.graph.size).toBe(1);
        expect(dataset.data.graph.has(q)).toBe(true);
    });

    it('should correctly detect an RDF list', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const node1 = blankNode();
        const node2 = blankNode();
        const node3 = namedNode(RDF.nil.value);

        dataset.addQuad(quad(node1, RDF.first, literal("Item 1")));
        dataset.addQuad(quad(node1, RDF.rest, node2));
        dataset.addQuad(quad(node2, RDF.first, literal("Item 2")));
        dataset.addQuad(quad(node2, RDF.rest, node3));

        expect(dataset.isRdfList(node1)).toBe(true);
        expect(dataset.isRdfList(node2)).toBe(true);
        expect(dataset.isRdfList(node3)).toBe(false);
    });

    it('should convert an RDF list to an array', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const node1 = blankNode();
        const node2 = blankNode();
        const node3 = namedNode(RDF.nil.value);

        dataset.addQuad(quad(node1, RDF.first, literal("Item 1")));
        dataset.addQuad(quad(node1, RDF.rest, node2));
        dataset.addQuad(quad(node2, RDF.first, literal("Item 2")));
        dataset.addQuad(quad(node2, RDF.rest, node3));

        const result = dataset.rdfListToArray(node1);
        expect(result).toEqual(["Item 1", "Item 2"]);
    });

    it('should serialize the dataset to Turtle format', async () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = namedNode('http://example.com/subject');
        const predicate = namedNode('http://example.com/predicate');
        const object = literal('example', XSD.string);
        const q = quad(subject, predicate, object);

        dataset.addQuad(q);
        const serializedGraph = await dataset.serializeGraph();
        expect(serializedGraph).toContain('<http://example.com/subject>');
        expect(serializedGraph).toContain('<http://example.com/predicate>');
        expect(serializedGraph).toContain('"example"');
    });

    it('should load RDF data from a Turtle file and run associated functions and catch emits', async () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        server = httpServer.createServer({ });
        server.listen(PORT, HOST, (err) => {
            if (err && err.code !== 'EADDRINUSE') throw err;
            console.log(`Test server started on http://${HOST}:${PORT}`);
        });
        expect(dataset.data.graphLoaded).toBe(false);
        expect(dataset.data.prefixesLoaded).toBe(false);
        const fileUrl = `http://${HOST}:${PORT}/tests/mockData.ttl`
        // const graphLoadedHandler = vi.fn();
        // dataset.addEventListener('graphLoaded', graphLoadedHandler);
        // await dataset.loadRDF(fileUrl);
        // await new Promise(resolve => dataset.addEventListener('graphLoaded', resolve));


        // Add listener to await graph load
        const graphLoadedHandler = vi.fn();
        const graphLoadedPromise = new Promise(resolve => {
            dataset.addEventListener('graphLoaded', event => {
                graphLoadedHandler(event);
                resolve();
            });
        });

        await dataset.loadRDF(fileUrl);
        await graphLoadedPromise;
        
        
        expect(graphLoadedHandler).toHaveBeenCalledTimes(1);
        expect(dataset.data.prefixes['ex']).toBe('http://example.com/');
        expect(dataset.data.graphLoaded).toBe(true);
        expect(dataset.data.prefixesLoaded).toBe(true);
        expect(dataset.data.graph.size).toBe(2);
        console.log('Quads in graph:', dataset.data.graph.getQuads(null, null, null, null));

        console.log(`Closing server on http://${HOST}:${PORT}`);
        server.close();

    });

    it('should emit events for prefixes', async () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const prefixHandler = vi.fn();
        dataset.addEventListener('prefix', prefixHandler);
        dataset.onPrefixFn('ex', namedNode('http://example.com/'));
        expect(prefixHandler).toHaveBeenCalledTimes(1);
        expect(dataset.data.prefixes['ex']).toBe('http://example.com/');
    });

    it('should resolve blank nodes correctly', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const bn = blankNode();
        const predicate = namedNode('http://example.com/predicate');
        const object = literal('value');
        
        dataset.addQuad(quad(bn, predicate, object));

        const resolved = dataset.resolveBlankNode(bn);
        expect(resolved[predicate.value]).toBe('value');
    });

    it('should retrieve subject triples', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = namedNode('http://example.com/subject');
        const predicate = namedNode('http://example.com/predicate');
        const object = literal('example');

        dataset.addQuad(quad(subject, predicate, object));

        const triples = dataset.getSubjectTriples(subject);
        expect(triples.length).toBe(1);
        expect(triples[0].predicate.equals(predicate)).toBe(true);
    });

    it('should retrieve object triples', () => {
        console.log(`Running RdfDataset Test ${i++}...`)
        const subject = namedNode('http://example.com/subject');
        const predicate = namedNode('http://example.com/predicate');
        const object = literal('example');

        dataset.addQuad(quad(subject, predicate, object));

        const triples = dataset.getObjectTriples(object);
        expect(triples.length).toBe(1);
        expect(triples[0].subject.equals(subject)).toBe(true);
    });

});
