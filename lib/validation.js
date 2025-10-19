// ==================== VALIDATION LIBRARY ====================
// Centralized validation and sanitization functions

// ==================== STRING VALIDATORS ====================

/**
 * Validate username
 * @param {string} username 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUsername(username) {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (typeof username !== 'string') {
    return { valid: false, error: 'Username must be a string' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Username must not exceed 50 characters' };
  }
  
  // Only alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Username can only contain letters, numbers, underscore, and hyphen' 
    };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate password
 * @param {string} password 
 * @param {object} options - { minLength?: number, maxLength?: number }
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password, options = {}) {
  const minLength = options.minLength || 6;
  const maxLength = options.maxLength || 100;
  
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  
  if (password.length < minLength) {
    return { 
      valid: false, 
      error: `Password must be at least ${minLength} characters` 
    };
  }
  
  if (password.length > maxLength) {
    return { valid: false, error: 'Password is too long' };
  }
  
  return { valid: true };
}

/**
 * Validate role
 * @param {string} role 
 * @returns {{ valid: boolean, error?: string, role?: string }}
 */
function validateRole(role) {
  const validRoles = ['user', 'admin'];
  
  // Default to 'user' if not provided
  if (!role) {
    return { valid: true, role: 'user' };
  }
  
  if (typeof role !== 'string') {
    return { valid: false, error: 'Role must be a string' };
  }
  
  const normalized = role.toLowerCase().trim();
  
  if (!validRoles.includes(normalized)) {
    return { 
      valid: false, 
      error: 'Invalid role. Must be "user" or "admin"' 
    };
  }
  
  return { valid: true, role: normalized };
}

/**
 * Validate email (optional)
 * @param {string} email 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (trimmed.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }
  
  return { valid: true, value: trimmed };
}

// ==================== NUMBER VALIDATORS ====================

/**
 * Validate ID (must be positive integer)
 * @param {any} id 
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
function validateId(id) {
  if (id === null || id === undefined) {
    return { valid: false, error: 'ID is required' };
  }
  
  const num = Number(id);
  
  if (isNaN(num)) {
    return { valid: false, error: 'ID must be a number' };
  }
  
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'ID must be an integer' };
  }
  
  if (num <= 0) {
    return { valid: false, error: 'ID must be positive' };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate price (must be non-negative number)
 * @param {any} price 
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
function validatePrice(price) {
  if (price === null || price === undefined) {
    return { valid: false, error: 'Price is required' };
  }
  
  const num = Number(price);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Price must be a number' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Price cannot be negative' };
  }
  
  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  
  return { valid: true, value: rounded };
}

// ==================== TEXT VALIDATORS ====================

/**
 * Validate required text field
 * @param {string} text 
 * @param {object} options - { fieldName: string, minLength?: number, maxLength?: number }
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
function validateText(text, options = {}) {
  const fieldName = options.fieldName || 'Field';
  const minLength = options.minLength || 1;
  const maxLength = options.maxLength || 255;
  
  if (!text) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof text !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length < minLength) {
    return { 
      valid: false, 
      error: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}` 
    };
  }
  
  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} must not exceed ${maxLength} characters` 
    };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate optional text field
 * @param {string} text 
 * @param {object} options - { maxLength?: number }
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
function validateOptionalText(text, options = {}) {
  const maxLength = options.maxLength || 255;
  
  // Optional - can be empty
  if (!text) {
    return { valid: true, value: null };
  }
  
  if (typeof text !== 'string') {
    return { valid: false, error: 'Text must be a string' };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      error: `Text must not exceed ${maxLength} characters` 
    };
  }
  
  return { valid: true, value: trimmed || null };
}

// ==================== COLLECTION VALIDATORS ====================

/**
 * Validate collection name
 * @param {string} collection 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCollection(collection) {
  const validCollections = ['items', 'customers', 'students'];
  
  if (!collection) {
    return { valid: false, error: 'Collection name is required' };
  }
  
  if (!validCollections.includes(collection)) {
    return { 
      valid: false, 
      error: `Invalid collection. Must be one of: ${validCollections.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate item data
 * @param {object} data 
 * @returns {{ valid: boolean, errors?: string[], sanitized?: object }}
 */
