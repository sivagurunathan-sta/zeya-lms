const logger = require('./logger');

function warnIfMissingEnv() {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  const smtpMissing = [];
  if (!process.env.SMTP_HOST) smtpMissing.push('SMTP_HOST');
  if (!process.env.SMTP_PORT) smtpMissing.push('SMTP_PORT');
  if (!process.env.SMTP_USER) smtpMissing.push('SMTP_USER');
  if (!process.env.SMTP_PASS) smtpMissing.push('SMTP_PASS');
  const awsMissing = [];
  if (!process.env.AWS_ACCESS_KEY_ID) awsMissing.push('AWS_ACCESS_KEY_ID');
  if (!process.env.AWS_SECRET_ACCESS_KEY) awsMissing.push('AWS_SECRET_ACCESS_KEY');
  if (!process.env.AWS_REGION) awsMissing.push('AWS_REGION');

  if (process.env.NODE_ENV !== 'production') {
    if (missing.length) {
      logger.warn('Missing critical environment variables', { missing });
    }
    if (smtpMissing.length) {
      logger.warn('SMTP not fully configured; email will use JSON transport in development', { missing: smtpMissing });
    }
    if (awsMissing.length) {
      logger.warn('AWS not fully configured; S3 features may be limited', { missing: awsMissing });
    }
  }
}

module.exports = { warnIfMissingEnv };
