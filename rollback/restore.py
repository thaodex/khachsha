import sys,json,hashlib,zipfile
from pathlib import Path
base=Path(__file__).resolve().parent
root=Path(sys.argv[1] if len(sys.argv)>1 else '../main').resolve()
apply='--apply' in sys.argv
items=json.loads((base/'manifest.json').read_text())
conflicts=[]
for item in items:
 p=(root/item['path']).resolve()
 if not p.is_relative_to(root):raise SystemExit('Unsafe path')
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=item['enhanced_sha256']:conflicts.append(item['path'])
if conflicts:raise SystemExit('Refusing: changed or missing files. Back up and reconcile manually: '+str(conflicts))
with zipfile.ZipFile(base/'original-files.zip') as z:
 for item in items:
  p=root/item['path']
  print(('RESTORE ' if item['existed'] else 'REMOVE ')+item['path'])
  if apply:
   if item['existed']:p.write_bytes(z.read(item['path']))
   else:p.unlink()
print('Applied.' if apply else 'Dry run only. Add --apply after backing up.')
