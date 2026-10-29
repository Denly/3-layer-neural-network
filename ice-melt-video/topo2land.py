"""Decode world-atlas land-110m.json (TopoJSON) into land.js: window.LAND = [[ [lon,lat], ... ], ...]."""
import json, sys
topo = json.load(open(sys.argv[1]))
(sx, sy), (tx, ty) = topo["transform"]["scale"], topo["transform"]["translate"]
arcs = []
for arc in topo["arcs"]:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy
        pts.append([round(x * sx + tx, 2), round(y * sy + ty, 2)])
    arcs.append(pts)
def ring(idx):
    out = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        out += a[1:] if out else a
    return out
polys = []
for g in topo["objects"]["land"]["geometries"]:
    shapes = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
    for shape in shapes:
        polys.append(ring(shape[0]))
open(sys.argv[2], "w").write("window.LAND=" + json.dumps(polys, separators=(",", ":")) + ";")
print(len(polys), "polygons")
