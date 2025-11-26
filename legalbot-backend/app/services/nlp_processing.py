import re
from typing import List
from collections import Counter
from difflib import SequenceMatcher

import spacy
import fitz  # PyMuPDF
from docx import Document
import dateutil.parser

# Load spaCy English model (ensure model installed: python -m spacy download en_core_web_sm)
nlp = spacy.load("en_core_web_sm")


def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)


def extract_clauses(text: str) -> List[str]:
    """
    Use spaCy sentence segmentation and return normalized, deduplicated clauses
    that contain keywords of legal interest.
    """
    keywords = {"termination", "liability", "confidentiality", "indemnity", "warranty", "notice", "penalty", "obligation"}
    clauses = []
    doc = nlp(text)
    for sent in doc.sents:
        sent_text = sent.text.strip()
        sent_lower = sent_text.lower()
        if any(kw in sent_lower for kw in keywords):
            normalized = re.sub(r'\s+', ' ', sent_text).strip()
            clauses.append(normalized)
    # dedupe while preserving order
    seen = set()
    out = []
    for c in clauses:
        key = c.lower()
        if key not in seen:
            seen.add(key)
            out.append(c)
    return out


def analyze_risk(text: str) -> dict:
    """
    Count occurrences of risk keywords, compute normalized score and level.
    """
    risk_keywords = {
        "high": ["penalty", "liquidated damages", "indemnify", "exclusive remedy"],
        "medium": ["warranty", "limitation of liability", "termination"],
        "low": ["force majeure", "notification", "confidentiality"]
    }
    text_lower = text.lower()
    counts = {"high": 0, "medium": 0, "low": 0}
    found = []
    for level, kws in risk_keywords.items():
        for kw in kws:
            if kw in text_lower:
                counts[level] += 1
                found.append(f"{kw} ({level})")
    # normalized score: weighted by level and scaled to 0..100
    raw_score = counts["high"] * 3 + counts["medium"] * 2 + counts["low"] * 1
    # scale factor: guard against long docs -> divide by sqrt(len)/50 heuristic
    length_factor = max(1.0, (len(text) ** 0.5) / 50.0)
    score = int(min(100, (raw_score / length_factor) * 10))
    if score >= 60:
        level = "High"
    elif score >= 30:
        level = "Medium"
    elif score >= 5:
        level = "Low"
    else:
        level = "Unknown"
    return {"level": level, "score": score, "found": found}


def extract_keywords(text: str, top_n: int = 10) -> List[str]:
    doc = nlp(text.lower())
    candidates = [chunk.text.strip() for chunk in doc.noun_chunks]
    freq = Counter(candidates)
    most_common = freq.most_common(top_n)
    keywords = [kw for kw, _ in most_common]
    return keywords


def summarize_text(text: str, max_sentences: int = 3) -> str:
    doc = nlp(text)
    keywords = ['termination', 'liability', 'confidentiality', 'risk', 'warranty', 'indemnity']
    sent_scores = []
    for sent in doc.sents:
        score = sum(kw in sent.text.lower() for kw in keywords)
        score += len([ent for ent in sent.ents])
        sent_scores.append((score, sent.text))
    sent_scores.sort(reverse=True)
    top_sents = [s for _, s in sent_scores[:max_sentences]]
    if top_sents:
        return " ".join(top_sents)
    else:
        sentences = re.split(r'(?<=[.!?]) +', text)
        return ' '.join(sentences[:max_sentences]).strip()


def normalize_dates(entities: list) -> list:
    date_entities = []
    for ent in entities:
        try:
            dt = dateutil.parser.parse(ent, fuzzy=True)
            date_entities.append(dt.strftime('%Y-%m-%d'))
        except Exception:
            continue
    return list(set(date_entities))


async def process_document(upload_file):
    import tempfile
    import os
    filename = upload_file.filename
    suffix = os.path.splitext(filename)[1]
    file_bytes = await upload_file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    if suffix == '.pdf':
        text = extract_text_from_pdf(tmp_path)
    elif suffix == '.docx':
        text = extract_text_from_docx(tmp_path)
    elif suffix == '.txt':
        text = file_bytes.decode('utf-8')
    else:
        text = ''
    try:
        os.unlink(tmp_path)
    except Exception:
        pass

    clauses = extract_clauses(text)
    risk = analyze_risk(text)
    keywords = extract_keywords(text)
    summary = summarize_text(text)
    entities_all = [ent.text for ent in nlp(text).ents]
    dates_raw = [ent.text for ent in nlp(text).ents if ent.label_ == 'DATE']
    dates = normalize_dates(dates_raw)
    return {
        'filename': filename,
        'clauses': clauses,
        'risk': risk,
        'keywords': keywords,
        'summary': summary,
        'entities': entities_all,
        'dates': dates,
        'text': text
    }


