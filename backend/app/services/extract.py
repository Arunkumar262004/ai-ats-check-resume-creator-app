import io

from docx import Document
from pypdf import PdfReader


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif name.endswith(".docx"):
        doc = Document(io.BytesIO(data))
        text = "\n".join(p.text for p in doc.paragraphs)
    elif name.endswith(".txt"):
        text = data.decode("utf-8", errors="ignore")
    else:
        raise ValueError("Unsupported file type. Use PDF, DOCX or TXT.")
    text = text.strip()
    if not text:
        raise ValueError("No text could be extracted (scanned PDF?).")
    return text


def chunk_text(text: str, size: int = 700, overlap: int = 120) -> list[str]:
    """Paragraph-aware chunking with character overlap."""
    paras = [p.strip() for p in text.split("\n") if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if len(cur) + len(p) + 1 <= size:
            cur = f"{cur}\n{p}" if cur else p
        else:
            if cur:
                chunks.append(cur)
            while len(p) > size:  # very long line
                chunks.append(p[:size])
                p = p[size - overlap:]
            cur = (chunks[-1][-overlap:] + "\n" + p) if chunks and len(p) < size else p
    if cur:
        chunks.append(cur)
    return chunks
