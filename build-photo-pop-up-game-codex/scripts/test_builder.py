#!/usr/bin/env python3
"""Deterministic builder tests using temporary synthetic fixtures only."""
import base64
import json
from pathlib import Path
import tempfile
import unittest
import wave
import sys
sys.dont_write_bytecode = True
from build_game import STARTER, build, load_project

class BuilderTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.cfg=json.loads((STARTER/'demo.json').read_text())
        self.path=self.root/'project.json'
    def tearDown(self): self.temp.cleanup()
    def write(self): self.path.write_text(json.dumps(self.cfg)); return self.path
    def test_boolean_schema_rejected(self):
        self.cfg['schemaVersion'] = True
        with self.assertRaisesRegex(ValueError, 'schemaVersion'): build(self.write())

    def test_demo_and_license(self):
        html=build(self.write())
        self.assertIn('THE SOFTWARE IS PROVIDED',html)
        self.assertNotIn('__PROJECT_JSON__',html)
        self.assertNotIn('<script src=',html)
    def test_injection_escaped_and_notes_excluded(self):
        self.cfg['title']='</script><img src=x onerror=alert(1)>'
        self.cfg['privateNotes']='DO_NOT_PUBLISH_THIS'
        html=build(self.write())
        self.assertNotIn(self.cfg['title'],html)
        self.assertNotIn('DO_NOT_PUBLISH_THIS',html)
        self.assertIn('\\u003c/script\\u003e',html)
    def test_marker_text_is_not_replaced(self):
        self.cfg['title']='__APP_JS__'
        html=build(self.write())
        self.assertIn('"title": "__APP_JS__"',html)
    def test_ui_overrides_and_validation(self):
        self.cfg['language']='zh-CN'
        self.cfg['ui']={'open':'打开故事','progress':'已找到 {count}/{total}'}
        html=build(self.write())
        self.assertIn('打开故事',html)
        self.cfg['ui']['progress']='bad template'
        with self.assertRaisesRegex(ValueError,'needs'): build(self.write())
    def test_missing_media(self):
        self.cfg['pieces'][0]['image']='absent.png'
        with self.assertRaisesRegex(ValueError,'Missing media'): build(self.write())
    def test_traversal(self):
        self.cfg['pieces'][0]['image']='../other.png'
        with self.assertRaisesRegex(ValueError,'inside the project'): build(self.write())
    def test_duplicate_ids(self):
        self.cfg['pieces'][1]['id']=self.cfg['pieces'][0]['id']
        with self.assertRaisesRegex(ValueError,'Duplicate'): build(self.write())
    def test_invalid_target(self):
        self.cfg['game']['targets']=['missing']
        with self.assertRaisesRegex(ValueError,'every piece'): build(self.write())
    def test_nonfinite_geometry(self):
        self.cfg['pieces'][0]['x']=float('nan')
        with self.assertRaisesRegex(ValueError,'finite'): build(self.write())
    def test_media_and_only_referenced_assets(self):
        (self.root/'pixel.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII='))
        with wave.open(str(self.root/'tone.wav'),'wb') as f:
            f.setparams((1,2,8000,80,'NONE','not compressed')); f.writeframes(b'\0\0'*80)
        (self.root/'unused-private.txt').write_text('PRIVATE_UNREFERENCED')
        p=self.cfg['pieces'][0];p.update(image='pixel.png',audio='tone.wav',caption='Silent synthetic test clip')
        html=build(self.write())
        self.assertIn('data:image/png;base64,',html);self.assertIn('data:audio/wav;base64,',html)
        self.assertNotIn('PRIVATE_UNREFERENCED',html)
    def test_audio_needs_caption(self):
        self.cfg['pieces'][0]['audio']='sound.wav'
        with self.assertRaisesRegex(ValueError,'caption'): build(self.write())
    def test_wrong_signature(self):
        (self.root/'fake.png').write_text('not an image')
        self.cfg['pieces'][0]['image']='fake.png'
        with self.assertRaisesRegex(ValueError,'signature'): build(self.write())
    def test_no_accidental_overwrite(self):
        out=self.root/'game.html';build(self.write(),out)
        with self.assertRaisesRegex(ValueError,'Output exists'): build(self.path,out)
        build(self.path,out,force=True)
    def test_symlink_escape(self):
        (self.root/'outside.png').symlink_to('/etc/hosts')
        self.cfg['pieces'][0]['image']='outside.png'
        with self.assertRaisesRegex(ValueError,'inside the project'): build(self.write())

class AtlasTests(unittest.TestCase):
    setUp = BuilderTests.setUp
    tearDown = BuilderTests.tearDown
    write = BuilderTests.write
    def atlas(self):
        base=self.cfg
        self.cfg={k:v for k,v in base.items() if k not in ('pieces','game')}
        self.cfg['spreads']=[dict(id='one',pieces=base['pieces'],game=base['game'])]
    def test_atlas_roundtrip(self):
        self.atlas(); self.cfg['spreads'].append(dict(self.cfg['spreads'][0],id='two'))
        result=load_project(self.write());self.assertEqual(len(result['spreads']),2)
    def test_duplicate_spread(self):
        self.atlas();self.cfg['spreads']*=2
        with self.assertRaisesRegex(ValueError,'spread ID'):load_project(self.write())
    def test_atlas_map_traversal(self):
        self.atlas();self.cfg['spreads'][0].update(maps={'left':'../private.png'},mapCaption='equivalent')
        with self.assertRaisesRegex(ValueError,'inside the project'):load_project(self.write())
    def test_atlas_private_notes(self):
        self.atlas();self.cfg['spreads'][0]['privateNotes']='SECRET_ATLAS_NOTE'
        self.assertNotIn('SECRET_ATLAS_NOTE',build(self.write()))
    def test_empty_atlas(self):
        self.atlas();self.cfg['spreads']=[]
        with self.assertRaisesRegex(ValueError,'1–24'):load_project(self.write())

if __name__=='__main__':unittest.main()
