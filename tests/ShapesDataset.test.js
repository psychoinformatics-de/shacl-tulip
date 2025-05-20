import { describe, it, expect, beforeEach} from 'vitest';
import { ShapesDataset } from '@/classes/ShapesDataset';
import { DataFactory } from 'n3';
const { literal, blankNode } = DataFactory;
import httpServer from 'http-server';
let server;
const PORT = 8082;
const HOST = 'localhost';

// Test the ShapesDataset class
describe('ShapesDataset', () => {
    let dataset;

    beforeEach(() => {
        dataset = new ShapesDataset();
    });

    it('should load RDF data from Turtle file and populate all shapes-related variables', async () => {
        expect(dataset.data.graphLoaded).toBe(false);
        expect(dataset.data.prefixesLoaded).toBe(false);
        server = httpServer.createServer({ });
        server.listen(PORT, HOST, (err) => {
            if (err && err.code !== 'EADDRINUSE') throw err;
            console.log(`Test server started on http://${HOST}:${PORT}`);
        });
        const fileUrl = `http://${HOST}:${PORT}/tests/mockShapes.ttl`
        dataset.loadRDF(fileUrl);
        await new Promise(resolve => dataset.addEventListener('graphLoaded', resolve));
        expect(dataset.data.graphLoaded).toBe(true);
        expect(dataset.data.prefixesLoaded).toBe(true);
        expect(dataset.data.graph.size).toBe(318); // number of quads in the mockShapes.ttl file
        // Test content of all loaded variables
        expect(dataset.data.nodeShapeNames).toEqual(
            {
                AttributeSpecification: 'https://concepts.datalad.org/s/things/v1/AttributeSpecification',
                Person: 'https://concepts.datalad.org/s/social/unreleased/Person',
                DOI: 'https://concepts.datalad.org/s/identifiers/unreleased/DOI'
            }
        )
        expect(dataset.data.nodeShapeNamesArray).toEqual(['AttributeSpecification', 'DOI', 'Person'])
        expect(dataset.data.nodeShapeIRIs).toEqual(
            [
                'https://concepts.datalad.org/s/identifiers/unreleased/DOI',
                'https://concepts.datalad.org/s/social/unreleased/Person',
                'https://concepts.datalad.org/s/things/v1/AttributeSpecification'
            ]
        )
        expect(dataset.data.propertyGroups).toEqual(
            {
                'https://concepts.datalad.org/s/things/v1/BasicPropertyGroup': {
                  'http://www.w3.org/ns/shacl#order': '0',
                  'http://www.w3.org/2000/01/rdf-schema#label': 'Basic',
                  'http://www.w3.org/2000/01/rdf-schema#comment': 'Basic properties'
                },
                'https://concepts.datalad.org/s/things/v1/ExtraPropertyGroup': {
                  'http://www.w3.org/ns/shacl#order': '1',
                  'http://www.w3.org/2000/01/rdf-schema#label': 'Extra',
                  'http://www.w3.org/2000/01/rdf-schema#comment': 'Extra properties'
                }
            }
        )
        expect(dataset.data.prefixes).toEqual(
            {
                'ex': 'http://example.com/',
                'dlidentifiers': 'https://concepts.datalad.org/s/identifiers/unreleased/',
                'dlprov': 'https://concepts.datalad.org/s/prov/unreleased/',
                'dlroles': 'https://concepts.datalad.org/s/roles/unreleased/',
                'dlsocial': 'https://concepts.datalad.org/s/social/unreleased/',
                'dlspatial': 'https://concepts.datalad.org/s/spatial/unreleased/',
                'dlthings': 'https://concepts.datalad.org/s/things/v1/',
                'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
                'sh': 'http://www.w3.org/ns/shacl#',
                'skos': 'http://www.w3.org/2004/02/skos/core#',
                'xsd': 'http://www.w3.org/2001/XMLSchema#'
            }
        )
        // Test getPropertyNodeKind

        // expect(getPropertyNodeKind(class_uri, property_uri, id_uri))
        var nk1 = dataset.getPropertyNodeKind(
            'https://concepts.datalad.org/s/social/unreleased/Person',
            'https://concepts.datalad.org/s/social/unreleased/honorific_name_prefix',
            'https://concepts.datalad.org/s/things/v1/id'
        )

        expect(nk1[0]).toBeTypeOf('function')
        expect(nk1[0]).toEqual(literal)
        var nk2 = dataset.getPropertyNodeKind(
            'https://concepts.datalad.org/s/social/unreleased/Person',
            'https://concepts.datalad.org/s/things/v1/attributes',
            'https://concepts.datalad.org/s/things/v1/id'
        )
        expect(nk2[0]).toBeTypeOf('function')
        expect(nk2[0]).toEqual(blankNode)
        server.close();
    });

});
