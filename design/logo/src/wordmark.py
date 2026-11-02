"""Vectorise « hoopstats » en Space Grotesk (instance wght donnée) -> path SVG.

usage: wordmark.py font.woff2 weight tracking out.json
Sortie : {"d": path en unités police (y vers le bas, ligne de base à 0), "width", "xheight", "ascender"}
"""
import json
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src, weight, tracking, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
font = TTFont(src)
font = instancer.instantiateVariableFont(font, {"wght": weight})
gs = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]

text = "hoopstats"
names = [cmap[ord(c)] for c in text]

# Crénage GPOS (paires simples, format 1 et 2) si présent.
def kern_pairs():
    pairs = {}
    if "GPOS" not in font:
        return pairs
    for lookup in font["GPOS"].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, "LookupType", lookup.LookupType) != 2:
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for i, first in enumerate(cov):
                    for pvr in st.PairSet[i].PairValueRecord:
                        v = pvr.Value1.XAdvance if pvr.Value1 and hasattr(pvr.Value1, "XAdvance") else 0
                        if v:
                            pairs.setdefault((first, pvr.SecondGlyph), v)
            elif st.Format == 2:
                c1, c2 = st.ClassDef1.classDefs, st.ClassDef2.classDefs
                for first in cov:
                    k1 = c1.get(first, 0)
                    for second in set(names):
                        k2 = c2.get(second, 0)
                        rec = st.Class1Record[k1].Class2Record[k2]
                        v = rec.Value1.XAdvance if rec.Value1 and hasattr(rec.Value1, "XAdvance") else 0
                        if v:
                            pairs.setdefault((first, second), v)
    return pairs

pairs = kern_pairs()
pen = SVGPathPen(gs)
x = 0.0
for i, n in enumerate(names):
    tp = TransformPen(pen, (1, 0, 0, -1, x, 0))
    gs[n].draw(tp)
    x += hmtx[n][0] + tracking
    if i + 1 < len(names):
        x += pairs.get((n, names[i + 1]), 0)
x -= tracking
os2 = font["OS/2"]
json.dump(
    {"d": pen.getCommands(), "width": x, "xheight": os2.sxHeight, "ascender": os2.sTypoAscender,
     "upm": font["head"].unitsPerEm, "kerned": len(pairs)},
    open(out, "w"),
)
print("width", x, "xheight", os2.sxHeight, "kern pairs used", len(pairs))