def jaccard_similarity(set_a, set_b):
    intersection = set_a.intersection(set_b)
    union = set_a.union(set_b)
    return len(intersection) / len(union) if len(union) > 0 else 1.0


def token_set(text: str):
    doc = nlp(text.lower())
    tokens = {t.lemma_ for t in doc if not t.is_stop and t.is_alpha}
    return tokens


def compare_documents(doc_a, doc_b):
    """
    Improved comparison: clause diffs, entity/date diffs, multiple similarity metrics,
    combined weighted score, diagnostics and adjusted percent considering risk.
    """
    text_a = str(doc_a.get('text', '') if isinstance(doc_a, dict) else (doc_a or ''))
    text_b = str(doc_b.get('text', '') if isinstance(doc_b, dict) else (doc_b or ''))

    clauses_a = extract_clauses(text_a)
    clauses_b = extract_clauses(text_b)
    set_clauses_a = {c.lower() for c in clauses_a}
    set_clauses_b = {c.lower() for c in clauses_b}
    missing_in_b = list(set_clauses_a - set_clauses_b)
    missing_in_a = list(set_clauses_b - set_clauses_a)

    entities_a = set(doc_a.get('entities', []))
    entities_b = set(doc_b.get('entities', []))
    entities_only_in_a = list(entities_a - entities_b)
    entities_only_in_b = list(entities_b - entities_a)

    dates_a = set(doc_a.get('dates', []))
    dates_b = set(doc_b.get('dates', []))
    dates_only_in_a = list(dates_a - dates_b)
    dates_only_in_b = list(dates_b - dates_a)

    summary = {'doc_a': doc_a.get('summary'), 'doc_b': doc_b.get('summary')}

    # Similarity measures
    seq_ratio = SequenceMatcher(None, text_a, text_b).ratio()
    tokens_a = token_set(text_a)
    tokens_b = token_set(text_b)
    token_jaccard = jaccard_similarity(tokens_a, tokens_b)
    clause_overlap = jaccard_similarity(set_clauses_a, set_clauses_b)

    # combine with tunable weights
    overall_score = (0.45 * seq_ratio) + (0.35 * token_jaccard) + (0.20 * clause_overlap)
    overall_similarity = max(0.0, min(1.0, overall_score))
    similarity_percent = int(round(overall_similarity * 100))

    # risk-adjusted score
    def risk_numeric(r):
        lvl = (r.get('level') if isinstance(r, dict) else r) or ''
        lvl = str(lvl).lower()
        if 'high' in lvl:
            return 2
        if 'medium' in lvl:
            return 1
        if 'low' in lvl:
            return 0
        return 0

    risk_a = doc_a.get('risk', {}) or {}
    risk_b = doc_b.get('risk', {}) or {}
    risk_penalty = (risk_numeric(risk_a) + risk_numeric(risk_b)) / 4.0  # 0..0.5
    adjusted_similarity = overall_similarity * (1.0 - risk_penalty)
    adjusted_percent = int(round(adjusted_similarity * 100))

    diagnostics = {
        'len_a': len(text_a),
        'len_b': len(text_b),
        'seq_ratio': seq_ratio,
        'token_jaccard': token_jaccard,
        'clause_overlap': clause_overlap,
        'raw_overall_score': overall_similarity,
        'similarity_percent': similarity_percent,
        'adjusted_percent': adjusted_percent,
        'clauses_count_a': len(clauses_a),
        'clauses_count_b': len(clauses_b),
    }

    return {
        'missing_clauses_in_b': missing_in_b,
        'missing_clauses_in_a': missing_in_a,
        'risk_a': risk_a,
        'risk_b': risk_b,
        'entities_only_in_a': entities_only_in_a,
        'entities_only_in_b': entities_only_in_b,
        'dates_only_in_a': dates_only_in_a,
        'dates_only_in_b': dates_only_in_b,
        'summary': summary,
        'overall_similarity': overall_similarity,
        'similarity_percent': similarity_percent,
        'adjusted_similarity_percent': adjusted_percent,
        'diagnostics': diagnostics,
        'can_do_agreement': adjusted_similarity >= 0.8
    }