function validateItemData(data) {
  const errors = [];
  const sanitized = {};
  
  // Validate name (required)
  const nameCheck = validateText(data.name, { 
    fieldName: 'Item name', 
    minLength: 1, 
    maxLength: 255 
  });
  if (!nameCheck.valid) {
    errors.push(nameCheck.error);
  } else {
    sanitized.name = nameCheck.value;
  }
  
  // Validate price (required)
  const priceCheck = validatePrice(data.price);
  if (!priceCheck.valid) {
    errors.push(priceCheck.error);
  } else {
    sanitized.price = priceCheck.value;
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate customer data
 * @param {object} data 
 * @returns {{ valid: boolean, errors?: string[], sanitized?: object }}
 */
function validateCustomerData(data) {
  const errors = [];
  const sanitized = {};
  
  // Validate name (required)
  const nameCheck = validateText(data.name, { 
    fieldName: 'Customer name', 
    minLength: 1, 
    maxLength: 255 
  });
  if (!nameCheck.valid) {
    errors.push(nameCheck.error);
  } else {
    sanitized.name = nameCheck.value;
  }
  
  // Validate contact (optional)
  const contactCheck = validateOptionalText(data.contact, { maxLength: 255 });
  if (!contactCheck.valid) {
    errors.push(contactCheck.error);
  } else {
    sanitized.contact = contactCheck.value;
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate student data
 * @param {object} data 
 * @returns {{ valid: boolean, errors?: string[], sanitized?: object }}
 */
function validateStudentData(data) {
  const errors = [];
  const sanitized = {};
  
  // Validate name (required)
  const nameCheck = validateText(data.name, { 
    fieldName: 'Student name', 
    minLength: 1, 
    maxLength: 255 
  });
  if (!nameCheck.valid) {
    errors.push(nameCheck.error);
  } else {
    sanitized.name = nameCheck.value;
  }
  
  // Validate NIS (optional)
  const nisCheck = validateOptionalText(data.nis, { maxLength: 50 });
  if (!nisCheck.valid) {
    errors.push(nisCheck.error);
  } else {
    sanitized.nis = nisCheck.value;
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, sanitized };
}

// ==================== SANITIZATION ====================

/**
 * Sanitize string input
 * @param {string} str 
 * @param {number} maxLength 
 * @returns {string}
 */
function sanitizeString(str, maxLength = 255) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLength);
}

/**
 * Sanitize user object for API response (remove sensitive data)
 * @param {object} user 
 * @returns {object}
 */
function sanitizeUser(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
    // Explicitly exclude: password
  };
}

/**
 * Sanitize collection item for API response
 * @param {object} item 
 * @returns {object}
 */
function sanitizeCollectionItem(item) {
  if (!item) return null;
  
  // Return all fields (no sensitive data in collections)
  return { ...item };
}

// ==================== RESPONSE HELPERS ====================

/**
 * Create success response
 * @param {object} data 
 * @param {string} message 
 * @returns {object}
 */
function successResponse(data = {}, message = 'Success') {
  return {
    success: true,
    message,
    ...data
  };
}

/**
 * Create error response
 * @param {string} error 
 * @param {string} message 
 * @param {object} extra 
 * @returns {object}
 */
function errorResponse(error, message, extra = {}) {
  return {
    success: false,
    error,
    message,
    ...extra
  };
}

/**
 * Create validation error response
 * @param {string|string[]} errors 
 * @returns {object}
 */
function validationErrorResponse(errors) {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  
  return {
    success: false,
    error: 'Validation error',
    message: errorArray[0], // First error as main message
    errors: errorArray.length > 1 ? errorArray : undefined
  };
}

// ==================== EXPORTS ====================

module.exports = {
  // String validators
  validateUsername,
  validatePassword,
  validateRole,
  validateEmail,
  
  // Number validators
  validateId,
  validatePrice,
  
  // Text validators
  validateText,
  validateOptionalText,
  
  // Collection validators
  validateCollection,
  validateItemData,
  validateCustomerData,
  validateStudentData,
  
  // Sanitization
  sanitizeString,
  sanitizeUser,
  sanitizeCollectionItem,
  
  // Response helpers
  successResponse,
  errorResponse,
  validationErrorResponse
};