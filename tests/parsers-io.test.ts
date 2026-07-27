import { describe, expect, it, vi } from "vitest";

// pdf-parse and mammoth are mature, independently-tested libraries — these
// tests verify *our* thin wrappers call them correctly and propagate
// text/errors, rather than re-testing binary PDF/DOCX parsing itself.
const getTextMock = vi.fn();
const destroyMock = vi.fn();
const pdfParseCtor = vi.fn().mockImplementation(function PDFParseMock(this: unknown) {
  return { getText: getTextMock, destroy: destroyMock };
});

vi.mock("pdf-parse", () => ({
  PDFParse: pdfParseCtor,
}));

const extractRawTextMock = vi.fn();
vi.mock("mammoth", () => ({
  extractRawText: extractRawTextMock,
}));

const { extractTextFromPdf } = await import("@/lib/parsers/pdf-parse");
const { extractTextFromDocx } = await import("@/lib/parsers/docx");

describe("extractTextFromPdf", () => {
  it("passes the buffer to PDFParse and returns the extracted text", async () => {
    getTextMock.mockResolvedValueOnce({ text: "mocked pdf text" });
    destroyMock.mockResolvedValueOnce(undefined);

    const buffer = Buffer.from("fake-pdf-bytes");
    const text = await extractTextFromPdf(buffer);

    expect(text).toBe("mocked pdf text");
    expect(pdfParseCtor).toHaveBeenCalledWith({ data: buffer });
    expect(destroyMock).toHaveBeenCalled();
  });

  it("still destroys the parser and propagates the error on failure", async () => {
    getTextMock.mockRejectedValueOnce(new Error("corrupt pdf"));
    destroyMock.mockResolvedValueOnce(undefined);

    await expect(extractTextFromPdf(Buffer.from("bad"))).rejects.toThrow("corrupt pdf");
    expect(destroyMock).toHaveBeenCalled();
  });
});

describe("extractTextFromDocx", () => {
  it("passes the buffer to mammoth and returns the extracted value", async () => {
    extractRawTextMock.mockResolvedValueOnce({ value: "mocked docx text", messages: [] });

    const buffer = Buffer.from("fake-docx-bytes");
    const text = await extractTextFromDocx(buffer);

    expect(text).toBe("mocked docx text");
    expect(extractRawTextMock).toHaveBeenCalledWith({ buffer });
  });

  it("propagates mammoth errors", async () => {
    extractRawTextMock.mockRejectedValueOnce(new Error("corrupt docx"));
    await expect(extractTextFromDocx(Buffer.from("bad"))).rejects.toThrow("corrupt docx");
  });
});
