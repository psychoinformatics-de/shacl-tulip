/**
 * @module namespaces.js
 * @description This module exports common RDF namespaces used in the rest of the package
 */


import { DataFactory } from 'n3';
const { namedNode } = DataFactory;

function namespace(baseIRI) {
  return new Proxy({}, {
    get(_, prop) {
      // Return a NamedNode for every accessed property
      return namedNode(baseIRI + prop);
    }
  });
}

export const SHACL = namespace('http://www.w3.org/ns/shacl#');
export const RDF = namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const DASH = namespace('http://datashapes.org/dash#');
export const RDFS = namespace('http://www.w3.org/2000/01/rdf-schema#');
export const XSD = namespace('http://www.w3.org/2001/XMLSchema#');