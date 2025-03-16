import rdf from 'rdf-ext';
import { readRDF } from '../modules/io'
import { RDF, XSD } from '../modules/namespaces';
import { toCURIE } from '../modules/utils';
import formatsPretty from '@rdfjs/formats/pretty.js'

/**
 * A class wrapping an RDF dataset (quad-store) from the `rdf-ext` library.
 */
export class RdfDataset {
    /**
     * Create a wrapper object for an RDF dataset a.k.a. quad-store
     */
    constructor(data = {}) {

        this.data = data;
        this.rdfPretty = rdf.clone();
        this.rdfPretty.formats.import(formatsPretty);

        this.data.prefixes = {};
        this.data.serializedGraph = '';
        this.data.graphLoaded = false;
        this.data.prefixesLoaded = false;
        this.data.graph = this.createDataset();

        this._eventTarget = new EventTarget();
    }

    addEventListener(type, listener, options) {
        this._eventTarget.addEventListener(type, listener, options);
    }

    removeEventListener(type, listener, options) {
        this._eventTarget.removeEventListener(type, listener, options);
    }

    dispatchEvent(event) {
        return this._eventTarget.dispatchEvent(event);
    }

    /**
     * Create a quad store compliant with the [RDF/JS dataset specification](https://rdf.js.org/dataset-spec/)
     * via the `rdf-ext` package
     * @returns {import("rdf-ext").DatasetCore} The RDF dataset instance.
     */
    createDataset() {
        return rdf.dataset()
    }
    /**
     * Loads RDF data from a given URL and processes prefixes and quads.
     * @param {string} url - The URL of the RDF document.
     */
    async loadRDF(url) {
        this.beforeLoadFn()
        readRDF(url)
		.then(quadStream => {
			// Load prefixes
			quadStream.on('prefix', (prefix, ns) => {
                this.onPrefixFn(prefix, ns)
			}).on('end', () => {
                this.onPrefixEndFn()
			})
			// Load data
			quadStream.on('data', quad => {
				this.onDataFn(quad)
			}).on('end', async () => {
                await this.onDataEndFn()
            });
		})
		.catch(error => {
			console.error('Error reading RDF data:', error);
            throw error
		});
    }

    /**
     * Pre-load function to reset the graph loading state.
     */
    beforeLoadFn() {
        this.data.graphLoaded = false
    }

    /**
     * Process an RDF prefix.
     * @param {string} prefix - The prefix string.
     * @param {import("rdf-ext").NamedNode} ns - The namespace associated with the prefix.
     */
    onPrefixFn(prefix, ns) {
        this.data.prefixes[prefix] = ns.value;
        this.dispatchEvent(new CustomEvent('prefix', { detail: { prefix, ns } }));
    }
    onPrefixEndFn() {
        this.data.prefixesLoaded = true
        this.dispatchEvent(new CustomEvent('prefixesLoaded', { detail: this.data.prefixes }));
    }

    /**
     * Process an RDF quad
     * @param {import("rdf-ext").Quad} quad - The RDF quad.
     */
    onDataFn(quad) {
        this.addQuad(quad)
        this.dispatchEvent(new CustomEvent('quad', { detail: quad }));
    }
    async onDataEndFn() {
        this.data.serializedGraph = await this.serializeGraph()
        this.data.graphLoaded = true
        this.dispatchEvent(new CustomEvent('graphLoaded', { detail: this.data.graph }));
    }

    /**
     * Add an RDF quad to the dataset
     * @param {import("rdf-ext").Quad} quad - The RDF quad to add.
     */
    addQuad(quad) {
        this.data.graph.add(quad)
    }

    /**
     * Serializes the RDF graph to Turtle format.
     * @returns {Promise<string>} The serialized RDF graph in Turtle format.
     */
    async serializeGraph() {
        return (await this.rdfPretty.io.dataset.toText('text/turtle', this.data.graph)).trim()
    }

