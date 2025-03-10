import { describe, it, expect } from "vitest";
import * as ShaclTulip from "shacl-tulip";

// Test importing from the installed shacl-tulip package
describe("shacl-tulip package exports/imports", () => {
    it("should import from 'shacl-tulip'", async () => {
        // Check if specific classes exist
        expect(ShaclTulip.ClassDataset).toBeDefined();
        expect(ShaclTulip.RdfDataset).toBeDefined();
        expect(ShaclTulip.ShapesDataset).toBeDefined();
        expect(ShaclTulip.FormBase).toBeDefined();

        // Check if utility functions are available
        expect(ShaclTulip.toCURIE).toBeDefined();
    });
});