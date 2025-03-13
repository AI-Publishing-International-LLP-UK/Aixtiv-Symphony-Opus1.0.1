const Joi = require('joi');

const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
        details: error.details
      });
    }
    req.validatedData = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  userProfile: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    age: Joi.number().integer().min(18).optional()
  }),
  
  apiRequest: Joi.object({
    method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').required(),
    path: Joi.string().required(),
    body: Joi.object().optional(),
    headers: Joi.object().optional()
  })
};

module.exports = {
  validateSchema,
  schemas
};

