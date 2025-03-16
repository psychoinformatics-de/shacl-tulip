import { describe, it, expect, beforeEach} from 'vitest';
import { FormBase } from '@/classes/FormBase';
import { ShapesDataset } from '@/classes/ShapesDataset';
import { RdfDataset } from '@/classes/RdfDataset';
import { RDF } from '@/modules/namespaces'
import rdf from 'rdf-ext'
import httpServer from 'http-server';
let server;
const PORT = 8083;
const HOST = 'localhost';

// Test the FormBase class
describe('FormBase', () => {
    let form;
    let id_iri = 'https://concepts.datalad.org/s/things/v1/id'
    let shapesDS = new ShapesDataset();
    let rdfDS = new RdfDataset();

    beforeEach(() => {
        form = new FormBase(id_iri);
    });

    it('should throw an error if the required constructor argument is missing', () => {
        expect(() => new FormBase()).toThrowError()
    });

    it('should handle all form functionality correctly', async () => {
        
        let class_uri = 'https://concepts.datalad.org/s/social/unreleased/Person'
        let subject_uri = 'http://example.com/testPerson'
        let predicate_uri = 'https://concepts.datalad.org/s/social/unreleased/given_name'
        // Test adding an empty subject
        form.addSubject(class_uri, subject_uri)
        expect(Object.keys(form.content)).toContain(class_uri)
        expect(Object.keys(form.content[class_uri])).toContain(subject_uri)
        // Test adding an empty predicate (+ first object)
        form.addPredicate(class_uri, subject_uri, predicate_uri)
        expect(Object.keys(form.content[class_uri][subject_uri])).toContain(predicate_uri)
        expect(form.content[class_uri][subject_uri][predicate_uri]).toEqual([null])
        // Test setting first object value, and adding another empty object
        form.content[class_uri][subject_uri][predicate_uri][0] = "TestName"
        form.addObject(class_uri, subject_uri, predicate_uri)
        expect(form.content[class_uri][subject_uri][predicate_uri]).toEqual(['TestName', null])
        // Test removing an object
        form.removeObject(class_uri, subject_uri, predicate_uri, 1)
        expect(form.content[class_uri][subject_uri][predicate_uri]).toEqual(['TestName'])
        // Add ID
        form.addPredicate(class_uri, subject_uri, id_iri)
        form.content[class_uri][subject_uri][id_iri][0] = subject_uri
        // Test converting a form node to RDF quads
        // First we need a shapes dataset
        server = httpServer.createServer({ });
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
        const fileUrl = `http://${HOST}:${PORT}/tests/mockShapes.ttl`
        await shapesDS.loadRDF(fileUrl);
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Then we call the conversion function
        let qds = form.formNodeToQuads(class_uri, subject_uri, shapesDS)
        // Then test the output; we expect two quads (iri should not create a quad)
        // - <http://example.com/testPerson> a <https://concepts.datalad.org/s/social/unreleased/Person>
        // - <http://example.com/testPerson> <https://concepts.datalad.org/s/social/unreleased/given_name> "TestName"
        expect(qds.length).toBe(2)
        server.close();

        for (var q of qds) {
            rdfDS.addQuad(q);
        }
    });

    it('should convert an RDF dataset correctly to form content, and save it back', () => {
        let class_uri = 'https://concepts.datalad.org/s/social/unreleased/Person'
        let subject_uri = 'http://example.com/testPerson'
        let subject_term = rdf.namedNode(subject_uri)
        let predicate_uri = 'https://concepts.datalad.org/s/social/unreleased/given_name'
        form.quadsToFormData(class_uri, subject_term, rdfDS)
        expect(Object.keys(form.content)).toContain(class_uri)
        expect(Object.keys(form.content[class_uri])).toContain(subject_uri)
        expect(form.content[class_uri][subject_uri][RDF.type.value]).toEqual([class_uri])
        expect(form.content[class_uri][subject_uri][predicate_uri]).toEqual(["TestName"])
        expect(form.content[class_uri][subject_uri][id_iri]).toEqual([subject_uri])
        // Now save node
        let rdfDSnew = new RdfDataset();
        form.saveNode(class_uri, subject_uri, shapesDS, rdfDSnew, false)
        // Even though formdata has 3 predicates for the record,
        // the id_iri field should not be saved as a separate quad
        expect(rdfDSnew.data.graph.size).toBe(2)
    });





});
