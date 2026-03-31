function fail(res, status = 500, options = {}) {
  const code = options.code || 'INTERNAL_ERROR';
  const message = options.message || 'Unexpected server error';
  const userMessage = options.userMessage || '요청 처리 중 오류가 발생했습니다.';
  return res.status(status).json({
    ok: false,
    data: null,
    meta: options.meta || {},
    error: {
      code,
      message,
      userMessage,
      details: options.details || null,
    },
  });
}

module.exports = { fail };
