"""Builds public/models/anatomy.glb from BodyParts3D muscle meshes.

Needs: pip install trimesh fast-simplification numpy, plus parts.txt (the
dataset's parts_list_e.txt) and have.txt (names of the available STL files)
in ../bp relative to this script. Source data: BodyParts3D, (c) The Database
Center for Life Science, CC Attribution-Share Alike 2.1 Japan.
"""
import re, os, sys, subprocess, concurrent.futures as cf
import numpy as np, trimesh, fast_simplification
here = os.path.dirname(os.path.abspath(__file__))
parts = [l.rstrip('\n').split('\t') for l in open(os.path.join(here, '..', 'bp', 'parts.txt'))][1:]
have = set(open(os.path.join(here, '..', 'bp', 'have.txt')).read().split())
RULES = [  # (regex on name, app part)
    (r'pectoralis major|serratus anterior', 'chest'),
    (r'deltoid', 'shoulders'),
    (r'biceps brachii|triceps brachii|brachialis|coracobrachialis|brachioradialis|flexor carpi|extensor carpi|extensor digitorum$|flexor digitorum superficialis|pronator teres|palmaris longus', 'arms'),
    (r'rectus abdominis|external oblique', 'core'),
    (r'latissimus dorsi|trapezius|rhomboid|infraspinatus|teres major|teres minor|iliocostalis (lumborum|thoracis)|longissimus thoracis', 'back'),
    (r'gluteus (maximus|medius)|tensor fasciae latae', 'glutes'),
    (r'rectus femoris|vastus|sartorius|gracilis|adductor (longus|magnus)|biceps femoris|semitendinosus|semimembranosus|gastrocnemius|soleus|tibialis anterior|extensor digitorum longus|fibularis longus|pectineus', 'legs'),
    (r'sternocleidomastoid', 'neutral'),
]
pick = {}
for fid, name in parts:
    if fid not in have or not re.search(r'\b(right|left)\b', name): continue
    for rx, part in RULES:
        if re.search(rx, name):
            pick[fid] = (name, part); break
print(len(pick), 'muscle files')
os.makedirs(os.path.join(here, 'stl'), exist_ok=True)
BASE = 'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl/'
def get(fid):
    out = os.path.join(here, 'stl', fid + '.stl')
    if os.path.exists(out) and os.path.getsize(out) > 500: return 0
    return subprocess.call(['curl', '-sS', '-m', '180', '-f', '--retry', '3', '-o', out, BASE + fid + '.stl'])
ids = list(pick) + ['FMA7163']
with cf.ThreadPoolExecutor(8) as ex: res = list(ex.map(get, ids))
print('failed:', [i for i, r in zip(ids, res) if r])
print('downloaded MB:', sum(os.path.getsize(os.path.join(here, 'stl', f)) for f in os.listdir(os.path.join(here, 'stl'))) // 2**20)

# ---------- process ----------
def load(fid):
    m = trimesh.load(os.path.join(here, 'stl', fid + '.stl'), process=True)
    m.merge_vertices()
    return m
def simplify(m, target):
    if len(m.faces) <= target: return m
    v, f = fast_simplification.simplify(np.asarray(m.vertices, np.float32), np.asarray(m.faces, np.int32), target_count=int(target))
    return trimesh.Trimesh(v, f, process=True)
meshes = {fid: load(fid) for fid in pick}
area = {fid: m.area for fid, m in meshes.items()}
BUDGET = int(os.environ.get('BUDGET', 120000))
tot = sum(a ** 0.75 for a in area.values())
groups = {}
for fid, m in meshes.items():
    t = max(160, BUDGET * area[fid] ** 0.75 / tot)
    groups.setdefault(pick[fid][1], []).append(simplify(m, t))
skin = simplify(load('FMA7163'), 14000)
# orientation: z is up in the source; find which way the body faces from chest vs back
allv = np.vstack([m.vertices for g in groups.values() for m in g])
cy = lambda part: np.vstack([m.vertices for m in groups[part]])[:, 1].mean()
front_sign = 1.0 if cy('chest') > cy('back') else -1.0
zmin, zmax = skin.bounds[0][2], skin.bounds[1][2]
cx = (allv[:, 0].min() + allv[:, 0].max()) / 2
cyc = (allv[:, 1].min() + allv[:, 1].max()) / 2
s = 1.75 / (zmax - zmin)
print('height mm', zmax - zmin, 'front_sign', front_sign)
def conv(m):
    v = np.asarray(m.vertices, np.float64)
    out = np.empty_like(v)
    out[:, 0] = -(v[:, 0] - cx) * s * front_sign  # together with z this is a pure rotation
    out[:, 1] = (v[:, 2] - zmin) * s
    out[:, 2] = (v[:, 1] - cyc) * s * front_sign
    f = np.asarray(m.faces)
    t = trimesh.Trimesh(out, f, process=False)
    return t
scene = trimesh.Scene()
total = 0
for part, ms in groups.items():
    m = conv(trimesh.util.concatenate(ms))
    _ = m.vertex_normals
    m.visual = trimesh.visual.ColorVisuals(m)
    total += len(m.faces)
    scene.add_geometry(m, node_name=part, geom_name=part)
    print(part, len(ms), 'muscles', len(m.faces), 'faces', np.round(m.bounds, 2).tolist())
sk = conv(skin); _ = sk.vertex_normals
scene.add_geometry(sk, node_name='skin', geom_name='skin')
out = os.environ.get('OUT', os.path.join(here, 'anatomy.glb'))
data = scene.export(file_type='glb', include_normals=True)
open(out, 'wb').write(data)
print('faces', total, '+ skin', len(sk.faces), '| glb MB', round(len(data) / 2**20, 2))
