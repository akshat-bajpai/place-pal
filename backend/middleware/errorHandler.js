const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log server-side so production 500s aren't invisible. Operational 4xx errors
  // (thrown via AppError) are expected, so keep those quiet.
  if (err.statusCode >= 500 || !err.isOperational) {
    console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.stack || err);
  }

  // Development vs Production error detail
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.statusCode >= 500 && !isDev ? 'Something went wrong' : err.message,
    ...(isDev && { stack: err.stack, error: err })
  });
};

module.exports = errorHandler;
