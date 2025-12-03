// Simple in-memory rate limiter
// For production, use Redis-based rate limiting

const rateLimitMap = new Map();

const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(identifier)) {
      rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitMap.get(identifier);

    if (now > record.resetTime) {
      // Reset the window
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ 
        message,
        retryAfter: `${retryAfter} seconds`
      });
    }

    record.count++;
    next();
  };
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

module.exports = rateLimit;
