export function requireOperator(req, res, next) {
  const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!process.env.OPERATOR_API_KEY || supplied !== process.env.OPERATOR_API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
