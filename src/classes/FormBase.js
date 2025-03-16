/**
 * 
 */

import rdf from 'rdf-ext';
import { RDF } from '../modules/namespaces';
import { isEmptyObject, toIRI} from '../modules/utils';

export class FormBase {

    constructor(id_iri = null, content = {}) {

        if (!id_iri) {
            var msg = "id_iri is a required argument"
            console.error(msg)
            throw new Error(msg)
        }
        this.ID_IRI = id_iri
		this.content = content
        this.ignoredProperties = [
            RDF.type.value,
        ]
        // Example formData structure:
        // var exFormData = {
        //   "https://concepts.datalad.org/s/distribution/unreleased/Person": {          // RDF type of a subject
        //     "https://example.org/ns/dataset/#ahorst": {                               // A subject: named or blank node
        //       "https://concepts.datalad.org/s/distribution/unreleased/email":  []     // A predicate: named node
        //       "shaclvue:termType": "NamedNode"                                        // the nodetype of the subject: NamedNode or BlankNode (NOT USED)
        //     }
        //   },
        //   "https://concepts.datalad.org/s/prov/unreleased/Attribution": {             // RDF type of a subject
        //   } 
        // }
	}

    addSubject(class_uri, subject_uri, setVal_class={}, setVal_subject={}) {
        // add_empty_node
        // if the RDF:type IRI does not exist in FormBase.content yet, add it
        // if the RDF:type IRI already exists in FormBase.content:
        // - if the subject iri does not exist, add it
        // - if the subject iri exists do nothing
        if (Object.keys(this.content).indexOf(class_uri) < 0) {
            // The added value is an object; to allow adding multiple of the same node type,
            // unique subject IRIs (from named or blank nodes) will be the unique keys of the object
            this.content[class_uri] = setVal_class
        }
        if (Object.keys(this.content[class_uri]).indexOf(subject_uri) < 0) {
            // The added value is an object with keys == predicates and values being arrays
            // that can take multiple object values
            this.content[class_uri][subject_uri] = setVal_subject
        } 
    }

    removeSubject(class_uri, subject_uri) {
        // remove_current_node
        // Error: if the RDF:type iri does not exist in the lookup object
        if (Object.keys(this.content).indexOf(class_uri) < 0) {
            console.error(`Trying to delete a node of a class that does not exist in form data:\n${class_uri}`)
        }
        // Error: if the node iri does not exist in the lookup object
        else if (Object.keys(this.content[class_uri]).indexOf(subject_uri) < 0) {
            console.error(`Trying to delete a node that does not exist in form data:\n${class_uri} - ${subject_uri}`)
        }
        // remove node instance at provided iri
        // if node object is empty after instance removal, remove node key as well
        else {
            delete this.content[class_uri][subject_uri]
            if ( isEmptyObject(this.content[class_uri])) { delete this.content[class_uri] }
        }
    }

    clearSubject(class_uri, subject_uri, setVal = [null]) {
        // clear_current_node
        // Error: if the RDF:type iri does not exist in the lookup object
        if (Object.keys(this.content).indexOf(class_uri) < 0) {
            console.error(`Trying to delete a node of a class that does not exist in form data:\n${class_uri}`)
        }
        // Error: if the node iri does not exist in the lookup object
        else if (Object.keys(this.content[class_uri]).indexOf(subject_uri) < 0) {
            console.error(`Trying to delete a node that does not exist in form data:\n${class_uri} - ${subject_uri}`)
        }
        // clear node instance at provided index
        else {
            objectKeysToNull(this.content[class_uri][subject_uri], setVal)
        }
    }

