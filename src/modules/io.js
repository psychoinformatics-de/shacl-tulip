/**
 * @module io.js
 * @description This module provides common functionality for reading and writing
 * to files or endpoints
 * 
 * It depends mainly on [fetch-lite](https://github.com/rdfjs-base/fetch-lite) for reading RDF data
 * into streams and writing stream data to serialized RDF formats
 */

import formats from '@rdfjs/formats-common'
import fetch from '@rdfjs/fetch-lite'
import formatsPretty from '@rdfjs/formats/pretty.js'
import rdf from 'rdf-ext'

export async function readRDF(file_url, headers = { "Content-Type": "text/turtle" }) {
    const url = file_url;
    try {
        console.log(url)
        var res = null
        res = await fetch(url,
            {
                formats, 
                headers: headers
            }
        )
        // Handle cases where the server returns generic 'text/plain' or 'text/html' content type
        if (['text/plain', 'text/html'].indexOf(res.headers.get('content-type')) >= 0) {
            // default to turtle
            headers['Content-Type'] = 'text/turtle';
            res = await fetch(url, { formats, headers });
        }

        if (!res.ok) {
            // throw new Error(`readRDF error: ${res.statusText}`)
            const code = res.status || 'Unknown';
            const error = new Error(`readRDF error: HTTP ${code} from ${url}`);
            error.status = code;
            error.url = url;
            error.response = res;
            throw error
        }

        if (res.headers.get('content-type').indexOf('application/json') >= 0) {
            throw new Error(`readRDF error: reading json data is not supported`);
        }

        const quadStream = await res.quadStream()
        return {
            success: true,
            quadStream,
            url: url,
            message: 'RDF data loaded successfully',
        };
    } catch (error) {
        return {
            success: false,
            error,
            url: url,
            message: error.message,
        };
    }
}
