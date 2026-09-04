/**
 * Unit tests for the security middleware/helpers that are hard to exercise
 * end-to-end (the response sanitizer only activates in production, etc.).
 *   - sanitizeInput recursion + vector stripping (C9)
 *   - sanitizeErrorResponses strips internal detail from 5xx in production (C8)
 *   - autodata formatDataset path-traversal guard (N1)
 */
const { sanitizeInput } = require('../../middleware/validation');
const { sanitizeErrorResponses } = require('../../middleware/errorHandler');
const { formatDataset } = require('../../services/autodata/agents/datasetFormatterAgent');

describe('sanitizeInput (C9)', () => {
  test('strips script tags, nested handlers, array js-uris and query vectors', () => {
    const req = {
      body: {
        name: '<script>alert(1)</script>hello',
        meta: { nested: 'x onload=evil()', arr: ['javascript:alert(2)', 'safe'] }
      },
      query: { q: '<iframe src=x></iframe>term' }
    };
    sanitizeInput(req, {}, () => {});

    expect(req.body.name).toBe('hello');
    expect(req.body.meta.nested).not.toMatch(/onload=/i);
    expect(req.body.meta.arr[0]).not.toMatch(/javascript:/i);
    expect(req.body.meta.arr[1]).toBe('safe');
    expect(req.query.q).not.toMatch(/<iframe/i);
  });
});

describe('sanitizeErrorResponses (C8)', () => {
  const makeRes = (statusCode) => {
    const res = { statusCode, sent: null };
    res.json = (body) => { res.sent = body; return res; };
    return res;
  };

  test('in production, strips error/stack/details from 5xx but keeps message', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = makeRes(500);
      sanitizeErrorResponses({}, res, () => {});
      res.json({ success: false, message: 'Internal server error', error: 'SequelizeError: column x', stack: '...', details: {} });

      expect(res.sent.message).toBe('Internal server error');
      expect(res.sent.error).toBeUndefined();
      expect(res.sent.stack).toBeUndefined();
      expect(res.sent.details).toBeUndefined();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  test('does not strip detail from 4xx responses', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = makeRes(400);
      sanitizeErrorResponses({}, res, () => {});
      res.json({ success: false, message: 'Bad input', error: 'validation: email' });
      expect(res.sent.error).toBe('validation: email');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  test('is a no-op outside production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = makeRes(500);
      sanitizeErrorResponses({}, res, () => {});
      res.json({ message: 'oops', error: 'leaky detail' });
      expect(res.sent.error).toBe('leaky detail');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('formatDataset path-traversal guard (N1)', () => {
  test('rejects a format containing path separators', async () => {
    await expect(formatDataset([], 1, '../../../../tmp/evil')).rejects.toThrow();
  });

  test('rejects an unknown format', async () => {
    await expect(formatDataset([], 1, 'exe')).rejects.toThrow();
  });
});
