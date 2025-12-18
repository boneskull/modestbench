// @ts-nocheck
/**
 * Vendored from eslint-plugin-unicorn by Sindre Sorhus
 * @see https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/rules/numeric-separators-style.js
 * @license MIT
 */

// --- Inlined from rules/ast/literal.js ---
const isNumericLiteral = (node) =>
  node.type === 'Literal' && typeof node.value === 'number';

const isBigIntLiteral = (node) =>
  node.type === 'Literal' && Boolean(node.bigint);

// --- Inlined from rules/utils/numeric.js ---
const isNumeric = (node) => isNumericLiteral(node) || isBigIntLiteral(node);

const isLegacyOctal = (node) =>
  isNumericLiteral(node) && /^0\d+$/.test(node.raw);

const getPrefix = (text) => {
  let prefix = '';
  let data = text;

  if (/^0[box]/i.test(text)) {
    prefix = text.slice(0, 2);
    data = text.slice(2);
  }

  return { prefix, data };
};

const parseNumber = (text) => {
  const {
    number,
    mark = '',
    sign = '',
    power = '',
  } = text.match(
    /^(?<number>[\d._]*?)(?:(?<mark>[Ee])(?<sign>[+-])?(?<power>[\d_]+))?$/,
  ).groups;

  return { number, mark, sign, power };
};

const parseFloatNumber = (text) => {
  const parts = text.split('.');
  const [integer, fractional = ''] = parts;
  const dot = parts.length === 2 ? '.' : '';

  return { integer, dot, fractional };
};

// --- Main rule from rules/numeric-separators-style.js ---
const MESSAGE_ID = 'numeric-separators-style';
const messages = {
  [MESSAGE_ID]: 'Invalid group length in numeric value.',
};

const addSeparator = (value, { minimumDigits, groupLength }, fromLeft) => {
  const { length } = value;

  if (length < minimumDigits) {
    return value;
  }

  const parts = [];
  if (fromLeft) {
    for (let start = 0; start < length; start += groupLength) {
      const end = Math.min(start + groupLength, length);
      parts.push(value.slice(start, end));
    }
  } else {
    for (let end = length; end > 0; end -= groupLength) {
      const start = Math.max(end - groupLength, 0);
      parts.unshift(value.slice(start, end));
    }
  }

  return parts.join('_');
};

const addSeparatorFromLeft = (value, options) => addSeparator(value, options, true);

const formatNumber = (value, options) => {
  const { integer, dot, fractional } = parseFloatNumber(value);
  return (
    addSeparator(integer, options) + dot + addSeparatorFromLeft(fractional, options)
  );
};

const format = (value, { prefix, data }, options) => {
  const formatOption = options[prefix.toLowerCase()];

  if (prefix) {
    return prefix + addSeparator(data, formatOption);
  }

  const { number, mark, sign, power } = parseNumber(value);

  return (
    formatNumber(number, formatOption) + mark + sign + addSeparator(power, options[''])
  );
};

const defaultOptions = {
  binary: { minimumDigits: 0, groupLength: 4 },
  octal: { minimumDigits: 0, groupLength: 4 },
  hexadecimal: { minimumDigits: 0, groupLength: 2 },
  number: { minimumDigits: 5, groupLength: 3 },
};

const create = (context) => {
  const { onlyIfContainsSeparator, binary, octal, hexadecimal, number } = {
    onlyIfContainsSeparator: false,
    ...context.options[0],
  };

  const options = {
    '0b': {
      onlyIfContainsSeparator,
      ...defaultOptions.binary,
      ...binary,
    },
    '0o': {
      onlyIfContainsSeparator,
      ...defaultOptions.octal,
      ...octal,
    },
    '0x': {
      onlyIfContainsSeparator,
      ...defaultOptions.hexadecimal,
      ...hexadecimal,
    },
    '': {
      onlyIfContainsSeparator,
      ...defaultOptions.number,
      ...number,
    },
  };

  return {
    Literal(node) {
      if (!isNumeric(node) || isLegacyOctal(node)) {
        return;
      }

      const { raw } = node;
      let num = raw;
      let suffix = '';
      if (isBigIntLiteral(node)) {
        num = raw.slice(0, -1);
        suffix = 'n';
      }

      const strippedNumber = num.replaceAll('_', '');
      const { prefix, data } = getPrefix(strippedNumber);

      const { onlyIfContainsSeparator: onlyIfContains } = options[prefix.toLowerCase()];
      if (onlyIfContains && !raw.includes('_')) {
        return;
      }

      const formatted = format(strippedNumber, { prefix, data }, options) + suffix;

      if (raw !== formatted) {
        context.report({
          node,
          messageId: MESSAGE_ID,
          fix: (fixer) => fixer.replaceText(node, formatted),
        });
      }
    },
  };
};

const formatOptionsSchema = () => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    onlyIfContainsSeparator: {
      type: 'boolean',
    },
    minimumDigits: {
      type: 'integer',
      minimum: 0,
    },
    groupLength: {
      type: 'integer',
      minimum: 1,
    },
  },
});

const schema = [
  {
    type: 'object',
    additionalProperties: false,
    properties: {
      ...Object.fromEntries(
        Object.entries(defaultOptions).map(([type]) => [type, formatOptionsSchema()]),
      ),
      onlyIfContainsSeparator: {
        type: 'boolean',
      },
    },
  },
];

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  create,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce the style of numeric separators by correctly grouping digits.',
    },
    fixable: 'code',
    schema,
    defaultOptions: [
      {
        onlyIfContainsSeparator: false,
        binary: defaultOptions.binary,
        octal: defaultOptions.octal,
        hexadecimal: defaultOptions.hexadecimal,
        number: defaultOptions.number,
      },
    ],
    messages,
  },
};

// Export as an ESLint plugin
export default {
  rules: {
    'numeric-separators-style': rule,
  },
};

