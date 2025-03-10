/**
 * @module namespaces.js
 * @description This module exports common RDF namespaces used in the rest of the package
 */


import rdf from 'rdf-ext';
export const SHACL = rdf.namespace('http://www.w3.org/ns/shacl#');
export const RDF = rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const DASH = rdf.namespace('http://datashapes.org/dash#');
export const RDFS = rdf.namespace('http://www.w3.org/2000/01/rdf-schema#');
export const XSD = rdf.namespace('http://www.w3.org/2001/XMLSchema#');