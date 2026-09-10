#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const allowGoldenExample = rawArgs.includes('--allow-golden-example');
const unknownFlags = rawArgs.filter(argument => argument.startsWith('--') && argument !== '--allow-golden-example');
const positional = rawArgs.filter(argument => !argument.startsWith('--'));
if (unknownFlags.length || positional.length !== 1) {
  console.error('usage: node scripts/validate-renovation-html.mjs [--allow-golden-example] path/to/result.html');
  if (unknownFlags.length) console.error(`unknown option(s): ${unknownFlags.join(', ')}`);
  process.exit(1);
}

const target = path.resolve(positional[0]);
if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
  console.error(`HTML file does not exist: ${target}`);
  process.exit(1);
}
if (fs.statSync(target).size > 160 * 1024 * 1024) {
  console.error(`HTML file exceeds the 160 MiB validation limit: ${target}`);
  process.exit(1);
}

const html = fs.readFileSync(target, 'utf8');
const errors = [];
const warnings = [];
const report = {
  file: target,
  bytes: Buffer.byteLength(html),
  contract: null,
  project: null,
  panels: 0,
  embeddedAssets: 0,
  directImages: 0,
  visuals: null,
  budget: null,
  browserRuntimeRequired: true,
};

function addError(message) { errors.push(message); }
function addWarning(message) { warnings.push(message); }
function matches(regex, source = html) { return [...source.matchAll(regex)]; }
function nonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0; }
function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? true;
  return attributes;
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? _;
    const hexadecimal = entity[1].toLowerCase() === 'x';
    const number = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : _;
  });
}

