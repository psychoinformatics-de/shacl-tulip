import { readRDF } from '../modules/io'
import { RDF, XSD } from '../modules/namespaces';
import { toCURIE } from '../modules/utils';
import { Store, Writer, DataFactory } from 'n3';
const { namedNode, literal } = DataFactory;

/**
 * A class wrapping an RDF dataset (quad-store) from the `rdf-ext` library.
 */
export class RdfDataset {
    /**
     * Create a wrapper object for an RDF dataset a.k.a. quad-store
     */
    constructor(data = {}) {
        this.data = data;
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
     * via the `n3` package
     * @returns {} The RDF dataset instance.
     */
    createDataset() {
        return new Store();
    }
    /**
     * Loads RDF data from a given URL and processes prefixes and quads.
     * @param {string} url - The URL of the RDF document.
     */
    async loadRDF(url, headers = {}) {
        this.beforeLoadFn()
        const result = await readRDF(url, headers)

        // Bubble up error
        if (!result.success) {
            return result  
        }

        const quadStream = result.quadStream
        // Load prefixes
        quadStream.on('prefix', (prefix, ns) => {
            this.onPrefixFn(prefix, ns)
        }).on('data', quad => {
            this.onDataFn(quad)
        }).on('end', () => {
            this.onDataEndFn()
            this.onPrefixEndFn()
        }).on('error', err => {
            console.error('Error while processing quadStream:', err);
        });
        return result
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
     * @param {} ns - The namespace associated with the prefix.
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
     * @param {} quad - The RDF quad.
     */
    onDataFn(quad) {
        // The first following line, moved here from shacl-vue's graphdata composable,
        // was an attempt to solve https://hub.datalad.org/datalink/annotate-trr379-demo/issues/32.
        // But it was a faulty attempt, since the object was different. Still, leaving it here since
        // deleting matches would prospectively solve the duplication of named node or literal objects
        // this.data.graph.removeMatches(quad.subject, quad.predicate, quad.object, null)
        this.addQuad(quad)
        this.dispatchEvent(new CustomEvent('quad', { detail: quad }));
    }
    
    onDataEndFn() {
        this.data.graphLoaded = true
        this.dispatchEvent(new CustomEvent('graphLoaded', { detail: this.data.graph }));
    }

    /**
     * Add an RDF quad to the dataset
     * @param {} quad - The RDF quad to add.
     */
    addQuad(quad) {
        this.data.graph.addQuad(quad)
    }

    /**
     * Serializes the RDF graph to Turtle format.
     * @returns {Promise<string>} The serialized RDF graph in Turtle format.
     */
    async serializeGraph() {
        // Using N3.Writer to serialize graph to Turtle
        return new Promise((resolve, reject) => {
            const writer = new Writer({ prefixes: this.data.prefixes });
            writer.addQuads(this.data.graph.getQuads(null, null, null, null));
            writer.end((error, result) => {
                if (error) reject(error);
                else resolve(result.trim());
            });
        });
    }

    /**
     * Checks if a given RDF node represents an RDF list.
     * @param {} node - The RDF node to check.
     * @returns {boolean} True if the node represents an RDF list, otherwise false.
     */
    isRdfList(node) {
        let hasFirst = false;
        let hasRest = false;
        this.data.graph.getQuads(node, null, null, null).forEach((quad) => {
            if (quad.predicate.value === RDF.first.value) hasFirst = true;
            if (quad.predicate.value === RDF.rest.value) hasRest = true;
        });
        return hasFirst && hasRest;
    };
    
    /**
     * Converts an RDF list to an array.
     * @param {} startNode - The starting node of the RDF list.
     * @returns {Array} The converted RDF list as an array.
     */
    rdfListToArray(startNode) {
        const listItems = [];
        let currentNode = startNode;
        while (currentNode && currentNode.value !== RDF.nil.value) {
            let listItem = null;
            // Get the first element in the RDF list
            this.data.graph.getQuads(currentNode, RDF.first, null, null).forEach(quad => {
                if (quad.object.termType === 'BlankNode') {
                    if (this.isRdfList(quad.object)) {
                        listItem = this.rdfListToArray(quad.object);
                    } else {
                        listItem = this.resolveBlankNode(quad.object);
                    }
                } else if (quad.object.termType === 'Literal' || quad.object.termType === 'NamedNode') {
                    listItem = quad.object.value;
                }
            });
            if (listItem !== null) {
                listItems.push(listItem);
            }
            // Move to the next item in the list (rdf:rest)
            const restQuads = this.data.graph.getQuads(currentNode, RDF.rest, null, null);
            currentNode = restQuads.length > 0 ? restQuads[0].object : null;
        }
        return listItems;
    };
    
    resolveBlankNode(blankNode) {
        let resolvedObject = {};
        this.data.graph.getQuads(blankNode, null, null, null).forEach(({ predicate, object }) => {
            if (object.termType === 'BlankNode') {
                if (this.isRdfList(object)) {
                    resolvedObject[predicate.value] = this.rdfListToArray(object);
                } else {
                    resolvedObject[predicate.value] = this.resolveBlankNode(object);
                }
            } else if (object.termType === 'Literal' || object.termType === 'NamedNode') {
                resolvedObject[predicate.value] = object.value;
            }
        });
        return resolvedObject;
    }

    getLiteralAndNamedNodes(predicate, propertyClass, prefixes) {
        var propClassCurie = toCURIE(propertyClass, prefixes)
        const literalQuads = this.data.graph.getQuads(null, predicate, literal(String(propClassCurie), XSD.anyURI), null)
        const uriQuads = this.data.graph.getQuads(null, predicate, namedNode(propertyClass), null)
        return literalQuads.concat(uriQuads)
    }
    
    getSubjectTriples(someTerm) {
        return this.data.graph.getQuads(someTerm, null, null, null);
    }
    
    getObjectTriples(someTerm) {
        return this.data.graph.getQuads(null, null, someTerm, null);
    }
}
