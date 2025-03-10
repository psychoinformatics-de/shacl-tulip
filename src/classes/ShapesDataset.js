/**
 * 
 */

import { RdfDataset } from '@/classes/RdfDataset'
import { SHACL, RDF } from '@/modules/namespaces';
import rdf from 'rdf-ext';
import { toIRI} from '@/modules/utils';

export class ShapesDataset extends RdfDataset {
    
    constructor() {
        super()
        this.propertyGroups = {}
        this.nodeShapes = {}
        this.nodeShapeNames = {}
        this.nodeShapeNamesArray = []
        this.nodeShapeIRIs = null
    }

    onDataFn(quad) {
        this.addQuad(quad)
        const subject = quad.subject.value;
        const predicate = quad.predicate.value;
        const object = quad.object;
        // Isolate sh:NodeShape instances
        if (predicate === RDF.type.value && object.value === SHACL.NodeShape.value) {
            this.nodeShapes[subject] = {properties: []};
        }
        // Get properties of node shapes
        if (predicate === SHACL.property.value) {
            this.nodeShapes[subject].properties.push(object);
        }
        // Get property groups, if any
        if (predicate === RDF.type.value && object.value === SHACL.PropertyGroup.value) {
            this.propertyGroups[subject] = {};
        }
    }

    async onDataEndFn() {
        // Loop through all nodeshapes to restructure them
        for (const [key, val] of Object.entries(this.nodeShapes)) {
            // Get attributes (other than 'properties') of the nodeshape
            this.graph.forEach(quad => {
                if (quad.subject.value === key && quad.predicate.value != SHACL.property.value) {
                    // Check if the object is a blank node and resolve it
                    if (quad.object.termType === 'BlankNode') {
                        this.nodeShapes[key][quad.predicate.value] = this.resolveBlankNode(quad.object);
                    } else {
                        this.nodeShapes[key][quad.predicate.value] = quad.object.value;
                    }
                }
            });
            // Loop through property elements, i.e. blank nodes, and set correct attributes
            for (var i = 0; i < val.properties.length; i++) {
                var node = val.properties[i];
                if (node.termType === "BlankNode") {
                    // If it's a blank node, resolve it
                    // console.log(`Resolving blank node: ${node.value}`);
                    val.properties[i] = this.resolveBlankNode(node);
                } else {
                    // Non-blank nodes are kept as they are, but eventually store only their `.value`
                    var new_node = {};
                    this.graph.forEach((quad) => {
                        if (quad.subject.value === node.value) {
                            new_node[quad.predicate.value] = quad.object.value; // Store only .value
                        }
                    });
                    val.properties[i] = new_node;
                }
            }
        }
        for (const iri of Object.keys(this.nodeShapes)) { 
            var parts = iri.split('/')
            this.nodeShapeNames[parts[parts.length - 1]] = iri
        }
        this.nodeShapeNamesArray = Object.keys(this.nodeShapeNames).sort()
        this.nodeShapeIRIs = Object.keys(this.nodeShapes).sort()
        // Now handle the (possibility of) property groups
        for (const [key, value] of Object.entries(this.propertyGroups)) {
            this.graph.forEach(quad => {
                if (quad.subject.value === key && quad.predicate.value != RDF.type.value ) {
                    this.propertyGroups[key][quad.predicate.value] = quad.object.value
                }
            });
        }
        this.serializedGraph = await this.serializeGraph()
        this.graphLoaded = true
    }

    getPropertyNodeKind(class_uri, property_uri, id_uri) {
        var nodeShape = this.nodeShapes[class_uri]
        var propertyShapes = nodeShape.properties
        // Find associated property shape, for information about nodekind
        var propertyShape = propertyShapes.find((prop) => prop[SHACL.path.value] == property_uri)
        var nodeFunc = null
        var dt = null
        if (propertyShape.hasOwnProperty(SHACL.nodeKind.value)) {
            // possible options = sh:BlankNode, sh:IRI, sh:Literal, sh:BlankNodeOrIRI, sh:BlankNodeOrLiteral, sh:IRIOrLiteral
            // if sh:nodeKind == sh:Literal
            if (propertyShape[SHACL.nodeKind.value] == SHACL.Literal.value) {
                // sh:nodeKind == sh:Literal
                nodeFunc = rdf.literal
                // sh:datatype exists
                if (propertyShape.hasOwnProperty(SHACL.datatype.value)) {
                    dt = propertyShape[SHACL.datatype.value]
                }
            } else if (propertyShape[SHACL.nodeKind.value] == SHACL.IRI.value) {
                // sh:nodeKind == sh:IRI
                nodeFunc = rdf.namedNode
            } else if (propertyShape[SHACL.nodeKind.value] == SHACL.BlankNode.value) {
                // sh:nodeKind == sh:BlankNode
                nodeFunc = rdf.blankNode
            } else if (propertyShape[SHACL.nodeKind.value] == SHACL.BlankNodeOrIRI.value) {
                // sh:nodeKind == sh:BlankNodeOrIRI
                // If the same property shape has a sh:class field, and if that class
                // has a related property shape which has the sh:path field value as 
                // the id_uri, then it means the range of the property is a named node,
                // otherwise it's a blank node (because the object does not have a
                // configured identifier).
                // If there's no class field, I am not exactly sure if it should be
                // blank node or named node. Defaulting to named node for now.
                if (propertyShape.hasOwnProperty(SHACL.class.value)) {
                    var shClass = propertyShape[SHACL.class.value];
                    // this now assumes that the class is part of the driving shacl shapes graph
                    var associatedNodeShape = this.nodeShapes[toIRI(shClass, this.prefixes)]
                    var hasIdField = associatedNodeShape.properties.find((prop) => prop[SHACL.path.value] == id_uri)
                    if (hasIdField) {
                        nodeFunc = rdf.namedNode
                    } else {
                        nodeFunc = rdf.blankNode
                    }
                } else {
                    nodeFunc = rdf.namedNode
                }
             } else {
                console.error(`\t- NodeKind not supported: ${propertyShape[SHACL.nodeKind.value]}\n\t\tAdding triple with literal object to graphData`)
                nodeFunc = rdf.literal
            }
        } else if (propertyShape.hasOwnProperty(SHACL.in.value)) {
            // This is a temporary workaround; should definitely not be permanent
            // Assume Literal nodekind for any arrays
            console.log(`\t- NodeKind not found for property shape: ${property_uri}; found 'sh:in'. Setting to default literal`)
            nodeFunc = rdf.literal
        }
        else {
            console.log(`\t- NodeKind not found for property shape: ${property_uri}. Setting to default literal`)
            nodeFunc = rdf.literal
        }
        return [nodeFunc, dt]
    }

}