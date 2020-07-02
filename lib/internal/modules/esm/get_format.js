'use strict';
const { StringPrototypeStartsWith } = primordials;
const { extname } = require('path');
const { getOptionValue } = require('internal/options');

const experimentalJsonModules = getOptionValue('--experimental-json-modules');
const experimentalSpeciferResolution =
  getOptionValue('--experimental-specifier-resolution');
const experimentalWasmModules = getOptionValue('--experimental-wasm-modules');
const { getPackageType } = require('internal/modules/esm/resolve');
const { URL, fileURLToPath } = require('internal/url');
const { ERR_UNKNOWN_FILE_EXTENSION } = require('internal/errors').codes;

const extensionFormatMap = {
  '__proto__': null,
  '.cjs': 'commonjs',
  '.mjs': 'module',
  '.json': 'unsupported',
  '.wasm': 'unsupported'
};

const legacyExtensionFormatMap = {
  '__proto__': null,
  '.cjs': 'commonjs',
  '.js': 'commonjs',
  '.json': 'commonjs',
  '.mjs': 'module',
  '.node': 'commonjs',
  '.wasm': 'unsupported'
};

if (experimentalWasmModules)
  extensionFormatMap['.wasm'] = legacyExtensionFormatMap['.wasm'] = 'wasm';

if (experimentalJsonModules)
  extensionFormatMap['.json'] = legacyExtensionFormatMap['.json'] = 'json';

function defaultGetFormat(url, context, defaultGetFormatUnused) {
  if (StringPrototypeStartsWith(url, 'nodejs:')) {
    return { format: 'builtin' };
  }
  const parsed = new URL(url);
  if (parsed.protocol === 'data:') {
    const [, mime] = /^([^/]+\/[^;,]+)(?:[^,]*?)(;base64)?,/.exec(parsed.pathname) || [null, null, null];
    const format = ({
      '__proto__': null,
      'text/javascript': 'module',
      'application/json': experimentalJsonModules ? 'json' : null,
      'application/wasm': experimentalWasmModules ? 'wasm' : null
    })[mime] || null;
    return { format };
  } else if (parsed.protocol === 'file:') {
    const ext = extname(parsed.pathname);
    let format = extensionFormatMap[ext];
    if (!format) {
      if (experimentalSpeciferResolution === 'node') {
        process.emitWarning(
          'The Node.js specifier resolution in ESM is experimental.',
          'ExperimentalWarning');
        format = legacyExtensionFormatMap[ext];
      }
    }
    if (format === 'unsupported') {
      throw new ERR_UNKNOWN_FILE_EXTENSION(ext, fileURLToPath(url));
    }
    if (!format) {
      format = getPackageType(parsed.href) === 'module' ? 'module' : 'commonjs';
    }
    return { format: format || null };
  }
  return { format: null };
}
exports.defaultGetFormat = defaultGetFormat;
