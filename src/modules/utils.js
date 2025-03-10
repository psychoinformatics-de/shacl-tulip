/**
 * @module utils.js
 * @description This module provides common utility functionality for the rest of the
 * package modules and classes
 */


export function toCURIE(IRI, prefixes, return_type) {
    // prefixes is an object with prefix as keys and the resolved prefix IRI as the value
    if (!IRI) {
        return null
    }
    if (!prefixes) {
        console.log("no prefixes passed!!")
    }
    const longToShort = Object.values(prefixes).sort((a, b) => b.length - a.length);
    for (const iri of longToShort) {
        if (IRI.indexOf(iri) >= 0) {
        const prefix = objectFlip(prefixes)[iri]
        const property = IRI.substring(iri.length)
        if (return_type == "parts") {
            return {
            "prefix": prefix,
            "property": property,
            }
        } else {
            return prefix + ':' + property
        }
        }
    }
    return IRI
}

export function toIRI(CURIE, prefixes) {
    // prefixes is an object with prefix as keys and the resolved prefix IRI as the value
    if (!CURIE) {
        return null
    }
    if (!prefixes) {
        console.error("no prefixes passed!!")
        return null
    }
    if (CURIE.indexOf(':') < 0) {
        // console.log("not a valid curie, returning")
        return CURIE
    }
    var parts = CURIE.split(':')
    var pref = parts[0]
    var prop = parts[1]
    if (Object.keys(prefixes).indexOf(pref) < 0) {
        return CURIE
    }
    return prefixes[pref] + prop
  }

export function isEmptyObject(obj) {
    for (const prop in obj) {
      if (Object.hasOwn(obj, prop)) {
        return false;
      }
    }
    return true;
}


function objectFlip(obj) {
    // Flip the keys and values of an object
    return Object.keys(obj).reduce((ret, key) => {
      ret[obj[key]] = key;
      return ret;
    }, {});
}

