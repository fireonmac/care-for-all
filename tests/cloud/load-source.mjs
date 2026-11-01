import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// 기존 TypeScript 의존성만 사용해 Node 20+에서 서버 모듈을 격리 검증한다.
export function sourceLoader(mocks = {}) {
  const cache = new Map();
  const root = path.resolve(import.meta.dirname, '../..');
  function load(relativePath) {
    const filename = path.resolve(root, relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const nativeImport = createRequire(filename);
    const dependency = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      const local = id.startsWith('@/') ? path.join(root, 'src', id.slice(2))
        : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (local) {
        const file = [local, local + '.ts', local + '.tsx', path.join(local, 'index.ts')].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (file && /\.tsx?$/.test(file)) return load(file);
      }
      return nativeImport(id);
    };
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    new Function('require', 'module', 'exports', output)(dependency, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}