    /**
     * Checks if a given RDF node represents an RDF list.
     * @param {import("rdf-ext").Term} node - The RDF node to check.
     * @returns {boolean} True if the node represents an RDF list, otherwise false.
     */
    isRdfList(node) {
        let hasFirst = false;
        let hasRest = false;
        this.data.graph.forEach((quad) => {
            if (quad.subject.equals(node)) {
                if (quad.predicate.value === RDF.first.value) hasFirst = true;
                if (quad.predicate.value === RDF.rest.value) hasRest = true;
            }
        });
        return hasFirst && hasRest;
    };
    
    /**
     * Converts an RDF list to an array.
     * @param {import("rdf-ext").Term} startNode - The starting node of the RDF list.
     * @returns {Array} The converted RDF list as an array.
     */
    rdfListToArray(startNode) {
        const listItems = [];
        let currentNode = startNode;
        while (currentNode && currentNode.value !== RDF.nil.value) {
            let listItem = null;
            // Get the first element in the RDF list
            this.data.graph.forEach((quad) => {
                if (quad.subject.equals(currentNode) && quad.predicate.value === RDF.first.value) {
                    // Resolve blank nodes recursively, but handle literals and IRIs separately
                    if (quad.object.termType === "BlankNode") {
                        listItem = this.resolveBlankNode(quad.object, this.data.graph);
                    } else if (quad.object.termType === "Literal") {
                        listItem = quad.object.value; // Store literal value
                    } else if (quad.object.termType === "NamedNode") {
                        listItem = quad.object.value; // Store IRI as a string
                    }
                }
            });
            if (listItem !== null) {
                listItems.push(listItem);
            }
            // Move to the next item in the list (rdf:rest)
            let nextNode = null;
            this.data.graph.forEach((quad) => {
                if (quad.subject.equals(currentNode) && quad.predicate.value === RDF.rest.value) {
                    nextNode = quad.object;
                }
            });
            currentNode = nextNode;
        }
        return listItems;
    };
    
    resolveBlankNode(blankNode) {
        let resolvedObject = {};
        this.data.graph.forEach((quad) => {
            if (quad.subject.equals(blankNode)) {
                const predicate = quad.predicate.value;
                const object = quad.object;
    
                // If the object is a blank node, resolve it recursively
                if (object.termType === "BlankNode") {
                    // Check if it's an RDF list and convert it to an array
                    if (this.isRdfList(object)) {
                        resolvedObject[predicate] = this.rdfListToArray(object);
                    } else {
                        resolvedObject[predicate] = this.resolveBlankNode(object);
                    }
                } else if (object.termType === "Literal") {
                    resolvedObject[predicate] = object.value; // Handle literal values
                } else if (object.termType === "NamedNode") {
                    resolvedObject[predicate] = object.value; // Handle IRIs as strings
                }
            }
        });
        return resolvedObject;
    }

    getLiteralAndNamedNodes(predicate, propertyClass, prefixes) {
        var propClassCurie = toCURIE(propertyClass, prefixes)
        // a) use the literal node with xsd data type
        const literalNodes = rdf.grapoi({ dataset: this.data.graph })
            .hasOut(predicate, rdf.literal(String(propClassCurie), XSD.anyURI))
            .quads();
        // b) and the named node
        const uriNodes = rdf.grapoi({ dataset: this.data.graph })
            .hasOut(predicate, rdf.namedNode(propertyClass))
            .quads();
        // return as a concatenated array of quads
        return Array.from(literalNodes).concat(Array.from(uriNodes))
    }
    
    getSubjectTriples(someTerm) {
        const quads = rdf.grapoi({ dataset: this.data.graph, term: someTerm }).out().quads();
        return Array.from(quads)
    }
    
    getObjectTriples(someTerm) {
        const quads = rdf.grapoi({ dataset: this.data.graph, term: someTerm }).in().quads();
        return Array.from(quads)
    }
}
