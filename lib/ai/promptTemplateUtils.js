// Shared prompt-template interpolation helpers.

export function formatTemplateValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => formatTemplateValue(item)).join(', ');
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

export function replaceTemplateVariables(template, variables = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => {
    return formatTemplateValue(variables[key] ?? `{${key}}`);
  });
}

export function customizeTemplateValue(value, variables, replaceVariablesFn) {
  if (typeof value === 'string') {
    return replaceVariablesFn(value, variables);
  }
  if (Array.isArray(value)) {
    return value.map((item) => customizeTemplateValue(item, variables, replaceVariablesFn));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        customizeTemplateValue(item, variables, replaceVariablesFn),
      ])
    );
  }
  return value;
}