    static objectKeysToNull(obj, setVal = [null]) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                obj[key] = setVal;
            }
        }
    }

    addPredicate(class_uri, subject_uri, predicate_uri, setVal = [null]) {
        // add_empty_triple
        // if the class and node exist and the predicate does not exist, add it
        // if the class and node exist and the predicate already exists, add empty value to array
        // if the class and node do not exist, print console error because this should not be possible
        if (Object.keys(this.content).indexOf(class_uri) >= 0 && Object.keys(this.content[class_uri]).indexOf(subject_uri) >= 0) {
            // Current node being edited at IRI
            if (Object.keys(this.content[class_uri][subject_uri]).indexOf(predicate_uri) < 0) {
                this.content[class_uri][subject_uri][predicate_uri] = setVal
            } else {
                this.addObject(class_uri, subject_uri, predicate_uri)
            }
        } else {
            console.error(`Class and/or subject IRI not in form data yet:\n${class_uri} - ${subject_uri}\nCannot add triple for non-existing subject.`)
        }
    }

    addObject(class_uri, subject_uri, predicate_uri) {
        // add_empty_triple_manual
        this.content[class_uri][subject_uri][predicate_uri].push(null)
    }

    removeObject(class_uri, subject_uri, predicate_uri, object_idx) {
        // remove_triple
        if (Object.keys(this.content).indexOf(class_uri) >= 0 && Object.keys(this.content[class_uri]).indexOf(subject_uri) >= 0) {
            // Current node being edited at index
            if (Object.keys(this.content[class_uri][subject_uri]).indexOf(predicate_uri) < 0) {
                console.error(`Predicate ${predicate_uri} not in specific subject instance in form data:\n${class_uri} - ${subject_uri}\nCannot remove non-existing triple.`)
            } else {
                this.content[class_uri][subject_uri][predicate_uri].splice(object_idx, 1)
            }
        } else {
            console.error(`Class and/or subject IRI not in form data yet:\n${class_uri} - ${subject_uri}\nCannot remove triple from non-existing subject.`)
        }
    }

    formNodeToQuads(class_uri, subject_uri, shapesDS) {
        // Node = subject_uri = a specific identifiable object that was edited
        // Empty array to store quads
        var quadArray = []
        // Identify the record's subject (named or blank node)
        var subject = this._getRecordSubjectTerm(subject_uri, this.content[class_uri][subject_uri])
        // Add the triple stating the subject is of type class
        let firstQuad = rdf.quad(subject, rdf.namedNode(RDF.type.value), rdf.namedNode(class_uri))
        quadArray.push(firstQuad)
        // Now we need to add all triples relating to the properties of the record.
        for (var triple_predicate of Object.keys(this.content[class_uri][subject_uri])) {
            // triple_predicate: all properties of an identifiable object
            // Only process entered values, i.e. ignore property if it has value: [null]
            if (Array.isArray(this.content[class_uri][subject_uri][triple_predicate]) &&
                this.content[class_uri][subject_uri][triple_predicate].length == 1 &&
                this.content[class_uri][subject_uri][triple_predicate][0] === null) {
                continue;
            }
            // Don't add id_iri triple, since it would have been added already if it exists
            if (triple_predicate == this.ID_IRI) {
                continue;
            }
            // Don't add properties that should be ignored
            if (this.ignoredProperties.indexOf(triple_predicate) >= 0) {
                console.log(`Not saving predicate: ${triple_predicate}`)
                continue
            }
            // now set the predicate as a named node
            var predicate = rdf.namedNode(triple_predicate)
            // In order to set the node type of the object, we first need to figure it out
            var [nodeFunc, dt] = shapesDS.getPropertyNodeKind(class_uri, triple_predicate, this.ID_IRI)
            // Now we can create the object nodes for each property
            for (var val of this.content[class_uri][subject_uri][triple_predicate]) {
                // val: all values of a given property of an identifiable object
                let triple_object
                if (dt) {
                    triple_object = nodeFunc(val, rdf.namedNode(dt))
                } else {
                    triple_object = nodeFunc(val)
                }
                // and finally we can add the quads to the store
                let quad = rdf.quad(subject, predicate, triple_object)
                quadArray.push(quad)
            }
        }
        return quadArray
        // TODO: see the following in saveNode function:
        // If this was in editmode and the node IRI has been altered,
        // i.e. node_iri is not the same as the new value in this.content,
        // then we need to RE-reference existing triples in the graph that has the current node_iri as object.
        // This is only necessary for namedNodes where the IRI changed. The process is:
        // - only do the following if the node is a namedNode and if the IRI changed during editing
        // - find all triples with the node IRI as object -> oldTriples
        // - for each triple in oldTriples: create a new one with same subject and predicate
        //   and with new IRI as object, then delete the old triple

        // For now we ignore this ^^, i.e. we just add this.content to new rdf datasets
        // and nothing more. This is to be tested to see the implications. TODO
    }

    _getRecordSubjectTerm(record_id, record) {
        // A record is a javascript object with property IRIs as keys and arrays as values
        // If the configured id_iri is a property of the record, this means that
        // property's value is the triple subject, which should be a named node.
        // If the configured id_iri is NOT a property of the record, it means
        // the record_id itself is the triple subject, which is a blank node.
        var subject
        if (Object.keys(record).indexOf(this.ID_IRI) >= 0) {
            var subject_iri = record[this.ID_IRI][0]
            subject = rdf.namedNode(subject_iri)
        } else {
            subject = rdf.blankNode(record_id)
        }
        return subject
    }

    quadsToFormData(class_uri, subject_term, RdfDS) {
        // Subject term should be namedNode or blankNode
        var subject_uri = subject_term.value
        this.addSubject(class_uri, subject_uri)
        // Get all triples with the term as subject, and add to formData
        // NOTE: these triples added to formData are only the ones that exist in RdfDS
        // i.e. only the values that the subject has been annotated with. The node shape
        // defines all properties that the node could have, of which the actual existing
        // properties are only a subset. This means that the `add_empty_triple` call below
        // is not populating all possible empty properties for the node, such that the form
        // can be edited in full. At the moment, this task is left to the `add_empty_triple`
        // call that is done in `onMounted` of the `PropertyShapeEditor` component. It is
        // to be determined whether this is the best way forward. But it works for now.
        // TODO ^^

        // Another TODO: the ID property of the node is not necessarily existing explicitly
        // as a triple in the graph. Refer to the `save_node` function above, where the quad
        // with the id_iri as predicate is not added to the graph when formData is saved.
        // For the current `quadsToFormData` function, the reverse process is important
        // to keep in mind, i.e. because the id_iri quad does not exist in the graph,
        // the corresponding field in formData has to be set explicitly from the subject_term,
        // because it won't be covered in the `quadArray.forEach` loop.
        var quadArray = RdfDS.getSubjectTriples(subject_term)
        var IdQuadExists = false
        quadArray.forEach((quad) => {
            var predicate_uri = toIRI(quad.predicate.value, RdfDS.data.prefixes)
            if (predicate_uri === this.ID_IRI) {
                IdQuadExists = true
            }
            this.addPredicate(class_uri, subject_uri, predicate_uri)
            var length = this.content[class_uri][subject_uri][predicate_uri].length
            this.content[class_uri][subject_uri][predicate_uri][length-1] = quad.object.value
        });
        // Here we deal with explicitly adding the id_iri quad, if necessary
        if (subject_term.termType === "NamedNode"  && !IdQuadExists) {
            this.addPredicate(class_uri, subject_uri, this.ID_IRI)
            var l = this.content[class_uri][subject_uri][this.ID_IRI].length
            this.content[class_uri][subject_uri][this.ID_IRI][l-1] = subject_uri
        }
    }

    saveNode(class_uri, node_uri, shapesDS, RdfDS, editMode) {
        var changeNodeIdx = false
        var subject_iri = null
        // Check if the node exists beforehand
        if (this.content[class_uri]) {
            // If we are in edit mode, the first step is to delete existing quads from graphData
            if (editMode) {
                RdfDS.data.graph.deleteMatches(rdf.namedNode(node_uri), null, null, null)
            }

            // Then we generate the quads
            
            var quads = this.formNodeToQuads(class_uri, node_uri, shapesDS)
            // and add them to the dataset
            quads.forEach(quad => {
                RdfDS.addQuad(quad)
            });

            // Some next steps depend on the type of the record's subject
            var subject = quads[0].subject
            if (subject.termType === "NamedNode") {
                changeNodeIdx = true
                subject_iri = subject.value
            }

            // If this was in editmode and the node IRI has been altered,
            // i.e. node_uri is not the same as the new value in formData,
            // then we need to RE-reference existing triples in the graph that has the current node_uri as object.
            // This is only necessary for namedNodes where the IRI changed. The process is:
            // - only do the following if the node is a namedNode and if the IRI changed during editing
            // - find all triples with the node IRI as object -> oldTriples
            // - for each triple in oldTriples: create a new one with same subject and predicate
            //   and with new IRI as object, then delete the old triple
            if (editMode && subject_iri !== null && subject_iri !== node_uri) {
                var objectQuads = RdfDS.getObjectTriples(rdf.namedNode(node_uri))
                objectQuads.forEach((quad) => {
                    let new_quad = rdf.quad(quad.subject, quad.predicate, subject)
                    RdfDS.data.graph.delete(quad)
                    RdfDS.data.graph.add(new_quad)
                });
            }
            // Change formdata node_uri to the actual id, if this was present:
            if (changeNodeIdx && subject_iri !== node_uri) {
                this.content[class_uri][subject_iri] = structuredClone(this.content[class_uri][node_uri])
                delete this.content[class_uri][node_uri]
            }
            return {
                nodeshape_iri: class_uri,
                node_iri: subject_iri || node_uri
            }
            // at the end, what to do with current data in formdata?
            // we keep it there because this keeps track of changes during
            // the session, so that we know what to submit back to the service.
        } else {
            console.error(`\t- Node ${class_uri} does not exist`)
        }
    }
}