function visibleText(fragment) {
  return decodeEntities(fragment
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonScript(id, required = false) {
  const pattern = new RegExp(`<script\\b[^>]*\\bid=["']${escapeRegex(id)}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const match = html.match(pattern);
  if (!match) {
    if (required) addError(`required JSON block is missing: ${id}`);
    return null;
  }
  try { return JSON.parse(match[1]); }
  catch (error) { addError(`${id} is invalid JSON: ${error.message}`); return null; }
}

function compareExactSets(label, expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter(value => !actualSet.has(value));
  const extra = [...actualSet].filter(value => !expectedSet.has(value));
  if (missing.length) addError(`${label} is missing: ${missing.join(', ')}`);
  if (extra.length) addError(`${label} has unrecognised entries: ${extra.join(', ')}`);
}

function hasFiniteBounds(bounds) {
  return isPlainObject(bounds) && ['x', 'z', 'width', 'depth'].every(key => Number.isFinite(bounds[key])) && bounds.width > 0 && bounds.depth > 0;
}

function boundsContain(outer, inner, epsilon = 1e-7) {
  return hasFiniteBounds(outer) && hasFiniteBounds(inner) &&
    inner.x >= outer.x - epsilon && inner.z >= outer.z - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.z + inner.depth <= outer.z + outer.depth + epsilon;
}

function finiteSegment(segment) {
  return isPlainObject(segment) && ['x1', 'z1', 'x2', 'z2'].every(key => Number.isFinite(segment[key]));
}

function segmentInside(bounds, segment, epsilon = 1e-7) {
  return finiteSegment(segment) &&
    [segment.x1, segment.x2].every(x => x >= bounds.x - epsilon && x <= bounds.x + bounds.width + epsilon) &&
    [segment.z1, segment.z2].every(z => z >= bounds.z - epsilon && z <= bounds.z + bounds.depth + epsilon);
}

function pairKey(a, b) { return [String(a), String(b)].sort().join('\u0000'); }

const elements = matches(/<([a-z][\w:-]*)\b([^<>]*?)>/gi).map(match => ({
  name: match[1].toLowerCase(),
  attributes: parseAttributes(match[2]),
  raw: match[0],
  index: match.index,
  end: match.index + match[0].length,
}));
const byName = name => elements.filter(element => element.name === name);
const bodyElement = byName('body')[0];

if (!/^\s*<!doctype html>/i.test(html)) addError('missing HTML doctype');
const root = byName('html')[0];
if (!root) addError('missing html element');
else {
  if (typeof root.attributes.lang !== 'string' || !root.attributes.lang.trim()) addWarning('html element has no language attribute');
  report.contract = root.attributes['data-renovation-contract'] || null;
}
const strict = report.contract === 'v1';
if (!strict) addError('renovation HTML must declare data-renovation-contract="v1" on the root html element');
if (!byName('meta').some(meta => String(meta.attributes.name).toLowerCase() === 'viewport')) addError('missing responsive viewport meta tag');

const placeholders = [...new Set(matches(/__[A-Z][A-Z0-9_]{2,}__/g).map(match => match[0]))];
if (placeholders.length) addError(`unresolved placeholders: ${placeholders.join(', ')}`);
if (/(?:\/workspace\/|\/private\/tmp\/|\/tmp\/|\/home\/|\/Users\/|\/root\/|\bfile:\/\/|\b[A-Za-z]:[\\/])/.test(html)) addError('private, temporary, or absolute local filesystem path is embedded');

const ids = elements.map(element => element.attributes.id).filter(value => typeof value === 'string');
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) addError(`duplicate ids: ${duplicateIds.join(', ')}`);
const idSet = new Set(ids);
for (const element of elements) {
  const controls = element.attributes['aria-controls'];
  if (typeof controls === 'string' && !idSet.has(controls)) addError(`aria-controls target does not exist: ${controls}`);
  const jump = element.attributes['data-jump'];
  if (typeof jump === 'string' && !idSet.has(jump)) addError(`data-jump target does not exist: ${jump}`);
}

const projectConfig = parseJsonScript('projectConfig', strict);
const recognisedPanelIds = new Set([
  'overview', 'drawing', 'openings', 'special-areas', 'special_areas', 'balcony',
  'kitchen', 'bathroom', 'laundry', 'visuals', 'materials', 'furniture',
]);
const reservedGoldenIds = new Set(['golden-sanitised-third-floor']);
const reservedGoldenFingerprints = new Set([
  'dbed55193a950088a4f6eff4a36aebced5ccab80d5ade8313bd8ffed6e012895',
  '9fdc0568469c87247bd2fa6233a25fa1a7e05f24023582c78749535aa8d21ce3',
  '94733bdf5226c6e06c7a72761dedc16832d6f5aa750e16cff2b8e4e2785a9972',
]);
const sensitiveAssetFields = {
  contains_source_photo: 'allow_source_photo',
  contains_face: 'allow_face',
  contains_watermark: 'allow_watermark',
  contains_private_plan: 'allow_private_plan',
};
let requiredPanels = [];
let features = {};
let minimumVisuals = { static_3d: 0, final_renders: 0 };
let requiredPreflight = [];
let statusLabels = {};
let budgetConfig = null;
let assetPolicy = {};
const wholeRenovationPreflight = [
  'moisture_mould', 'demolition_hazards', 'electrical', 'gas_combustion_co',
  'smoke_egress_fire', 'door_swings', 'plumbing_drainage_ventilation', 'structural_facade',
];

if (strict) {
  if (!isPlainObject(projectConfig)) addError('projectConfig must be an object');
  else {
    if (projectConfig.version !== 1) addError('projectConfig.version must be 1');
    if (!nonEmptyString(projectConfig.project_id) || !/^[a-z0-9][a-z0-9._-]*$/i.test(projectConfig.project_id)) addError('projectConfig.project_id must be a non-empty stable identifier');
    if (!/^[a-f0-9]{64}$/.test(projectConfig.input_fingerprint || '')) addError('projectConfig.input_fingerprint must be 64 lowercase hexadecimal SHA-256 characters');
    if (typeof projectConfig.is_golden_example !== 'boolean') addError('projectConfig.is_golden_example must be Boolean');
    const hasGoldenSentinel = projectConfig.is_golden_example === true || reservedGoldenIds.has(projectConfig.project_id) || reservedGoldenFingerprints.has(projectConfig.input_fingerprint);
    if (hasGoldenSentinel && !allowGoldenExample) addError('bundled golden example is blocked from release; pass --allow-golden-example only for deliberate example validation');
    if (allowGoldenExample && !hasGoldenSentinel) addWarning('--allow-golden-example was supplied for a non-golden project');
    if (!['whole-home', 'selected-floor', 'room'].includes(projectConfig.scope_type)) addError('projectConfig.scope_type must be whole-home, selected-floor, or room');
    if (!nonEmptyString(projectConfig.locale)) addError('projectConfig.locale is required');
    if (bodyElement?.attributes['data-project-id'] !== projectConfig.project_id) addError('body data-project-id does not match projectConfig.project_id');
    if (!isPlainObject(projectConfig.target)) addError('projectConfig.target must be an object');
    else {
      for (const key of ['id', 'label', 'primary_floor_id', 'area_unit', 'area_basis', 'source_id']) if (!nonEmptyString(projectConfig.target[key])) addError(`projectConfig.target.${key} is required`);
      if (!Array.isArray(projectConfig.target.floor_ids) || !projectConfig.target.floor_ids.length || projectConfig.target.floor_ids.some(id => !nonEmptyString(id))) addError('projectConfig.target.floor_ids must be a non-empty string array');
      else {
        if (new Set(projectConfig.target.floor_ids).size !== projectConfig.target.floor_ids.length) addError('projectConfig.target.floor_ids must be unique');
        if (!projectConfig.target.floor_ids.includes(projectConfig.target.primary_floor_id)) addError('projectConfig.target.primary_floor_id must appear in target.floor_ids');
      }
      if (!Number.isFinite(projectConfig.target.area_value) || projectConfig.target.area_value <= 0) addError('projectConfig.target.area_value must be positive');
      if (projectConfig.scope_type === 'room' && (!Array.isArray(projectConfig.target.room_ids) || !projectConfig.target.room_ids.length || projectConfig.target.room_ids.some(id => !nonEmptyString(id)))) addError('room scope requires target.room_ids');
    }

    if (!Array.isArray(projectConfig.required_panels) || !projectConfig.required_panels.length || projectConfig.required_panels.some(id => !nonEmptyString(id))) addError('projectConfig.required_panels must be a non-empty string array');
    else {
      requiredPanels = projectConfig.required_panels;
      if (new Set(requiredPanels).size !== requiredPanels.length) addError('projectConfig.required_panels must be unique');
      for (const id of requiredPanels) {
        if (!/^[a-z][a-z0-9_-]*$/.test(id)) addError(`projectConfig has an unsafe panel ID: ${id}`);
        else if (!recognisedPanelIds.has(id)) addError(`projectConfig has an unrecognised panel ID: ${id}`);
      }
    }

    if (!isPlainObject(projectConfig.features)) addError('projectConfig.features must be an object');
    else {
      features = projectConfig.features;
      for (const key of ['plan', 'modifications', 'interactive_3d', 'budget', 'sourcing', 'multi_floor']) if (typeof features[key] !== 'boolean') addError(`projectConfig.features.${key} must be Boolean`);
      if ('review_notes' in features && typeof features.review_notes !== 'boolean') addError('projectConfig.features.review_notes must be Boolean when present');
      if (!Array.isArray(features.special_areas) || features.special_areas.some(value => !nonEmptyString(value))) addError('projectConfig.features.special_areas must be a string array');
    }

    if (!isPlainObject(projectConfig.minimum_visuals)) addError('projectConfig.minimum_visuals must be an object');
    else {
      minimumVisuals = projectConfig.minimum_visuals;
      for (const key of ['static_3d', 'final_renders']) if (!Number.isInteger(minimumVisuals[key]) || minimumVisuals[key] < 0) addError(`projectConfig.minimum_visuals.${key} must be a non-negative integer`);
      if (features.interactive_3d && minimumVisuals.static_3d < 1) addError('interactive_3d requires at least one configured static 3D fallback');
    }

    if (!Array.isArray(projectConfig.required_preflight_categories) || projectConfig.required_preflight_categories.some(value => !nonEmptyString(value))) addError('projectConfig.required_preflight_categories must be a string array');
    else {
      requiredPreflight = projectConfig.required_preflight_categories;
      if (new Set(requiredPreflight).size !== requiredPreflight.length) addError('projectConfig.required_preflight_categories must be unique');
      if (projectConfig.scope_type !== 'room') for (const category of wholeRenovationPreflight) if (!requiredPreflight.includes(category)) addError(`whole-home/selected-floor scope requires preflight category: ${category}`);
    }
    if (!isPlainObject(projectConfig.preflight_status_labels)) addError('projectConfig.preflight_status_labels must be an object');
    else {
      statusLabels = projectConfig.preflight_status_labels;
      for (const status of ['unknown', 'clear', 'issue', 'not_applicable']) if (!nonEmptyString(statusLabels[status])) addError(`projectConfig.preflight_status_labels.${status} is required`);
    }

    if (features.budget) {
      if (!isPlainObject(projectConfig.budget)) addError('projectConfig.budget is required when budget is enabled');
      else {
        budgetConfig = projectConfig.budget;
        for (const key of ['currency_code', 'currency_symbol', 'unit_label', 'price_date']) if (!nonEmptyString(budgetConfig[key])) addError(`projectConfig.budget.${key} is required`);
        if (!Number.isFinite(budgetConfig.unit_divisor) || budgetConfig.unit_divisor <= 0) addError('projectConfig.budget.unit_divisor must be positive');
        if (!Number.isFinite(budgetConfig.contingency_rate) || budgetConfig.contingency_rate < 0 || budgetConfig.contingency_rate > 1) addError('projectConfig.budget.contingency_rate must be between 0 and 1');
        if (!Array.isArray(budgetConfig.required_optional_categories) || budgetConfig.required_optional_categories.some(value => !nonEmptyString(value))) addError('projectConfig.budget.required_optional_categories must be a string array');
        else if (new Set(budgetConfig.required_optional_categories).size !== budgetConfig.required_optional_categories.length) addError('projectConfig.budget.required_optional_categories must be unique');
      }
    }

    if (!isPlainObject(projectConfig.vertical_assumptions) || !nonEmptyString(projectConfig.vertical_assumptions.status)) addError('projectConfig.vertical_assumptions must include status');
    else {
      const heights = Object.entries(projectConfig.vertical_assumptions).filter(([key]) => key.startsWith('model_') && key.endsWith('_mm'));
      if (!heights.length) addError('projectConfig.vertical_assumptions must include at least one model_*_mm value');
      for (const [key, value] of heights) {
        const minimum = key === 'model_window_sill_mm' ? 0 : Number.EPSILON;
        if (!Number.isFinite(value) || value < minimum) addError(`projectConfig.vertical_assumptions.${key} has an invalid height`);
      }
      const vertical = projectConfig.vertical_assumptions;
      if (Number.isFinite(vertical.model_window_sill_mm) && Number.isFinite(vertical.model_window_head_mm) && vertical.model_window_sill_mm >= vertical.model_window_head_mm) addError('vertical assumptions require window sill < window head');
      if (Number.isFinite(vertical.model_window_head_mm) && Number.isFinite(vertical.model_wall_height_mm) && vertical.model_window_head_mm > vertical.model_wall_height_mm) addError('vertical assumptions require window head <= wall height');
      if (Number.isFinite(vertical.model_glazed_divider_height_mm) && Number.isFinite(vertical.model_wall_height_mm) && vertical.model_glazed_divider_height_mm > vertical.model_wall_height_mm) addError('vertical assumptions require glazed divider height <= wall height');
    }

    if (!isPlainObject(projectConfig.asset_policy)) addError('projectConfig.asset_policy must be an object');
    else {
      assetPolicy = projectConfig.asset_policy;
      for (const field of Object.values(sensitiveAssetFields)) if (typeof assetPolicy[field] !== 'boolean') addError(`projectConfig.asset_policy.${field} must be Boolean`);
    }

    if (features.plan && !requiredPanels.includes('drawing')) addError('plan feature requires the drawing panel');
    if (features.modifications && !requiredPanels.includes('openings')) addError('modifications feature requires the openings panel');
    if ((features.interactive_3d || minimumVisuals.static_3d > 0 || minimumVisuals.final_renders > 0) && !requiredPanels.includes('visuals')) addError('3D or render output requires the visuals panel');
    if (features.budget && !requiredPanels.includes('materials')) addError('budget feature requires the materials panel');
    if (features.sourcing && !requiredPanels.includes('furniture')) addError('sourcing feature requires the furniture panel');
    if (!isPlainObject(projectConfig.special_area_panels)) addError('projectConfig.special_area_panels must be an object');
    else if (Array.isArray(features.special_areas)) {
      compareExactSets('projectConfig.special_area_panels keys', features.special_areas, Object.keys(projectConfig.special_area_panels));
      for (const [area, panelId] of Object.entries(projectConfig.special_area_panels)) if (!requiredPanels.includes(panelId)) addError(`special area ${area} maps to a panel not present in required_panels: ${panelId}`);
    }
    if (features.multi_floor && projectConfig.target?.floor_ids?.length < 2) addError('multi_floor requires at least two target.floor_ids');
    if (!features.multi_floor && projectConfig.target?.floor_ids?.length > 1) addError('multiple target.floor_ids require features.multi_floor=true');
    report.project = { id: projectConfig.project_id || null, scopeType: projectConfig.scope_type || null, locale: projectConfig.locale || null, goldenExample: hasGoldenSentinel, goldenOverride: allowGoldenExample, features };
  }
}

const panels = byName('section').filter(element => element.attributes.role === 'tabpanel');
report.panels = panels.length;
if (strict && requiredPanels.length) {
  const panelIds = panels.map(panel => panel.attributes.id).filter(nonEmptyString);
  if (panels.some(panel => !nonEmptyString(panel.attributes.id))) addError('every tab panel must have an ID');
  compareExactSets('tab panels', requiredPanels, panelIds);
  if (panelIds.length !== requiredPanels.length) addError(`projectConfig requires ${requiredPanels.length} panels; found ${panelIds.length}`);
  const tabTargets = byName('button').map(button => button.attributes['data-tab']).filter(nonEmptyString);
  compareExactSets('tab controls', requiredPanels, tabTargets);
  if (!/(?:location\.hash|history\.(?:replaceState|pushState))/.test(html)) addError('tab URL/hash state wiring is missing');
}

if (strict && Array.isArray(features.special_areas)) {
  for (const area of features.special_areas) {
    const cardPattern = new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bdata-special-area=["']${escapeRegex(area)}["'])[^>]*>[\\s\\S]*?<\\/\\1>`, 'i');
    const card = html.match(cardPattern)?.[0];
    if (!card) { addError(`special-area panel is missing a data-special-area card: ${area}`); continue; }
    if (!/<img\b/i.test(card) || !/\bdata-asset=["'][^"']+["']/i.test(card)) addError(`special-area card lacks a visible data-asset-backed image: ${area}`);
    if (!/\bdata-floor-id=["'][^"']+["']/i.test(card)) addError(`special-area card lacks a same-floor image binding: ${area}`);
  }
}

if (strict && features.review_notes) {
  const requiredReviewIds = [
    'reviewOrb', 'reviewDrawer', 'reviewPinOverlay', 'reviewAdd', 'reviewImport',
    'reviewExportAll', 'reviewExportJson', 'reviewExportMd', 'reviewExportCsv',
    'reviewComposer', 'reviewList', 'reviewConfig', 'reviewNotes', 'releaseManifest',
  ];
  for (const id of requiredReviewIds) if (!idSet.has(id)) addError(`review_notes requires element or JSON block: ${id}`);
  const reviewConfig = parseJsonScript('reviewConfig', true);
  const reviewNotes = parseJsonScript('reviewNotes', true);
  const releaseManifest = parseJsonScript('releaseManifest', true);
  if (!isPlainObject(reviewConfig)) addError('reviewConfig must be an object');
  else {
    if (reviewConfig.version !== 1 || reviewConfig.enabled !== true) addError('reviewConfig must be enabled at version 1');
    if (!['local_export', 'remote'].includes(reviewConfig.storage_mode)) addError('reviewConfig.storage_mode must be local_export or remote');
    if (reviewConfig.project_id !== projectConfig.project_id) addError('reviewConfig.project_id must match projectConfig.project_id');
    if (!nonEmptyString(reviewConfig.release_id)) addError('reviewConfig.release_id is required');
    if (!isPlainObject(reviewConfig.baseline_versions)) addError('reviewConfig.baseline_versions must be an object');
    else for (const floorId of projectConfig.target?.floor_ids || []) if (!Number.isInteger(reviewConfig.baseline_versions[floorId])) addError(`reviewConfig lacks an integer baseline version for ${floorId}`);
    compareExactSets('reviewConfig.export_formats', ['json', 'markdown', 'csv'], Array.isArray(reviewConfig.export_formats) ? reviewConfig.export_formats : []);
  }
  if (!Array.isArray(reviewNotes)) addError('reviewNotes must be an array');
  if (!isPlainObject(releaseManifest)) addError('releaseManifest must be an object');
  else {
    if (releaseManifest.project_id !== projectConfig.project_id) addError('releaseManifest.project_id must match projectConfig.project_id');
    if (reviewConfig && releaseManifest.release_id !== reviewConfig.release_id) addError('releaseManifest.release_id must match reviewConfig.release_id');
    if (releaseManifest.review_storage_mode !== reviewConfig?.storage_mode) addError('releaseManifest.review_storage_mode must match reviewConfig.storage_mode');
  }
  if (bodyElement?.attributes['data-review-mode'] !== reviewConfig?.storage_mode) addError('body data-review-mode must match reviewConfig.storage_mode');
  const orbElement = elements.find(element => element.attributes.id === 'reviewOrb');
  if (orbElement?.attributes['aria-label'] !== '设计讨论与标注') addError('review orb must use aria-label="设计讨论与标注"');
  const reviewAnchors = elements.map(element => element.attributes['data-review-anchor']).filter(nonEmptyString);
  if (!reviewAnchors.length) addError('review_notes requires stable data-review-anchor markers');
  const duplicateReviewAnchors = [...new Set(reviewAnchors.filter((value, index) => reviewAnchors.indexOf(value) !== index))];
  if (duplicateReviewAnchors.length) addError(`duplicate data-review-anchor values: ${duplicateReviewAnchors.join(', ')}`);
  for (const panel of panels) if (!nonEmptyString(panel.attributes['data-review-anchor'])) addError(`reviewable panel lacks data-review-anchor: ${panel.attributes.id || '(unnamed)'}`);
  const staticVisuals = elements.filter(element => nonEmptyString(element.attributes['data-asset']) && String(element.attributes.class || '').split(/\s+/).includes('visual-item'));
  for (const visual of staticVisuals) if (!nonEmptyString(visual.attributes['data-review-anchor'])) addError(`visual item lacks data-review-anchor: ${visual.attributes['data-asset']}`);
  if (features.plan && !/\bdata-review-anchor=["']plan-[^"']+["']/i.test(html)) addError('review_notes with plan requires a stable plan anchor');
  if (features.interactive_3d && !/\bdata-review-anchor=["'][^"']*3d[^"']*["']/i.test(html)) addError('review_notes with interactive_3d requires a stable 3D viewer anchor');
  for (const token of ['localStorage', 'x_ratio', 'y_ratio', 'pointerdown', 'pointermove', 'review-notes.json', 'review-notes.md', 'review-index.csv']) if (!html.includes(token)) addError(`review_notes implementation is missing: ${token}`);
  if (!/\.textContent\s*=/.test(html)) addError('review note rendering must use textContent');
}

if (strict && features.multi_floor && (minimumVisuals.static_3d || 0) > 0 && Array.isArray(projectConfig?.target?.floor_ids)) {
  const overviewElements = elements.filter(element => element.attributes['data-whole-floor-overview'] === 'true');
  compareExactSets('whole-floor 3D overviews', projectConfig.target.floor_ids, overviewElements.map(element => element.attributes['data-floor-id']).filter(nonEmptyString));
  for (const element of overviewElements) {
    if (element.attributes['data-overview-quality'] !== 'polished') addError(`whole-floor 3D overview is not marked polished: ${element.attributes['data-floor-id'] || 'unknown floor'}`);
    if (!nonEmptyString(element.attributes['data-asset'])) addError(`whole-floor 3D overview lacks data-asset: ${element.attributes['data-floor-id'] || 'unknown floor'}`);
  }
}
if (strict && (minimumVisuals.static_3d || 0) > 0) {
  const staticConsumers = elements.filter(element => element.attributes['data-visual-kind'] === 'static-3d');
  for (const element of staticConsumers) {
    const quality = element.attributes['data-overview-quality'];
    const evidenceTier = element.attributes['data-geometry-evidence'];
    if (quality !== 'polished' && evidenceTier !== 'supplemental') {
      addError(`user-facing static 3D must be polished or marked supplemental geometry evidence: ${element.attributes['data-asset'] || 'unknown asset'}`);
    }
  }
}
for (const panel of panels) {
  const close = html.indexOf('</section>', panel.end);
  const text = close < 0 ? '' : visibleText(html.slice(panel.end, close));
  if (text.length < 40) addError(`panel has no substantive content: ${panel.attributes.id || '(unnamed)'}`);
}

function loadSharp() {
  const require = createRequire(import.meta.url);
  const candidates = ['sharp'];
  for (const root of String(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '').split(path.delimiter).filter(Boolean)) candidates.push(path.join(root, 'sharp'));
  for (const candidate of candidates) {
    try { const loaded = require(candidate); return loaded.default || loaded; }
    catch { /* try the runtime-owned dependency fallback */ }
  }
  return null;
}
const sharp = loadSharp();
let cumulativeDecodedImageBytes = 0;
let cumulativeDecodedPixels = 0;

function quickImageSignature(mime, bytes) {
  if (mime === 'image/webp') return bytes.length >= 30 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'image/png') return bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/jpeg') return bytes.length >= 128 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/gif') return bytes.length >= 20 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (mime === 'image/svg+xml') return /<svg\b/i.test(bytes.toString('utf8'));
  if (mime === 'image/avif') return bytes.length >= 24 && bytes.subarray(4, 8).toString('ascii') === 'ftyp' && /avif|avis/.test(bytes.subarray(8, Math.min(bytes.length, 64)).toString('ascii'));
  return false;
}

function normaliseSvgXmlEntities(source, label) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  let invalidEntity = false;
  const normalised = source.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()];
    const hexadecimal = entity[1].toLowerCase() === 'x';
    const value = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isInteger(value) || value <= 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
      invalidEntity = true;
      return whole;
    }
    return String.fromCodePoint(value);
  });
  if (invalidEntity || /&(?:#[^;\s<]*|[A-Za-z][A-Za-z0-9._:-]*);/.test(normalised)) addError(`${label} SVG contains an invalid or unsupported XML entity`);
  return normalised;
}

async function validateImageDataUri(label, value) {
  const match = /^data:(image\/(?:webp|png|jpeg|gif|svg\+xml|avif));base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  if (!match) { addError(`${label} is not a supported image data URI`); return false; }
  const encoded = match[2].replace(/\s/g, '');
  let bytes;
  try { bytes = Buffer.from(encoded, 'base64'); }
  catch { addError(`${label} cannot be decoded`); return false; }
  if (!bytes.length || bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) { addError(`${label} has invalid base64 encoding`); return false; }
  if (bytes.length < 16) { addError(`${label} is too small`); return false; }
  if (bytes.length > 32 * 1024 * 1024) { addError(`${label} exceeds the 32 MiB encoded-image limit`); return false; }
  cumulativeDecodedImageBytes += bytes.length;
  if (cumulativeDecodedImageBytes > 128 * 1024 * 1024) { addError('embedded images exceed the 128 MiB cumulative encoded-image limit'); return false; }
  const mime = match[1];
  if (!quickImageSignature(mime, bytes)) { addError(`${label} does not match its declared MIME signature`); return false; }
  if (mime === 'image/svg+xml') {
    const svg = normaliseSvgXmlEntities(bytes.toString('utf8'), label);
    if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(svg) || /<\s*(?:script|foreignObject|metadata)\b/i.test(svg) || /\son[a-z]+\s*=/i.test(svg)) addError(`${label} SVG contains executable, foreign, or metadata content`);
    if (/\/\*[\s\S]*?\*\//.test(svg)) addError(`${label} SVG contains a prohibited CSS comment`);
    if (/<!--[\s\S]*?-->/.test(svg)) addError(`${label} SVG contains a prohibited XML comment`);
    if (/\\(?:[0-9a-f]{1,6}\s?|[^\r\n0-9a-f])/i.test(svg)) addError(`${label} SVG contains a prohibited CSS/XML escape token`);
    for (const reference of svg.matchAll(/\b(?:href|xlink:href)\s*=\s*["']([^"']*)["']/gi)) if (!/^#[A-Za-z_][\w:.-]*$/.test(reference[1].trim())) addError(`${label} SVG has a non-fragment href`);
    if (/@import\b/i.test(svg)) addError(`${label} SVG contains CSS @import`);
    for (const reference of svg.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) if (!/^#[A-Za-z_][\w:.-]*$/.test(reference[2].trim())) addError(`${label} SVG has a non-fragment CSS url()`);
    if (/(?:file:|\/home\/|\/Users\/|\/workspace\/|\/tmp\/|\/root\/|\b[A-Za-z]:[\\/])/i.test(svg)) addError(`${label} SVG contains a private filesystem path`);
  }
  if (!sharp) { addError(`${label} cannot be fully decoded because sharp is unavailable (install sharp or set CODEX_PRIMARY_RUNTIME_NODE_MODULES)`); return false; }
  try {
    const image = sharp(bytes, { failOn: 'error', limitInputPixels: 25_000_000, animated: true });
    const metadata = await image.metadata();
    const expectedFormats = {
      'image/webp': new Set(['webp']), 'image/png': new Set(['png']), 'image/jpeg': new Set(['jpeg']),
      'image/gif': new Set(['gif']), 'image/svg+xml': new Set(['svg']), 'image/avif': new Set(['avif', 'heif']),
    };
    if (!expectedFormats[mime].has(metadata.format)) addError(`${label} decodes as ${metadata.format || 'unknown'}, not ${mime}`);
    if (!Number.isInteger(metadata.width) || metadata.width <= 0 || !Number.isInteger(metadata.height) || metadata.height <= 0) addError(`${label} has no valid decoded dimensions`);
    const pageCount = Number(metadata.pages || 1);
    const pageHeight = Number(metadata.pageHeight || metadata.height);
    const totalPixelCount = Number(metadata.width) * pageHeight * pageCount;
    let unsafeDecodeSize = false;
    if (totalPixelCount > 25_000_000) { addError(`${label} exceeds the 25 megapixel total decode limit`); unsafeDecodeSize = true; }
    if (pageCount > 60) { addError(`${label} exceeds the 60-frame limit`); unsafeDecodeSize = true; }
    cumulativeDecodedPixels += totalPixelCount;
    if (cumulativeDecodedPixels > 250_000_000) { addError('embedded images exceed the 250 megapixel cumulative decode limit'); unsafeDecodeSize = true; }
    for (const field of ['exif', 'iptc', 'xmp', 'tifftagPhotoshop', 'comments']) if (metadata[field] && (metadata[field].length === undefined || metadata[field].length > 0)) addError(`${label} contains disallowed ${field} metadata`);
    if (unsafeDecodeSize) return false;
    await image.clone().raw().toBuffer();
  } catch (error) { addError(`${label} cannot be fully decoded as a real image: ${error.message}`); return false; }
  return true;
}

const images = byName('img');
const directImages = [];
const missingImageSources = [];
for (const image of images) {
  if (!('alt' in image.attributes)) addError(`img lacks alt text${image.attributes.id ? `: ${image.attributes.id}` : ''}`);
  const src = image.attributes.src;
  if (typeof src === 'string' && src) {
    if (!src.startsWith('data:image/')) addError(`non-embedded img source found: ${src.slice(0, 120)}`);
    else {
      directImages.push({ image, src });
      if (!nonEmptyString(image.attributes['data-provenance-key'])) addError(`direct embedded image lacks data-provenance-key${image.attributes.id ? `: ${image.attributes.id}` : ''}`);
    }
  } else missingImageSources.push(image);
  if ('srcset' in image.attributes) addError('img srcset is not permitted in the single-file project asset path');
}
if (directImages.length > 100) addError(`direct images exceed the 100-image validation limit: ${directImages.length}`);
for (const [index, item] of directImages.entries()) await validateImageDataUri(`direct image ${index + 1}`, item.src);
if (directImages.length > 100) addError(`direct images exceed the 100-asset validation limit: ${directImages.length}`);
report.directImages = directImages.length;

const planImage = directImages.find(item => item.image.attributes.id === 'planImage');
if (planImage) {
  const mime = /^data:(image\/(?:webp|png|jpeg|gif|svg\+xml|avif));/.exec(planImage.src)?.[1];
  const expectedExtensions = { 'image/webp': ['webp'], 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'image/gif': ['gif'], 'image/svg+xml': ['svg'], 'image/avif': ['avif'] };
  const handler = html.match(/getElementById\(\s*['"]downloadPlanBtn['"]\s*\)[\s\S]{0,1200}?\.download\s*=\s*['"]([^'"]+)['"]/);
  if (!handler) addWarning('could not verify the plan download filename extension');
  else {
    const extension = path.extname(handler[1]).slice(1).toLowerCase();
    if (!expectedExtensions[mime]?.includes(extension)) addError(`plan download extension .${extension || '(none)'} does not match ${mime}`);
  }
}

const assetBoundImageMatches = matches(/<([a-z][\w:-]*)\b([^>]*\bdata-asset\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*)>\s*<img\b([^>]*)>/gi);
const boundSourceLessImages = assetBoundImageMatches.filter(match => !nonEmptyString(parseAttributes(match[5]).src));
const unboundImageAllowlist = new Set(['dialogImage']);
const copiedSourceLessImages = missingImageSources.filter(image => nonEmptyString(image.attributes['data-copy-src']));
for (const image of copiedSourceLessImages) {
  const sourceId = image.attributes['data-copy-src'];
  if (!directImages.some(item => item.image.attributes.id === sourceId)) addError(`data-copy-src references an unknown direct embedded image: ${sourceId}`);
}
const sourceLessAssetConsumers = missingImageSources.filter(image => !unboundImageAllowlist.has(image.attributes.id) && !nonEmptyString(image.attributes['data-copy-src']));
if (boundSourceLessImages.length !== sourceLessAssetConsumers.length) addError(`every project source-less img must be the immediate child of an element with data-asset; found ${sourceLessAssetConsumers.length} project images and ${boundSourceLessImages.length} bound images`);

const jsonAndDataStripped = html
  .replace(/<script\b[^>]*\btype=["']application\/json["'][^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=\s]+/gi, 'data:image/embedded');
const cspElements = byName('meta').filter(element => String(element.attributes['http-equiv']).toLowerCase() === 'content-security-policy');
if (cspElements.length !== 1) addError(`expected exactly one Content-Security-Policy meta element; found ${cspElements.length}`);
else {
  const headElement = byName('head')[0];
  const headClose = headElement ? html.indexOf('</head>', headElement.end) : -1;
  if (!headElement || headClose < 0 || cspElements[0].index < headElement.end || cspElements[0].index > headClose) addError('Content-Security-Policy meta element must appear inside head');
  else {
    const resourceBearingHeadElements = elements.filter(element =>
      element.index > headElement.end &&
      element.index < cspElements[0].index &&
      ['script', 'style', 'link', 'base', 'img', 'video', 'audio', 'source', 'iframe', 'object', 'embed'].includes(element.name)
    );
    if (resourceBearingHeadElements.length) addError(`Content-Security-Policy meta must precede every executable or resource-bearing head element; found ${resourceBearingHeadElements[0].name} first`);
  }
  const directives = new Map();
  for (const clause of String(cspElements[0].attributes.content || '').split(';').map(value => value.trim()).filter(Boolean)) {
    const [name, ...values] = clause.split(/\s+/);
    if (directives.has(name)) addError(`Content-Security-Policy repeats directive: ${name}`);
    directives.set(name, values);
  }
  const expected = {
    'default-src': ["'none'"],
    'img-src': ['data:', 'blob:'],
    'style-src': ["'unsafe-inline'"],
    'script-src': features.interactive_3d ? ["'unsafe-inline'", 'https://cdn.jsdelivr.net'] : ["'unsafe-inline'"],
    'connect-src': ["'none'"],
    'font-src': ['data:'],
    'worker-src': ['blob:'],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
  };
  for (const [directive, values] of Object.entries(expected)) {
    if (!directives.has(directive)) addError(`Content-Security-Policy is missing ${directive}`);
    else compareExactSets(`Content-Security-Policy ${directive}`, values, directives.get(directive));
  }
  for (const directive of directives.keys()) if (!Object.hasOwn(expected, directive)) addError(`Content-Security-Policy contains an unapproved directive: ${directive}`);
  for (const [directive, values] of directives) for (const value of values) {
    if (/^(?:https?:)?\/\//i.test(value) && !(features.interactive_3d && directive === 'script-src' && value === 'https://cdn.jsdelivr.net')) addError(`Content-Security-Policy contains an unapproved network source: ${directive} ${value}`);
  }
}
const networkScanSource = cspElements.length === 1 ? jsonAndDataStripped.replace(cspElements[0].raw, '') : jsonAndDataStripped;
const importMapBlocks = matches(/<script\b[^>]*\btype=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi, networkScanSource);
const allowedImportUrls = new Set();
const importMapVersions = new Set();
if (features.interactive_3d && importMapBlocks.length !== 1) addError(`interactive 3D requires exactly one approved importmap; found ${importMapBlocks.length}`);
if (!features.interactive_3d && importMapBlocks.length) addError('importmap is present while interactive_3d is disabled');
for (const [index, block] of importMapBlocks.entries()) {
  let map;
  try { map = JSON.parse(block[1]); } catch (error) { addError(`importmap ${index + 1} is invalid JSON: ${error.message}`); continue; }
  if (!isPlainObject(map) || !isPlainObject(map.imports)) { addError(`importmap ${index + 1} must contain imports`); continue; }
  for (const [key, url] of Object.entries(map.imports)) {
    const permitted = (key === 'three' && /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@\d+\.\d+\.\d+\/build\/three\.module\.js$/.test(url)) ||
      (key === 'three/addons/' && /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@\d+\.\d+\.\d+\/examples\/jsm\/$/.test(url));
    if (!permitted) addError(`importmap contains an unapproved dependency: ${key} -> ${url}`);
    else {
      allowedImportUrls.add(url);
      const version = /\/three@(\d+\.\d+\.\d+)\//.exec(url)?.[1];
      if (version) importMapVersions.add(version);
    }
  }
  if (features.interactive_3d) compareExactSets(`importmap ${index + 1} keys`, ['three', 'three/addons/'], Object.keys(map.imports));
}
if (features.interactive_3d && allowedImportUrls.size !== 2) addError('interactive 3D importmap must contain exactly the approved Three.js module and addons prefix');
if (importMapVersions.size > 1) addError('Three.js importmap entries use different pinned versions');
const scanWithoutImportMaps = networkScanSource.replace(/<script\b[^>]*\btype=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi, '');
for (const element of elements) {
  const remote = value => typeof value === 'string' && /^(?:https?:)?\/\//i.test(value.trim());
  if (element.name === 'script' && 'src' in element.attributes) addError(`script src is prohibited: ${element.attributes.src}`);
  if (element.name === 'link' && 'href' in element.attributes) addError(`link dependencies are prohibited: ${element.attributes.href}`);
  if (['iframe', 'object', 'embed'].includes(element.name)) addError(`${element.name} elements are prohibited in a portable renovation HTML`);
  if (['video', 'audio', 'source', 'track'].includes(element.name)) addError(`${element.name} elements are prohibited in the portable single-file contract`);
  if (element.name === 'base') addError('base elements are prohibited');
  if (element.name === 'meta' && String(element.attributes['http-equiv']).toLowerCase() === 'refresh') addError('meta refresh is prohibited');
}
const remoteUrls = matches(/(?:https?:)?\/\/[^\s"'<>`)]+/gi, scanWithoutImportMaps);
if (remoteUrls.length) addError(`unapproved remote URL found: ${remoteUrls[0][0].slice(0, 180)}`);
const remoteCssUrls = matches(/url\s*\(\s*(['"]?)(?:https?:)?\/\/[^)]+\1\s*\)/gi, networkScanSource);
if (remoteCssUrls.length) addError(`remote CSS url() dependency found: ${remoteCssUrls[0][0].slice(0, 160)}`);
if (/@import\s+(?:url\s*\()?\s*['"]?(?:https?:)?\/\//i.test(networkScanSource)) addError('remote CSS @import dependency found');
const cssFragments = [
  ...matches(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, networkScanSource).map(match => match[1]),
  ...elements.map(element => element.attributes.style).filter(nonEmptyString),
];
for (const css of cssFragments) {
  if (/\\(?:[0-9a-f]{1,6}\s?|[^\r\n0-9a-f])/i.test(css)) addError('CSS escape sequences are prohibited in portable styles');
  if (/@import\b/i.test(css)) addError('CSS @import is prohibited');
  for (const reference of css.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) if (!/^#[A-Za-z_][\w:.-]*$/.test(reference[2].trim())) addError('CSS url() may only reference an in-document fragment');
}
if (/\b(?:fetch\s*\(|XMLHttpRequest\b|EventSource\s*\(|WebSocket\s*\(|navigator\s*\.\s*sendBeacon\s*\()/i.test(scanWithoutImportMaps)) addError('runtime network API use is prohibited');

const embeddedAssetsRequired = strict && (((minimumVisuals.static_3d || 0) + (minimumVisuals.final_renders || 0) > 0) || /\bdata-asset=/i.test(html));
const embeddedAssets = parseJsonScript('embeddedAssets', embeddedAssetsRequired);
const provenance = parseJsonScript('assetProvenance', strict);
if (embeddedAssets) {
  if (!isPlainObject(embeddedAssets)) addError('embeddedAssets must be an object');
  else {
    const keys = Object.keys(embeddedAssets);
    report.embeddedAssets = keys.length;
    if (embeddedAssetsRequired && !keys.length) addError('embeddedAssets is empty');
    if (keys.length > 100) addError(`embeddedAssets exceeds the 100-asset validation limit: ${keys.length}`);
    for (const [key, value] of Object.entries(embeddedAssets)) {
      if (typeof value !== 'string') addError(`embedded asset ${key} is not a string`);
      else await validateImageDataUri(`embedded asset ${key}`, value);
    }
    const referenced = new Set(elements.map(element => element.attributes['data-asset']).filter(nonEmptyString));
    const referencesBlock = html.match(/const\s+references\s*=\s*\[([\s\S]*?)\];/);
    if (referencesBlock) for (const match of referencesBlock[1].matchAll(/\bkey\s*:\s*['"]([^'"]+)['"]/g)) referenced.add(match[1]);
    for (const key of referenced) if (!Object.hasOwn(embeddedAssets, key)) addError(`referenced asset is missing from embeddedAssets: ${key}`);
    for (const key of keys) if (!referenced.has(key)) addWarning(`embedded asset is not referenced: ${key}`);
    // One embedded asset may be intentionally rendered in several panels (for example,
    // a room render repeated in both 重点区域 and 3D/效果图). Validate every consumer's
    // immediate binding above instead of comparing image count with unique asset keys.
  }
}

let static3dCount = 0;
let finalRenderCount = 0;
if (!isPlainObject(provenance) || !isPlainObject(provenance.assets)) {
  if (strict) addError('assetProvenance must be an object with an assets object');
} else {
  const provenanceKeys = Object.keys(provenance.assets);
  const assetKeys = isPlainObject(embeddedAssets) ? Object.keys(embeddedAssets) : [];
  compareExactSets('assetProvenance.assets', assetKeys, provenanceKeys);
  const defaults = provenance.defaults;
  if (!isPlainObject(defaults) || !nonEmptyString(defaults.origin) || !nonEmptyString(defaults.rights_note)) addError('assetProvenance.defaults lacks origin or rights_note');
  for (const [field, policyField] of Object.entries(sensitiveAssetFields)) {
    if (typeof defaults?.[field] !== 'boolean') addError(`assetProvenance.defaults.${field} must be Boolean`);
    else {
      if (defaults[field] && assetPolicy[policyField] !== true) addError(`assetProvenance.defaults.${field} exceeds projectConfig.asset_policy.${policyField}`);
      if (projectConfig?.is_golden_example === true && defaults[field]) addError(`golden example must set assetProvenance.defaults.${field} to false`);
    }
  }
  for (const [key, entry] of Object.entries(provenance.assets)) {
    if (!isPlainObject(entry) || !nonEmptyString(entry.type)) { addError(`asset provenance entry lacks type: ${key}`); continue; }
    const type = entry.type.toLowerCase();
    if (type === 'static-3d-preview') static3dCount += 1;
    if (type === 'plan-specific-final-render') finalRenderCount += 1;
    for (const [field, policyField] of Object.entries(sensitiveAssetFields)) {
      if (field in entry && typeof entry[field] !== 'boolean') addError(`assetProvenance.assets.${key}.${field} must be Boolean`);
      const effective = field in entry ? entry[field] : defaults?.[field];
      if (effective === true && assetPolicy[policyField] !== true) addError(`asset ${key} ${field} exceeds projectConfig.asset_policy.${policyField}`);
      if (projectConfig?.is_golden_example === true && effective === true) addError(`golden example asset ${key} must not contain sensitive source material (${field})`);
    }
  }
  const directVisuals = provenance.direct_visuals;
  if (directImages.length && !isPlainObject(directVisuals)) addError('assetProvenance.direct_visuals must describe every directly embedded image');
  else if (isPlainObject(directVisuals)) {
    const directKeys = directImages.map(item => item.image.attributes['data-provenance-key']).filter(nonEmptyString);
    compareExactSets('assetProvenance.direct_visuals', directKeys, Object.keys(directVisuals));
    for (const item of directImages) {
      const key = item.image.attributes['data-provenance-key'];
      const entry = directVisuals[key];
      if (!isPlainObject(entry) || !nonEmptyString(entry.type) || !nonEmptyString(entry.origin)) { addError(`direct visual provenance entry is incomplete: ${key}`); continue; }
      if (!nonEmptyString(item.image.attributes.id) || entry.binding !== `img#${item.image.attributes.id}`) addError(`direct visual provenance binding does not match its img element: ${key}`);
      for (const [field, policyField] of Object.entries(sensitiveAssetFields)) {
        if (field in entry && typeof entry[field] !== 'boolean') addError(`assetProvenance.direct_visuals.${key}.${field} must be Boolean`);
        const effective = field in entry ? entry[field] : defaults?.[field];
        if (effective === true && assetPolicy[policyField] !== true) addError(`direct visual ${key} ${field} exceeds projectConfig.asset_policy.${policyField}`);
        if (projectConfig?.is_golden_example === true && effective === true) addError(`golden example direct visual ${key} must not contain sensitive source material (${field})`);
      }
    }
  }
}
if (strict) {
  if (static3dCount < (minimumVisuals.static_3d || 0)) addError(`projectConfig requires at least ${minimumVisuals.static_3d || 0} static 3D previews; found ${static3dCount}`);
  if (finalRenderCount < (minimumVisuals.final_renders || 0)) addError(`projectConfig requires at least ${minimumVisuals.final_renders || 0} final renders; found ${finalRenderCount}`);
}
report.visuals = { static3d: static3dCount, finalRenders: finalRenderCount, minimums: minimumVisuals };

const planFacts = parseJsonScript('planFacts', strict && features.plan === true);
const baselineRequired = strict && !features.multi_floor && (features.plan === true || features.modifications === true || features.interactive_3d === true);
const baseline = parseJsonScript('spatialBaseline', baselineRequired);
const modifications = parseJsonScript('modifications', strict && (features.plan === true || features.modifications === true || features.multi_floor === true));
const preflight = parseJsonScript('preflightLedger', strict);
const factIds = [];
const modificationIds = [];
const preflightCategories = [];

if (planFacts !== null) {
  if (!Array.isArray(planFacts) || (features.plan && !planFacts.length)) addError(`planFacts must be ${features.plan ? 'a non-empty' : 'an'} array`);
  else {
    const allowedClasses = new Set(['drawing_fact', 'design_inference', 'proposal']);
    const allowedConfidence = new Set(['low', 'medium', 'high']);
    for (const [index, fact] of planFacts.entries()) {
      const label = `planFacts[${index}]`;
      if (!isPlainObject(fact)) { addError(`${label} must be an object`); continue; }
      if (!nonEmptyString(fact.id)) addError(`${label}.id is required`); else factIds.push(fact.id);
      if (!nonEmptyString(fact.item)) addError(`${label}.item is required`);
      if (!allowedClasses.has(fact.class)) addError(`${label}.class is invalid`);
      if (!allowedConfidence.has(fact.confidence)) addError(`${label}.confidence is invalid`);
      if (typeof fact.site_measure !== 'boolean') addError(`${label}.site_measure must be Boolean`);
      if (!isPlainObject(fact.source) || !nonEmptyString(fact.source.page_label) || !nonEmptyString(fact.source.region)) addError(`${label}.source must include page_label and region`);
      if (fact.class === 'design_inference' && !nonEmptyString(fact.derivation)) addError(`${label}.derivation is required for design_inference`);
    }
    if (new Set(factIds).size !== factIds.length) addError('planFacts IDs must be unique');
  }
}
if (isPlainObject(projectConfig?.target) && nonEmptyString(projectConfig.target.source_id)) {
  const areaFact = Array.isArray(planFacts) ? planFacts.find(fact => fact.id === projectConfig.target.source_id) : null;
  if (!areaFact) addError(`projectConfig.target.source_id references an unknown plan fact: ${projectConfig.target.source_id}`);
  else {
    if (Number(areaFact.value) !== Number(projectConfig.target.area_value)) addError('projectConfig.target.area_value does not match its source plan fact');
    if (String(areaFact.unit) !== String(projectConfig.target.area_unit)) addError('projectConfig.target.area_unit does not match its source plan fact');
  }
}
const visibleFactIds = elements.map(element => element.attributes['data-source-id']).filter(nonEmptyString);
if (new Set(visibleFactIds).size !== visibleFactIds.length) addError('visible plan-facts source IDs must be unique');
if (planFacts !== null) compareExactSets('visible plan-facts table', factIds, visibleFactIds);
else if (visibleFactIds.length) addError('visible plan facts exist without a planFacts JSON block');

if (modifications !== null) {
  if (!Array.isArray(modifications) || (features.modifications && !modifications.length)) addError(`modifications must be ${features.modifications ? 'a non-empty' : 'an'} array`);
  else {
    if (!features.modifications && modifications.length) addError('projectConfig disables modifications but the modifications block is non-empty');
    for (const [index, item] of modifications.entries()) {
      const label = `modifications[${index}]`;
      if (!isPlainObject(item)) { addError(`${label} must be an object`); continue; }
      if (!nonEmptyString(item.id)) addError(`${label}.id is required`); else modificationIds.push(item.id);
      for (const field of ['category', 'location', 'existing_condition', 'status', 'benefit', 'risk', 'fallback']) if (!nonEmptyString(item[field])) addError(`${label}.${field} is required`);
      if (!Number.isInteger(item.base_version) || item.base_version < 1) addError(`${label}.base_version must be a positive integer`);
      if (!Array.isArray(item.variant_ids) || !item.variant_ids.length || item.variant_ids.some(value => !nonEmptyString(value))) addError(`${label}.variant_ids must be a non-empty string array`);
      if (typeof item.preferred_for_visualisation !== 'boolean') addError(`${label}.preferred_for_visualisation must be Boolean`);
      if (!['low', 'medium', 'high', 'unknown'].includes(item.risk_level)) addError(`${label}.risk_level must be low, medium, high, or unknown`);
      if (!isPlainObject(item.delta) || !Object.keys(item.delta).length) addError(`${label}.delta must be a non-empty object`);
      if (!Array.isArray(item.checks) || !item.checks.length) addError(`${label}.checks must be a non-empty array`);
      if (!Array.isArray(item.conflicts)) addError(`${label}.conflicts must be an array`);
    }
    if (new Set(modificationIds).size !== modificationIds.length) addError('modification IDs must be unique');
  }
}
const visibleModificationIds = elements.map(element => element.attributes['data-modification-id']).filter(nonEmptyString);
if (new Set(visibleModificationIds).size !== visibleModificationIds.length) addError('visible modification IDs must be unique');
if (modifications !== null) compareExactSets('visible modification table', modificationIds, visibleModificationIds);
else if (visibleModificationIds.length) addError('visible modifications exist without a modifications JSON block');

function validateZone(zone, label, overallBounds, knownFacts = factIds, knownModifications = modificationIds) {
  if (!isPlainObject(zone) || !nonEmptyString(zone.id)) { addError(`${label}.id is required`); return false; }
  if (!hasFiniteBounds(zone.bounds)) addError(`${label}.bounds is incomplete`);
  else if (!boundsContain(overallBounds, zone.bounds)) addError(`${label} lies outside overall_bounds`);
  if (zone.source_id && !knownFacts.includes(zone.source_id)) addError(`${label} references unknown plan fact: ${zone.source_id}`);
  if (zone.modification_id && !knownModifications.includes(zone.modification_id)) addError(`${label} references unknown modification: ${zone.modification_id}`);
  return true;
}

function activeZoneIdsForVariant(baseZoneIds, variant) {
  const removed = new Set(Array.isArray(variant?.zone_deltas?.remove) ? variant.zone_deltas.remove : []);
  const added = Array.isArray(variant?.zone_deltas?.add) ? variant.zone_deltas.add.map(zone => zone?.id).filter(nonEmptyString) : [];
  return new Set([...baseZoneIds.filter(id => !removed.has(id)), ...added]);
}

if (baseline !== null) {
  if (!isPlainObject(baseline) || !Number.isInteger(baseline.version) || baseline.version < 1) addError('spatialBaseline must be an object with a positive integer version');
  else {
    const overallBounds = baseline.overall_bounds;
    if (!hasFiniteBounds(overallBounds)) addError('spatialBaseline.overall_bounds must contain finite x/z/width/depth values');
    const baseZoneIds = [];
    if (!Array.isArray(baseline.zones) || !baseline.zones.length) addError('spatialBaseline.zones must be non-empty');
    else {
      for (const [index, zone] of baseline.zones.entries()) if (validateZone(zone, `spatialBaseline.zones[${index}]`, overallBounds)) baseZoneIds.push(zone.id);
      if (new Set(baseZoneIds).size !== baseZoneIds.length) addError('spatialBaseline zone IDs must be unique');
    }

    if (!Array.isArray(baseline.shared_boundaries)) addError('spatialBaseline.shared_boundaries must be an array');
    else for (const [index, edge] of baseline.shared_boundaries.entries()) {
      if (!baseZoneIds.includes(edge?.a) || !baseZoneIds.includes(edge?.b)) addError(`shared boundary ${index} references an unknown base zone`);
      if (!finiteSegment(edge?.segment)) addError(`shared boundary ${index} has invalid segment geometry`);
      else if (hasFiniteBounds(overallBounds) && !segmentInside(overallBounds, edge.segment)) addError(`shared boundary ${index} lies outside overall_bounds`);
    }

    if (!Array.isArray(baseline.variants) || !baseline.variants.length) addError('spatialBaseline.variants must be non-empty');
    const variantIds = Array.isArray(baseline.variants) ? baseline.variants.map(variant => variant?.id).filter(nonEmptyString) : [];
    if (new Set(variantIds).size !== variantIds.length) addError('spatialBaseline variant IDs must be unique');
    if (!variantIds.includes(baseline.preferred_visual_state)) addError('spatialBaseline.preferred_visual_state does not name an existing variant');
    const variantsById = new Map();
    let existingVariantValid = false;
    for (const [index, variant] of (Array.isArray(baseline.variants) ? baseline.variants : []).entries()) {
      const label = `spatialBaseline.variants[${index}]`;
      if (!isPlainObject(variant) || !nonEmptyString(variant.id)) { addError(`${label}.id is required`); continue; }
      variantsById.set(variant.id, variant);
      if (!Array.isArray(variant.modification_ids)) addError(`${label}.modification_ids must be an array`);
      const deltas = variant.zone_deltas;
      if (!isPlainObject(deltas) || !Array.isArray(deltas.remove) || !Array.isArray(deltas.add)) addError(`${label}.zone_deltas must include remove and add arrays`);
      const removed = Array.isArray(deltas?.remove) ? deltas.remove : [];
      const added = Array.isArray(deltas?.add) ? deltas.add : [];
      if (new Set(removed).size !== removed.length) addError(`${label}.zone_deltas.remove must be unique`);
      for (const id of removed) if (!baseZoneIds.includes(id)) addError(`${label} removes unknown base zone: ${id}`);
      const addedIds = [];
      for (const [zoneIndex, zone] of added.entries()) if (validateZone(zone, `${label}.zone_deltas.add[${zoneIndex}]`, overallBounds)) addedIds.push(zone.id);
      if (new Set(addedIds).size !== addedIds.length) addError(`${label} added zone IDs must be unique`);
      for (const id of addedIds) if (baseZoneIds.includes(id)) addError(`${label} added zone collides with a base zone ID: ${id}`);
      const activeIds = activeZoneIdsForVariant(baseZoneIds, variant);
      const knownForDelta = new Set([...baseZoneIds, ...addedIds]);
      const boundaryDeltas = variant.boundary_deltas;
      if (!isPlainObject(boundaryDeltas) || !Array.isArray(boundaryDeltas.remove) || !Array.isArray(boundaryDeltas.add)) addError(`${label}.boundary_deltas must include remove and add arrays`);
      const removedBoundaryKeys = new Set();
      for (const pair of Array.isArray(boundaryDeltas?.remove) ? boundaryDeltas.remove : []) {
        if (!Array.isArray(pair) || pair.length !== 2 || pair.some(id => !knownForDelta.has(id))) addError(`${label} has an invalid removed-boundary pair`);
        else removedBoundaryKeys.add(pairKey(pair[0], pair[1]));
      }
      for (const baseEdge of Array.isArray(baseline.shared_boundaries) ? baseline.shared_boundaries : []) {
        if ((removed.includes(baseEdge.a) || removed.includes(baseEdge.b)) && !removedBoundaryKeys.has(pairKey(baseEdge.a, baseEdge.b))) addError(`${label} removes zone ${removed.includes(baseEdge.a) ? baseEdge.a : baseEdge.b} without removing its shared boundary ${baseEdge.a}/${baseEdge.b}`);
      }
      for (const [edgeIndex, edge] of (Array.isArray(boundaryDeltas?.add) ? boundaryDeltas.add : []).entries()) {
        if (!activeIds.has(edge?.a) || !activeIds.has(edge?.b)) addError(`${label}.boundary_deltas.add[${edgeIndex}] references a non-active zone`);
        if (!finiteSegment(edge?.segment)) addError(`${label}.boundary_deltas.add[${edgeIndex}] has invalid segment geometry`);
        else if (hasFiniteBounds(overallBounds) && !segmentInside(overallBounds, edge.segment)) addError(`${label}.boundary_deltas.add[${edgeIndex}] lies outside overall_bounds`);
      }
      const expectedVariantModifications = (Array.isArray(modifications) ? modifications : []).filter(item => item.variant_ids?.includes(variant.id)).map(item => item.id);
      if (Array.isArray(variant.modification_ids)) compareExactSets(`variant ${variant.id} modification_ids`, expectedVariantModifications, variant.modification_ids);
      if (variant.id === 'existing') existingVariantValid = !(variant.modification_ids?.length || removed.length || added.length || boundaryDeltas?.remove?.length || boundaryDeltas?.add?.length);
    }
    if (!existingVariantValid) addError('spatialBaseline must include id="existing" with empty modifications and empty zone/boundary deltas');

    for (const item of Array.isArray(modifications) ? modifications : []) {
      if (item.base_version !== baseline.version) addError(`modification ${item.id} base_version ${item.base_version} does not match spatialBaseline.version ${baseline.version}`);
      for (const variantId of item.variant_ids || []) if (!variantIds.includes(variantId)) addError(`modification ${item.id} references unknown variant: ${variantId}`);
      if (item.preferred_for_visualisation && !item.variant_ids?.includes(baseline.preferred_visual_state)) addError(`preferred modification ${item.id} does not include the preferred visual variant`);
    }
    const preferredVariant = variantsById.get(baseline.preferred_visual_state);
    const preferredModificationIds = (Array.isArray(modifications) ? modifications : [])
      .filter(item => item.preferred_for_visualisation && item.variant_ids?.includes(baseline.preferred_visual_state))
      .map(item => item.id);
    if (preferredVariant && Array.isArray(preferredVariant.modification_ids)) compareExactSets('preferred variant modification_ids', preferredModificationIds, preferredVariant.modification_ids);

    if (!Array.isArray(baseline.openings)) addError('spatialBaseline.openings must be an array');
    else for (const [index, opening] of baseline.openings.entries()) {
      const label = `spatialBaseline.openings[${index}]`;
      if (!nonEmptyString(opening?.id)) addError(`${label}.id is required`);
      if (!Array.isArray(opening?.between) || opening.between.length !== 2 || opening.between.some(id => !nonEmptyString(id))) { addError(`${label}.between must name exactly two zones`); continue; }
      if (opening.between[0] === opening.between[1]) addError(`${label}.between endpoints must be different zones`);
      const modification = opening.modification_id ? (Array.isArray(modifications) ? modifications.find(item => item.id === opening.modification_id) : null) : null;
      if (opening.modification_id && !modification) addError(`${label} references unknown modification: ${opening.modification_id}`);
      const relevantVariantIds = Array.isArray(opening.variant_ids) && opening.variant_ids.length ? opening.variant_ids : modification?.variant_ids?.length ? modification.variant_ids : variantIds;
      for (const variantId of relevantVariantIds) {
        const variant = variantsById.get(variantId);
        if (!variant) { addError(`${label} references unknown relevant variant: ${variantId}`); continue; }
        const activeIds = activeZoneIdsForVariant(baseZoneIds, variant);
        for (const zoneId of opening.between) if (!activeIds.has(zoneId)) addError(`${label} references non-active zone ${zoneId} in variant ${variantId}`);
      }
    }

    if (!Array.isArray(baseline.circulation)) addError('spatialBaseline.circulation must be an array');
    else for (const route of baseline.circulation) {
      const routeZones = [route?.from, ...(Array.isArray(route?.via) ? route.via : []), route?.to].filter(Boolean);
      const relevantVariantIds = Array.isArray(route?.variant_ids) && route.variant_ids.length ? route.variant_ids : variantIds;
      for (const variantId of relevantVariantIds) {
        const variant = variantsById.get(variantId);
        if (!variant) { addError(`circulation route references unknown variant: ${variantId}`); continue; }
        const activeIds = activeZoneIdsForVariant(baseZoneIds, variant);
        if (routeZones.some(id => !activeIds.has(id))) addError(`circulation route references a non-active zone in variant ${variantId}: ${route?.id || '(unnamed)'}`);
      }
    }

    if (Array.isArray(baseline.fixed_furniture) && preferredVariant) {
      const activePreferred = activeZoneIdsForVariant(baseZoneIds, preferredVariant);
      for (const item of baseline.fixed_furniture) if (!activePreferred.has(item?.zone)) addError(`fixed furniture ${item?.id || '(unnamed)'} references a non-active preferred zone: ${item?.zone}`);
    }
    if (Array.isArray(baseline.unmodelled_or_exterior_voids)) for (const [index, item] of baseline.unmodelled_or_exterior_voids.entries()) if (!hasFiniteBounds(item?.bounds) || !boundsContain(overallBounds, item.bounds)) addError(`spatialBaseline.unmodelled_or_exterior_voids[${index}] has invalid or out-of-bounds geometry`);

    const baselinePanels = panels.filter(panel => ['visuals', 'materials'].includes(panel.attributes.id));
    for (const panel of baselinePanels) {
      if (panel.attributes['data-variant'] !== baseline.preferred_visual_state) addError(`${panel.attributes.id} panel does not use the preferred visual variant`);
      if (String(panel.attributes['data-baseline-version']) !== String(baseline.version)) addError(`${panel.attributes.id} panel does not use the canonical baseline version`);
    }
    if (bodyElement?.attributes['data-preferred-variant'] !== baseline.preferred_visual_state) addError('body preferred variant does not match spatialBaseline');
    if (String(bodyElement?.attributes['data-baseline-version']) !== String(baseline.version)) addError('body baseline version does not match spatialBaseline');
    report.evidence = { planFacts: factIds.length, modifications: modificationIds.length, baselineVersion: baseline.version, preferredVariant: baseline.preferred_visual_state };
  }
}

if (preflight !== null) {
  if (!isPlainObject(preflight) || !Array.isArray(preflight.entries)) addError('preflightLedger must be an object with entries');
  else {
    const statuses = new Set(['unknown', 'clear', 'issue', 'not_applicable']);
    for (const [index, entry] of preflight.entries.entries()) {
      if (!nonEmptyString(entry?.category)) addError(`preflightLedger.entries[${index}].category is required`);
      else preflightCategories.push(entry.category);
      if (!statuses.has(entry?.status)) addError(`preflightLedger entry has invalid status: ${entry?.category || index}`);
      if (!nonEmptyString(entry?.required_check) || !nonEmptyString(entry?.release_by)) addError(`preflightLedger entry lacks required_check or release_by: ${entry?.category || index}`);
    }
    if (new Set(preflightCategories).size !== preflightCategories.length) addError('preflight categories must be unique');
    for (const category of requiredPreflight) if (!preflightCategories.includes(category)) addError(`required preflight category is missing: ${category}`);
    const allRows = matches(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi);
    const visiblePreflight = [];
    for (const row of allRows) {
      const rowAttributes = parseAttributes(row[1]);
      const category = rowAttributes['data-preflight-category'];
      if (!nonEmptyString(category)) continue;
      visiblePreflight.push(category);
      const entry = preflight.entries.find(item => item.category === category);
      if (!entry) continue;
      if (rowAttributes['data-preflight-status'] !== entry.status) addError(`visible preflight row status differs from ledger: ${category}`);
      const statusOpen = row[2].match(/<([a-z][\w:-]*)\b([^>]*\bdata-preflight-status-value(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*)>/i);
      if (!statusOpen) { addError(`visible preflight row lacks data-preflight-status-value: ${category}`); continue; }
      const statusAttributes = parseAttributes(statusOpen[2]);
      if (statusAttributes['data-preflight-status-value'] !== entry.status) addError(`visible preflight status value differs from ledger: ${category}`);
      const afterOpen = row[2].slice(statusOpen.index + statusOpen[0].length);
      const closeIndex = afterOpen.search(new RegExp(`<\\/${escapeRegex(statusOpen[1])}\\s*>`, 'i'));
      const statusText = visibleText(closeIndex < 0 ? '' : afterOpen.slice(0, closeIndex));
      const expectedLabel = statusLabels[entry.status];
      if (nonEmptyString(expectedLabel) && statusText !== expectedLabel.trim()) addError(`visible preflight label for ${category} must be "${expectedLabel}"; found "${statusText}"`);
    }
    if (new Set(visiblePreflight).size !== visiblePreflight.length) addError('visible preflight categories must be unique');
    compareExactSets('visible preflight table', preflightCategories, visiblePreflight);
  }
}
if (report.evidence) {
  report.evidence.preflightCategories = preflightCategories.length;
  report.evidence.provenanceAssets = isPlainObject(provenance?.assets) ? Object.keys(provenance.assets).length : 0;
}

function validateFloorGeometry(record, label, floorModifications = []) {
  if (!isPlainObject(record) || !Number.isInteger(record.version) || record.version < 1) { addError(`${label} must have a positive integer version`); return; }
  if (!nonEmptyString(record.source_page_id)) addError(`${label}.source_page_id is required`);
  if (!nonEmptyString(record.source_plan_asset_id)) addError(`${label}.source_plan_asset_id is required`);
  if (!isPlainObject(record.floor_identity)) addError(`${label}.floor_identity is required`);
  else for (const field of ['outline_source_ids', 'core_anchor_ids', 'zone_ids', 'opening_ids', 'dimension_source_ids']) {
    if (!Array.isArray(record.floor_identity[field]) || record.floor_identity[field].some(value => !nonEmptyString(value))) addError(`${label}.floor_identity.${field} must be a string array`);
  }
  if (!hasFiniteBounds(record.overall_bounds)) addError(`${label}.overall_bounds is invalid`);
  const zoneIds = [];
  if (!Array.isArray(record.zones) || !record.zones.length) addError(`${label}.zones must be non-empty`);
  else {
    for (const [index, zone] of record.zones.entries()) {
      if (!isPlainObject(zone) || !nonEmptyString(zone.id)) addError(`${label}.zones[${index}].id is required`);
      else zoneIds.push(zone.id);
      if (!hasFiniteBounds(zone?.bounds) || !boundsContain(record.overall_bounds, zone.bounds)) addError(`${label}.zones[${index}] has invalid or out-of-bounds geometry`);
    }
    if (new Set(zoneIds).size !== zoneIds.length) addError(`${label} zone IDs must be unique`);
    if (Array.isArray(record.floor_identity?.zone_ids)) compareExactSets(`${label}.floor_identity.zone_ids`, zoneIds, record.floor_identity.zone_ids);
  }
  if (!Array.isArray(record.shared_boundaries)) addError(`${label}.shared_boundaries must be an array`);
  else for (const [index, edge] of record.shared_boundaries.entries()) {
    if (!zoneIds.includes(edge?.a) || !zoneIds.includes(edge?.b) || !finiteSegment(edge?.segment)) addError(`${label}.shared_boundaries[${index}] is invalid`);
    else if (!segmentInside(record.overall_bounds, edge.segment)) addError(`${label}.shared_boundaries[${index}] lies outside overall_bounds`);
  }

  if (!Array.isArray(record.variants) || !record.variants.length) addError(`${label}.variants must be non-empty`);
  const variants = Array.isArray(record.variants) ? record.variants : [];
  const variantIds = variants.map(variant => variant?.id).filter(nonEmptyString);
  if (new Set(variantIds).size !== variantIds.length) addError(`${label} variant IDs must be unique`);
  if (!variantIds.includes(record.preferred_visual_state)) addError(`${label}.preferred_visual_state does not name a variant`);
  const variantsById = new Map();
  let existingValid = false;
  for (const [index, variant] of variants.entries()) {
    const variantLabel = `${label}.variants[${index}]`;
    if (!isPlainObject(variant) || !nonEmptyString(variant.id)) { addError(`${variantLabel}.id is required`); continue; }
    variantsById.set(variant.id, variant);
    if (!Array.isArray(variant.modification_ids)) addError(`${variantLabel}.modification_ids must be an array`);
    if (!isPlainObject(variant.zone_deltas) || !Array.isArray(variant.zone_deltas.remove) || !Array.isArray(variant.zone_deltas.add)) addError(`${variantLabel}.zone_deltas must include arrays`);
    if (!isPlainObject(variant.boundary_deltas) || !Array.isArray(variant.boundary_deltas.remove) || !Array.isArray(variant.boundary_deltas.add)) addError(`${variantLabel}.boundary_deltas must include arrays`);
    const removed = Array.isArray(variant.zone_deltas?.remove) ? variant.zone_deltas.remove : [];
    const added = Array.isArray(variant.zone_deltas?.add) ? variant.zone_deltas.add : [];
    for (const id of removed) if (!zoneIds.includes(id)) addError(`${variantLabel} removes unknown zone: ${id}`);
    const addedIds = [];
    for (const [addedIndex, zone] of added.entries()) {
      if (!isPlainObject(zone) || !nonEmptyString(zone.id)) addError(`${variantLabel}.zone_deltas.add[${addedIndex}].id is required`);
      else addedIds.push(zone.id);
      if (!hasFiniteBounds(zone?.bounds) || !boundsContain(record.overall_bounds, zone.bounds)) addError(`${variantLabel}.zone_deltas.add[${addedIndex}] has invalid geometry`);
    }
    if (new Set(addedIds).size !== addedIds.length) addError(`${variantLabel} added zone IDs must be unique`);
    for (const id of addedIds) if (zoneIds.includes(id)) addError(`${variantLabel} added zone collides with a base zone ID: ${id}`);
    const activeIds = activeZoneIdsForVariant(zoneIds, variant);
    for (const [edgeIndex, edge] of (Array.isArray(variant.boundary_deltas?.add) ? variant.boundary_deltas.add : []).entries()) if (!activeIds.has(edge?.a) || !activeIds.has(edge?.b) || !finiteSegment(edge?.segment)) addError(`${variantLabel}.boundary_deltas.add[${edgeIndex}] is invalid`);
    const expectedModifications = floorModifications.filter(item => item.variant_ids?.includes(variant.id)).map(item => item.id);
    if (Array.isArray(variant.modification_ids)) compareExactSets(`${variantLabel}.modification_ids`, expectedModifications, variant.modification_ids);
    if (variant.id === 'existing') existingValid = !(variant.modification_ids?.length || removed.length || added.length || variant.boundary_deltas?.remove?.length || variant.boundary_deltas?.add?.length);
  }
  if (!existingValid) addError(`${label} must include an empty id="existing" variant`);
  for (const item of floorModifications) {
    if (item.base_version !== record.version) addError(`modification ${item.id} base_version does not match ${label}.version`);
    for (const variantId of item.variant_ids || []) if (!variantIds.includes(variantId)) addError(`modification ${item.id} references unknown ${label} variant: ${variantId}`);
  }
  const preferred = variantsById.get(record.preferred_visual_state);
  if (preferred) {
    const preferredModificationIds = floorModifications.filter(item => item.preferred_for_visualisation && item.variant_ids?.includes(record.preferred_visual_state)).map(item => item.id);
    compareExactSets(`${label} preferred variant modification_ids`, preferredModificationIds, preferred.modification_ids || []);
  }
  const openingIds = [];
  if (!Array.isArray(record.openings)) addError(`${label}.openings must be an array`);
  else for (const [index, opening] of record.openings.entries()) {
    if (!nonEmptyString(opening?.id)) addError(`${label}.openings[${index}].id is required`); else openingIds.push(opening.id);
    if (!Array.isArray(opening?.between) || opening.between.length !== 2 || opening.between[0] === opening.between[1]) { addError(`${label}.openings[${index}] must connect two different zones`); continue; }
    const modification = floorModifications.find(item => item.id === opening.modification_id);
    const relevantVariants = opening.variant_ids?.length ? opening.variant_ids : modification?.variant_ids?.length ? modification.variant_ids : variantIds;
    for (const variantId of relevantVariants) {
      const variant = variantsById.get(variantId);
      if (!variant || opening.between.some(id => !activeZoneIdsForVariant(zoneIds, variant).has(id))) addError(`${label}.openings[${index}] references a non-active zone in ${variantId}`);
    }
  }
  if (new Set(openingIds).size !== openingIds.length) addError(`${label} opening IDs must be unique`);
  if (Array.isArray(record.floor_identity?.opening_ids)) compareExactSets(`${label}.floor_identity.opening_ids`, openingIds, record.floor_identity.opening_ids);
  if (!Array.isArray(record.circulation)) addError(`${label}.circulation must be an array`);
  else for (const route of record.circulation) {
    const routeZones = [route?.from, ...(Array.isArray(route?.via) ? route.via : []), route?.to].filter(Boolean);
    for (const variantId of route.variant_ids?.length ? route.variant_ids : variantIds) {
      const variant = variantsById.get(variantId);
      if (!variant || routeZones.some(id => !activeZoneIdsForVariant(zoneIds, variant).has(id))) addError(`${label} circulation ${route?.id || '(unnamed)'} references a non-active zone in ${variantId}`);
    }
  }
}

if (strict && features.multi_floor) {
  if (baseline !== null) addError('multi-floor projects must use floorBaselines instead of a singular spatialBaseline');
  const buildingCore = parseJsonScript('buildingCore', true);
  const floorBaselinesRaw = parseJsonScript('floorBaselines', true);
  const roomLedgers = parseJsonScript('roomLedgers', true);
  const preferredOpeningModifications = (Array.isArray(modifications) ? modifications : []).filter(item =>
    item?.preferred_for_visualisation === true && /(?:door|window|opening)/i.test(String(item?.category || ''))
  );
  const visualEvidenceRequired = (minimumVisuals.static_3d || 0) > 0 || (minimumVisuals.final_renders || 0) > 0 || preferredOpeningModifications.length > 0;
  const visualCorrespondence = parseJsonScript('visualCorrespondence', visualEvidenceRequired);
  if (!isPlainObject(buildingCore) || !Number.isInteger(buildingCore.version) || buildingCore.version < 1) addError('buildingCore must be an object with a positive integer version');
  else {
    if (!Array.isArray(buildingCore.floor_ids) || !buildingCore.floor_ids.length || buildingCore.floor_ids.some(id => !nonEmptyString(id))) addError('buildingCore.floor_ids must be a non-empty string array');
    else if (new Set(buildingCore.floor_ids).size !== buildingCore.floor_ids.length) addError('buildingCore.floor_ids must be unique');
    for (const field of ['stairs', 'shafts', 'facade_grid', 'wet_stacks', 'vertical_services']) if (!Array.isArray(buildingCore[field])) addError(`buildingCore.${field} must be an array`);
    for (const [index, stair] of (Array.isArray(buildingCore.stairs) ? buildingCore.stairs : []).entries()) {
      if (!nonEmptyString(stair?.id) || !Array.isArray(stair?.serves_floors) || stair.serves_floors.some(id => !buildingCore.floor_ids.includes(id))) addError(`buildingCore.stairs[${index}] has invalid floor references`);
    }
    const floorBaselines = Array.isArray(floorBaselinesRaw) ? floorBaselinesRaw : isPlainObject(floorBaselinesRaw) ? Object.values(floorBaselinesRaw) : [];
    if (!floorBaselines.length) addError('floorBaselines must contain at least one floor baseline');
    const floorIds = [];
    for (const [index, floor] of floorBaselines.entries()) {
      const floorId = floor?.floor_id || floor?.id;
      if (!nonEmptyString(floorId)) addError(`floorBaselines[${index}] lacks floor_id`); else floorIds.push(floorId);
      if (String(floor?.building_core_version) !== String(buildingCore.version)) addError(`floor ${floorId || index} building_core_version does not match buildingCore.version`);
      const targetFloorIds = projectConfig?.target?.floor_ids || [];
      if (nonEmptyString(floorId) && !targetFloorIds.includes(floorId)) addError(`floor baseline is outside projectConfig.target.floor_ids: ${floorId}`);
      const floorModifications = (Array.isArray(modifications) ? modifications : []).filter(item => {
        if (nonEmptyString(item.floor_id)) return item.floor_id === floorId;
        if (Array.isArray(item.floor_ids)) return item.floor_ids.includes(floorId);
        return targetFloorIds.length === 1;
      });
      validateFloorGeometry(floor, `floorBaselines[${index}]`, floorModifications);
      const floorFactIds = (Array.isArray(planFacts) ? planFacts : []).filter(fact => fact?.floor_id === floorId || fact?.scope === 'building').map(fact => fact?.id).filter(nonEmptyString);
      for (const sourceId of [...(floor?.floor_identity?.outline_source_ids || []), ...(floor?.floor_identity?.dimension_source_ids || [])]) if (!floorFactIds.includes(sourceId)) addError(`floor ${floorId || index} identity references a fact from another floor or an unknown fact: ${sourceId}`);
    }
    const canonicalFloorGeometry = floor => {
      const zoneBoundsById = new Map((Array.isArray(floor?.zones) ? floor.zones : []).map(zone => [zone?.id, zone?.bounds]));
      const sortJson = values => values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      return JSON.stringify({
        overall_bounds: floor?.overall_bounds,
        zones: sortJson((Array.isArray(floor?.zones) ? floor.zones : []).map(zone => ({bounds: zone?.bounds, classification: zone?.classification}))),
        boundaries: sortJson((Array.isArray(floor?.shared_boundaries) ? floor.shared_boundaries : []).map(edge => edge?.segment)),
        openings: sortJson((Array.isArray(floor?.openings) ? floor.openings : []).map(opening => ({
          between_bounds: sortJson((Array.isArray(opening?.between) ? opening.between : []).map(id => zoneBoundsById.get(id))),
          position: opening?.position,
          width: opening?.width,
          width_mm: opening?.width_mm,
        }))),
      });
    };
    for (let index = 0; index < floorBaselines.length; index += 1) for (let prior = 0; prior < index; prior += 1) {
      if (canonicalFloorGeometry(floorBaselines[index]) !== canonicalFloorGeometry(floorBaselines[prior])) continue;
      const current = floorBaselines[index];
      const previousId = floorBaselines[prior]?.floor_id || floorBaselines[prior]?.id;
      if (current?.floor_identity?.drawing_equivalent_to_floor_id !== previousId || !Array.isArray(current?.floor_identity?.equivalence_source_ids) || !current.floor_identity.equivalence_source_ids.length) addError(`floor ${current?.floor_id || index} exactly clones ${previousId} without drawing-equivalence evidence`);
    }
    if (new Set(floorIds).size !== floorIds.length) addError('floor baseline IDs must be unique');
    const sourcePlanAssetIds = floorBaselines.map(floor => floor?.source_plan_asset_id).filter(nonEmptyString);
    if (new Set(sourcePlanAssetIds).size !== sourcePlanAssetIds.length) addError('each designed floor must have its own source_plan_asset_id');
    if (Array.isArray(buildingCore.floor_ids)) compareExactSets('floorBaselines', buildingCore.floor_ids, floorIds);
    if (Array.isArray(projectConfig?.target?.floor_ids) && Array.isArray(buildingCore.floor_ids)) compareExactSets('buildingCore.floor_ids vs projectConfig.target.floor_ids', projectConfig.target.floor_ids, buildingCore.floor_ids);
    if (projectConfig?.target?.floor_ids?.length > 1) for (const item of Array.isArray(modifications) ? modifications : []) if (!nonEmptyString(item.floor_id) && !Array.isArray(item.floor_ids)) addError(`multi-floor modification must declare floor_id or floor_ids: ${item.id}`);
    const baselineByFloor = new Map(floorBaselines.map(floor => [floor?.floor_id || floor?.id, floor]));

    for (const fact of Array.isArray(planFacts) ? planFacts : []) if (!nonEmptyString(fact?.floor_id) && fact?.scope !== 'building') addError(`multi-floor plan fact must declare floor_id or scope="building": ${fact?.id || '(unnamed)'}`);

    const planImages = elements.filter(element => element.name === 'img' && element.attributes['data-floor-plan'] === 'source');
    const planImageFloors = planImages.map(element => element.attributes['data-floor-id']).filter(nonEmptyString);
    compareExactSets('source-plan images by floor', projectConfig.target.floor_ids, planImageFloors);
    for (const image of planImages) {
      const floorId = image.attributes['data-floor-id'];
      const floor = baselineByFloor.get(floorId);
      if (!floor) continue;
      if (image.attributes['data-source-page-id'] !== floor.source_page_id) addError(`source-plan image ${floorId} does not match its baseline source_page_id`);
      if (image.attributes['data-plan-asset-id'] !== floor.source_plan_asset_id) addError(`source-plan image ${floorId} does not match its baseline source_plan_asset_id`);
      if (image.attributes['data-asset'] !== floor.source_plan_asset_id) addError(`source-plan image ${floorId} must bind data-asset to its source_plan_asset_id`);
      if (!Object.hasOwn(isPlainObject(embeddedAssets) ? embeddedAssets : {}, floor.source_plan_asset_id)) addError(`source-plan asset is not embedded for ${floorId}: ${floor.source_plan_asset_id}`);
      if (provenance?.assets?.[floor.source_plan_asset_id]?.type !== 'plan-crop') addError(`source-plan asset provenance must use type="plan-crop" for ${floorId}`);
    }

    const ledgerRecords = Array.isArray(roomLedgers) ? roomLedgers : [];
    if (!Array.isArray(roomLedgers) || !roomLedgers.length) addError('roomLedgers must be a non-empty array');
    const ledgerIds = [];
    for (const [index, room] of ledgerRecords.entries()) {
      const label = `roomLedgers[${index}]`;
      if (!isPlainObject(room)) { addError(`${label} must be an object`); continue; }
      if (!nonEmptyString(room.floor_id) || !baselineByFloor.has(room.floor_id)) addError(`${label}.floor_id is invalid`);
      if (!nonEmptyString(room.room_id)) addError(`${label}.room_id is required`); else ledgerIds.push(room.room_id);
      const floor = baselineByFloor.get(room.floor_id);
      if (!nonEmptyString(room.source_page_id) || room.source_page_id !== floor?.source_page_id) addError(`${label}.source_page_id does not match its floor baseline`);
      for (const field of ['printed_label', 'proposed_use', 'design_explanation']) if (!nonEmptyString(room[field])) addError(`${label}.${field} is required`);
      for (const field of ['dimensions', 'adjacent_room_ids', 'opening_ids', 'fixed_furniture', 'unknowns']) if (!Array.isArray(room[field])) addError(`${label}.${field} must be an array`);
    }
    if (new Set(ledgerIds).size !== ledgerIds.length) addError('roomLedgers room IDs must be unique');
    for (const floor of floorBaselines) {
      const floorId = floor?.floor_id || floor?.id;
      const expectedRooms = (Array.isArray(floor?.zones) ? floor.zones : []).map(zone => zone?.id).filter(nonEmptyString);
      const actualRooms = ledgerRecords.filter(room => room?.floor_id === floorId).map(room => room?.room_id).filter(nonEmptyString);
      compareExactSets(`roomLedgers for ${floorId}`, expectedRooms, actualRooms);
    }
    const visibleRoomCards = elements.filter(element => element.attributes['data-room-card'] === 'true');
    const visibleRoomIds = visibleRoomCards.map(element => element.attributes['data-room-id']);
    compareExactSets('visible room-by-room cards', ledgerIds, visibleRoomIds);
    const ledgerById = new Map(ledgerRecords.map(room => [room?.room_id, room]));
    for (const card of visibleRoomCards) {
      const room = ledgerById.get(card.attributes['data-room-id']);
      if (!room) continue;
      if (card.attributes['data-floor-id'] !== room.floor_id) addError(`visible room card has wrong floor_id: ${room.room_id}`);
      if (card.attributes['data-source-page-id'] !== room.source_page_id) addError(`visible room card has wrong source_page_id: ${room.room_id}`);
    }

    const correspondenceRecords = Array.isArray(visualCorrespondence) ? visualCorrespondence : [];
    if (visualEvidenceRequired && (!Array.isArray(visualCorrespondence) || !visualCorrespondence.length)) addError('visualCorrespondence must be a non-empty array when multi-floor visuals are enabled');
    const correspondenceIds = [];
    for (const [index, record] of correspondenceRecords.entries()) {
      const label = `visualCorrespondence[${index}]`;
      if (!isPlainObject(record)) { addError(`${label} must be an object`); continue; }
      if (!nonEmptyString(record.asset_id)) addError(`${label}.asset_id is required`); else correspondenceIds.push(record.asset_id);
      const floor = baselineByFloor.get(record.floor_id);
      if (!floor) addError(`${label}.floor_id is invalid`);
      if (!Array.isArray(record.room_ids) || !record.room_ids.length || record.room_ids.some(id => ledgerById.get(id)?.floor_id !== record.floor_id)) addError(`${label}.room_ids must reference roomLedgers on the same floor`);
      if (String(record.baseline_version) !== String(floor?.version)) addError(`${label}.baseline_version does not match its floor`);
      if (record.variant_id !== floor?.preferred_visual_state && record.comparison_state !== 'existing') addError(`${label}.variant_id does not match its floor's preferred visual state`);
      if (!nonEmptyString(record.camera_id)) addError(`${label}.camera_id is required`);
      if (!Array.isArray(record.reference_asset_ids) || !record.reference_asset_ids.includes(floor?.source_plan_asset_id)) addError(`${label}.reference_asset_ids must include the same-floor source plan`);
      if (!Array.isArray(record.modification_ids)) addError(`${label}.modification_ids must be an array`);
      if (!['final', 'existing', 'proposed'].includes(record.comparison_state)) addError(`${label}.comparison_state is invalid`);
      if (!isPlainObject(record.geometry_checks) || ['outline', 'adjacency', 'openings', 'fixed_furniture'].some(key => record.geometry_checks?.[key] !== 'pass')) addError(`${label}.geometry_checks must pass outline, adjacency, openings and fixed_furniture`);
      if (!nonEmptyString(record.review_notes)) addError(`${label}.review_notes is required`);
      const assetType = provenance?.assets?.[record.asset_id]?.type;
      if (!nonEmptyString(assetType) || assetType !== record.asset_type) addError(`${label}.asset_type must match asset provenance`);
    }
    if (new Set(correspondenceIds).size !== correspondenceIds.length) addError('visualCorrespondence asset IDs must be unique');
    const visibleCorrespondence = elements.filter(element => nonEmptyString(element.attributes['data-visual-correspondence-id']));
    compareExactSets('visible visual-correspondence assets', correspondenceIds, visibleCorrespondence.map(element => element.attributes['data-visual-correspondence-id']));
    for (const element of visibleCorrespondence) {
      const record = correspondenceRecords.find(item => item?.asset_id === element.attributes['data-visual-correspondence-id']);
      if (!record) continue;
      if (element.attributes['data-asset'] !== record.asset_id) addError(`visible visual correspondence must bind data-asset=${record.asset_id}`);
      if (element.attributes['data-floor-id'] !== record.floor_id) addError(`visible visual correspondence has wrong floor_id: ${record.asset_id}`);
    }
    if ((minimumVisuals.static_3d || 0) > 0) for (const floorId of projectConfig.target.floor_ids) if (!correspondenceRecords.some(record => record.floor_id === floorId && record.asset_type === 'static-3d-preview')) addError(`multi-floor static 3D lacks a floor-specific view: ${floorId}`);
    if ((minimumVisuals.final_renders || 0) > 0) for (const floorId of projectConfig.target.floor_ids) if (!correspondenceRecords.some(record => record.floor_id === floorId && record.asset_type === 'plan-specific-final-render')) addError(`multi-floor final renders lack a floor-specific view: ${floorId}`);
    for (const modification of preferredOpeningModifications) {
      const records = correspondenceRecords.filter(record => record.modification_ids?.includes(modification.id));
      const existingCameras = new Set(records.filter(record => record.comparison_state === 'existing').map(record => record.camera_id));
      const proposedCameras = new Set(records.filter(record => record.comparison_state === 'proposed').map(record => record.camera_id));
      if (![...existingCameras].some(camera => proposedCameras.has(camera))) addError(`highlighted opening modification lacks a matched existing/proposed visual pair: ${modification.id}`);
    }

    const selectorPanelIds = ['drawing', 'openings', 'visuals', 'materials', 'furniture'].filter(id => requiredPanels.includes(id));
    const sortedPanels = [...panels].sort((a, b) => a.index - b.index);
    for (const panelId of selectorPanelIds) {
      const panel = sortedPanels.find(item => item.attributes.id === panelId);
      if (!panel) continue;
      if (String(panel.attributes['data-building-core-version']) !== String(buildingCore.version)) addError(`${panelId} panel data-building-core-version does not match buildingCore.version`);
      const nextPanel = sortedPanels.find(item => item.index > panel.index);
      const panelEnd = nextPanel?.index ?? html.length;
      const panelElements = elements.filter(element => element.index > panel.end && element.index < panelEnd);
      const controls = panelElements.filter(element => 'data-floor-target' in element.attributes);
      const controlTargets = controls.map(element => element.attributes['data-floor-target']).filter(nonEmptyString);
      if (controls.some(element => element.name !== 'button')) addError(`${panelId} panel data-floor-target controls must be buttons`);
      if (new Set(controlTargets).size !== controlTargets.length) addError(`${panelId} panel data-floor-target controls must be unique`);
      compareExactSets(`${panelId} panel floor controls`, projectConfig.target.floor_ids, controlTargets);
      const containers = panelElements.filter(element => element.attributes['data-floor-container'] === 'true');
      const containerFloorIds = containers.map(element => element.attributes['data-floor-id']).filter(nonEmptyString);
      compareExactSets(`${panelId} panel floor containers`, projectConfig.target.floor_ids, containerFloorIds);
      for (const container of containers) {
        const floorId = container.attributes['data-floor-id'];
        const floor = baselineByFloor.get(floorId);
        if (!floor) continue;
        if (String(container.attributes['data-building-core-version']) !== String(buildingCore.version)) addError(`${panelId}/${floorId} container data-building-core-version does not match buildingCore.version`);
        if (String(container.attributes['data-baseline-version']) !== String(floor.version)) addError(`${panelId}/${floorId} container data-baseline-version does not match its floor baseline`);
        if (container.attributes['data-variant'] !== floor.preferred_visual_state) addError(`${panelId}/${floorId} container data-variant does not match its preferred floor variant`);
      }
    }
    report.buildingCore = { version: buildingCore.version, floors: floorIds.length };
  }
} else if (strict) {
  if (parseJsonScript('buildingCore') !== null || parseJsonScript('floorBaselines') !== null) addError('buildingCore/floorBaselines are present while projectConfig.features.multi_floor is false');
}

if (strict && isPlainObject(projectConfig?.vertical_assumptions)) {
  const verticalElements = elements.filter(element => 'data-vertical-assumptions' in element.attributes);
  if (verticalElements.length !== 1) addError(`expected exactly one visible data-vertical-assumptions element; found ${verticalElements.length}`);
  else {
    const attributes = verticalElements[0].attributes;
    if (attributes['data-status'] !== projectConfig.vertical_assumptions.status) addError('visible vertical assumption data-status does not match projectConfig');
    for (const [key, value] of Object.entries(projectConfig.vertical_assumptions)) {
      if (!key.startsWith('model_') || !key.endsWith('_mm')) continue;
      const attribute = `data-${key.slice('model_'.length).replaceAll('_', '-')}`;
      if (String(attributes[attribute]) !== String(value)) addError(`visible vertical assumption ${attribute} does not match projectConfig (${value})`);
    }
  }
}

const tableRows = matches(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi);
const budgetRows = tableRows.map(match => ({ attributes: parseAttributes(match[1]), inner: match[2] }))
  .filter(row => 'data-low' in row.attributes || 'data-high' in row.attributes || 'data-budget-category' in row.attributes);
if (features.budget) {
  if (!budgetRows.length) addError('budget feature is enabled but no budget rows were found');
  let low = 0;
  let high = 0;
  let included = 0;
  const categories = [];
  for (const [index, row] of budgetRows.entries()) {
    const rowLow = Number(row.attributes['data-low']);
    const rowHigh = Number(row.attributes['data-high']);
    if (!Number.isFinite(rowLow) || !Number.isFinite(rowHigh) || rowLow < 0 || rowHigh < rowLow) { addError(`invalid budget row values at row ${index + 1}`); continue; }
    const category = row.attributes['data-budget-category'];
    if (nonEmptyString(category)) categories.push(category);
    const inputMatch = row.inner.match(/<input\b([^>]*)>/i);
    if (!inputMatch) { addError(`budget row ${category || index + 1} lacks an input checkbox`); continue; }
    const inputAttributes = parseAttributes(inputMatch[1]);
    if (String(inputAttributes.type).toLowerCase() !== 'checkbox') addError(`budget row ${category || index + 1} input is not a checkbox`);
    const checked = 'checked' in inputAttributes;
    const disabled = 'disabled' in inputAttributes;
    const tbd = String(row.attributes['data-budget-tbd']).toLowerCase() === 'true';
    if (rowLow === 0 && rowHigh === 0 && tbd) {
      if (!disabled) addError(`zero-value TBD budget row must be disabled: ${category || index + 1}`);
      if (!/(?:\bTBD\b|excluded|not included|不计入|未计入|另计|待报价|待清单)/i.test(visibleText(row.inner))) addError(`zero-value TBD budget row must visibly say it is excluded: ${category || index + 1}`);
    }
    if (checked && !disabled) { low += rowLow; high += rowHigh; included += 1; }
  }
  if (new Set(categories).size !== categories.length) addError('data-budget-category values must be unique');
  for (const category of budgetConfig?.required_optional_categories || []) if (!categories.includes(category)) addError(`required optional budget category is missing: ${category}`);

  const expectedContingencyMultiplier = 1 + Number(budgetConfig?.contingency_rate || 0);
  const scriptWithoutJson = html.replace(/<script\b[^>]*\btype=["']application\/json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const multipliers = matches(/\b(?:low|high)\s*\*=\s*([\d.]+)\s*\*\s*factor/g, scriptWithoutJson).map(match => Number(match[1])).filter(Number.isFinite);
  if (!multipliers.length || multipliers.some(value => Math.abs(value - expectedContingencyMultiplier) > 1e-9)) addError(`budget recalculation multiplier must equal 1 + contingency_rate (${expectedContingencyMultiplier})`);

  let selectedFactor = 1;
  const factorSelect = html.match(/<select\b([^>]*(?:\bid=["']cityFactor["']|\bdata-budget-factor)[^>]*)>([\s\S]*?)<\/select>/i);
  if (factorSelect) {
    const options = [...factorSelect[2].matchAll(/<option\b([^>]*)>/gi)].map(match => parseAttributes(match[1]));
    const selected = options.find(option => 'selected' in option) || options[0];
    selectedFactor = Number(selected?.value);
    if (!Number.isFinite(selectedFactor) || selectedFactor <= 0) { addError('default budget factor is invalid'); selectedFactor = 1; }
  } else addError('budget factor select is missing');
  const expectedLow = low * expectedContingencyMultiplier * selectedFactor;
  const expectedHigh = high * expectedContingencyMultiplier * selectedFactor;
  const totalElement = elements.find(element => element.attributes.id === 'budgetTotal');
  if (!totalElement) addError('visible budgetTotal element is missing');
  else {
    const machineLow = Number(totalElement.attributes['data-default-low']);
    const machineHigh = Number(totalElement.attributes['data-default-high']);
    if (!Number.isFinite(machineLow) || !Number.isFinite(machineHigh)) addError('budgetTotal must expose numeric data-default-low and data-default-high');
    else if (Math.abs(machineLow - expectedLow) > Math.max(0.5, expectedLow * 1e-9) || Math.abs(machineHigh - expectedHigh) > Math.max(0.5, expectedHigh * 1e-9)) addError('budgetTotal machine defaults do not match checked rows, selected factor, and configured contingency');
  }
  const visibleDocumentText = visibleText(html);
  if (!visibleDocumentText.includes(budgetConfig.currency_code) && !visibleDocumentText.includes(budgetConfig.currency_symbol)) addError('configured budget currency is not visible outside JSON');
  if (!visibleDocumentText.includes(budgetConfig.price_date)) addError('configured budget price date is not visible outside JSON');
  const percentage = `${Number((budgetConfig.contingency_rate * 100).toFixed(4))}%`;
  if (!visibleDocumentText.includes(percentage) && !/(?:contingency|机动金|预备费)/i.test(visibleDocumentText)) addError('configured budget contingency is not visible');
  if (!/(?:示例性规划额度|planning allowance|价格来源|预算假设|budget source|estimate basis)/i.test(visibleDocumentText)) addError('budget source or assumption is not visible');
  report.budget = { rows: budgetRows.length, included, baseLow: low, baseHigh: high, contingencyMultiplier: expectedContingencyMultiplier, selectedFactor, defaultLow: expectedLow, defaultHigh: expectedHigh, currency: budgetConfig.currency_code, priceDate: budgetConfig.price_date };
} else if (budgetRows.length) addError('projectConfig disables budget but budget rows are present');

const scripts = byName('script');
const moduleCodes = [];
const runtimeCodes = [];
let moduleIndex = 0;
let classicIndex = 0;
for (const script of scripts) {
  const close = html.indexOf('</script>', script.end);
  if (close < 0) { addError('script element is not closed'); continue; }
  if (script.attributes.src) continue;
  const type = String(script.attributes.type || '').toLowerCase();
  const code = html.slice(script.end, close);
  if (!code.trim() || ['application/json', 'importmap'].includes(type)) continue;
  runtimeCodes.push(code);
  if (type === 'module') {
    moduleCodes.push(code);
    const optionalComments = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*`;
    const dynamicImportPattern = new RegExp(`\\bimport${optionalComments}\\(${optionalComments}(['"])([^'"]+)\\1${optionalComments}\\)`, 'g');
    const sideEffectImportPattern = new RegExp(`\\bimport${optionalComments}(['"])([^'"]+)\\1`, 'g');
    const fromPattern = new RegExp(`\\bfrom${optionalComments}(['"])([^'"]+)\\1`, 'g');
    const dynamicImports = [...code.matchAll(dynamicImportPattern)];
    const everyDynamicImport = [...code.matchAll(new RegExp(`\\bimport${optionalComments}\\(`, 'g'))];
    if (dynamicImports.length !== everyDynamicImport.length) addError('module script contains a non-literal dynamic import');
    const moduleSpecifiers = [
      ...dynamicImports.map(match => match[2]),
      ...[...code.matchAll(sideEffectImportPattern)].map(match => match[2]),
      ...[...code.matchAll(fromPattern)].map(match => match[2]),
    ];
    for (const specifier of moduleSpecifiers) {
      const addonPath = specifier.startsWith('three/addons/') ? specifier.slice('three/addons/'.length) : '';
      const permittedAddon = addonPath.endsWith('.js') && addonPath.split('/').every(segment => /^[A-Za-z0-9_.-]+$/.test(segment) && segment !== '.' && segment !== '..');
      if (specifier !== 'three' && !permittedAddon) addError(`module script imports an unapproved specifier: ${specifier}`);
    }
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'renovation-validator-'));
    const temp = path.join(temporaryDirectory, `module-${moduleIndex}.mjs`);
    moduleIndex += 1;
    let checked;
    try {
      fs.writeFileSync(temp, code, { flag: 'wx' });
      checked = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
    } finally { fs.rmSync(temporaryDirectory, { recursive: true, force: true }); }
    if (!checked || checked.status !== 0) addError(`module script ${moduleIndex} does not compile: ${checked ? (checked.stderr || checked.stdout).trim() : 'temporary-file check failed'}`);
  } else {
    classicIndex += 1;
    try { new Function(code); } catch (error) { addError(`classic script ${classicIndex} does not compile: ${error.message}`); }
  }
}

if (features.multi_floor) {
  const runtimeCode = runtimeCodes.join('\n');
  const readsFloorTarget = /dataset\s*\.\s*floorTarget\b/.test(runtimeCode) || /getAttribute\(\s*['"]data-floor-target['"]\s*\)/.test(runtimeCode);
  const readsFloorId = /dataset\s*\.\s*floorId\b/.test(runtimeCode) || /getAttribute\(\s*['"]data-floor-id['"]\s*\)/.test(runtimeCode);
  const switchesFloorContent = /(?:\.hidden\s*=|classList\s*\.\s*toggle\s*\(|toggleAttribute\(\s*['"]hidden['"])/.test(runtimeCode);
  if (!readsFloorTarget) addError('multi-floor runtime does not read data-floor-target controls');
  if (!readsFloorId) addError('multi-floor runtime does not read data-floor-id containers');
  if (!switchesFloorContent) addError('multi-floor runtime does not switch floor content visibility');
}

if (features.interactive_3d) {
  const moduleCode = moduleCodes.join('\n');
  if (!/getElementById\(\s*['"]projectConfig['"]\s*\)/.test(moduleCode) || !/vertical_assumptions/.test(moduleCode)) addError('interactive 3D does not consume projectConfig vertical assumptions');
  if (features.multi_floor) {
    if (!/getElementById\(\s*['"]buildingCore['"]\s*\)/.test(moduleCode)) addError('multi-floor interactive 3D does not consume buildingCore');
    if (!/getElementById\(\s*['"]floorBaselines['"]\s*\)/.test(moduleCode)) addError('multi-floor interactive 3D does not consume floorBaselines');
  } else if (!/getElementById\(\s*['"]spatialBaseline['"]\s*\)/.test(moduleCode)) addError('interactive 3D does not consume the canonical spatialBaseline JSON block');
  if (features.modifications && !/getElementById\(\s*['"]modifications['"]\s*\)/.test(moduleCode)) addError('interactive 3D does not consume the canonical modifications JSON block');
  if (!/activeVariant\s*\.\s*zone_deltas/.test(moduleCode)) addError('interactive 3D does not derive active zones from the preferred variant deltas');
  if (/floorZone\s*\(\s*['"]/.test(moduleCode)) addError('interactive 3D contains hard-coded floorZone calls instead of canonical zone iteration');
  if (!idSet.has('viewerError')) addError('interactive 3D lacks the required static-fallback/error element');
}

report.errors = errors;
report.warnings = warnings;
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);
