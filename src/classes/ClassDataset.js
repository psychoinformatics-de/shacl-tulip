/**
 * 
 */

import { RdfDataset } from './RdfDataset'
import { RDFS } from '../modules/namespaces';

export class ClassDataset extends RdfDataset {
    
    constructor() {
        super()
    }

    onDataFn(quad) {
        if (quad.predicate.value === RDFS.subClassOf.value &&
            quad.subject.termType !== 'BlankNode' &&
            quad.object.termType !== 'BlankNode' ) {
            this.addQuad(quad)
            this.dispatchEvent(new CustomEvent('quad', { detail: quad }));
        }
    }
}